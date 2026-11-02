import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Sparkles } from "lucide-react";
import Navbar from "../components/Navbar";
import { isLoggedIn } from "../auth";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/study";
import { useToast } from "../components/ui/ToastContext";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { success } = useToast();

  const load = async () => {
    try {
      const data = await getNotifications();
      setItems(data.items || []);
    } catch {
      setError("Đăng nhập để xem thông báo.");
    } finally {
      setLoading(false);
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
          {items.length > 0 && !loading && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await markAllNotificationsRead();
                await load();
                success("Đã đánh dấu tất cả thông báo là đã đọc.");
              }}
            >
              Đánh dấu đã đọc
            </Button>
          )}
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <Spinner size="lg" className="text-brand-500" />
            <p className="text-sm">Đang tải thông báo...</p>
          </div>
        )}

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

        {!error && !loading && items.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-100">
            <EmptyState
              icon={<Bell size={26} />}
              title="Bạn chưa có thông báo mới"
              description="Khi gia sư xác nhận lịch học, thông báo sẽ xuất hiện tại đây."
            />
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
