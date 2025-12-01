use axum::{
    extract::{State, Path, Json},
    Router, routing::{get, post, delete},
    http::StatusCode,
    response::IntoResponse,
};
use crate::AppState;
use crate::routes::auth::AuthUser;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use rust_decimal::Decimal;

// Struct trả về cho Frontend (giống cấu trúc Redux store)
#[derive(Debug, Serialize, FromRow)]
pub struct CartItemResponse {
    pub id: String,          // product_id
    pub name: String,
    pub price: Decimal,
    pub image: Option<String>, // Lấy ảnh đầu tiên hoặc ảnh đại diện
    pub quantity: i32,
}

// Struct nhận từ Frontend để update
#[derive(Debug, Deserialize)]
pub struct UpdateCartReq {
    pub product_id: String,
    pub quantity: i32,
}

// 1. Lấy giỏ hàng
async fn get_cart(State(state): State<AppState>, auth: AuthUser) -> impl IntoResponse {
    // Join bảng cart_items với products để lấy thông tin chi tiết
    let sql = "
        SELECT p.id, p.name, p.price, 
               -- Xử lý lấy ảnh: nếu là JSON array thì lấy phần tử đầu, nếu string thì lấy nguyên
               CASE 
                 WHEN JSON_VALID(p.images) THEN JSON_UNQUOTE(JSON_EXTRACT(p.images, '$[0]'))
                 ELSE p.images 
               END as image,
               c.quantity
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    ";

    let cart: Vec<CartItemResponse> = sqlx::query_as(sql)
        .bind(auth.user_id)
        .fetch_all(&state.db)
        .await
        .unwrap_or(vec![]);

    (StatusCode::OK, Json(cart)).into_response()
}

// 2. Thêm / Cập nhật giỏ hàng (Upsert)
async fn update_cart(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<UpdateCartReq>
) -> impl IntoResponse {
    if payload.quantity <= 0 {
        // Nếu số lượng <= 0 thì xóa luôn
        let _ = sqlx::query("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?")
            .bind(&auth.user_id).bind(&payload.product_id)
            .execute(&state.db).await;
    } else {
        // Nếu chưa có thì Insert, có rồi thì Update số lượng
        let _ = sqlx::query("
            INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = ?
        ")
        .bind(&auth.user_id).bind(&payload.product_id)
        .bind(payload.quantity).bind(payload.quantity)
        .execute(&state.db).await;
    }
    
    (StatusCode::OK, Json("Synced")).into_response()
}

// 3. Xóa sản phẩm
async fn remove_item(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(product_id): Path<String>
) -> impl IntoResponse {
    let _ = sqlx::query("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?")
        .bind(auth.user_id).bind(product_id)
        .execute(&state.db).await;
        
    (StatusCode::OK, Json("Deleted")).into_response()
}

pub fn cart_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_cart).post(update_cart))
        .route("/:id", delete(remove_item))
}