download libary:
```
npm i
```
---
run server:
```
npm start
```
---
| px | rem |
|----:|:-----|
| 1 | 0.0625 |
| 2 | 0.125 |
| 3 | 0.1875 |
| 4 | 0.25 |
| 5 | 0.3125 |
| 6 | 0.375 |
| 7 | 0.4375 |
| 8 | 0.5 |
| 9 | 0.5625 |
| 10 | 0.625 |
| 11 | 0.6875 |
| 12 | 0.75 |
| 13 | 0.8125 |
| 14 | 0.875 |
| 15 | 0.9375 |
| 16 | 1 |

## Lấy App password
### ⚙️ Bước 1: Bật xác minh 2 bước cho tài khoản Gmail
1. Vào [Google Security Settings](https://myaccount.google.com/security)
2. Bật Xác minh 2 bước (2-Step Verification).
### ⚙️ Bước 2: Tạo App Password
1. Sau khi bật xong, vào mục Mật khẩu ứng dụng (App passwords).
2. Tạo app mới, chọn loại “Mail” và thiết bị “Other (Custom)”, ví dụ: NodeMailer.
3. Google sẽ sinh ra một chuỗi 16 ký tự (ví dụ: abcd efgh ijkl mnop).
    
    → Đây là App Password, thay cho mật khẩu thật của bạn.

## GOOGLE_CLIENT_ID
```
#.env
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxx.apps.googleusercontent.com
```
👉 GOOGLE_CLIENT_ID lấy từ [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)

## Tạo mã jwt
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
