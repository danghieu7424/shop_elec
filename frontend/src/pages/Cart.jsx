import React from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useStore, actions } from "../store";
import { Button } from "../components/UI";
import { formatCurrency, LEVELS } from "../utils";

export default function Cart() {
  const [state, dispatch] = useStore();
  const { cart, userInfo } = state;
  const navigate = useNavigate();

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
                  src={item.image || "https://placehold.co/100"}
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
                  <button
                    onClick={() =>
                      dispatch(
                        actions.update_cart_quantity({ id: item.id, delta: -1 })
                      )
                    }
                    className="p-1 bg-gray-100 rounded"
                  >
                    <Minus size={14} />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() =>
                      dispatch(
                        actions.update_cart_quantity({ id: item.id, delta: 1 })
                      )
                    }
                    className="p-1 bg-gray-100 rounded"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  onClick={() => dispatch(actions.remove_from_cart(item.id))}
                  className="text-red-500"
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
                <span>Giảm giá:</span>
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
