import React, { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Star,
  BarChart2,
  Settings,
  Plus,
  Trash2,
  Save,
  X,
  Menu,
  UploadCloud,
  ChevronRight,
  Edit,
  Search,
  MessageSquare,
  Mail,
} from "lucide-react";
import { useStore } from "../store";
import { Button, Card, Badge } from "../components/UI";
import { formatCurrency } from "../utils";

// --- 1. COMPONENT UPLOAD ẢNH ---
const ImageUploader = ({ images = [], onImagesChange, domain }) => {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      const formData = new FormData();
      acceptedFiles.forEach((file) => formData.append("files", file));

      try {
        const res = await fetch(`${domain}/api/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const newLinks = await res.json();
          onImagesChange([...images, ...newLinks]);
        } else {
          alert("Upload thất bại");
        }
      } catch (e) {
        console.error(e);
      }
      setUploading(false);
    },
    [images, domain, onImagesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  const removeImage = (index) => {
    const newImgs = images.filter((_, i) => i !== index);
    onImagesChange(newImgs);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        Hình ảnh sản phẩm
      </label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <UploadCloud size={32} className="text-blue-500" />
          {uploading ? (
            <span className="animate-pulse">Đang tải lên...</span>
          ) : (
            <span className="text-sm">Kéo thả hoặc nhấn để chọn ảnh</span>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mt-3">
          {images.map((link, idx) => (
            <div
              key={idx}
              className="relative group aspect-square border rounded-lg overflow-hidden bg-gray-100"
            >
              <img
                src={`${domain}${link}`}
                className="w-full h-full object-cover"
                alt="preview"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(idx);
                }}
                className="absolute top-1 right-1 bg-white/90 text-red-600 p-1 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-sm"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- 2. COMPONENT ADMIN CHÍNH ---
export default function Admin() {
  const [state] = useStore();
  const { userInfo, domain, categories } = state;
  const [activeTab, setActiveTab] = useState("products");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);

  // Data States
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [analytics, setAnalytics] = useState(null);

  // Product Form State
  const [isEditingProd, setIsEditingProd] = useState(false);
  const [prodForm, setProdForm] = useState({
    id: "",
    category_id: "ic",
    name: "",
    price: 0,
    stock: 0,
    images: [],
    description: "",
    specs: [],
  });

  useEffect(() => {
    if (userInfo?.role === "admin") fetchData(activeTab);
  }, [activeTab, userInfo, domain]);

  // --- FETCH DATA LOGIC ---
  const fetchData = async (tab) => {
    setLoading(true);
    try {
      const opts = { credentials: "include" };
      if (tab === "products") {
        const res = await fetch(`${domain}/api/products`);
        if (res.ok) setProducts(await res.json());
      } else if (tab === "orders") {
        const res = await fetch(`${domain}/api/admin/orders`, opts);
        if (res.ok) setOrders(await res.json());
      } else if (tab === "users") {
        const res = await fetch(`${domain}/api/admin/users`, opts);
        if (res.ok) setUsers(await res.json());
      } else if (tab === "settings" || tab === "loyalty") {
        // Settings dùng chung endpoint
        const res = await fetch(`${domain}/api/admin/settings`, opts);
        if (res.ok) {
          const data = await res.json(); // Trả về mảng [{id, value}]
          // Convert sang Object {id: value} để dễ binding
          const setObj = data.reduce(
            (acc, curr) => ({ ...acc, [curr.id]: curr.value }),
            {}
          );
          setSettings(setObj);
        }
      } else if (tab === "analytics") {
        const res = await fetch(`${domain}/api/admin/analytics`, opts);
        if (res.ok) setAnalytics(await res.json());
      } else if (tab === "contacts") {
        const res = await fetch(`${domain}/api/admin/contacts`, opts);
        if (res.ok) setContacts(await res.json());
      }
    } catch (e) {
      console.error("Fetch Error:", e);
    }
    setLoading(false);
  };

  if (userInfo?.role !== "admin")
    return (
      <div className="h-screen flex items-center justify-center text-red-500 font-bold text-xl">
        ⛔ Truy cập bị từ chối.
      </div>
    );

  const updateContactStatus = async (id, newStatus) => {
    await fetch(`${domain}/api/admin/contacts/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
      credentials: "include",
    });
    fetchData("contacts");
  };

  const handleReplyMail = (email) => {
    // Mở trình duyệt mail mặc định
    // console.log("Replying to:", email);
    window.location.href = `mailto:${email}?subject=Phản hồi từ ElectroShop`;
  };

  // --- HELPERS ---
  const handleSpecChange = (index, field, value) => {
    const newSpecs = [...prodForm.specs];
    newSpecs[index][field] = value;
    setProdForm({ ...prodForm, specs: newSpecs });
  };
  const addSpec = () =>
    setProdForm({
      ...prodForm,
      specs: [...prodForm.specs, { key: "", value: "" }],
    });
  const removeSpec = (index) =>
    setProdForm({
      ...prodForm,
      specs: prodForm.specs.filter((_, i) => i !== index),
    });

  const openEditProduct = (prod = null) => {
    if (prod) {
      const specsArray = prod.specs
        ? Object.entries(prod.specs).map(([key, value]) => ({ key, value }))
        : [];
      let imgList = Array.isArray(prod.images)
        ? prod.images
        : prod.image
        ? [prod.image]
        : [];
      setProdForm({ ...prod, specs: specsArray, images: imgList });
    } else {
      setProdForm({
        id: "",
        category_id: "ic",
        name: "",
        price: 0,
        stock: 0,
        images: [],
        description: "",
        specs: [],
      });
    }
    setIsEditingProd(true);
  };

  // --- API CALLS ---
  // src/pages/Admin.jsx

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không?"))
      return;

    try {
      const res = await fetch(`${domain}/api/admin/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        alert("Đã xóa thành công!");
        fetchData("products"); // Tải lại danh sách
      } else {
        alert("Lỗi khi xóa sản phẩm");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối");
    }
  };

  const saveProduct = async () => {
    // 1. Convert mảng specs thành object
    const specsObject = prodForm.specs.reduce((acc, curr) => {
      if (curr.key) acc[curr.key] = curr.value;
      return acc;
    }, {});

    // 2. CHUẨN HÓA DỮ LIỆU (QUAN TRỌNG)
    // React input trả về string, cần ép về số để Rust không báo lỗi 422
    const payload = {
      category_id: prodForm.category_id,
      name: prodForm.name,
      description: prodForm.description,
      images: prodForm.images,

      // Ép kiểu số
      price: Number(prodForm.price) || 0,
      stock: Number(prodForm.stock) || 0,

      specs: specsObject,
    };

    // 3. Xác định Method và URL
    const isEditing = !!prodForm.id;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `${domain}/api/admin/products/${prodForm.id}`
      : `${domain}/api/admin/products`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // Gửi payload đã chuẩn hóa
        credentials: "include",
      });

      if (res.ok) {
        alert(isEditing ? "Cập nhật thành công!" : "Thêm mới thành công!");
        setIsEditingProd(false);
        fetchData("products");
      } else {
        // In ra lỗi cụ thể nếu backend trả về
        const errText = await res.text();
        console.error("Lỗi server:", errText);
        alert("Lỗi khi lưu sản phẩm: " + res.status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async (newSettingsObj) => {
    // Convert Object -> Array [{id, value}] để gửi lên Server
    const settingsArray = Object.entries(newSettingsObj).map(([id, value]) => ({
      id,
      value,
    }));
    try {
      await fetch(`${domain}/api/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsArray }),
        credentials: "include",
      });
      alert("Cập nhật cấu hình thành công!");
    } catch (e) {
      alert("Lỗi cập nhật");
    }
  };

  const updateOrderStatus = async (id, status) => {
    await fetch(`${domain}/api/admin/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
      credentials: "include",
    });
    fetchData("orders");
  };

  // --- RENDER CONTENT ---
  const renderContent = () => {
    if (loading)
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin text-blue-600 text-3xl">⚙️</div>
        </div>
      );

    switch (activeTab) {
      case "products":
        if (isEditingProd)
          return (
            <div className="max-w-5xl mx-auto animate-fade-in">
              <div
                className="flex items-center gap-2 mb-4 text-gray-500 cursor-pointer hover:text-blue-600"
                onClick={() => setIsEditingProd(false)}
              >
                <ChevronRight className="rotate-180" size={20} /> Quay lại
              </div>
              <Card className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                  <h2 className="text-xl font-bold">
                    {prodForm.id ? "Sửa sản phẩm" : "Thêm mới"}
                  </h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-5">
                    <div>
                      <label className="label">Tên sản phẩm</label>
                      <input
                        className="input"
                        value={prodForm.name}
                        onChange={(e) =>
                          setProdForm({ ...prodForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Danh mục</label>
                        <select
                          className="input"
                          value={prodForm.category_id}
                          onChange={(e) =>
                            setProdForm({
                              ...prodForm,
                              category_id: e.target.value,
                            })
                          }
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Giá (VND)</label>
                        <input
                          type="number"
                          className="input"
                          value={prodForm.price}
                          onChange={(e) =>
                            setProdForm({ ...prodForm, price: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Tồn kho</label>
                        <input
                          type="number"
                          className="input"
                          value={prodForm.stock}
                          onChange={(e) =>
                            setProdForm({ ...prodForm, stock: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Mô tả</label>
                      <textarea
                        rows="4"
                        className="input"
                        value={prodForm.description}
                        onChange={(e) =>
                          setProdForm({
                            ...prodForm,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <ImageUploader
                      images={prodForm.images}
                      domain={domain}
                      onImagesChange={(imgs) =>
                        setProdForm({ ...prodForm, images: imgs })
                      }
                    />
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border h-fit">
                    <div className="flex justify-between items-center mb-3">
                      <label className="font-bold">Thông số</label>
                      <button
                        onClick={addSpec}
                        className="text-blue-600 text-sm font-bold flex items-center hover:underline"
                      >
                        <Plus size={14} /> Thêm
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {prodForm.specs.map((s, i) => (
                        <div
                          key={i}
                          className="flex gap-2 items-center bg-white p-2 rounded border"
                        >
                          <input
                            className="w-full text-xs font-bold border-b outline-none"
                            placeholder="Tên"
                            value={s.key}
                            onChange={(e) =>
                              handleSpecChange(i, "key", e.target.value)
                            }
                          />
                          <input
                            className="w-full text-sm outline-none"
                            placeholder="Giá trị"
                            value={s.value}
                            onChange={(e) =>
                              handleSpecChange(i, "value", e.target.value)
                            }
                          />
                          <button
                            onClick={() => removeSpec(i)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditingProd(false)}
                  >
                    Hủy
                  </Button>
                  <Button onClick={saveProduct}>
                    <Save size={16} className="mr-2" /> Lưu lại
                  </Button>
                </div>
              </Card>
            </div>
          );
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sản phẩm</h2>
              <Button onClick={() => openEditProduct(null)}>
                <Plus size={18} /> Thêm mới
              </Button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase font-semibold hidden md:table-header-group">
                  <tr>
                    <th className="p-4">Sản phẩm</th>
                    <th className="p-4">Danh mục</th>
                    <th className="p-4">Giá</th>
                    <th className="p-4 text-center">Kho</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="group hover:bg-blue-50/50 flex flex-col md:table-row"
                    >
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={
                            p.images?.[0]
                              ? `${domain}${p.images[0]}`
                              : "https://placehold.co/50"
                          }
                          className="w-12 h-12 rounded border object-cover bg-gray-100"
                        />
                        <span className="font-bold text-gray-800">
                          {p.name}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 hidden md:table-cell">
                        {categories.find((c) => c.id === p.category_id)?.name}
                      </td>
                      <td className="p-4 font-bold text-blue-600 hidden md:table-cell">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="p-4 text-center hidden md:table-cell">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            p.stock > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-4 text-right md:table-cell border-t md:border-0 flex justify-between items-center">
                        {/* Mobile Info */}
                        <div className="md:hidden text-left">
                          <div className="text-blue-600 font-bold">
                            {formatCurrency(p.price)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Kho: {p.stock}
                          </div>
                        </div>
                        <div className="space-x-2">
                          <button
                            onClick={() => openEditProduct(p)}
                            className="text-blue-600 hover:bg-blue-100 p-2 rounded"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="text-red-500 hover:text-red-700 font-medium px-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "orders":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Đơn hàng</h2>
            <div className="space-y-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">#{o.id}</span>
                      <span className="text-xs text-gray-400">
                        • {new Date(o.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Khách:{" "}
                      <span className="font-medium text-gray-900">
                        {o.shipping_name || o.user_id}
                      </span>
                    </div>
                    <div className="text-blue-600 font-bold text-lg">
                      {formatCurrency(o.final_amount)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <Badge
                      color={
                        o.status === "completed"
                          ? "green"
                          : o.status === "pending"
                          ? "yellow"
                          : "blue"
                      }
                    >
                      {o.status.toUpperCase()}
                    </Badge>
                    <select
                      className="input !py-1 !px-2 !w-auto"
                      value={o.status}
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="shipping">Đang giao</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Hủy đơn</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "users":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Khách hàng</h2>
            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-700 uppercase">
                  <tr>
                    <th className="p-4">Tên</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Cấp độ</th>
                    <th className="p-4">Điểm</th>
                    <th className="p-4">Vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={u.picture || "https://placehold.co/40"}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="font-medium">{u.name}</span>
                      </td>
                      <td className="p-4 text-gray-500">{u.email}</td>
                      <td className="p-4">
                        <Badge>{u.level}</Badge>
                      </td>
                      <td className="p-4 font-bold">{u.points}</td>
                      <td className="p-4 text-red-500 font-bold">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "loyalty":
        return (
          <div className="max-w-4xl space-y-6">
            <h2 className="text-2xl font-bold">Cấu hình Điểm & Cấp độ</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold mb-4 flex gap-2">
                  <Star className="text-yellow-500" /> Tỷ lệ tích điểm
                </h3>
                <div className="flex items-center gap-3">
                  <span>1.000đ = </span>
                  <input
                    className="input !w-20 text-center font-bold"
                    value={settings.point_ratio || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, point_ratio: e.target.value })
                    }
                  />
                  <span>điểm</span>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="font-bold mb-4">Cấp độ (Điểm tối thiểu)</h3>
                <div className="space-y-3">
                  {["Silver", "Gold", "Diamond"].map((lvl) => (
                    <div
                      key={lvl}
                      className="flex justify-between items-center"
                    >
                      <span>{lvl}</span>
                      <input
                        className="input !w-32 text-right"
                        value={settings[`level_${lvl.toLowerCase()}`] || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [`level_${lvl.toLowerCase()}`]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => saveSettings(settings)}>
                Lưu cấu hình
              </Button>
            </div>
          </div>
        );

      case "analytics":
        if (!analytics) return <div>No Data</div>;
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Thống kê</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Doanh thu",
                  val: formatCurrency(analytics.revenue_month),
                  color: "text-green-600 bg-green-50",
                },
                {
                  label: "Đơn hàng",
                  val: analytics.new_orders,
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  label: "Khách mới",
                  val: analytics.new_users,
                  color: "text-purple-600 bg-purple-50",
                },
                {
                  label: "Top Sản phẩm",
                  val: analytics.top_product,
                  color: "text-orange-600 bg-orange-50",
                },
              ].map((stat, i) => (
                <Card key={i} className="p-4">
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                  <div
                    className={`text-xl font-bold mt-1 px-2 py-1 rounded w-fit ${stat.color}`}
                  >
                    {stat.val}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case "contacts":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Phản hồi khách hàng</h2>
            <div className="space-y-4">
              {contacts.map((c) => (
                <Card
                  key={c.id}
                  className="p-5 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">
                        {c.user_name || "Khách vãng lai"}
                      </span>
                      <span className="text-xs text-gray-400">
                        • {new Date(c.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 font-medium mb-2 flex items-center gap-1">
                      <Mail size={14} /> {c.email}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-gray-700 text-sm border">
                      {c.message}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 min-w-[150px]">
                    <Badge
                      color={c.status === "processed" ? "green" : "yellow"}
                    >
                      {c.status === "processed" ? "Đã xử lý" : "Chờ xử lý"}
                    </Badge>

                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <Button
                        size="sm"
                        onClick={() => handleReplyMail(c.email)}
                        className="bg-white border border-gray-300 text-black hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <Mail size={16} /> Trả lời
                      </Button>

                      {c.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => updateContactStatus(c.id, "processed")}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Đánh dấu xong
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {contacts.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  Chưa có tin nhắn nào
                </div>
              )}
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold">Cấu hình hệ thống</h2>
            <Card className="p-6 space-y-4">
              <div>
                <label className="label">Tên cửa hàng</label>
                <input
                  className="input"
                  value={settings.site_name || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, site_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Email liên hệ</label>
                <input
                  className="input"
                  value={settings.contact_email || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, contact_email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Hotline</label>
                <input
                  className="input"
                  value={settings.hotline || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, hotline: e.target.value })
                  }
                />
              </div>
              <div className="pt-4">
                <Button onClick={() => saveSettings(settings)}>
                  Lưu thay đổi
                </Button>
              </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  const menuItems = [
    { id: "products", label: "Sản phẩm", icon: <Package size={20} /> },
    { id: "orders", label: "Đơn hàng", icon: <ShoppingCart size={20} /> },
    { id: "users", label: "Khách hàng", icon: <Users size={20} /> },
    { id: "loyalty", label: "Điểm thưởng", icon: <Star size={20} /> },
    { id: "analytics", label: "Thống kê", icon: <BarChart2 size={20} /> },
    { id: "settings", label: "Cấu hình", icon: <Settings size={20} /> },
    {
      id: "contacts",
      label: "Phản hồi & LH",
      icon: <MessageSquare size={20} />,
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Mobile Header */}

      <div className="md:hidden fixed w-full bg-white z-40 border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="font-bold text-blue-600 flex items-center gap-2">
          <LayoutDashboard /> Admin
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-xl transform transition-transform duration-300 md:translate-x-0 md:static md:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b hidden md:flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={18} />
          </div>
          <span className="text-xl font-bold text-gray-800">AdminPanel</span>
        </div>
        <div className="p-4 flex justify-between items-center md:hidden border-b">
          <span className="font-bold">Menu</span>
          <button onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsEditingProd(false);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeTab === item.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 bg-gray-50">
          {renderContent()}
        </div>
      </div>

      {/* CSS Helper classes (bạn có thể thêm vào index.css) */}
      <style>{`
                .label { display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem; }
                .input { width: 100%; padding: 0.625rem; border: 1px solid #E5E7EB; border-radius: 0.5rem; outline: none; transition: border-color 0.2s; }
                .input:focus { border-color: #2563EB; ring: 2px solid #2563EB; }
            `}</style>
    </div>
  );
}
