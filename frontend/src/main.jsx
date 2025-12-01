import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore, actions } from './store';

import Layout from './components/Layout';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Contact from './pages/Contact';
import About from './pages/About';

export default function MainContent() {
  const [state, dispatch] = useStore();
  const { domain } = state;

  useEffect(() => {
    const initData = async () => {
        try {
            // 1. Check Auth & Lấy Giỏ Hàng (Chạy song song cho nhanh)
            // Lưu ý: Logic ở đây là check auth trước, nếu OK mới lấy cart
            const userRes = await fetch(`${domain}/api/auth/me`, { credentials: 'include' });
            
            if (userRes.ok) {
                const userData = await userRes.json();
                dispatch(actions.set_user_info(userData));

                // --- QUAN TRỌNG: Nếu đã login, tải giỏ hàng từ Server ---
                const cartRes = await fetch(`${domain}/api/cart`, { credentials: 'include' });
                if (cartRes.ok) {
                    const cartData = await cartRes.json();
                    dispatch(actions.set_cart(cartData));
                }
            }
        } catch (e) { console.log("Guest mode"); }

        try {
            // 2. Fetch Danh mục & Sản phẩm
            const [catRes, prodRes] = await Promise.all([
                fetch(`${domain}/api/categories`),
                fetch(`${domain}/api/products`)
            ]);
            if(catRes.ok) dispatch(actions.set_categories(await catRes.json()));
            if(prodRes.ok) dispatch(actions.set_products(await prodRes.json()));
        } catch(e) { console.error("Init data error", e); }
    };

    initData();
    
    // Load Google Script
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => { if(document.body.contains(script)) document.body.removeChild(script); };
  }, [domain, dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<ProductList />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="login" element={<Login />} />
          
          <Route path="checkout" element={<Checkout />} />
          <Route path="profile" element={<Profile />} />
          <Route path="contact" element={<Contact />} />
          <Route path="about" element={<About />} />
          
          <Route path="admin" element={<Admin />} />
          
          <Route path="*" element={<div className="p-10 text-center">404 - Không tìm thấy trang</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}