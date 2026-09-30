import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Sparkles } from "lucide-react";
import Navbar from "../components/Navbar";
import BookingLessonCard from "../components/BookingLessonCard";
import CancelRefundModal from "../components/CancelRefundModal";
import { getUser, isLoggedIn } from "../auth";
import { confirmBooking, getMyBookings, openConversation, rejectBooking } from "../api/study";

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "today", label: "Hôm nay" },
  { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
];

export default function MyBookings() {
  const navigate = useNavigate();
  const user = getUser();
  const isTutor = (user?.role || "").toLowerCase() === "tutor";
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState(isTutor ? "pending" : "all");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cancelBookingId, setCancelBookingId] = useState(null);

  const load = () => getMyBookings().then(setItems);

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login");
    else load().catch(() => setError("Không tải được lịch học."));
  }, [navigate]);

  const visible = useMemo(() => {
    if (filter === "today") return items.filter((b) => b.isToday);
    if (filter === "pending") return items.filter((b) => b.status === "Pending");
    if (filter === "confirmed") return items.filter((b) => b.status === "Confirmed");
    return items;
  }, [items, filter]);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <section className="relative overflow-hidden pt-12 pb-8 px-6">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)",
          }}
        />
        <div className="max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} />
            Lịch học được xác thực trên TSG
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Lịch <span className="text-brand-600">{isTutor ? "dạy" : "học"}</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            {isTutor
              ? "Xác nhận đơn của học viên. Học viên sẽ nhận thông báo ngay khi bạn duyệt."
              : "Theo dõi các buổi đã đặt với gia sư, đơn chờ xác nhận và lịch hôm nay."}
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 mb-6">
          <div className="flex overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  filter === f.id
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 text-sm text-verified-600 bg-verified-50 border border-emerald-100 rounded-lg px-3 py-2">
            {info}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-3">
              <CalendarClock size={26} />
            </span>
            <p className="font-medium text-slate-900">Chưa có buổi học</p>
            <p className="text-sm text-slate-500 mt-1">
              {isTutor
                ? "Khi học viên đặt lịch, đơn sẽ hiện tại đây để bạn xác nhận hoặc từ chối."
                : "Khi bạn đặt lịch, buổi học sẽ hiện tại đây."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visible.map((b) => (
              <BookingLessonCard
                key={b.bookingId}
                booking={b}
                counterpartName={isTutor ? b.studentName : b.tutorName}
                onChat={async () => {
                  const other = isTutor ? b.studentId : b.tutorId;
                  const id = await openConversation(other, b.bookingId);
                  navigate(`/messages?c=${id}`);
                }}
                actions={
                  isTutor && b.status === "Pending" ? (
                    <div className="flex items-center gap-2">
                      {b.paymentStatus !== "Success" && Number(b.price) > 0 ? (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                          Chờ học viên thanh toán
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="h-9 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors shadow-sm"
                          onClick={async () => {
                            try {
                              const res = await confirmBooking(b.bookingId);
                              setInfo(res.message);
                              load();
                            } catch (err) {
                              setError(err.response?.data?.message || "Lỗi khi xác nhận buổi học.");
                            }
                          }}
                        >
                          Xác nhận
                        </button>
                      )}
                      <button
                        type="button"
                        className="h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                        onClick={async () => {
                          const confirmText = b.paymentStatus === "Success"
                            ? "Bạn có chắc muốn từ chối buổi học này? Hệ thống sẽ tự động hoàn 100% tiền tạm giữ cho học viên."
                            : "Bạn có chắc muốn từ chối buổi học này?";
                          if (window.confirm(confirmText)) {
                            try {
                              const res = await rejectBooking(b.bookingId);
                              setInfo(res.message);
                              load();
                            } catch (err) {
                              setError(err.response?.data?.message || "Lỗi khi từ chối buổi học.");
                            }
                          }
                        }}
                      >
                        Từ chối
                      </button>
                    </div>
                  ) : !isTutor ? (
                    <div className="flex items-center gap-2">
                      {(b.paymentStatus === "Unpaid" || b.paymentStatus === "Pending") && b.status !== "Cancelled" && b.status !== "Rejected" && (
                        <button
                          type="button"
                          onClick={() => navigate(`/checkout/${b.bookingId}`)}
                          className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-sm"
                        >
                          Thanh toán
                        </button>
                      )}
                      {(b.status === "Confirmed" || b.status === "Pending") && (
                        <button
                          type="button"
                          onClick={() => setCancelBookingId(b.bookingId)}
                          className="h-9 px-3.5 rounded-lg border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 text-sm font-medium hover:bg-red-50/50 transition-colors"
                        >
                          Hủy buổi học
                        </button>
                      )}
                    </div>
                  ) : null
                }
              />
            ))}
          </div>
        )}

        {cancelBookingId && (
          <CancelRefundModal
            bookingId={cancelBookingId}
            onClose={() => setCancelBookingId(null)}
            onSuccess={(msg) => {
              setInfo(msg);
              load();
            }}
          />
        )}

        <p className="text-xs text-slate-400 mt-6">
          Đến ngày học, hệ thống tự gửi thông báo nhắc cho học viên và gia sư.
        </p>
      </main>
    </div>
  );
}
