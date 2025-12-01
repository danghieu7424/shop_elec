use axum::{
    extract::Request, // Chỉ cần Request cho middleware
    middleware::{ self, Next },
    response::{ Html, Response },
    routing::Router,
    http::{Method, HeaderValue, header},
};
use tower_http::{ cors::CorsLayer, services::{ ServeDir, ServeFile } };
use sqlx::{ mysql::MySqlPoolOptions, MySqlPool }; // Giữ lại MySqlPoolOptions và MySqlPool
use dotenvy::dotenv;
// use axum::routing::{get}; // Chỉ cần get cho api_handler
use std::io::{ self, Write };
use chrono::Local;
use regex::Regex;
use std::fs;
use std::path::Path;

// 1. Khai báo và Import Module Route
mod utils;
mod routes;
// use routes::{ auth, user };
use routes::{ auth, categories, products, orders, admin, reviews, upload, cart, contact };

// 2. Phục hồi AppState (AppState cần pub để được dùng trong module user)
#[derive(Clone)]
pub struct AppState {
    pub db: MySqlPool,
}

// Lưu ý: User struct đã được chuyển sang src/routes/user.rs để giữ main.rs gọn gàng.
fn visible_len(s: &str) -> usize {
    // Regex bỏ các đoạn \x1b[...m
    let re = Regex::new(r"\x1b\[[0-9;]*m").unwrap();
    let clean = re.replace_all(s, "");
    clean.len()
}

fn redraw(logs: &Vec<String>) {
    // Xóa màn hình và đặt con trỏ về góc trên bên trái
    // print!("\x1b[2J\x1b[H");
    io::stdout().flush().unwrap();

    // Tính độ dài lớn nhất của toàn bộ log (sau khi bỏ ANSI)
    let max_len = logs
        .iter()
        .map(|s| {
            let time = Local::now().format("%H:%M:%S%.3f").to_string();
            visible_len(&format!("[{}] {}", time, s))
        })
        .max()
        .unwrap_or(0);

    let width = max_len + 2; // thêm padding

    // Vẽ khung trên
    println!("┌{}┐", "─".repeat(width));

    // In từng dòng log trong khung
    for entry in logs {
        let time = Local::now().format("%H:%M:%S%.3f").to_string();
        let content = format!("\x1b[90m[{}]\x1b[0m {}", time, entry);

        let visible = visible_len(&format!("[{}] {}", time, entry));
        let padding = if max_len > visible { max_len - visible } else { 0 };

        println!("│ {}{} │", content, " ".repeat(padding));
    }

    // Vẽ khung dưới
    println!("└{}┘", "─".repeat(width));
}
// 3. Phục hồi Middleware
async fn my_logging_middleware(req: Request, next: Next) -> Response {
    let mut logs = Vec::new();
    let method = req.method().clone();
    let uri = req.uri().clone();
    //\x1b[90mĐã nhận Request:
    logs.push(format!("\x1b[1;32m==> \x1b[1;93m{}\x1b[0m {}", method, uri));

    let response = next.run(req).await;
    let status = response.status();

    let status_color = match status.as_u16() {
        200..=299 => "\x1b[1;32m", // xanh lá cho thành công
        300..=399 => "\x1b[1;36m", // xanh dương nhạt cho redirect
        400..=499 => "\x1b[1;93m", // vàng cho lỗi client
        500..=599 => "\x1b[1;91m", // đỏ cho lỗi server
        _ => "\x1b[0m", // mặc định
    };

    // \x1b[90mĐã gửi Response:
    logs.push(
        format!(
            "\x1b[1;34m<== \x1b[0m({}{}{}) {}",
            status_color,
            status,
            "\x1b[0m",
            uri
        )
    );
    redraw(&logs);
    response
}

// ==- KHẮC PHỤC LỖI E0601: MAIN FUNCTION NOT FOUND ==-
#[tokio::main]
async fn main() {
    dotenv().ok();
    print!("\x1b[2J\x1b[H");
    let port: u16 = std::env
        ::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3000);
    let database_url = std::env::var("DATABASE_URL").expect("Chưa set DATABASE_URL trong .env");

    // Khắc phục lỗi DB connect (thêm .connect)
    let pool = MySqlPoolOptions::new()
        .max_connections(5)
        .connect(&database_url).await
        .expect("\x1b[31mKhông thể kết nối đến MySQL\x1b[0m");
    println!("✅ \x1b[32mĐã kết nối MySQL thành công!\x1b[0m");

    let state = AppState { db: pool };

    // Cấu hình CORS (Đã sửa lỗi allow_any_origin)
    // main.rs
   let frontend_url = "http://localhost:8080"; 

    let cors_layer = CorsLayer::new()
        .allow_origin(frontend_url.parse::<HeaderValue>().unwrap()) 
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_credentials(true);
    //     .allow_origin(tower_http::cors::Any)
    //     .allow_methods(tower_http::cors::Any)
    //     .allow_headers(tower_http::cors::Any);

    // Kiểm tra folder storages nếu chưa có thì tạo
    if !Path::new("storages").exists() {
        fs::create_dir_all("storages").expect("Không tạo được folder storages");
        println!("Đã tạo thư mục storages");
    }

    let spa_service = ServeDir::new("public").fallback(ServeFile::new("public/index.html"));
    let spa_storages = ServeDir::new("storages");

    let app = Router::new()
        // Auth
        .nest("/api/auth", auth::auth_routes())
        // Categories
        .nest("/api/categories", categories::category_routes())
        // Products
        .nest("/api/products", products::product_routes())
        .nest("/api/reviews", reviews::review_routes())
        // Orders
        .nest("/api/orders", orders::order_routes())
        // Admin
        .nest("/api/admin", admin::admin_routes())
        .nest("/api/upload", upload::upload_routes())
        .nest("/api/cart", cart::cart_routes())
        .nest("/api/contact", contact::contact_routes())

        // Các route còn lại trong main

        .nest_service("/storages", spa_storages)

        .fallback_service(spa_service)

        // Áp dụng Middleware và CORS
        .layer(middleware::from_fn(my_logging_middleware))
        .layer(cors_layer)
        .with_state(state);

    let addr_str = format!("localhost:{}", port);
    println!("🚀 \x1b[34mServer đang lắng nghe trên http://{}\x1b[0m", addr_str);

    let listener = tokio::net::TcpListener::bind(&addr_str).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
