use axum::{
    extract::Multipart,
    routing::post,
    Router,
    Json,
    http::StatusCode,
    response::IntoResponse,
};
use crate::AppState;
use std::path::Path;
use tokio::fs; // Dùng tokio fs cho async
use crate::utils::suid;

async fn upload_images(mut multipart: Multipart) -> impl IntoResponse {
    let mut uploaded_files = Vec::new();

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap().to_string();
        
        if name == "files" {
            let file_name = field.file_name().unwrap().to_string();
            let data = field.bytes().await.unwrap();

            // Tạo tên file unique
            let new_name = format!("{}_{}", suid(), file_name);
            let path = Path::new("storages").join(&new_name);

            // Lưu file
            if let Err(e) = fs::write(&path, data).await {
                println!("Lỗi lưu file: {:?}", e);
                continue;
            }

            // Trả về đường dẫn truy cập (Public URL)
            let public_url = format!("/storages/{}", new_name);
            uploaded_files.push(public_url);
        }
    }

    (StatusCode::OK, Json(uploaded_files)).into_response()
}

pub fn upload_routes() -> Router<AppState> {
    Router::new().route("/", post(upload_images))
}