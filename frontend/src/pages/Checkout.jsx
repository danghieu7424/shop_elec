import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle } from "lucide-react";
import { useStore, actions } from "../store";
import { Button, Card } from "../components/UI";
import { formatCurrency, getVietQRUrl, LEVELS } from "../utils";

export default function Checkout() {
  const [state, dispatch] = useStore();
  const { userInfo, cart, domain } = state;
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  // QR Modal state
  const [orderSuccess, setOrderSuccess] = useState(null);

  // --- LOGIC AUTOFILL (Tự động điền) ---
  useEffect(() => {
    if (userInfo) {
      setForm((prev) => ({
        ...prev,
        // Ưu tiên lấy từ UserInfo (Database), nếu không có thì để trống
        name: userInfo.name || "",
        phone: userInfo.phone || "", // <-- Tự động điền SĐT
        address: userInfo.address || "", // <-- Tự động điền Địa chỉ
      }));
    }
  }, [userInfo]);

  const calculateTotal = () => {
    const subtotal = cart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
    let discountPercent = 0;
    const levelKey = userInfo?.level || "BRONZE";
    if (LEVELS[levelKey]) discountPercent = LEVELS[levelKey].discount;
    const discountAmount = subtotal * (discountPercent / 100);
    return { total: subtotal - discountAmount };
  };

  const handleSubmit = async () => {
    if (!userInfo) return alert("Cần đăng nhập");
    const { total } = calculateTotal();

    try {
      const res = await fetch(`${domain}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            product_id: i.id,
            quantity: i.quantity,
            price: i.price,
          })),
          shipping_info: form,
          final_amount: total,
        }),
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        // Xóa giỏ hàng
        dispatch(actions.clear_cart());

        // Refresh User Info (để cập nhật lại thông tin mới nếu user có sửa form)
        fetch(`${domain}/api/auth/me`, { credentials: "include" })
          .then((r) => r.json())
          .then((user) => dispatch(actions.set_user_info(user)));

        // Hiện Modal QR
        setOrderSuccess({
          id: data.order_id,
          amount: total,
          content: `Thanh toan don ${data.order_id}`,
        });
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
  };

  if (!userInfo)
    return <div className="text-center py-20">Vui lòng đăng nhập</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Thông tin giao hàng
        </h2>
        <div className="space-y-4">
          {/* Input Họ tên */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Họ tên người nhận
            </label>
            <input
              className="border w-full p-2.5 rounded focus:ring-2 ring-blue-500 outline-none"
              placeholder="Nhập họ tên"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Input Số điện thoại (Đã Autofill) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Số điện thoại
            </label>
            <input
              className="border w-full p-2.5 rounded focus:ring-2 ring-blue-500 outline-none"
              placeholder="Nhập số điện thoại"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {/* Input Địa chỉ (Đã Autofill) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Địa chỉ giao hàng
            </label>
            <textarea
              className="border w-full p-2.5 rounded focus:ring-2 ring-blue-500 outline-none"
              rows="3"
              placeholder="Nhập địa chỉ nhận hàng"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {/* Input Ghi chú */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Ghi chú thêm
            </label>
            <textarea
              className="border w-full p-2.5 rounded focus:ring-2 ring-blue-500 outline-none"
              placeholder="Ghi chú cho shipper (nếu có)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full py-3 mt-4 text-lg shadow-lg"
          >
            Xác nhận & Thanh toán
          </Button>
        </div>
      </Card>

      {/* MODAL QR CODE */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative">
            <div className="bg-green-600 p-4 text-white text-center">
              <CheckCircle size={48} className="mx-auto mb-2" />
              <h3 className="text-xl font-bold">Đặt hàng thành công!</h3>
              <p className="opacity-90">Mã đơn: #{orderSuccess.id}</p>
            </div>
            <div className="p-6 flex flex-col items-center">
              <p className="text-gray-600 mb-4 text-center text-sm">
                Quét mã bên dưới để thanh toán
              </p>
              <img
                src={getVietQRUrl(orderSuccess.amount, orderSuccess.content)}
                className="w-full h-auto border rounded-lg shadow-sm mb-4"
                alt="QR Code"
              />
              <div className="text-center mb-6">
                <div className="text-xs text-gray-500 uppercase">
                  Số tiền thanh toán
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(orderSuccess.amount)}
                </div>
              </div>
              <Button onClick={() => navigate("/profile")} className="w-full">
                Hoàn tất / Xem lịch sử
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
