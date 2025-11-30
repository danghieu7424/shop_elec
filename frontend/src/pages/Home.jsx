import React from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, Package, Wrench, Settings } from "lucide-react"; 
import { useStore } from "../store"; // Tạm thời không dùng store để tránh lỗi dữ liệu rỗng
import { Button } from "../components/UI";

export default function Home() {
  const [state] = useStore();
  const { categories } = state; // Bỏ dòng này vì database đang rỗng
  const navigate = useNavigate();

  // --- DỮ LIỆU CỨNG (Để đảm bảo luôn hiện ra) ---
//   const categories = [
//     { id: "ic", name: "Mạch tích hợp (IC)" },
//     { id: "module", name: "Module - Cảm biến" },
//     { id: "tools", name: "Dụng cụ sửa chữa" },
//     { id: "passive", name: "Linh kiện thụ động" },
//   ];

  // Hàm helper để chọn icon đúng theo id danh mục
  const renderCategoryIcon = (id) => {
    switch (id) {
      case "ic":
        return <Cpu size={32} />;
      case "module":
        return <Package size={32} />;
      case "tools":
        return <Wrench size={32} />;
      case "passive":
        return <Settings size={32} />;
      default:
        return <Package size={32} />;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-600 text-white py-16 px-4 rounded-b-[0px] shadow-xl">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Linh Kiện Điện Tử Chất Lượng Cao
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8">
            Cung cấp IC, Cảm biến, Module và dụng cụ sửa chữa chính hãng.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => navigate("/products")}
            //   className="bg-white !text-blue-900 hover:bg-blue-50 px-8 py-3 text-lg shadow-lg"
            >
              Mua sắm ngay
            </Button>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="container mx-auto px-4">
        {/* Tiêu đề có vạch xanh trang trí */}
        <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-8 bg-blue-600 rounded-sm"></div>
            <h2 className="text-2xl font-bold text-gray-800">Danh mục nổi bật</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/products?cat=${cat.id}`)}
              className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md cursor-pointer flex flex-col items-center gap-3 transition-transform hover:-translate-y-1"
            >
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                {renderCategoryIcon(cat.id)}
              </div>
              <span className="font-semibold text-gray-700">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}