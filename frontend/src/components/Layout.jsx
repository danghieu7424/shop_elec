import React, { useState } from "react";
import { Link, useNavigate, Outlet } from "react-router-dom";
import {
  ShoppingCart,
  Cpu,
  LogOut,
  User,
  Settings,
  Menu,
  X,
} from "lucide-react"; // Thêm Menu, X
import { useStore, actions } from "../store";
import { Button } from "./UI";

export default function Layout() {
  const [state, dispatch] = useStore();
  const { userInfo, cart, domain } = state;
  const navigate = useNavigate();

  // State cho Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch(`${domain}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      dispatch(actions.set_user_info(null));
      dispatch(actions.clear_cart());
      navigate("/");
      setIsMobileMenuOpen(false); // Đóng menu nếu đang mở
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          {/* --- MOBILE HAMBURGER BUTTON --- */}
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 cursor-pointer no-underline text-current"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Cpu className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold hidden sm:block">
                ElectroShop
              </span>
            </Link>
          </div>
          {/* Desktop Menu (Ẩn trên mobile) */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              Trang chủ
            </Link>
            <Link
              to="/products"
              className="font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              Sản phẩm
            </Link>
            <Link
              to="/about"
              className="font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              Về chúng tôi
            </Link>
            <Link
              to="/contact"
              className="font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              Liên hệ
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Cart Icon */}
            <Link
              to="/cart"
              className="relative cursor-pointer text-gray-600 hover:text-blue-600 transition-colors p-1"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <ShoppingCart className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                  {cart.length}
                </span>
              )}
            </Link>

            {/* User Dropdown (Desktop) & Login Button */}
            <div className="hidden md:block">
              {userInfo ? (
                <div className="relative group py-2">
                  <div className="flex items-center gap-3 cursor-pointer">
                    <div className="text-right hidden lg:block">
                      <div className="text-sm font-bold text-gray-700">
                        {userInfo.name}
                      </div>
                      <div className="text-xs text-blue-600 font-bold">
                        {userInfo.points} pts
                      </div>
                    </div>
                    <img
                      src={userInfo.picture || "https://via.placeholder.com/40"}
                      className="w-9 h-9 rounded-full border border-gray-200 object-cover"
                      alt="Avatar"
                    />
                  </div>

                  <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50">
                    <div className="bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden animate-fade-in p-1">
                      <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-gray-100 transform rotate-45"></div>
                      <Link
                        to="/profile"
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm font-medium flex items-center gap-2 rounded-lg transition-colors"
                      >
                        <User size={16} className="text-gray-400" /> Tài khoản
                      </Link>
                      {userInfo.role === "admin" && (
                        <Link
                          to="/admin"
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-blue-600 text-sm font-bold flex items-center gap-2 rounded-lg transition-colors"
                        >
                          <Settings size={16} /> Quản trị
                        </Link>
                      )}
                      <div className="h-px bg-gray-100 my-1 mx-2"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 text-sm font-medium flex items-center gap-2 rounded-lg transition-colors"
                      >
                        <LogOut size={16} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login">
                  <Button size="sm" className="text-sm px-4 py-2">
                    Đăng nhập
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile User Avatar (Nếu đã login, hiện avatar thay vì nút login) */}
            {userInfo && (
              <div
                className="md:hidden cursor-pointer"
                onClick={() => navigate("/profile")}
              >
                <img
                  src={userInfo.picture || "https://via.placeholder.com/40"}
                  className="w-8 h-8 rounded-full border"
                  alt="User"
                />
              </div>
            )}
          </div>
        </div>

        {/* --- MOBILE MENU DROPDOWN --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg animate-fade-in">
            <div className="flex flex-col p-4 space-y-3">
              {/* User Info (Mobile) */}
              {userInfo ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl mb-2">
                  <img
                    src={userInfo.picture}
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                  <div>
                    <div className="font-bold text-gray-800">
                      {userInfo.name}
                    </div>
                    <div className="text-xs text-blue-600 font-bold">
                      {userInfo.points} điểm tích lũy
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full justify-center">
                    Đăng nhập / Đăng ký
                  </Button>
                </Link>
              )}

              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-medium text-gray-700 hover:text-blue-600 py-2 border-b border-gray-50"
              >
                Trang chủ
              </Link>
              <Link
                to="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-medium text-gray-700 hover:text-blue-600 py-2 border-b border-gray-50"
              >
                Sản phẩm
              </Link>
              <Link
                to="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-medium text-gray-700 hover:text-blue-600 py-2 border-b border-gray-50"
              >
                Về chúng tôi
              </Link>
              <Link
                to="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-medium text-gray-700 hover:text-blue-600 py-2 border-b border-gray-50"
              >
                Liên hệ
              </Link>

              {userInfo && (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-medium text-gray-700 hover:text-blue-600 py-2 border-b border-gray-50 flex items-center gap-2"
                  >
                    <User size={18} /> Tài khoản của tôi
                  </Link>
                  {userInfo.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="font-bold text-blue-600 py-2 border-b border-gray-50 flex items-center gap-2"
                    >
                      <Settings size={18} /> Trang quản trị
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="font-medium text-red-500 py-2 text-left flex items-center gap-2"
                  >
                    <LogOut size={18} /> Đăng xuất
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-800 text-gray-400 py-8 mt-12 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center text-sm">
          <p className="mb-2">
            &copy; 2024 ElectroShop. Nền tảng linh kiện điện tử hàng đầu.
          </p>
          <div className="flex justify-center gap-4 text-gray-500">
            <span className="hover:text-white cursor-pointer">Điều khoản</span>
            <span className="hover:text-white cursor-pointer">Bảo mật</span>
            <span className="hover:text-white cursor-pointer">Hỗ trợ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
