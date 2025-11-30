import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/UI';
import { useStore, actions } from '../store';

export default function Login() {
    const [state, dispatch] = useStore();
    const { domain, clientId } = state;
    const navigate = useNavigate();

    const handleGoogleLoginSuccess = async (response) => {
        try {
            const res = await fetch(`${domain}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                dispatch(actions.set_user_info(data.user));
                navigate('/');
            } else {
                alert("Lỗi đăng nhập: " + data.message);
            }
        } catch (e) { alert("Lỗi server"); }
    };

    useEffect(() => {
        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleLoginSuccess
            });
            window.google.accounts.id.renderButton(document.getElementById("googleBtn"), { theme: "outline", size: "large", width: 250 });
        }
    }, [clientId]);

    return (
        <div className="h-[80vh] flex items-center justify-center bg-gray-50">
            <Card className="p-8 text-center w-96">
                <h1 className="text-2xl font-bold mb-2">Đăng nhập</h1>
                <p className="text-gray-500 mb-6">ElectroShop Loyalty Program</p>
                <div className="flex justify-center h-[50px]"><div id="googleBtn"></div></div>
            </Card>
        </div>
    );
}