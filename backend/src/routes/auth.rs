use axum::{
    extract::{State, Json, FromRequestParts},
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
    routing::{post, get},
    Router,
    async_trait,
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use crate::AppState;
use std::env;
use time::Duration;
use reqwest::Client;
use crate::utils::suid;

// --- MODELS ---

#[derive(Debug, FromRow)]
pub struct UserAuthDetails {
    pub id: String,
    pub email: String,
    pub role: String,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
    pub role: String,
    pub status: String,
    pub points: i32,
    pub level: String,
    // --- THÊM 2 DÒNG NÀY ---
    pub phone: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub credential: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleTokenInfo {
    email: String,
    aud: String,
    name: Option<String>,
    picture: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub exp: usize,
}

pub struct AuthUser {
    pub user_id: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, state: &S)
        -> Result<Self, Self::Rejection>
    {
        let jar = CookieJar::from_request_parts(parts, state).await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": "Cookie error"}))))?;

        let token = match jar.get("token") {
            Some(c) => c.value().to_string(),
            None => return Err((StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"message": "Chưa đăng nhập"})))),
        };

        let secret = env::var("SECRET_KEY").unwrap_or("secret".to_string());
        let decoding_key = DecodingKey::from_secret(secret.as_bytes());

        match decode::<Claims>(&token, &decoding_key, &Validation::new(Algorithm::HS256)) {
            Ok(token_data) => Ok(AuthUser { user_id: token_data.claims.sub }),
            Err(_) => Err((StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"message": "Token không hợp lệ"})))),
        }
    }
}

// --- HANDLERS ---

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<LoginPayload>,
) -> impl IntoResponse {
    if let Some(google_token) = payload.credential {
        let client = Client::new();
        let google_res = client
            .get("https://oauth2.googleapis.com/tokeninfo")
            .query(&[("id_token", &google_token)])
            .send()
            .await;

        let google_info: GoogleTokenInfo = match google_res {
            Ok(res) if res.status().is_success() => res.json().await.unwrap(),
            _ => return (StatusCode::UNAUTHORIZED, jar, Json(serde_json::json!({"message": "Token Google lỗi"}))).into_response(),
        };

        let env_client_id = env::var("GOOGLE_CLIENT_ID").expect("Thiếu GOOGLE_CLIENT_ID");
        if google_info.aud != env_client_id {
            return (StatusCode::UNAUTHORIZED, jar, Json(serde_json::json!({"message": "Client ID sai"}))).into_response();
        }

        let user_result = sqlx::query_as::<_, UserAuthDetails>(
            "SELECT id, email, role FROM users WHERE email = ?"
        )
        .bind(&google_info.email)
        .fetch_optional(&state.db)
        .await;

        let user = match user_result {
            Ok(Some(u)) => u,
            Ok(None) => {
                let uid = suid().to_string();
                let insert = sqlx::query(
                    "INSERT INTO users (id, email, name, picture, role, status)
                     VALUES (?, ?, ?, ?, 'user', 'active')"
                )
                .bind(&uid)
                .bind(&google_info.email)
                .bind(google_info.name.unwrap_or("User".to_string()))
                .bind(google_info.picture)
                .execute(&state.db)
                .await;

                match insert {
                    Ok(_) => UserAuthDetails {
                        id: uid,
                        email: google_info.email,
                        role: "user".to_string(),
                    },
                    Err(_) => {
                        return (StatusCode::INTERNAL_SERVER_ERROR, jar,
                            Json(serde_json::json!({"message": "Lỗi tạo user"}))
                        ).into_response()
                    }
                }
            },
            Err(_) => {
                return (StatusCode::INTERNAL_SERVER_ERROR, jar,
                    Json(serde_json::json!({"message": "Lỗi DB"}))
                ).into_response()
            }
        };

        return generate_jwt_response(user, jar, &state.db).await;
    }

    (StatusCode::BAD_REQUEST, jar,
        Json(serde_json::json!({"message": "Yêu cầu đăng nhập bằng Google"}))
    ).into_response()
}

pub async fn refresh(
    State(state): State<AppState>,
    jar: CookieJar
) -> impl IntoResponse {
    let token = match jar.get("token") {
        Some(c) => c.value(),
        None => return (StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"message": "Chưa đăng nhập"}))).into_response(),
    };

    let secret = env::var("SECRET_KEY").unwrap_or("secret".to_string());
    let decoding_key = DecodingKey::from_secret(secret.as_bytes());

    let claims = match decode::<Claims>(token, &decoding_key, &Validation::new(Algorithm::HS256)) {
        Ok(data) => data.claims,
        Err(_) => return (StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"message": "Token lỗi"}))).into_response(),
    };

    let user = sqlx::query_as::<_, UserAuthDetails>(
        "SELECT id, email, role FROM users WHERE id = ?"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.db)
    .await;

    match user {
        Ok(Some(u)) => generate_jwt_response(u, jar, &state.db).await,
        _ => (StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"message": "User không tồn tại"}))).into_response(),
    }
}

async fn generate_jwt_response(
    user: UserAuthDetails,
    jar: CookieJar,
    db: &sqlx::MySqlPool
) -> Response {
    let exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(1))
        .unwrap()
        .timestamp() as usize;

    let claims = Claims {
        sub: user.id.clone(),
        email: user.email.clone(),
        role: user.role.clone(),
        exp,
    };

    let secret = env::var("SECRET_KEY").unwrap_or("secret".into());
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .unwrap();

    let is_prod = env::var("NODE_ENV").unwrap_or_default() == "production";

    let cookie = Cookie::build(("token", token))
        .http_only(true)
        .secure(is_prod)
        .path("/")
        .same_site(SameSite::Lax)
        .max_age(Duration::hours(1));

    let full_info = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email, name, picture, role, status, points, level, phone, address
         FROM users WHERE id = ?"
    )
    .bind(user.id)
    .fetch_one(db)
    .await
    .unwrap();

    (StatusCode::OK, jar.add(cookie), Json(serde_json::json!({
        "user": full_info,
        "message": "Success"
    })))
    .into_response()
}

async fn get_me(
    State(state): State<AppState>,
    auth: AuthUser
) -> impl IntoResponse {
    let user = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email, name, picture, role, status, points, level, phone, address
         FROM users WHERE id = ?"
    )
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await;

    match user {
        Ok(Some(u)) => (StatusCode::OK, Json(u)).into_response(),
        _ => (StatusCode::NOT_FOUND,
            Json(serde_json::json!({"message": "User not found"}))).into_response(),
    }
}

async fn logout(jar: CookieJar) -> impl IntoResponse {
    let is_prod = env::var("NODE_ENV").unwrap_or_default() == "production";

    let cookie = Cookie::build(("token", ""))
        .http_only(true)
        .secure(is_prod)
        .path("/")
        .same_site(SameSite::Lax)
        .max_age(Duration::seconds(0));

    (StatusCode::OK, jar.add(cookie), Json(serde_json::json!({"message": "Logout"})))
}

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/me", get(get_me))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
}
