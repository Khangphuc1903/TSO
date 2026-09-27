import { useEffect, useRef, useState } from "react";
import axiosClient from "../api/axiosClient";
import { saveSession } from "../auth";

let gisPromise;

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-gis]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Không tải được Google.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google."));
    document.head.appendChild(script);
  });
  return gisPromise;
}

export default function GoogleSignInButton({ onError, onSuccess, label = "Sign In with Google" }) {
  const boxRef = useRef(null);
  const [clientId, setClientId] = useState("");
  const [hint, setHint] = useState("");

  useEffect(() => {
    let cancelled = false;
    axiosClient
      .get("/Auth/google-config")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.data?.configured || !res.data.clientId) {
          setHint("Thêm Google Client ID vào appsettings.json (Google:ClientId) rồi chạy lại API.");
          return;
        }
        setClientId(res.data.clientId);
        await loadGis();
        if (cancelled || !boxRef.current || !window.google?.accounts?.id) return;
        boxRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: res.data.clientId,
          callback: async (response) => {
            try {
              const result = await axiosClient.post("/Auth/google", {
                idToken: response.credential,
              });
              saveSession(result.data.token);
              onSuccess?.(result.data);
            } catch (err) {
              onError?.(err.response?.data?.message || "Google login thất bại.");
            }
          },
        });
        window.google.accounts.id.renderButton(boxRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: Math.max(boxRef.current.offsetWidth || 320, 280),
        });
      })
      .catch(() => {
        if (!cancelled) setHint("Không lấy được cấu hình Google từ API.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div ref={boxRef} className="w-full min-h-[44px] flex justify-center overflow-hidden rounded-lg" />
      {!clientId && (
        <button
          type="button"
          onClick={() => onError?.(hint || "Chưa cấu hình Google login.")}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-2.5 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <GoogleIcon />
          {label}
        </button>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.4C41.4 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
