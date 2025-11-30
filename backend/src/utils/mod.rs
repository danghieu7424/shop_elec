// src/utils/mod.rs
pub mod suid;
pub mod email;
pub use self::suid::suid;
pub use self::email::send_order_completed_email;