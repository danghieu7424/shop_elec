use axum::{
    extract::{Path, State, Query},
    Json, Router, routing::get,
    http::StatusCode,
    response::IntoResponse,
};
use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use rust_decimal::Decimal; 
use serde_json::Value; // Import Value để xử lý JSON

// --- STRUCTS ---

#[derive(Debug, Serialize, FromRow)]
pub struct Category {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct Product {
    pub id: String,
    pub category_id: String,
    pub name: String,
    pub price: Decimal,
    pub stock: i32,
    pub images: Option<sqlx::types::Json<Vec<String>>>,
    pub description: Option<String>,
    
    // --- CÁC TRƯỜNG MỚI THÊM ---
    // sqlx::types::Json giúp tự động parse cột JSON từ MySQL
    pub specs: Option<sqlx::types::Json<Value>>, 
    
    pub rating: Option<Decimal>,
    pub review_count: Option<i32>,
    
    pub created_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct ProductFilter {
    pub category_id: Option<String>,
    pub search: Option<String>,
}

// --- HANDLERS ---

async fn get_products(
    State(state): State<AppState>,
    Query(filter): Query<ProductFilter>
) -> impl IntoResponse {
    // SELECT * sẽ tự động lấy luôn các cột mới (specs, rating...)
    let mut sql = "SELECT * FROM products WHERE (is_deleted = FALSE OR is_deleted IS NULL)".to_string();
    
    if let Some(cat_id) = &filter.category_id {
        if cat_id != "all" {
            // Lưu ý: Trong dự án thực tế nên dùng bind() thay vì format string để tránh SQL Injection
            sql.push_str(&format!(" AND category_id = '{}'", cat_id)); 
        }
    }
    if let Some(search) = &filter.search {
        sql.push_str(&format!(" AND name LIKE '%{}%'", search));
    }

    let products = sqlx::query_as::<_, Product>(&sql)
        .fetch_all(&state.db)
        .await;

    match products {
        Ok(prods) => (StatusCode::OK, Json(prods)).into_response(),
        Err(e) => {
            println!("Error get_products: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi lấy sản phẩm")).into_response()
        },
    }
}

async fn get_product_detail(
    State(state): State<AppState>,
    Path(id): Path<String>
) -> impl IntoResponse {
    let product = sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await;

    match product {
        Ok(Some(p)) => (StatusCode::OK, Json(p)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json("Không tìm thấy sản phẩm")).into_response(),
        Err(e) => {
            println!("Error detail: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json("Lỗi DB")).into_response()
        },
    }
}

// --- ROUTER ---
pub fn product_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_products))
        .route("/:id", get(get_product_detail))
}