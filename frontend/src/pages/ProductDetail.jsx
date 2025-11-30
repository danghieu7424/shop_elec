import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Star, Check, Shield, Truck, Box, User } from 'lucide-react';
import { useStore, actions } from '../store';
import { Button, Badge } from '../components/UI';
import { formatCurrency } from '../utils';

export default function ProductDetail() {
    const { id } = useParams();
    const [state, dispatch] = useStore();
    const { domain, categories, userInfo } = state;
    const navigate = useNavigate();
    
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]); 
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('desc');
    
    // State quản lý ảnh đang hiển thị (cho tính năng nhiều ảnh)
    const [activeImg, setActiveImg] = useState(null);

    // State cho Form đánh giá
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Helper xử lý danh sách ảnh an toàn
    const getProductImages = (prod) => {
        if (!prod) return [];
        if (Array.isArray(prod.images) && prod.images.length > 0) return prod.images;
        if (typeof prod.image === 'string' && prod.image) return [prod.image];
        return [];
    };

    // 1. Fetch Dữ liệu
    useEffect(() => {
        const loadData = async () => {
            try {
                const [prodRes, revRes] = await Promise.all([
                    fetch(`${domain}/api/products/${id}`),
                    fetch(`${domain}/api/reviews/${id}`)
                ]);

                if (prodRes.ok) {
                    const prodData = await prodRes.json();
                    setProduct(prodData);
                    
                    // Tự động chọn ảnh đầu tiên làm ảnh chính
                    const imgs = getProductImages(prodData);
                    if (imgs.length > 0) setActiveImg(imgs[0]);
                }
                if (revRes.ok) setReviews(await revRes.json());
            } catch (e) { console.error("Lỗi tải chi tiết:", e); }
        };
        loadData();
    }, [id, domain]);

    // ... (Giữ nguyên các hàm xử lý Review, Quantity...)
    const handlePostReview = async () => {
        if (!userInfo) return alert("Vui lòng đăng nhập để đánh giá");
        if (!newComment.trim()) return alert("Vui lòng nhập nội dung");

        setSubmitting(true);
        try {
            const res = await fetch(`${domain}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: id,
                    rating: newRating,
                    content: newComment
                }),
                credentials: 'include'
            });

            if (res.ok) {
                alert("Cảm ơn đánh giá của bạn!");
                setNewComment('');
                setNewRating(5);
                const [revRes, prodRes] = await Promise.all([
                    fetch(`${domain}/api/reviews/${id}`),
                    fetch(`${domain}/api/products/${id}`)
                ]);
                if (revRes.ok) setReviews(await revRes.json());
                if (prodRes.ok) setProduct(await prodRes.json()); 
            } else {
                alert("Có lỗi xảy ra khi gửi đánh giá");
            }
        } catch(e) { console.error(e); }
        setSubmitting(false);
    };

    const BULK_PRICING = [
        { min: 1, max: 9, discount: 0 },
        { min: 10, max: 49, discount: 5 },
        { min: 50, max: 999, discount: 10 },
    ];
    
    if (!product) return <div className="p-20 text-center text-gray-500">Đang tải thông tin sản phẩm...</div>;
    
    const handleQuantityChange = (delta) => {
        const newQty = quantity + delta;
        if (newQty >= 1 && newQty <= product.stock) setQuantity(newQty);
    };

    const currentDiscount = BULK_PRICING.find(tier => quantity >= tier.min && quantity <= tier.max)?.discount || 0;
    const unitPrice = Number(product.price);
    const discountedUnitPrice = unitPrice * (1 - currentDiscount / 100);
    const totalPrice = discountedUnitPrice * quantity;

    const handleAddToCart = () => {
        // Lưu ý: Gửi thêm trường image để hiển thị trong giỏ hàng
        dispatch(actions.add_to_cart({ 
            ...product, 
            image: activeImg, // Dùng ảnh đang chọn làm thumbnail
            quantity: quantity 
        }));
        alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
    };

    const specsArray = product.specs 
        ? Object.entries(product.specs).map(([key, value]) => ({ label: key, value: String(value) }))
        : [];

    const productImages = getProductImages(product);

    return (
        <div className="container mx-auto px-4 py-8">
            <Button onClick={() => navigate(-1)} variant="secondary" className="mb-6 text-sm">← Quay lại danh sách</Button>
            
            <div className="grid md:grid-cols-12 gap-8 mb-12">
                
                {/* --- CẬP NHẬT CỘT TRÁI: GALLERY ẢNH --- */}
                <div className="md:col-span-5">
                    {/* Ảnh Chính (Lớn) */}
                    <div className="bg-white rounded-2xl border p-4 flex items-center justify-center mb-4 relative overflow-hidden group h-[400px]">
                        <img 
                            src={activeImg ? `${domain}${activeImg}` : "https://placehold.co/500"} 
                            className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110" 
                            alt={product.name}
                        />
                        {product.stock === 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl uppercase">Hết hàng</div>
                        )}
                    </div>

                    {/* Danh sách Thumbnail (Nhỏ) */}
                    {productImages.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                            {productImages.map((img, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => setActiveImg(img)}
                                    className={`w-20 h-20 flex-shrink-0 border rounded-lg overflow-hidden cursor-pointer p-1 bg-white transition-all ${activeImg === img ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200 hover:border-blue-400'}`}
                                >
                                    <img 
                                        src={`${domain}${img}`} 
                                        className="w-full h-full object-contain" 
                                        alt={`thumb-${idx}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- Cột Phải (Thông tin) --- */}
                <div className="md:col-span-7 space-y-6">
                    <div>
                        <div className="flex justify-between items-start">
                            <Badge>{categories.find(c => c.id === product.category_id)?.name || product.category_id}</Badge>
                            <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold mt-2 text-gray-800">{product.name}</h1>
                        
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex text-yellow-400">
                                <span className="font-bold mr-1 text-gray-700">{Number(product.rating || 0).toFixed(1)}</span>
                                <Star size={16} fill="currentColor" className={product.rating > 0 ? "text-yellow-400" : "text-gray-300"}/>
                            </div>
                            <span className="text-sm text-gray-500">({product.review_count || 0} đánh giá)</span>
                        </div>
                    </div>

                    {/* Giá & Giá sỉ */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-3xl text-blue-700 font-bold flex items-end gap-2">
                            {formatCurrency(discountedUnitPrice)}
                            {currentDiscount > 0 && <span className="text-sm text-gray-500 line-through mb-1">{formatCurrency(unitPrice)}</span>}
                            {currentDiscount > 0 && <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">-{currentDiscount}%</span>}
                        </div>
                        
                        <div className="mt-4 text-sm">
                            <div className="font-semibold mb-2 text-gray-700">Mua nhiều giảm giá:</div>
                            <div className="grid grid-cols-3 gap-2">
                                {BULK_PRICING.map((tier, idx) => (
                                    <div key={idx} className={`p-2 rounded border text-center transition-colors ${quantity >= tier.min && quantity <= tier.max ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600'}`}>
                                        <div className="font-bold">SL: {tier.min}{tier.max < 999 ? `-${tier.max}` : '+'}</div>
                                        <div className="text-xs">{tier.discount === 0 ? 'Giá chuẩn' : `Giảm ${tier.discount}%`}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chọn số lượng */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                        <div className="flex items-center border rounded-lg w-fit bg-white">
                            <button onClick={() => handleQuantityChange(-1)} className="p-3 hover:bg-gray-100 disabled:opacity-50" disabled={quantity <= 1}><Minus size={18}/></button>
                            <input className="w-16 text-center font-bold outline-none bg-transparent" value={quantity} readOnly />
                            <button onClick={() => handleQuantityChange(1)} className="p-3 hover:bg-gray-100 disabled:opacity-50" disabled={quantity >= product.stock}><Plus size={18}/></button>
                        </div>
                        <Button onClick={handleAddToCart} disabled={product.stock === 0} className="flex-1 py-3 text-lg shadow-lg">
                            <ShoppingCart className="mr-2"/> 
                            {product.stock > 0 ? `Thêm vào giỏ - ${formatCurrency(totalPrice)}` : 'Tạm hết hàng'}
                        </Button>
                    </div>

                    {/* Icon Chính sách */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 pt-2">
                        <div className="flex gap-2 items-center"><Shield size={18} className="text-blue-600"/> Bảo hành 6 tháng</div>
                        <div className="flex gap-2 items-center"><Check size={18} className="text-blue-600"/> 1 đổi 1 trong 7 ngày</div>
                        <div className="flex gap-2 items-center"><Truck size={18} className="text-blue-600"/> Ship COD toàn quốc</div>
                        <div className="flex gap-2 items-center"><Box size={18} className="text-blue-600"/> Kiểm hàng trước khi nhận</div>
                    </div>
                </div>
            </div>

            {/* --- KHU VỰC TABS (Giữ nguyên code cũ) --- */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-12">
                <div className="flex border-b overflow-x-auto">
                    {['desc', 'specs', 'reviews'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)} 
                            className={`px-6 py-4 font-bold border-b-2 whitespace-nowrap transition-colors capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                        >
                            {tab === 'desc' ? 'Mô tả' : tab === 'specs' ? 'Thông số' : `Đánh giá (${reviews.length})`}
                        </button>
                    ))}
                </div>

                <div className="p-6 md:p-8 min-h-[300px]">
                    {activeTab === 'desc' && (
                        <div className="prose max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                            {product.description || "Chưa có mô tả chi tiết cho sản phẩm này."}
                        </div>
                    )}

                    {activeTab === 'specs' && (
                        <div>
                            {specsArray.length > 0 ? (
                                <table className="w-full max-w-2xl text-sm border-collapse">
                                    <tbody>
                                        {specsArray.map((spec, index) => (
                                            <tr key={index} className="border-b last:border-0">
                                                <td className="py-3 px-4 bg-gray-50 font-medium w-1/3 text-gray-600 capitalize">{spec.label}</td>
                                                <td className="py-3 px-4 text-gray-800">{spec.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-gray-500 italic">Chưa có thông số kỹ thuật.</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div>
                            <div className="bg-gray-50 p-6 rounded-lg mb-8 border shadow-sm">
                                <h3 className="font-bold mb-4 text-lg">Viết đánh giá của bạn</h3>
                                {userInfo ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-2 items-center">
                                            <span className="text-sm font-medium">Chọn số sao:</span>
                                            {[1,2,3,4,5].map(star => (
                                                <button key={star} onClick={() => setNewRating(star)} className="focus:outline-none transition-transform hover:scale-110" type="button">
                                                    <Star size={28} fill={star <= newRating ? "#FACC15" : "white"} className={star <= newRating ? "text-yellow-400" : "text-gray-300"} />
                                                </button>
                                            ))}
                                            <span className="ml-2 font-bold text-yellow-600 text-lg">{newRating}/5</span>
                                        </div>
                                        <textarea 
                                            className="w-full border rounded-lg p-3 focus:ring-2 ring-blue-500 outline-none resize-none bg-white" 
                                            rows="3" 
                                            placeholder="Sản phẩm dùng tốt không? Chia sẻ cảm nhận của bạn..."
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                        />
                                        <div className="flex justify-end">
                                            <Button onClick={handlePostReview} disabled={submitting}>
                                                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 bg-white p-4 rounded border text-center">
                                        Vui lòng <span className="text-blue-600 font-bold cursor-pointer hover:underline" onClick={() => navigate('/login')}>đăng nhập</span> để viết đánh giá.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                {reviews.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg border border-dashed">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>
                                ) : (
                                    reviews.map((review) => (
                                        <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg select-none">
                                                    {review.user_name ? review.user_name.charAt(0).toUpperCase() : <User size={20}/>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{review.user_name || 'Người dùng ẩn danh'}</div>
                                                    <div className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('vi-VN')}</div>
                                                </div>
                                            </div>
                                            <div className="pl-12">
                                                <div className="flex text-yellow-400 mb-2">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300"}/>
                                                    ))}
                                                </div>
                                                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg inline-block min-w-[50%]">{review.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}