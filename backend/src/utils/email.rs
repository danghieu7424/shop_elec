use lettre::{Message, SmtpTransport, Transport};
use lettre::transport::smtp::authentication::Credentials;
use std::env;

// SỬA: Đổi tham số thành String (bỏ dấu &)
pub fn send_order_completed_email(to_email: String, order_id: String, amount: String) {
    let gmail_user = env::var("GMAIL_USER").expect("Thiếu GMAIL_USER");
    let gmail_pass = env::var("GMAIL_PASS").expect("Thiếu GMAIL_PASS");

    // Clone dữ liệu để đưa vào thread (hoặc dùng trực tiếp vì String đã move được)
    let to_email_clone = to_email.clone(); 

    let subject = format!("Xác nhận hoàn thành đơn hàng #{}", order_id);
    let body = format!(
        "Xin chào,\n\n\
        Cảm ơn bạn đã mua sắm tại ElectroShop.\n\
        Đơn hàng #{} với giá trị {} đã được giao thành công.\n\
        Điểm thưởng đã được cộng vào tài khoản của bạn.\n\n\
        Trân trọng,\nElectroShop Team",
        order_id, amount
    );

    let email_builder = Message::builder()
        .from(gmail_user.parse().unwrap())
        .to(to_email.parse().unwrap()) // Parse từ String
        .subject(subject)
        .body(body)
        .unwrap();

    let creds = Credentials::new(gmail_user, gmail_pass);

    let mailer = SmtpTransport::relay("smtp.gmail.com")
        .unwrap()
        .credentials(creds)
        .build();

    // Spawn thread
    std::thread::spawn(move || {
        match mailer.send(&email_builder) {
            // SỬA: Dùng biến clone trong println!
            Ok(_) => println!("Email sent successfully to {}", to_email_clone),
            Err(e) => eprintln!("Could not send email: {:?}", e),
        }
    });
}