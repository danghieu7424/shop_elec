import React from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useStore, actions } from "../store";
import { Button } from "../components/UI";
import { formatCurrency, LEVELS } from "../utils";

export default function Cart() {
  const [state, dispatch] = useStore();
  const { cart, userInfo, domain } = state; // Lấy domain để gọi API
  const navigate = useNavigate();

  // --- HÀM MỚI: Cập nhật số lượng ---
  const handleUpdateQuantity = async (itemId, delta) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + delta;

    // 1. Cập nhật UI
    if (newQty > 0) {
      dispatch(actions.update_cart_quantity({ id: itemId, delta }));
    } else {
      // Nếu giảm về 0 thì hỏi xóa
      handleRemoveItem(itemId);
      return;
    }

    // 2. Cập nhật Database (nếu đã login)
    if (userInfo && newQty > 0) {
      try {
        await fetch(`${domain}/api/cart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: itemId, quantity: newQty }),
          credentials: "include",
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // --- HÀM MỚI: Xóa sản phẩm ---
  const handleRemoveItem = async (itemId) => {
    if (!window.confirm("Bạn muốn xóa sản phẩm này?")) return;

    // 1. Cập nhật UI
    dispatch(actions.remove_from_cart(itemId));

    // 2. Cập nhật Database
    if (userInfo) {
      try {
        await fetch(`${domain}/api/cart/${itemId}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
    let discountPercent = 0;
    const levelKey = userInfo?.level || "BRONZE";
    if (LEVELS[levelKey]) discountPercent = LEVELS[levelKey].discount;
    const discountAmount = subtotal * (discountPercent / 100);
    return {
      subtotal,
      discountPercent,
      discountAmount,
      total: subtotal - discountAmount,
    };
  };

  const { subtotal, discountAmount, total } = calculateTotal();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">Giỏ hàng</h2>
      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white border rounded">
          <p className="mb-4 text-gray-500">Giỏ hàng trống</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate("/products")}>Mua sắm ngay</Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 border rounded flex gap-4 items-center"
              >
                <img
                  src={
                    item.image
                      ? `${domain}${item.image}`
                      : "https://placehold.co/100"
                  }
                  className="w-16 h-16 object-contain bg-gray-100 rounded"
                  alt={item.name}
                />
                <div className="flex-1">
                  <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                  <div className="text-blue-600">
                    {formatCurrency(item.price)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* SỬA: Gọi hàm handleUpdateQuantity */}
                  <button
                    onClick={() => handleUpdateQuantity(item.id, -1)}
                    className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, 1)}
                    className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {/* SỬA: Gọi hàm handleRemoveItem */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 border rounded h-fit">
            <h3 className="font-bold mb-4">Thanh toán</h3>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Giảm giá ({userInfo?.level || "BRONZE"}):</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Tổng:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <Button onClick={() => navigate("/checkout")} className="w-full">
              Thanh toán
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
