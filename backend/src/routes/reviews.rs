use axum::{
    extract::{Path, State, Json},
    Router, routing::{get, post},
    http::StatusCode,
    response::IntoResponse,
};
use crate::AppState;
use crate::routes::auth::AuthUser; // Cần đăng nhập mới được review
use crate::utils::suid; // Hàm sinh ID
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// --- MODELS ---

#[derive(Debug, Serialize, FromRow)]
pub struct ReviewItem {
    pub id: String,
    pub user_name: String, // Join bảng users để lấy tên
    pub rating: i32,
    pub content: Option<String>,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Debug, Deserialize)]
pub struct CreateReviewReq {
    pub product_id: String,
    pub rating: i32,
    pub content: String,
}

// --- HANDLERS ---

// 1. Lấy danh sách đánh giá của 1 sản phẩm
async fn get_reviews(
    State(state): State<AppState>,
    Path(product_id): Path<String>
) -> impl IntoResponse {
    let sql = "
        SELECT r.id, u.name as user_name, r.rating, r.content, r.created_at
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
    ";

    let reviews = sqlx::query_as::<_, ReviewItem>(sql)
        .bind(product_id)
        .fetch_all(&state.db)
        .await;

    match reviews {
        Ok(data) => (StatusCode::OK, Json(data)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi lấy đánh giá")).into_response(),
    }
}

// 2. Gửi đánh giá mới
async fn create_review(
    State(state): State<AppState>,
    auth: AuthUser, // Bắt buộc đăng nhập
    Json(payload): Json<CreateReviewReq>
) -> impl IntoResponse {
    // 2.1 Validate
    if payload.rating < 1 || payload.rating > 5 {
        return (StatusCode::BAD_REQUEST, Json("Điểm đánh giá từ 1-5")).into_response();
    }

    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi transaction")).into_response(),
    };

    // 2.2 Insert Review
    let review_id = suid();
    let insert_res = sqlx::query(
        "INSERT INTO reviews (id, user_id, product_id, rating, content) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(review_id)
    .bind(auth.user_id)
    .bind(&payload.product_id)
    .bind(payload.rating)
    .bind(&payload.content)
    .execute(&mut *tx).await;

    if insert_res.is_err() {
        let _ = tx.rollback().await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi lưu đánh giá")).into_response();
    }

    // 2.3 Tính toán lại Rating trung bình và Count cho Product
    // Logic: Tính AVG và COUNT từ bảng reviews cho product_id này
    let stats: Option<(sqlx::types::Decimal, i64)> = sqlx::query_as(
        "SELECT AVG(rating), COUNT(*) FROM reviews WHERE product_id = ?"
    )
    .bind(&payload.product_id)
    .fetch_optional(&mut *tx).await.unwrap_or(None);

    if let Some((avg_rating, count)) = stats {
        // 2.4 Update bảng Products
        let update_res = sqlx::query(
            "UPDATE products SET rating = ?, review_count = ? WHERE id = ?"
        )
        .bind(avg_rating)
        .bind(count)
        .bind(&payload.product_id)
        .execute(&mut *tx).await;

        if update_res.is_err() {
            let _ = tx.rollback().await;
            return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi cập nhật sản phẩm")).into_response();
        }
    }

    // 2.5 Commit
    if tx.commit().await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi commit")).into_response();
    }

    (StatusCode::CREATED, Json("Đánh giá thành công")).into_response()
}

pub fn review_routes() -> Router<AppState> {
    Router::new()
        .route("/:product_id", get(get_reviews)) // GET /api/reviews/:product_id
        .route("/", post(create_review))         // POST /api/reviews
}