import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  Sparkles,
  Calendar as CalendarIcon,
  List as ListIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
} from "lucide-react";
import BookingLessonCard from "../components/BookingLessonCard";
import CancelRefundModal from "../components/CancelRefundModal";
import MonthlyBookingsCalendar from "../components/MonthlyBookingsCalendar";
import WeeklyScheduleManager from "../components/WeeklyScheduleManager";
import { getUser, isLoggedIn } from "../auth";
import {
  completeBooking,
  confirmBooking,
  getMyBookings,
  getTutorWorkspace,
  openConversation,
  rejectBooking,
  saveLessonReport,
} from "../api/study";
import { useCart } from "../context/CartContext";
import EmptyState from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";

const DAYS = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "today", label: "Hôm nay" },
  { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "completed", label: "Hoàn thành" },
];

export default function MyBookings() {
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const user = getUser();
  const isTutor = (user?.role || "").toLowerCase() === "tutor";
  const isParent = (user?.role || "").toLowerCase() === "parent";
  const [items, setItems] = useState([]);
  const [slots, setSlots] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chế độ xem: "calendar" (Cuốn lịch tháng) hoặc "list" (Danh sách)
  const [viewMode, setViewMode] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSlots, setShowSlots] = useState(true);

  // Chuẩn hóa khung giờ cố định: luôn hiển thị theo Thứ trong tuần + Giờ học (không hiển thị ngày)
  const fixedSlots = useMemo(() => {
    return slots
      .map((slot) => {
        let dow = slot.dayOfWeek;
        // Nếu slot cũ trong database có specificDate mà thiếu dayOfWeek thì chuyển thành Thứ tương ứng
        if ((dow == null || dow < 1 || dow > 7) && slot.specificDate) {
          const parts = slot.specificDate.split("-");
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            const jsDay = d.getDay();
            dow = jsDay === 0 ? 7 : jsDay;
          }
        }
        const safeDow = dow >= 1 && dow <= 7 ? dow : 1;
        return {
          ...slot,
          resolvedDayOfWeek: safeDow,
          dayLabel: DAYS[safeDow] || `Thứ ${safeDow}`,
        };
      })
      .sort((a, b) => {
        if (a.resolvedDayOfWeek !== b.resolvedDayOfWeek) {
          return a.resolvedDayOfWeek - b.resolvedDayOfWeek;
        }
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
  }, [slots]);

  const load = () =>
    getMyBookings()
      .then(setItems)
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login");
    else {
      load().catch(() => setError("Không tải được lịch học."));
      if (isTutor) {
        getTutorWorkspace()
          .then((ws) => setSlots(Array.isArray(ws?.slots) ? ws.slots : []))
          .catch(() => setSlots([]));
      }
    }
  }, [navigate, isTutor]);

  const visible = useMemo(() => {
    // Nếu đang chọn một ngày cụ thể trên cuốn lịch
    if (selectedDate) {
      return items.filter((b) => (b.scheduledDate || "").startsWith(selectedDate));
    }
    if (filter === "today") return items.filter((b) => b.isToday);
    if (filter === "pending") return items.filter((b) => b.status === "Pending");
    if (filter === "confirmed") return items.filter((b) => b.status === "Confirmed");
    if (filter === "completed") return items.filter((b) => b.status === "Completed");
    return items;
  }, [items, filter, selectedDate]);

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden pt-12 pb-8 px-6">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)",
          }}
        />
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full w-fit">
              <Sparkles size={14} />
              Lịch học được xác thực trên TSG
            </span>

            {/* Nút chuyển đổi chế độ xem: Cuốn lịch tháng / Danh sách */}
            <div className="inline-flex items-center bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setViewMode("calendar");
                  setSelectedDate(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === "calendar"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <CalendarIcon size={14} />
                Cuốn lịch tháng
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  setSelectedDate(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === "list"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <ListIcon size={14} />
                Dạng danh sách
              </button>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Lịch <span className="text-brand-600">{isTutor ? "dạy" : isParent ? "của con" : "học"}</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            {isTutor
              ? "Theo dõi toàn bộ ca dạy trên cuốn lịch theo tháng, xác nhận đơn và hoàn thành buổi học."
              : isParent
                ? "Đặt lịch, thanh toán và theo dõi buổi học của con trên cuốn lịch tháng trực quan."
                : "Theo dõi các buổi đã đặt với gia sư, đơn chờ xác nhận và lịch học theo tháng."}
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* Lịch dạy cố định hàng tuần (Thứ 2 đến Chủ nhật) */}
        {isTutor && (
          <WeeklyScheduleManager
            slots={slots}
            canEdit={true}
            onChanged={async () => {
              try {
                const ws = await getTutorWorkspace();
                setSlots(Array.isArray(ws?.slots) ? ws.slots : []);
              } catch {
                // ignore
              }
            }}
          />
        )}

        {/* Thanh lọc trạng thái (khi xem dạng danh sách hoặc muốn lọc nhanh) */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-2 mb-6">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-500 px-3 flex items-center gap-1 shrink-0">
                <Filter size={13} />
                Lọc:
              </span>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFilter(f.id);
                    setSelectedDate(null);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    filter === f.id && !selectedDate
                      ? "bg-brand-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {selectedDate && (
              <div className="flex items-center gap-2 pr-2 shrink-0">
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg">
                  Đang lọc ngày: {selectedDate}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-slate-500 hover:text-red-600 font-bold"
                >
                  ✕ Hủy
                </button>
              </div>
            )}
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

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <Spinner size="lg" className="text-brand-500" />
            <p className="text-sm">Đang tải lịch học...</p>
          </div>
        ) : (
          <>
            {/* 1. HIỂN THỊ CUỐN LỊCH THÁNG (KHI VIEWMODE = CALENDAR) */}
            {viewMode === "calendar" && (
              <MonthlyBookingsCalendar
                items={items}
                selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate(d)}
                isTutor={isTutor}
                userId={user?.userId}
              />
            )}

            {/* 2. DANH SÁCH CHI TIẾT CÁC BUỔI DẠY */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock size={18} className="text-brand-600" />
                  {selectedDate
                    ? `Chi tiết ca dạy ngày ${selectedDate} (${visible.length} ca)`
                    : `Danh sách ca dạy (${visible.length} ca)`}
                </h3>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="text-xs font-bold text-brand-600 hover:text-brand-800"
                  >
                    Xem tất cả các ca trong danh sách
                  </button>
                )}
              </div>

              {visible.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-xs">
                  <EmptyState
                    icon={<CalendarClock size={28} className="text-slate-400" />}
                    title={
                      selectedDate
                        ? `Không có ca dạy nào trong ngày ${selectedDate}`
                        : "Chưa có buổi học nào"
                    }
                    description={
                      selectedDate
                        ? "Bấm vào ngày khác trên cuốn lịch tháng hoặc chọn 'Xem tất cả' để xem toàn bộ lịch."
                        : isTutor
                        ? "Khi học viên đặt lịch, đơn sẽ hiện tại đây để bạn xác nhận hoặc từ chối."
                        : "Khi bạn đặt lịch, buổi học sẽ hiện tại đây."
                    }
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(null)}
                      className="mt-4 inline-flex items-center px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                    >
                      Quay lại xem toàn bộ lịch
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {visible.map((b) => {
                    const teaching = Number(b.tutorId) === Number(user?.userId);
                    return (
                      <BookingLessonCard
                        key={b.bookingId}
                        booking={b}
                        counterpartName={teaching ? b.studentName : b.tutorName}
                        canWriteReport={teaching}
                        onSaveReport={async (payload) => {
                          const res = await saveLessonReport(b.bookingId, payload);
                          setInfo(res.message);
                          await load();
                        }}
                        onReviewed={load}
                        onChat={async () => {
                          const other = teaching ? b.studentId : b.tutorId;
                          const id = await openConversation(other, b.bookingId);
                          navigate(`/messages?c=${id}`);
                        }}
                        actions={
                          teaching && b.status === "Pending" ? (
                            <div className="flex items-center gap-2">
                              {b.paymentStatus !== "Success" &&
                              Number(b.price) > 0 ? (
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
                                      setError(
                                        err.response?.data?.message || "Lỗi khi xác nhận buổi học."
                                      );
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
                                  const confirmText =
                                    b.paymentStatus === "Success"
                                      ? "Bạn có chắc muốn từ chối buổi học này? Hệ thống sẽ tự động hoàn 100% tiền tạm giữ cho học viên."
                                      : "Bạn có chắc muốn từ chối buổi học này?";
                                  if (window.confirm(confirmText)) {
                                    try {
                                      const res = await rejectBooking(b.bookingId);
                                      setInfo(res.message);
                                      load();
                                    } catch (err) {
                                      setError(
                                        err.response?.data?.message || "Lỗi khi từ chối buổi học."
                                      );
                                    }
                                  }
                                }}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : b.status === "Confirmed" ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {(teaching && b.tutorCompleted) ||
                              (!teaching && b.studentCompleted) ? (
                                <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                                  {teaching
                                    ? "Đã xác nhận dạy xong — chờ học viên"
                                    : "Đã xác nhận học xong — chờ gia sư"}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="h-9 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
                                  onClick={async () => {
                                    try {
                                      const res = await completeBooking(b.bookingId);
                                      setInfo(res.message);
                                      load();
                                    } catch (err) {
                                      setError(
                                        err.response?.data?.message ||
                                          "Không xác nhận hoàn thành được."
                                      );
                                    }
                                  }}
                                >
                                  {teaching ? "Xác nhận dạy xong" : "Xác nhận học xong"}
                                </button>
                              )}
                              {!teaching && (
                                <button
                                  type="button"
                                  onClick={() => setCancelBookingId(b.bookingId)}
                                  className="h-9 px-3.5 rounded-lg border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 text-sm font-medium hover:bg-red-50/50 transition-colors"
                                >
                                  Hủy buổi học
                                </button>
                              )}
                            </div>
                          ) : !teaching ? (
                            <div className="flex items-center gap-2">
                              {(b.paymentStatus === "Unpaid" ||
                                  b.paymentStatus === "Pending") &&
                                b.status !== "Cancelled" &&
                                b.status !== "Rejected" && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/checkout/${b.bookingId}`)}
                                    className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-sm"
                                  >
                                    Thanh toán
                                  </button>
                                )}
                              {b.status === "Pending" && (
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
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {cancelBookingId && (
          <CancelRefundModal
            bookingId={cancelBookingId}
            onClose={() => setCancelBookingId(null)}
            onSuccess={(msg) => {
              setInfo(msg);
              load();
              refreshCart();
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
