export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const LEVELS = {
  BRONZE: { name: 'Đồng', min: 0, discount: 0, color: 'text-orange-700', bg: 'bg-orange-100' },
  SILVER: { name: 'Bạc', min: 1000, discount: 2, color: 'text-gray-400', bg: 'bg-gray-100' },
  GOLD: { name: 'Vàng', min: 5000, discount: 5, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  DIAMOND: { name: 'Kim Cương', min: 10000, discount: 10, color: 'text-blue-400', bg: 'bg-blue-100' }
};

export const BANK_INFO = {
    BANK_ID: "MB", // Ví dụ: MB, VCB, TECHCOMBANK... (Mã ngân hàng theo VietQR)
    ACCOUNT_NO: "0325692240", // Số tài khoản của bạn
    ACCOUNT_NAME: "DANG VAN HIEU", // Tên chủ tài khoản
    TEMPLATE: "compact" // compact, print, qr_only
};

export const getVietQRUrl = (amount, content) => {
    return `https://img.vietqr.io/image/${BANK_INFO.BANK_ID}-${BANK_INFO.ACCOUNT_NO}-${BANK_INFO.TEMPLATE}.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(BANK_INFO.ACCOUNT_NAME)}`;
};