import React, { useState, useEffect, useMemo } from 'react';
import { useStore, actions } from '../store';
import { Card, Badge, Button } from '../components/UI';
import { formatCurrency, getVietQRUrl, LEVELS } from '../utils';
// --- SỬA Ở ĐÂY: Thêm ShoppingCart vào danh sách import ---
import { X, QrCode, CheckCircle, Crown, TrendingUp, ShoppingCart } from 'lucide-react'; 

export default function Profile() {
    const [state, dispatch] = useStore();
    const { userInfo, domain } = state;
    const [orders, setOrders] = useState([]);
    
    // State Modal QR
    const [qrData, setQrData] = useState(null);

    // Hàm lấy danh sách đơn hàng
    const fetchOrders = () => {
        if(userInfo) {
            fetch(`${domain}/api/orders/my`, {credentials: 'include'})
                .then(r => r.json())
                .then(setOrders)
                .catch(console.error);
        }
    };

    // Hàm lấy lại thông tin user
    const refreshUserInfo = () => {
        fetch(`${domain}/api/auth/me`, {credentials: 'include'})
            .then(r => r.json())
            .then(data => dispatch(actions.set_user_info(data)))
            .catch(console.error);
    };

    useEffect(() => {
        fetchOrders();
    }, [userInfo, domain]);

    // --- TÍNH TOÁN TIẾN TRÌNH LÊN HẠNG ---
    const loyaltyStatus = useMemo(() => {
        if (!userInfo) return null;
        
        const currentPoints = userInfo.points || 0;
        const sortedLevels = Object.values(LEVELS).sort((a, b) => a.min - b.min);
        const nextLevelIndex = sortedLevels.findIndex(lvl => lvl.min > currentPoints);
        
        let nextLevel = null;
        let progress = 100;
        let pointsNeeded = 0;

        if (nextLevelIndex !== -1) {
            nextLevel = sortedLevels[nextLevelIndex];
            const currentLevelMin = sortedLevels[nextLevelIndex - 1]?.min || 0;
            const range = nextLevel.min - currentLevelMin;
            const gained = currentPoints - currentLevelMin;
            progress = Math.min(100, Math.max(0, (gained / range) * 100));
            pointsNeeded = nextLevel.min - currentPoints;
        }

        return { progress, nextLevel, pointsNeeded };
    }, [userInfo]);

    // --- XỬ LÝ: ĐÃ NHẬN HÀNG ---
    const handleReceived = async (orderId) => {
        if (!window.confirm("Bạn xác nhận đã nhận được hàng?")) return;

        try {
            const res = await fetch(`${domain}/api/orders/${orderId}/receive`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            if (res.ok) {
                alert("Xác nhận thành công! Điểm thưởng đã được cộng.");
                fetchOrders();      
                refreshUserInfo();  
            } else {
                const data = await res.json();
                alert("Lỗi: " + (data || "Không thể xác nhận"));
            }
        } catch (e) { console.error(e); alert("Lỗi kết nối"); }
    };

    if(!userInfo) return <div className="p-10 text-center">Vui lòng đăng nhập</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-3 gap-8">
                {/* --- CỘT TRÁI: THÔNG TIN USER & LOYALTY --- */}
                <div className="space-y-6">
                    {/* Card Thông tin cơ bản */}
                    <Card className="p-6 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-blue-600 to-blue-400"></div>
                        <div className="relative z-10">
                            <img 
                                src={userInfo.picture || "https://via.placeholder.com/100"} 
                                className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-white shadow-md object-cover bg-white" 
                                alt="avatar"
                            />
                            <h2 className="font-bold text-xl text-gray-800">{userInfo.name}</h2>
                            <div className="text-sm text-gray-500 mb-1">{userInfo.email}</div>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                userInfo.level === 'DIAMOND' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                userInfo.level === 'GOLD' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                                {LEVELS[userInfo.level]?.name || userInfo.level} Member
                            </span>
                        </div>
                    </Card>

                    {/* Card Điểm thưởng & Tiến trình */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <div className="text-gray-500 text-sm font-medium flex items-center gap-1">
                                    <Crown size={16} className="text-yellow-500"/> Điểm tích lũy
                                </div>
                                <div className="text-4xl font-extrabold text-blue-700 mt-1">
                                    {userInfo.points} <span className="text-sm font-normal text-gray-400">pts</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400">Hạng hiện tại</div>
                                <div className="font-bold text-gray-700">{LEVELS[userInfo.level]?.name}</div>
                            </div>
                        </div>

                        {/* Thanh tiến trình */}
                        {loyaltyStatus && loyaltyStatus.nextLevel ? (
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Tiến độ thăng hạng</span>
                                    <span className="font-medium text-blue-600">{Math.round(loyaltyStatus.progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${loyaltyStatus.progress}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-gray-500 flex gap-1 items-center bg-blue-50 p-2 rounded text-center justify-center">
                                    <TrendingUp size={14} className="text-blue-600"/>
                                    <span>Tích thêm <b>{loyaltyStatus.pointsNeeded}</b> điểm để lên hạng <b>{loyaltyStatus.nextLevel.name}</b></span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg text-center border border-yellow-100">
                                <div className="text-sm font-bold text-yellow-700 flex items-center justify-center gap-2">
                                    <Crown size={18} fill="currentColor"/> Đỉnh cao danh vọng!
                                </div>
                                <div className="text-xs text-yellow-600 mt-1">Bạn đã đạt hạng cao nhất.</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- CỘT PHẢI: LỊCH SỬ ĐƠN HÀNG --- */}
                <div className="md:col-span-2">
                    <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                        Lịch sử đơn hàng <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{orders.length}</span>
                    </h2>
                    <div className="space-y-4">
                        {orders.map(o => (
                            <Card key={o.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="font-bold text-lg text-gray-800">Đơn #{o.id.substring(0, 8)}...</div>
                                        <Badge color={
                                            o.status === 'completed' ? 'green' : 
                                            o.status === 'shipping' ? 'blue' : 
                                            o.status === 'cancelled' ? 'red' : 'yellow'
                                        }>
                                            {o.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString('vi-VN')} • {new Date(o.created_at).toLocaleTimeString('vi-VN')}</div>
                                </div>
                                
                                <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto">
                                    <div className="font-bold text-blue-600 text-lg">{formatCurrency(o.final_amount)}</div>
                                    {o.status === 'completed' && (
                                        <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                                            <Crown size={12}/> +{o.points_earned} điểm
                                        </div>
                                    )}
                                    
                                    {/* Actions Buttons */}
                                    {o.status === 'pending' && (
                                        <Button 
                                            size="sm" 
                                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none flex items-center gap-1 w-full md:w-auto justify-center"
                                            onClick={() => setQrData({
                                                amount: o.final_amount,
                                                content: `Thanh toan don ${o.id}`
                                            })}
                                        >
                                            <QrCode size={16}/> Thanh toán ngay
                                        </Button>
                                    )}

                                    {o.status === 'shipping' && (
                                        <Button 
                                            size="sm"
                                            onClick={() => handleReceived(o.id)}
                                            className="bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-1 w-full md:w-auto justify-center shadow-md transition-transform hover:scale-105"
                                        >
                                            <CheckCircle size={16}/> Đã nhận hàng
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                        {/* Đây là đoạn code bị lỗi trước đó, giờ đã có ShoppingCart */}
                        {orders.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed">
                                <div className="text-gray-300 mb-3"><ShoppingCart size={48}/></div>
                                <div className="text-gray-500">Bạn chưa có đơn hàng nào</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL QR CODE */}
            {qrData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setQrData(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setQrData(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"><X size={24}/></button>
                        <h3 className="text-xl font-bold text-center mb-6 text-gray-800">Thanh toán VietQR</h3>
                        <div className="bg-white p-2 border rounded-xl shadow-inner mb-4">
                            <img 
                                src={getVietQRUrl(qrData.amount, qrData.content)} 
                                className="w-full rounded-lg"
                                alt="QR Code"
                            />
                        </div>
                        <div className="text-center space-y-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Số tiền thanh toán</div>
                            <div className="text-2xl font-extrabold text-blue-600">{formatCurrency(qrData.amount)}</div>
                            <p className="text-xs text-gray-500 bg-gray-100 py-2 px-3 rounded mt-2 break-all font-mono">{qrData.content}</p>
                        </div>
                        <div className="mt-6 text-center text-xs text-gray-400">
                            Vui lòng kiểm tra kỹ thông tin trước khi chuyển khoản.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}