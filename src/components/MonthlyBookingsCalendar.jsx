import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  User,
} from "lucide-react";

const WEEKDAYS = [
  { short: "T2", full: "Thứ 2" },
  { short: "T3", full: "Thứ 3" },
  { short: "T4", full: "Thứ 4" },
  { short: "T5", full: "Thứ 5" },
  { short: "T6", full: "Thứ 6" },
  { short: "T7", full: "Thứ 7" },
  { short: "CN", full: "Chủ nhật" },
];

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function MonthlyBookingsCalendar({
  items = [],
  selectedDate = null,
  onSelectDate = () => {},
  isTutor = false,
  userId = null,
}) {
  // Tìm tháng mặc định: ưu tiên tháng có buổi học gần nhất hoặc tháng hiện tại
  const initialDate = useMemo(() => {
    if (items.length > 0) {
      // Tìm booking đầu tiên có scheduledDate hợp lệ
      const sorted = [...items]
        .filter((b) => b.scheduledDate)
        .sort((a, b) => (a.scheduledDate > b.scheduledDate ? 1 : -1));
      if (sorted.length > 0) {
        const parts = sorted[0].scheduledDate.split("-");
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          // Nếu tháng trong quá khứ hoặc tương lai gần
          return new Date(y, m, 1);
        }
      }
    }
    return new Date();
  }, [items]);

  const [viewDate, setViewDate] = useState(initialDate);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const todayStr = useMemo(() => formatDateKey(new Date()), []);

  // Map bookings by date string "YYYY-MM-DD"
  const bookingsByDate = useMemo(() => {
    const map = {};
    for (const b of items) {
      if (!b.scheduledDate) continue;
      const key = b.scheduledDate.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    return map;
  }, [items]);

  // Thống kê trong tháng đang xem
  const monthStats = useMemo(() => {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const inMonth = items.filter((b) => (b.scheduledDate || "").startsWith(monthKey));
    return {
      total: inMonth.length,
      confirmed: inMonth.filter((b) => b.status === "Confirmed").length,
      pending: inMonth.filter((b) => b.status === "Pending").length,
      completed: inMonth.filter((b) => b.status === "Completed").length,
    };
  }, [items, year, month]);

  // Tạo các ô lịch (Grid cells: 35 hoặc 42 ô)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    // Thứ 2 = 0, ..., Chủ nhật = 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Ngày của tháng trước
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(year, month - 1, d);
      const key = formatDateKey(date);
      cells.push({
        dayNumber: d,
        dateKey: key,
        date,
        isCurrentMonth: false,
      });
    }

    // Ngày của tháng hiện tại
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const date = new Date(year, month, d);
      const key = formatDateKey(date);
      cells.push({
        dayNumber: d,
        dateKey: key,
        date,
        isCurrentMonth: true,
      });
    }

    // Ngày của tháng kế tiếp (lấp đầy hàng cuối)
    const totalSoFar = cells.length;
    const targetRows = totalSoFar > 35 ? 42 : 35;
    const remaining = targetRows - totalSoFar;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      const key = formatDateKey(date);
      cells.push({
        dayNumber: d,
        dateKey: key,
        date,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month]);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(todayStr);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden mb-8 transition-all">
      {/* Header cuốn lịch */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-brand-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-brand-100 text-brand-700">
                <CalendarIcon size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Tháng {month + 1}, {year}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {isTutor
                    ? "Cuốn lịch dạy tổng quan theo tháng · Bấm vào ngày để xem chi tiết ca dạy"
                    : "Cuốn lịch học tổng quan theo tháng · Bấm vào ngày để xem chi tiết ca học"}
                </p>
              </div>
            </div>
          </div>

          {/* Nút điều hướng tháng */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoToday}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs"
            >
              Hôm nay
            </button>
            <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200/60">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Tháng trước"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-xs"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 select-none">
                T{month + 1} / {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Tháng sau"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-xs"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Thanh tóm tắt chỉ số trong tháng */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <span className="font-semibold text-slate-600">Thống kê tháng:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
            <BookOpen size={13} className="text-slate-500" />
            Tổng: <strong className="font-bold text-slate-900">{monthStats.total}</strong> buổi
          </span>
          {monthStats.confirmed > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <CheckCircle2 size={13} />
              Đã xác nhận: <strong>{monthStats.confirmed}</strong>
            </span>
          )}
          {monthStats.pending > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              <AlertCircle size={13} />
              Chờ xác nhận: <strong>{monthStats.pending}</strong>
            </span>
          )}
          {monthStats.completed > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              <Sparkles size={13} />
              Đã hoàn thành: <strong>{monthStats.completed}</strong>
            </span>
          )}

          {selectedDate && (
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="ml-auto text-xs text-brand-600 hover:text-brand-800 font-semibold underline underline-offset-2"
            >
              ✕ Bỏ lọc ngày (Xem cả tháng)
            </button>
          )}
        </div>
      </div>

      {/* Lưới các thứ trong tuần (Weekdays Header) */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={w.short}
            className={`py-2.5 ${idx === 5 || idx === 6 ? "text-brand-700 bg-brand-50/40" : ""}`}
          >
            <span className="hidden sm:inline">{w.full}</span>
            <span className="sm:hidden">{w.short}</span>
          </div>
        ))}
      </div>

      {/* Lưới ngày trong tháng (Calendar Grid) */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100">
        {calendarCells.map((cell) => {
          const dayBookings = bookingsByDate[cell.dateKey] || [];
          const hasBookings = dayBookings.length > 0;
          const isToday = cell.dateKey === todayStr;
          const isSelected = selectedDate === cell.dateKey;

          return (
            <div
              key={cell.dateKey}
              onClick={() => onSelectDate(isSelected ? null : cell.dateKey)}
              className={`min-h-[92px] sm:min-h-[120px] p-1.5 sm:p-2 bg-white transition-all cursor-pointer relative flex flex-col justify-between group ${
                !cell.isCurrentMonth ? "bg-slate-50/50 text-slate-400 opacity-60" : "text-slate-800"
              } ${
                hasBookings
                  ? "bg-gradient-to-b from-brand-50/60 to-white hover:bg-brand-50/90 ring-1 ring-brand-300 shadow-xs z-10"
                  : "hover:bg-slate-50/80"
              } ${
                isSelected
                  ? "ring-2 ring-brand-600 bg-brand-100/50 z-20 shadow-md"
                  : ""
              }`}
            >
              {/* Header của ô ngày */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center text-xs sm:text-sm font-bold rounded-full transition-transform ${
                    isToday
                      ? "w-6 h-6 sm:w-7 sm:h-7 bg-brand-600 text-white shadow-sm ring-2 ring-brand-200"
                      : isSelected
                      ? "w-6 h-6 sm:w-7 sm:h-7 bg-slate-900 text-white"
                      : "text-slate-700 group-hover:scale-110"
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Badge số ca nếu có */}
                {hasBookings && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white shadow-xs">
                    {dayBookings.length} ca
                  </span>
                )}
              </div>

              {/* Danh sách các ca học/dạy trong ngày (Nổi bật lên) */}
              <div className="mt-1 space-y-1 flex-1 flex flex-col justify-start">
                {dayBookings.slice(0, 2).map((b) => {
                  const teaching = Number(b.tutorId) === Number(userId);
                  const counterpart = teaching ? b.studentName : b.tutorName;

                  // Màu sắc theo trạng thái
                  const isConfirmed = b.status === "Confirmed";
                  const isCompleted = b.status === "Completed";
                  const isPending = b.status === "Pending";

                  return (
                    <div
                      key={b.bookingId}
                      className={`p-1 sm:p-1.5 rounded-lg border text-left shadow-xs transition-all ${
                        isConfirmed
                          ? "bg-emerald-50/90 border-emerald-200 text-emerald-950 hover:border-emerald-300"
                          : isCompleted
                          ? "bg-blue-50/90 border-blue-200 text-blue-950 hover:border-blue-300"
                          : isPending
                          ? "bg-amber-50/90 border-amber-200 text-amber-950 hover:border-amber-300"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      {/* Dòng 1: Môn học + Badge trạng thái */}
                      <div className="flex items-center justify-between gap-1 leading-tight">
                        <span className="font-extrabold text-[11px] sm:text-xs truncate text-slate-900">
                          {b.subjectName || "Học kèm"}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1 rounded whitespace-nowrap ${
                            isConfirmed
                              ? "bg-emerald-200/80 text-emerald-900"
                              : isCompleted
                              ? "bg-blue-200/80 text-blue-900"
                              : isPending
                              ? "bg-amber-200/80 text-amber-900"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {isConfirmed ? "Đã duyệt" : isCompleted ? "Xong" : "Chờ"}
                        </span>
                      </div>

                      {/* Dòng 2: Thời gian (Giờ bắt đầu - Giờ kết thúc) */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-0.5 font-semibold">
                        <Clock size={10} className="shrink-0 text-slate-500" />
                        <span>
                          {b.startTime} - {b.endTime}
                        </span>
                      </div>

                      {/* Dòng 3: Tên người học / gia sư (ẩn trên mobile nhỏ để tránh vỡ ô) */}
                      {counterpart && (
                        <div className="hidden sm:block text-[9.5px] text-slate-500 truncate mt-0.5">
                          {counterpart}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Nếu có hơn 2 ca dạy trong 1 ngày */}
                {dayBookings.length > 2 && (
                  <div className="text-[10px] text-brand-700 font-bold text-center py-0.5 bg-brand-100/60 rounded">
                    + {dayBookings.length - 2} ca nữa
                  </div>
                )}
              </div>

              {/* Dấu chấm báo hiệu trên mobile nhỏ */}
              {hasBookings && (
                <div className="sm:hidden flex justify-center gap-0.5 mt-0.5">
                  {dayBookings.map((b, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        b.status === "Confirmed"
                          ? "bg-emerald-500"
                          : b.status === "Completed"
                          ? "bg-blue-500"
                          : "bg-amber-500"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Chú thích màu sắc (Legend) */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">Chú thích trạng thái:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            Đã xác nhận
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
            Chờ xác nhận / Chờ thanh toán
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200" />
            Đã hoàn thành
          </span>
        </div>

        <div className="text-slate-400 text-[11px]">
          * Bấm vào ô ngày để xem và xử lý các ca dạy của ngày đó
        </div>
      </div>
    </div>
  );
}
