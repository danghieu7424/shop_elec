import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { useStore, actions } from "../store";
import { Button, Card } from "../components/UI";
import { formatCurrency } from "../utils";

export default function ProductList() {
  const [state, dispatch] = useStore();
  const { products, categories, domain } = state;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const filterCat = searchParams.get("cat") || "all";
  const [search, setSearch] = useState("");

  // --- SỬA ĐOẠN NÀY ---
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Tải danh sách sản phẩm
        const prodRes = await fetch(`${domain}/api/products`);
        if (prodRes.ok) dispatch(actions.set_products(await prodRes.json()));

        // 2. Tải danh mục (BỊ THIẾU TRƯỚC ĐÓ)
        const catRes = await fetch(`${domain}/api/categories`);
        if (catRes.ok) dispatch(actions.set_categories(await catRes.json()));
      } catch (e) {
        console.error("Lỗi tải dữ liệu:", e);
      }
    };
    loadData();
  }, [domain, dispatch]);
  // --------------------

  const filtered = products.filter(
    (p) =>
      (filterCat === "all" || p.category_id === filterCat) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Nếu API chưa kịp tải hoặc lỗi, dùng danh mục dự phòng để không bị trống giao diện
  const displayCategories =
    categories.length > 0
      ? categories
      : [
          //   { id: 'ic', name: 'Mạch tích hợp (IC)' },
          //   { id: 'module', name: 'Module - Cảm biến' },
          //   { id: 'tools', name: 'Dụng cụ sửa chữa' },
          //   { id: 'passive', name: 'Linh kiện thụ động' }
        ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-bold mb-4">Danh mục</h3>

            {/* Nút Tất cả */}
            <div
              onClick={() => setSearchParams({ cat: "all" })}
              className={`cursor-pointer p-2 rounded ${
                filterCat === "all"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "hover:bg-gray-50"
              }`}
            >
              Tất cả
            </div>

            {/* Danh sách danh mục */}
            {displayCategories.map((c) => (
              <div
                key={c.id}
                onClick={() => setSearchParams({ cat: c.id })}
                className={`cursor-pointer p-2 rounded ${
                  filterCat === c.id
                    ? "bg-blue-50 text-blue-600 font-bold"
                    : "hover:bg-gray-50"
                }`}
              >
                {c.name}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 ring-blue-500 outline-none"
                placeholder="Tìm sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Không tìm thấy sản phẩm nào.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <Card
                  key={p.id}
                  className="flex flex-col h-full hover:shadow-lg transition-shadow"
                >
                  <div
                    className="h-48 bg-gray-100 relative cursor-pointer"
                    onClick={() => navigate(`/product/${p.id}`)}
                  >
                    <img
                      src={
                        p.images?.[0]
                          ? `${domain}${p.images[0]}`
                          : "https://placehold.co/50"
                      }
                      className="w-full h-full object-contain mix-blend-multiply"
                      alt={p.name}
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {displayCategories.find((c) => c.id === p.category_id)
                        ?.name || p.category_id}
                    </div>
                    <h3
                      className="font-bold mb-2 line-clamp-2 hover:text-blue-600 cursor-pointer"
                      onClick={() => navigate(`/product/${p.id}`)}
                    >
                      {p.name}
                    </h3>
                    <div className="mt-auto flex justify-between items-center">
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(p.price)}
                      </span>
                      <Button
                        onClick={() => dispatch(actions.add_to_cart(p))}
                        className="!p-2 rounded-full w-10 h-10 flex items-center justify-center"
                      >
                        <Plus size={20} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
