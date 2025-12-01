import React, { useState, useEffect } from 'react'; // Thêm useEffect
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import { Card, Button } from '../components/UI';
import { useStore } from '../store';

export default function Contact() {
  const [state] = useStore();
  const { domain, userInfo } = state; // Lấy thêm userInfo
  
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // --- TỰ ĐỘNG ĐIỀN EMAIL NẾU ĐÃ ĐĂNG NHẬP ---
  useEffect(() => {
    if (userInfo && userInfo.email) {
        setEmail(userInfo.email);
    }
  }, [userInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !message) return alert("Vui lòng nhập đủ thông tin!");

    setLoading(true);
    try {
      const res = await fetch(`${domain}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
        credentials: 'include' // Quan trọng: Để gửi kèm Cookie Token lên Server
      });

      if (res.ok) {
        alert("Tin nhắn của bạn đã được gửi! Chúng tôi sẽ phản hồi sớm.");
        // Nếu chưa đăng nhập thì xóa email, nếu đăng nhập rồi thì giữ nguyên email
        if (!userInfo) setEmail(''); 
        setMessage('');
      } else {
        alert("Gửi thất bại, vui lòng thử lại sau.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối server");
    }
    setLoading(false);
  };

  return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Liên hệ</h2>
          <Card className="p-8 space-y-6">
              {/* Thông tin tĩnh (Giữ nguyên) */}
              <div className="flex items-center gap-4">
                <Phone className="text-blue-600"/>
                <span className="font-medium">1900 1234</span>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="text-blue-600"/>
                <span className="font-medium">support@electroshop.vn</span>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="text-blue-600"/>
                <span className="font-medium">Hưng Yên</span>
              </div>
              
              <form className="space-y-4 pt-4 border-t" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email của bạn</label>
                    <input 
                        type="email"
                        className={`border w-full p-2 rounded focus:ring-2 ring-blue-500 outline-none ${userInfo ? 'bg-gray-100 text-gray-500' : ''}`}
                        placeholder="example@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        // Tùy chọn: Không cho sửa email nếu đã đăng nhập để đảm bảo tính xác thực
                        readOnly={!!userInfo} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung cần hỗ trợ</label>
                    <textarea 
                        className="border w-full p-2 rounded focus:ring-2 ring-blue-500 outline-none" 
                        rows="4" 
                        placeholder="Nhập nội dung..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    />
                  </div>
                  <Button className="w-full" disabled={loading}>
                      {loading ? 'Đang gửi...' : <><Send size={18} className="mr-2"/> Gửi tin nhắn</>}
                  </Button>
              </form>
          </Card>
      </div>
  );
}