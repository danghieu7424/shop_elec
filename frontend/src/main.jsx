import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Các component Cart, Checkout, Profile bạn có thể tách ra tương tự như trên
// Tôi giả định bạn đã tách chúng vào file tương ứng trong folder pages/

export default function MainContent() {
  const [state, dispatch] = useStore();
  const { domain } = state;

  useEffect(() => {
    // 1. Check Auth
    const checkAuth = async () => {
        try {
            const res = await fetch(`${domain}/api/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const userData = await res.json();
                dispatch(actions.set_user_info(userData));
            }
        } catch (e) { console.error("Guest mode"); }
    };
    
    // 2. Fetch Initial Data (Categories, Products)
    const fetchData = async () => {
        try {
            const [catRes, prodRes] = await Promise.all([
                fetch(`${domain}/api/categories`),
                fetch(`${domain}/api/products`)
            ]);
            if(catRes.ok) dispatch(actions.set_categories(await catRes.json()));
            if(prodRes.ok) dispatch(actions.set_products(await prodRes.json()));
        } catch(e) { console.error("Init data error", e); }
    };

    checkAuth();
    fetchData();
    
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
          
          {/* Protected Routes (Basic check inside component or wrapper) */}
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