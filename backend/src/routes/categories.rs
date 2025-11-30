use axum::{
    extract::State,
    Json,
    routing::get,
    Router,
};
use serde::Serialize;
use sqlx::FromRow;
use crate::AppState;

#[derive(Debug, Serialize, FromRow)]
pub struct Category {
    pub id: String,
    pub name: String,
}

async fn get_categories(State(state): State<AppState>) -> Json<Vec<Category>> {
    let categories = sqlx::query_as::<_, Category>("SELECT id, name FROM categories")
        .fetch_all(&state.db)
        .await
        .unwrap_or(vec![]);

    Json(categories)
}

pub fn category_routes() -> Router<AppState> {
    Router::new().route("/", get(get_categories))
}