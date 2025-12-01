use axum::{
    extract::{ State, Json, Path },
    Router,
    routing::{ post, get, put },
    http::StatusCode,
    response::IntoResponse,
};
use crate::AppState;
use crate::routes::auth::AuthUser;
use crate::utils::suid;
use serde::{ Deserialize, Serialize };
use sqlx::FromRow;
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use crate::utils::email::send_order_thank_you_email;

// --- STRUCTS ---
#[derive(Deserialize)]
pub struct OrderItemRequest {
    pub product_id: String,
    pub quantity: i32,
    pub price: Decimal,
}

#[derive(Deserialize)]
pub struct ShippingInfo {
    pub name: String,
    pub phone: String,
    pub address: String,
    pub note: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateOrderRequest {
    pub items: Vec<OrderItemRequest>,
    pub shipping_info: ShippingInfo,
}

#[derive(Serialize, FromRow)]
pub struct OrderHistory {
    pub id: String,
    pub final_amount: Decimal,
    pub status: String,
    pub points_earned: i32,
    pub created_at: Option<chrono::NaiveDateTime>,
}

// --- HANDLERS ---

async fn create_order(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateOrderRequest>
) -> impl IntoResponse {
    // Tính tổng tiền
    let mut total_amount = Decimal::new(0, 0);
    for item in &payload.items {
        total_amount += item.price * Decimal::from(item.quantity);
    }

    let discount_amount = Decimal::new(0, 0);
    let final_amount = total_amount - discount_amount;
    let points_earned = (final_amount.to_f64().unwrap_or(0.0) / 1000.0) as i32;

    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi transaction")).into_response();
        }
    };

    let order_id = suid();

    // 1. Insert Order
    let order_insert = sqlx
        ::query(
            "INSERT INTO orders (id, user_id, total_amount, discount_amount, final_amount, points_earned, shipping_name, shipping_phone, shipping_address, note) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&order_id)
        .bind(&auth.user_id)
        .bind(total_amount)
        .bind(discount_amount)
        .bind(final_amount)
        .bind(points_earned)
        .bind(&payload.shipping_info.name)
        .bind(&payload.shipping_info.phone)
        .bind(&payload.shipping_info.address)
        .bind(&payload.shipping_info.note)
        .execute(&mut *tx).await;

    if order_insert.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi tạo order")).into_response();
    }

    // 2. Insert Items & TRỪ TỒN KHO (STOCK)
    for item in payload.items {
        let item_id = suid();

        // 2a. Insert Order Item
        let item_insert = sqlx
            ::query(
                "INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(item_id)
            .bind(&order_id)
            .bind(&item.product_id)
            .bind(item.quantity)
            .bind(item.price)
            .execute(&mut *tx).await;

        if item_insert.is_err() {
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi thêm item")).into_response();
        }

        // 2b. Trừ Tồn Kho (QUAN TRỌNG)
        let stock_update = sqlx
            ::query("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
            .bind(item.quantity)
            .bind(&item.product_id)
            .bind(item.quantity)
            .execute(&mut *tx).await;

        match stock_update {
            Ok(res) => {
                if res.rows_affected() == 0 {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::BAD_REQUEST,
                        Json("Hết hàng hoặc không đủ số lượng"),
                    ).into_response();
                }
            }
            Err(_) => {
                let _ = tx.rollback().await;
                return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi trừ tồn kho")).into_response();
            }
        }
    }

    // 3. Lưu thông tin liên hệ mới nhất (CHƯA CỘNG ĐIỂM)
    let user_update = sqlx
        ::query("UPDATE users SET phone = ?, address = ? WHERE id = ?")
        .bind(&payload.shipping_info.phone)
        .bind(&payload.shipping_info.address)
        .bind(&auth.user_id)
        .execute(&mut *tx).await;

    if user_update.is_err() {
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi cập nhật user")).into_response();
    }

    // 4. Commit
    match tx.commit().await {
        Ok(_) =>
            (
                StatusCode::CREATED,
                Json(
                    serde_json::json!({
            "message": "Đặt hàng thành công",
            "order_id": order_id,
            "points_earned": points_earned,
            "final_amount": final_amount
        })
                ),
            ).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi commit")).into_response(),
    }
}

async fn get_my_orders(State(state): State<AppState>, auth: AuthUser) -> impl IntoResponse {
    let orders = sqlx
        ::query_as::<_, OrderHistory>(
            "SELECT id, final_amount, status, points_earned, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC"
        )
        .bind(auth.user_id)
        .fetch_all(&state.db).await;

    match orders {
        Ok(list) => (StatusCode::OK, Json(list)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi lấy lịch sử")).into_response(),
    }
}

// --- HANDLER: Khách xác nhận đã nhận hàng ---
async fn confirm_receipt(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>
) -> impl IntoResponse {
    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json("Transaction Error")).into_response();
        }
    };

    // 1. Kiểm tra đơn hàng
    let order_info: Option<(String, Decimal, i32, String)> = sqlx
        ::query_as(
            "SELECT o.status, o.final_amount, o.points_earned, u.email 
         FROM orders o 
         JOIN users u ON o.user_id = u.id 
         WHERE o.id = ? AND o.user_id = ?"
        )
        .bind(&id)
        .bind(&auth.user_id)
        .fetch_optional(&mut *tx).await
        .unwrap_or(None);

    if let Some((status, _amount, points, email)) = order_info {
        if status == "shipping" {
            // 2. Cập nhật trạng thái -> Completed
            let _ = sqlx
                ::query("UPDATE orders SET status = 'completed' WHERE id = ?")
                .bind(&id)
                .execute(&mut *tx).await;

            // 3. CỘNG ĐIỂM THƯỞNG (Bây giờ mới cộng)
            let _ = sqlx
                ::query("UPDATE users SET points = points + ? WHERE id = ?")
                .bind(points)
                .bind(&auth.user_id)
                .execute(&mut *tx).await;

            // 3.1 --- THÊM ĐOẠN NÀY: CẬP NHẬT LEVEL TỰ ĐỘNG ---
            // Logic: Diamond(10000), Gold(5000), Silver(1000), Bronze(<1000)
           // 1. Lấy các mốc điểm từ bảng settings
            // Chúng ta lấy 3 dòng cấu hình cùng lúc
            let settings_rows: Vec<(String, Option<String>)> = sqlx::query_as(
                "SELECT id, value FROM settings WHERE id IN ('level_silver', 'level_gold', 'level_diamond')"
            )
            .fetch_all(&mut *tx)
            .await
            .unwrap_or(vec![]);

            // 2. Đặt giá trị mặc định (đề phòng chưa config trong DB)
            let mut s_silver = 1000;
            let mut s_gold = 5000;
            let mut s_diamond = 10000;

            // 3. Parse dữ liệu từ DB vào biến
            for (id, value_opt) in settings_rows {
                if let Some(val_str) = value_opt {
                    if let Ok(val_int) = val_str.parse::<i32>() {
                        match id.as_str() {
                            "level_silver" => s_silver = val_int,
                            "level_gold" => s_gold = val_int,
                            "level_diamond" => s_diamond = val_int,
                            _ => {}
                        }
                    }
                }
            }

            // 4. Cập nhật Level User với các biến động
            // Lưu ý thứ tự bind: Diamond -> Gold -> Silver -> UserID
            let _ = sqlx::query(r#"
                UPDATE users 
                SET level = CASE 
                    WHEN points >= ? THEN 'DIAMOND'
                    WHEN points >= ? THEN 'GOLD'
                    WHEN points >= ? THEN 'SILVER'
                    ELSE 'BRONZE'
                END
                WHERE id = ?
            "#)
            .bind(s_diamond)  // Bind vào dấu ? thứ 1
            .bind(s_gold)     // Bind vào dấu ? thứ 2
            .bind(s_silver)   // Bind vào dấu ? thứ 3
            .bind(&auth.user_id) // Bind vào dấu ? thứ 4 (WHERE id)
            .execute(&mut *tx).await;

            // ------------------------------------------------

            // 4. Commit & Gửi Mail Cảm Ơn
            if tx.commit().await.is_ok() {
                send_order_thank_you_email(email, id, points);
                return (StatusCode::OK, Json("Đã xác nhận nhận hàng")).into_response();
            }
        } else {
            return (
                StatusCode::BAD_REQUEST,
                Json("Trạng thái đơn hàng không hợp lệ"),
            ).into_response();
        }
    }

    (StatusCode::NOT_FOUND, Json("Không tìm thấy đơn hàng")).into_response()
}

pub fn order_routes() -> Router<AppState> {
    Router::new()
        .route("/", post(create_order))
        .route("/my", get(get_my_orders))
        .route("/:id/receive", put(confirm_receipt))
}
