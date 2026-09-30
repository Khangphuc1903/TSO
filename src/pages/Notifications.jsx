import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Sparkles } from "lucide-react";
import Navbar from "../components/Navbar";
import { isLoggedIn } from "../auth";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/study";

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await getNotifications();
      setItems(data.items || []);
    } catch {
      setError("Đăng nhập để xem thông báo.");
    }
  };

  useEffect(() => {
    if (isLoggedIn()) load();
    else setError("Đăng nhập để xem thông báo.");
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <section className="relative overflow-hidden pt-12 pb-6 px-6">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)",
          }}
        />
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4">
              <Sparkles size={14} />
              Cập nhật lịch học & xác nhận
            </span>
            <h1 className="text-3xl font-bold text-slate-900">Thông báo</h1>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                await markAllNotificationsRead();
                load();
              }}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Đánh dấu đã đọc
            </button>
          )}
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        {error && (
          <div className="text-sm text-slate-500 bg-white border border-slate-100 rounded-2xl p-10 text-center">
            {error}{" "}
            {error.includes("Đăng nhập") && (
              <Link to="/login" className="text-brand-600 font-medium hover:underline">
                Đăng nhập
              </Link>
            )}
          </div>
        )}

        {!error && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-3">
              <Bell size={26} />
            </span>
            <p className="font-medium text-slate-900">Bạn chưa có thông báo mới</p>
            <p className="text-sm text-slate-500 mt-1">Khi gia sư xác nhận lịch, bạn sẽ thấy tại đây.</p>
          </div>
        )}

        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.notificationId}>
              <button
                type="button"
                onClick={async () => {
                  await markNotificationRead(n.notificationId);
                  await load();
                  if (n.type === "MentorInvite") navigate("/tutor");
                  else if (n.relatedEntityType === "StudyGroup" && n.relatedEntityId)
                    navigate(`/study-groups/${n.relatedEntityId}`);
                  else if (n.relatedEntityType === "Booking" || (n.type || "").includes("Booking"))
                    navigate("/bookings");
                }}
                className={`w-full text-left bg-white rounded-2xl border px-5 py-4 hover:shadow-md transition-shadow ${
                  n.isRead ? "border-slate-100" : "border-brand-200 bg-brand-50/40"
                }`}
              >
                <p className="font-medium text-slate-900">{n.title}</p>
                {n.content && <p className="text-sm text-slate-600 mt-1">{n.content}</p>}
                <p className="text-xs text-slate-400 mt-2">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString("vi-VN") : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
