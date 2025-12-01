use axum::{
    extract::{ State, FromRequestParts, Path, Json },
    http::{ StatusCode, request::Parts },
    response::IntoResponse,
    Router,
    routing::{ get, put, post, delete },
    async_trait,
};
use crate::AppState;
use crate::routes::auth::AuthUser;
use crate::utils::suid;
// --- IMPORT QUAN TRỌNG ĐỂ SỬA LỖI ---
use serde::{ Deserialize, Serialize };
use sqlx::FromRow;
// ------------------------------------
use rust_decimal::Decimal;
use serde_json::Value;
use crate::utils::email::{ send_order_shipping_email, send_order_thank_you_email };
use rust_decimal::prelude::ToPrimitive;
// --- MIDDLEWARE ---
pub struct AdminUser(pub String);

// --- HELPER FORMAT TIỀN TỆ (Thay thế cho {:,.0}) ---
fn format_money(amount: f64) -> String {
    let s = (amount as i64).to_string();
    let mut result = String::new();
    let len = s.len();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (len - i) % 3 == 0 {
            result.push(','); // Thêm dấu phẩy ngăn cách
        }
        result.push(c);
    }
    format!("{} đ", result)
}

#[async_trait]
impl<S> FromRequestParts<S> for AdminUser where S: Send + Sync, AppState: From<S>, S: Clone {
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let auth_user = AuthUser::from_request_parts(parts, state).await?;

        let app_state = AppState::from(state.clone());
        let role: (String,) = sqlx
            ::query_as("SELECT role FROM users WHERE id = ?")
            .bind(&auth_user.user_id)
            .fetch_one(&app_state.db).await
            .map_err(|_| (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"message": "User không tồn tại"})),
            ))?;

        if role.0 == "admin" {
            Ok(AdminUser(auth_user.user_id))
        } else {
            Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({"message": "Không có quyền Admin"})),
            ))
        }
    }
}

// --- HANDLERS: ORDERS ---

#[derive(Deserialize)]
struct UpdateStatusReq {
    status: String,
}

async fn get_all_orders(State(state): State<AppState>, _: AdminUser) -> impl IntoResponse {
    let orders = sqlx
        ::query_as::<_, crate::routes::orders::OrderHistory>(
            "SELECT id, final_amount, status, points_earned, created_at FROM orders ORDER BY created_at DESC"
        )
        .fetch_all(&state.db).await;

    match orders {
        Ok(data) => (StatusCode::OK, Json(data)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json("Error")).into_response(),
    }
}

// src/routes/admin.rs

// --- HÀM QUAN TRỌNG: UPDATE ORDER STATUS ---
async fn update_order_status(
    State(state): State<AppState>, 
    _: AdminUser, 
    Path(id): Path<String>,
    Json(payload): Json<UpdateStatusReq>
) -> impl IntoResponse {
    let mut tx = state.db.begin().await.unwrap();

    // 1. Lấy thông tin đơn hàng cũ
    let order_info: Option<(String, String, i32, String, Decimal)> = sqlx::query_as(
        "SELECT o.status, o.user_id, o.points_earned, u.email, o.final_amount 
         FROM orders o 
         JOIN users u ON o.user_id = u.id 
         WHERE o.id = ?"
    )
    .bind(&id)
    .fetch_optional(&mut *tx).await.unwrap_or(None);

    if let Some((old_status, user_id, points, email, final_amount)) = order_info {
        let new_status = payload.status.as_str();

        // Case 1: Chuyển sang SHIPPING -> Gửi mail
        if old_status != "shipping" && new_status == "shipping" {
            let items: Vec<(String, i32, Decimal)> = sqlx::query_as(
                "SELECT p.name, oi.quantity, oi.price 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = ?"
            )
            .bind(&id)
            .fetch_all(&mut *tx).await.unwrap_or(vec![]);

            // Tạo HTML Table Rows
            let items_html = items.iter().map(|(name, qty, price)| {
                let total_line = price * Decimal::from(*qty);
                
                // SỬA LỖI Ở ĐÂY: Dùng hàm helper format_money thay vì {:,.0}
                let price_str = format_money(price.to_f64().unwrap_or(0.0));
                let total_str = format_money(total_line.to_f64().unwrap_or(0.0));
                
                // Dùng {{ }} để escape ngoặc nhọn của CSS
                format!(
                    "<tr>
                        <td style='padding: 8px; border-bottom: 1px solid #ddd;'>{}</td>
                        <td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: center;'>{}</td>
                        <td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: right;'>{}</td>
                        <td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: right;'>{}</td>
                    </tr>", 
                    name, qty, price_str, total_str
                )
            }).collect::<Vec<String>>().join("");

            // SỬA LỖI Ở ĐÂY: Dùng hàm helper
            let total_bill_str = format_money(final_amount.to_f64().unwrap_or(0.0));

            send_order_shipping_email(email.clone(), id.clone(), items_html, total_bill_str);
        }

        // Case 2: Hoàn thành -> Cộng điểm
        if old_status != "completed" && new_status == "completed" {
            let _ = sqlx::query("UPDATE users SET points = points + ? WHERE id = ?")
                .bind(points).bind(&user_id).execute(&mut *tx).await;
            
            send_order_thank_you_email(email.clone(), id.clone(), points);
        } 
        // Case 3: Hủy hoàn thành -> Trừ điểm
        else if old_status == "completed" && new_status != "completed" {
            let _ = sqlx::query("UPDATE users SET points = points - ? WHERE id = ?")
                .bind(points).bind(&user_id).execute(&mut *tx).await;
        }

        // Cập nhật trạng thái
        let _ = sqlx::query("UPDATE orders SET status = ? WHERE id = ?")
            .bind(new_status).bind(&id).execute(&mut *tx).await;
    }

    if tx.commit().await.is_ok() {
        (StatusCode::OK, Json("Updated")).into_response()
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json("Error")).into_response()
    }
}

// --- HANDLERS: PRODUCTS ---

#[derive(Deserialize)]
struct CreateProductReq {
    category_id: String,
    name: String,
    price: Decimal,
    stock: i32,
    images: Option<Vec<String>>,
    description: Option<String>,
    specs: Option<Value>,
}

async fn create_product(
    State(state): State<AppState>,
    _: AdminUser,
    Json(payload): Json<CreateProductReq>
) -> impl IntoResponse {
    let id = suid();

    let images_json = sqlx::types::Json(payload.images.unwrap_or(vec![]));
    let specs_json = sqlx::types::Json(payload.specs.unwrap_or(serde_json::json!({})));

    let res = sqlx
        ::query(
            "INSERT INTO products (id, category_id, name, price, stock, images, description, specs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(payload.category_id)
        .bind(payload.name)
        .bind(payload.price)
        .bind(payload.stock)
        .bind(images_json)
        .bind(payload.description)
        .bind(specs_json)
        .execute(&state.db).await;

    match res {
        Ok(_) => (StatusCode::CREATED, Json("Created")).into_response(),
        Err(e) => {
            println!("Lỗi create_product: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json("Error DB")).into_response()
        }
    }
}

// Thêm hàm update_product để hỗ trợ sửa sản phẩm (PUT)
async fn update_product(
    State(state): State<AppState>,
    _: AdminUser,
    Path(id): Path<String>,
    Json(payload): Json<CreateProductReq>
) -> impl IntoResponse {
    let images_json = sqlx::types::Json(payload.images.unwrap_or(vec![]));
    let specs_json = sqlx::types::Json(payload.specs.unwrap_or(serde_json::json!({})));

    let res = sqlx
        ::query(
            "UPDATE products SET category_id=?, name=?, price=?, stock=?, images=?, description=?, specs=? WHERE id=?"
        )
        .bind(payload.category_id)
        .bind(payload.name)
        .bind(payload.price)
        .bind(payload.stock)
        .bind(images_json)
        .bind(payload.description)
        .bind(specs_json)
        .bind(id)
        .execute(&state.db).await;

    match res {
        Ok(_) => (StatusCode::OK, Json("Updated")).into_response(),
        Err(e) => {
            println!("Lỗi update_product: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json("Error DB")).into_response()
        }
    }
}

// src/routes/admin.rs

async fn delete_product(
    State(state): State<AppState>,
    _: AdminUser,
    Path(id): Path<String>
) -> impl IntoResponse {
    // THAY ĐỔI: Không dùng DELETE nữa, chuyển sang UPDATE
    let res = sqlx
        ::query("UPDATE products SET is_deleted = TRUE WHERE id = ?")
        .bind(id)
        .execute(&state.db).await;

    match res {
        Ok(_) => (StatusCode::OK, Json("Deleted successfully (Soft delete)")).into_response(),
        Err(e) => {
            println!("Lỗi delete_product: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json("Error DB")).into_response()
        }
    }
}

// --- HANDLERS: USERS ---

async fn get_all_users(State(state): State<AppState>, _: AdminUser) -> impl IntoResponse {
    let users = sqlx
        ::query_as::<_, crate::routes::auth::UserResponse>(
            "SELECT id, email, name, picture, role, status, points, level, phone, address FROM users"
        )
        .fetch_all(&state.db).await;

    match users {
        Ok(data) => (StatusCode::OK, Json(data)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json("Error")).into_response(),
    }
}

// --- HANDLERS: SETTINGS ---

// SỬA LỖI Ở ĐÂY: Thêm Deserialize để fix lỗi "trait bound not satisfied"
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SettingItem {
    pub id: String,
    pub value: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingReq {
    pub settings: Vec<SettingItem>,
}

async fn get_settings(State(state): State<AppState>, _: AdminUser) -> impl IntoResponse {
    let settings = sqlx
        ::query_as::<_, SettingItem>("SELECT * FROM settings")
        .fetch_all(&state.db).await;
    match settings {
        Ok(data) => (StatusCode::OK, Json(data)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json("Error")).into_response(),
    }
}

async fn update_settings(
    State(state): State<AppState>,
    _: AdminUser,
    Json(payload): Json<UpdateSettingReq>
) -> impl IntoResponse {
    let mut tx = state.db.begin().await.unwrap();

    for item in payload.settings {
        // Dùng ON DUPLICATE KEY UPDATE để vừa insert vừa update
        let _ = sqlx
            ::query(
                "INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?"
            )
            .bind(&item.id)
            .bind(&item.value)
            .bind(&item.value)
            .execute(&mut *tx).await;
    }

    if tx.commit().await.is_ok() {
        (StatusCode::OK, Json("Updated")).into_response()
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json("Error")).into_response()
    }
}

// --- HANDLERS: ANALYTICS ---

#[derive(Serialize)]
struct AnalyticsData {
    revenue_month: f64,
    new_orders: i64,
    new_users: i64,
    top_product: String,
}

async fn get_analytics(State(state): State<AppState>, _: AdminUser) -> impl IntoResponse {
    use rust_decimal::prelude::ToPrimitive;

    let revenue: (Option<Decimal>,) = sqlx
        ::query_as("SELECT SUM(final_amount) FROM orders")
        .fetch_one(&state.db).await
        .unwrap_or((None,));

    let orders_count: (i64,) = sqlx
        ::query_as("SELECT COUNT(*) FROM orders")
        .fetch_one(&state.db).await
        .unwrap_or((0,));

    let users_count: (i64,) = sqlx
        ::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db).await
        .unwrap_or((0,));

    let top_prod_result: Result<Option<(String,)>, _> = sqlx::query_as(
        "SELECT p.name 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status != 'cancelled' -- Chỉ tính các đơn chưa bị hủy
         GROUP BY p.id, p.name
         ORDER BY SUM(oi.quantity) DESC
         LIMIT 1"
    )
    .fetch_optional(&state.db)
    .await;

    let top_prod = match top_prod_result {
        Ok(Some((name,))) => name,
        Ok(None) => "Chưa có dữ liệu".to_string(),
        Err(e) => {
            println!("Lỗi tính top product: {:?}", e);
            "Lỗi".to_string()
        }
    };

    let data = AnalyticsData {
        revenue_month: revenue.0.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0),
        new_orders: orders_count.0,
        new_users: users_count.0,
        top_product: top_prod,
    };

    (StatusCode::OK, Json(data)).into_response()
}

// --- STRUCT CONTACT ---
#[derive(Debug, Serialize, FromRow)]
pub struct ContactItem {
    pub id: String,
    pub user_id: Option<String>,
    pub user_name: Option<String>, // Lấy tên nếu có tài khoản
    pub email: String,
    pub message: String,
    pub status: String,
    pub created_at: Option<chrono::NaiveDateTime>,
}

// --- HANDLERS CONTACT ---

// 1. Lấy danh sách liên hệ (Mới nhất lên đầu)
async fn get_all_contacts(State(state): State<AppState>, _: AdminUser) -> impl IntoResponse {
    let sql = "
        SELECT c.id, c.user_id, u.name as user_name, c.email, c.message, c.status, c.created_at 
        FROM contacts c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
    ";
    
    let contacts = sqlx::query_as::<_, ContactItem>(sql)
        .fetch_all(&state.db)
        .await;

    match contacts {
        Ok(data) => (StatusCode::OK, Json(data)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json("Error")).into_response(),
    }
}

// 2. Cập nhật trạng thái (Đã xử lý / Chưa xử lý)
async fn update_contact_status(
    State(state): State<AppState>,
    _: AdminUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateStatusReq> // Tái sử dụng struct UpdateStatusReq cũ
) -> impl IntoResponse {
    let res = sqlx::query("UPDATE contacts SET status = ? WHERE id = ?")
        .bind(payload.status)
        .bind(id)
        .execute(&state.db)
        .await;

    match res {
        Ok(_) => (StatusCode::OK, Json("Updated")).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json("Error")).into_response(),
    }
}

// --- ROUTER ---
pub fn admin_routes() -> Router<AppState> {
    Router::new()
        .route("/orders", get(get_all_orders))
        .route("/orders/:id/status", put(update_order_status))
        .route("/products", post(create_product))
        .route("/products/:id", put(update_product).delete(delete_product)) // Thêm route update
        .route("/users", get(get_all_users))
        .route("/settings", get(get_settings).post(update_settings))
        .route("/analytics", get(get_analytics))
        .route("/contacts", get(get_all_contacts))             // <-- Thêm
        .route("/contacts/:id/status", put(update_contact_status))
}
