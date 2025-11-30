/** @type {import('tailwindcss').Config} */
module.exports = {
  // Sửa lại dòng này thật kỹ
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Quét tất cả file trong thư mục src
    "./public/index.html"           // Quét cả file html gốc (nếu có viết class ở đó)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}