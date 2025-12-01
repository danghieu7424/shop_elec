pub mod auth;
pub mod upload;
pub mod categories;
pub mod products;
pub mod reviews;
pub mod orders;
pub mod cart;
pub mod admin; // Module dành riêng cho admin
// Re-export để dễ dùng nếu cần
pub use auth::AuthUser;