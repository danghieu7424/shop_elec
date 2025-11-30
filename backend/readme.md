# Dưới đây là danh sách các Mã ANSI (ANSI Escape Codes) phổ biến nhất mà bạn có thể dùng trong Rust (hoặc bất kỳ ngôn ngữ nào) để tô màu terminal.

Cú pháp chung là: `\x1b[MÃ_MÀUm`

1. Bảng màu cơ bản (Standard Colors)
# Bảng Mã Màu ANSI

| Tên màu        | Màu chữ (Foreground) | Màu nền (Background) |
|----------------|-----------------------|------------------------|
| Đen (Black)    | `\x1b[30m`            | `\x1b[40m`             |
| Đỏ (Red)       | `\x1b[31m`            | `\x1b[41m`             |
| Xanh lá (Green)| `\x1b[32m`            | `\x1b[42m`             |
| Vàng (Yellow)  | `\x1b[33m`            | `\x1b[43m`             |
| Xanh dương (Blue)| `\x1b[34m`          | `\x1b[44m`             |
| Tím (Magenta)  | `\x1b[35m`            | `\x1b[45m`             |
| Xanh lơ (Cyan) | `\x1b[36m`            | `\x1b[46m`             |
| Trắng (White)  | `\x1b[37m`            | `\x1b[47m`             |


# ⭐ Màu sáng (Bright, High Intensity)
| Tên màu                                  | Foreground | Background  |
| ---------------------------------------- | ---------- | ----------- |
| Xám đậm / Đen sáng (Bright Black / Gray) | `\x1b[90m` | `\x1b[100m` |
| Đỏ sáng (Bright Red)                     | `\x1b[91m` | `\x1b[101m` |
| Xanh lá sáng (Bright Green)              | `\x1b[92m` | `\x1b[102m` |
| Vàng sáng (Bright Yellow)                | `\x1b[93m` | `\x1b[103m` |
| Xanh dương sáng (Bright Blue)            | `\x1b[94m` | `\x1b[104m` |
| Tím sáng (Bright Magenta)                | `\x1b[95m` | `\x1b[105m` |
| Xanh lơ sáng (Bright Cyan)               | `\x1b[96m` | `\x1b[106m` |
| Trắng sáng (Bright White)                | `\x1b[97m` | `\x1b[107m` |

# ⭐ Định dạng chữ
| Tác dụng                | Mã        |
| ----------------------- | --------- |
| Reset                   | `\x1b[0m` |
| Bold (đậm)              | `\x1b[1m` |
| Dim (mờ)                | `\x1b[2m` |
| Italic                  | `\x1b[3m` |
| Underline               | `\x1b[4m` |
| Blink                   | `\x1b[5m` |
| Reverse (đảo màu FG/BG) | `\x1b[7m` |
| Hidden                  | `\x1b[8m` |

# ⭐ Mã mở rộng 256 màu
Foreground: `\x1b[38;5;{MÃ_MÀU}m`  
Background: `\x1b[48;5;{MÃ_MÀU}m`

2. Các mã định dạng khác
- Reset (Về mặc định): `\x1b[0m` (Rất quan trọng, luôn dùng cái này cuối câu)
- In đậm (Bold): `\x1b[1m`
- Gạch chân (Underline): `\x1b[4m`

3. Ví dụ Code Rust
Bạn có thể kết hợp chúng lại. Ví dụ: Chữ đỏ nền vàng.
```Rust
fn main() {
    // 31 = Chữ đỏ
    // 43 = Nền vàng
    // 0  = Reset
    println!("\x1b[31;43m Chữ Đỏ Nền Vàng \x1b[0m");
    
    println!("\x1b[36m Chữ Cyan \x1b[0m");
    
    println!("\x1b[1;32m Chữ Xanh lá In đậm \x1b[0m");
}
```

# Lệnh chạy PM2:
```Bash
# Giả sử bạn đang ở thư mục gốc dự án
# --name "lb-rust": Đặt tên cho process
# -- ./target/release/rust-load-balancer: Đường dẫn tới file chạy
pm2 start ./target/release/rust-load-balancer --name "lb-rust" --binary
```
- Tự động chạy khi khởi động lại Server (Startup):
```Bash
pm2 save
pm2 startup
# (Sau đó copy dòng lệnh mà pm2 gợi ý và chạy nó)
```

# pool sql
```Rust
use sqlx::{MySqlPool, Error};

// Ví dụ về một hàm thực hiện giao dịch chuyển tiền
async fn transfer_money(pool: &MySqlPool, account_a_id: i32, account_b_id: i32) -> Result<(), Error> {
    
    // Bắt đầu giao dịch: mượn một kết nối từ Pool
    let mut tx = pool.begin().await?; 
    
    // --- BƯỚC 1: Trừ tiền ---
    let result_a = sqlx::query("UPDATE accounts SET balance = balance - 100 WHERE id = ? AND balance >= 100")
        .bind(account_a_id)
        .execute(&mut tx) // Giao dịch chạy trên &mut tx
        .await?;

    if result_a.rows_affected() == 0 {
        // Nếu không có hàng nào bị ảnh hưởng (ví dụ: không đủ tiền), 
        // giao dịch sẽ bị Rollback khi tx bị hủy (drop)
        return Err(Error::RowNotFound); 
    }

    // --- BƯỚC 2: Cộng tiền ---
    sqlx::query("UPDATE accounts SET balance = balance + 100 WHERE id = ?")
        .bind(account_b_id)
        .execute(&mut tx) // Giao dịch chạy trên &mut tx
        .await?;
    
    // --- BƯỚC 3: Hoàn tất (Commit) ---
    tx.commit().await?;

    Ok(())
}
```
## Cài theo dõi file:
```Bash
cargo install cargo-watch
```
Chạy thường: `cargo watch -w src -x test -x "run"`
Chạy với hiệu năng cao: `cargo watch -w src -x test -x "run --release"`