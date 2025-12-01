use axum::{
    extract::{State, Json},
    Router, routing::post,
    http::StatusCode,
    response::IntoResponse,
};
use axum_extra::extract::cookie::CookieJar; // Cần thêm cái này để đọc cookie
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm}; // Để giải mã token
use crate::AppState;
use crate::utils::suid;
use crate::routes::auth::Claims; // Import Claims từ auth để đọc token
use serde::Deserialize;
use std::env;

#[derive(Deserialize)]
pub struct ContactRequest {
    pub email: String,
    pub message: String,
}

async fn submit_contact(
    State(state): State<AppState>,
    jar: CookieJar, // Thêm CookieJar để lấy token tùy chọn
    Json(payload): Json<ContactRequest>,
) -> impl IntoResponse {
    // 1. Validate cơ bản
    if payload.email.is_empty() || payload.message.is_empty() {
        return (StatusCode::BAD_REQUEST, Json("Vui lòng điền đầy đủ thông tin")).into_response();
    }

    // 2. Kiểm tra xem người dùng có đăng nhập không (Optional Auth)
    let mut user_id: Option<String> = None;

    if let Some(token_cookie) = jar.get("token") {
        let token = token_cookie.value();
        let secret = env::var("SECRET_KEY").unwrap_or("secret".to_string());
        let decoding_key = DecodingKey::from_secret(secret.as_bytes());
        
        // Nếu giải mã token thành công -> Lấy user_id
        if let Ok(token_data) = decode::<Claims>(token, &decoding_key, &Validation::new(Algorithm::HS256)) {
            user_id = Some(token_data.claims.sub);
        }
    }

    let id = suid();

    // 3. Lưu vào Database (Có thêm cột user_id)
    let res = sqlx::query("INSERT INTO contacts (id, user_id, email, message) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(user_id) // Nếu không đăng nhập, giá trị này là None (NULL trong DB)
        .bind(&payload.email)
        .bind(&payload.message)
        .execute(&state.db)
        .await;

    match res {
        Ok(_) => (StatusCode::OK, Json("Đã gửi tin nhắn thành công")).into_response(),
        Err(e) => {
            println!("Lỗi contact: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi server")).into_response()
        }
    }
}

pub fn contact_routes() -> Router<AppState> {
    Router::new().route("/", post(submit_contact))
}