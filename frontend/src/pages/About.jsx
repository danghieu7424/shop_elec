import React from 'react';

export default function About() {
  return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-100">
            <h1 className="text-3xl font-bold mb-6 text-blue-800">Về chúng tôi</h1>
            <div className="prose max-w-none text-gray-700 space-y-4 leading-relaxed">
                <p>
                    ElectroShop là đơn vị tiên phong cung cấp linh kiện điện tử chính hãng, chất lượng cao cho cộng đồng kỹ sư, sinh viên và những người đam mê công nghệ (Makers) tại Việt Nam.
                </p>
                <p>Chúng tôi cam kết:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Sản phẩm chính hãng 100%, nguồn gốc rõ ràng.</li>
                    <li>Giá cả cạnh tranh, hỗ trợ giá tốt cho sinh viên.</li>
                    <li>Đội ngũ kỹ thuật hỗ trợ tư vấn nhiệt tình.</li>
                    <li>Hệ thống tích điểm thành viên với nhiều ưu đãi hấp dẫn.</li>
                </ul>
            </div>
          </div>
      </div>
  );
}