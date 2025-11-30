import React, { useEffect, useState } from "react";

// Replace with your Google client ID
const GOOGLE_CLIENT_ID =
  "382574203305-ud2irfgr6bl243mmq6le9l67e29ire7d.apps.googleusercontent.com";
// Replace with your backend base URL if different
const API_BASE = "http://localhost:5000/api/auth";

export default function MainContent() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // load Google Identity Services script
    const id = "gsi-script";
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.id = id;
    document.body.appendChild(script);

    script.onload = () => {
      /* global google */
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });

      // render a button into a container
      window.google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large" }
      );

      // optionally prompt the user
      // window.google.accounts.id.prompt();
    };
  }, []);

  // This is called by Google's library with a credential (ID token)
  async function handleGoogleCredentialResponse(response) {
    setMessage("Đang xác thực với backend...");

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
        credentials: "include",
        // do NOT include credentials here — refresh token is set httpOnly by backend
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(`Login failed: ${err.error || res.statusText}`);
        return;
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
      setMessage("Đăng nhập thành công!");
    } catch (e) {
      console.error(e);
      setMessage("Lỗi mạng khi gọi backend");
    }
  }

  async function handleGetMe() {
    setMessage("Lấy profile...");
    if (!accessToken)
      return setMessage("Chưa có access token. Hãy đăng nhập trước.");

    try {
      const res = await fetch(`${API_BASE}/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(`Lỗi: ${err.error || res.statusText}`);
        return;
      }

      const u = await res.json();
      setUser(u);
      setMessage("Lấy profile thành công");
    } catch (e) {
      console.error(e);
      setMessage("Lỗi khi gọi /me");
    }
  }

  async function handleRefresh() {
    setMessage("Gọi refresh token (cookie sẽ được gửi tự động)...");
    try {
      const res = await fetch(`${API_BASE}/refresh`, {
        method: "POST",
        credentials: "include", // gửi cookie refreshToken
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(`Refresh failed: ${err.error || res.statusText}`);
        return;
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      setMessage("Refresh thành công");
    } catch (e) {
      console.error(e);
      setMessage("Lỗi khi refresh");
    }
  }

  async function handleLogout() {
    setMessage("Đang đăng xuất...");
    try {
      const res = await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setMessage("Logout lỗi");
        return;
      }
      setAccessToken(null);
      setUser(null);
      setMessage("Đã đăng xuất");

      // revoke Google One Tap session locally (optional)
      if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.id
      ) {
        window.google.accounts.id.disableAutoSelect();
      }
    } catch (e) {
      console.error(e);
      setMessage("Lỗi khi logout");
    }
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "40px auto",
        fontFamily: "Inter, Roboto, Arial",
      }}
    >
      <h1>Demo Google Login (Axum backend)</h1>
      <p style={{ color: "#666" }}>
        Kết nối tới: <code>{API_BASE}</code>
      </p>

      <div id="g_id_signin" style={{ margin: "20px 0" }}></div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={handleGetMe}>Lấy profile (/me)</button>
        <button onClick={handleRefresh}>Refresh token</button>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
        <strong>Trạng thái:</strong>
        <div style={{ marginTop: 8 }}>{message}</div>

        <div style={{ marginTop: 12 }}>
          <strong>Access Token:</strong>
          <pre style={{ maxHeight: 120, overflow: "auto" }}>
            {accessToken || "(none)"}
          </pre>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>User:</strong>
          <pre style={{ maxHeight: 220, overflow: "auto" }}>
            {user ? JSON.stringify(user, null, 2) : "(none)"}
          </pre>
        </div>
      </div>

      <p style={{ marginTop: 18, color: "#444" }}>
        Ghi chú: refresh token được backend set trong cookie{" "}
        <code>refreshToken</code> (httpOnly). Khi gọi <code>/refresh</code> phải
        dùng <code>credentials: 'include'</code>.
      </p>
    </div>
  );
}
