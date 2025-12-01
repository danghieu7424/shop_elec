import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Card, Button } from '../components/UI';

export default function Contact() {
  return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Liên hệ</h2>
          <Card className="p-8 space-y-6">
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
              
              <form className="space-y-4 pt-4 border-t">
                  <input className="border w-full p-2 rounded focus:ring-2 ring-blue-500 outline-none" placeholder="Email của bạn"/>
                  <textarea className="border w-full p-2 rounded focus:ring-2 ring-blue-500 outline-none" rows="4" placeholder="Nội dung cần hỗ trợ"/>
                  <Button className="w-full">Gửi tin nhắn</Button>
              </form>
          </Card>
      </div>
  );
}