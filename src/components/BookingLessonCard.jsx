import { Calendar, Clock, MapPin, MessageCircle, Wallet } from "lucide-react";

const STATUS = {
  Pending: { label: "Chờ xác nhận", className: "bg-orange-50 text-orange-600" },
  Confirmed: { label: "Đã xác nhận", className: "bg-verified-50 text-verified-600" },
  Rejected: { label: "Từ chối", className: "bg-red-50 text-red-600" },
  Cancelled: { label: "Đã hủy", className: "bg-slate-100 text-slate-600" },
  Completed: { label: "Hoàn thành", className: "bg-brand-50 text-brand-700" },
};

export default function BookingLessonCard({
  booking,
  counterpartName,
  onChat,
  actions,
}) {
  let status = STATUS[booking.status] || {
    label: booking.status,
    className: "bg-slate-100 text-slate-600",
  };

  if (booking.status === "Pending") {
    if (booking.paymentStatus === "Success") {
      status = { label: "Chờ gia sư duyệt", className: "bg-amber-50 text-amber-700 border border-amber-200" };
    } else {
      status = { label: "Chờ thanh toán", className: "bg-orange-50 text-orange-600 border border-orange-200" };
    }
  }

  return (
    <article className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-600">
            {booking.teachingMode || "Buổi học"}
          </p>
          <h3 className="font-semibold text-slate-900 mt-0.5">{booking.subjectName}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{counterpartName}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${status.className}`}>
            {status.label}
          </span>
          {booking.paymentStatus === "Success" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đã thanh toán (Tạm giữ)
            </span>
          )}
          {(booking.paymentStatus === "Unpaid" || booking.paymentStatus === "Pending") && booking.status !== "Cancelled" && booking.status !== "Rejected" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Chưa thanh toán
            </span>
          )}
          {booking.paymentStatus === "Refunded" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Đã hoàn tiền (100%)
            </span>
          )}
          {booking.paymentStatus === "PartiallyRefunded" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Đã hoàn một phần
            </span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600 mb-4">
        <p className="flex items-center gap-2">
          <Calendar size={15} className="text-brand-600" />
          {booking.scheduledDate}
        </p>
        <p className="flex items-center gap-2">
          <Clock size={15} className="text-brand-600" />
          {booking.startTime} – {booking.endTime}
        </p>
        {booking.location && (
          <p className="flex items-center gap-2 sm:col-span-2">
            <MapPin size={15} className="text-brand-600" />
            {booking.location}
          </p>
        )}
        {booking.price != null && (
          <p className="flex items-center gap-2">
            <Wallet size={15} className="text-brand-600" />
            {Number(booking.price).toLocaleString("vi-VN")} đ
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onChat && (
          <button
            type="button"
            onClick={onChat}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:text-brand-600 hover:border-brand-200 transition-colors"
          >
            <MessageCircle size={15} />
            Nhắn tin
          </button>
        )}
        {actions}
      </div>
    </article>
  );
}
