import { Calendar, Clock, MapPin, MessageCircle, Wallet } from "lucide-react";
import { useState } from "react";
import { createTutorReview } from "../api/study";

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
  canWriteReport = false,
  onSaveReport,
  onReviewed,
}) {
  let status = STATUS[booking.status] || {
    label: booking.status,
    className: "bg-slate-100 text-slate-600",
  };

  if (booking.status === "Pending") {
    if (booking.paymentType === "InPerson" || booking.paymentStatus === "Success") {
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
          {booking.paymentType === "InPerson" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              Tiền mặt khi gặp
            </span>
          )}
          {booking.paymentStatus === "Success" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đã thanh toán (Tạm giữ)
            </span>
          )}
          {(booking.paymentStatus === "Unpaid" || booking.paymentStatus === "Pending") && booking.paymentType !== "InPerson" && booking.status !== "Cancelled" && booking.status !== "Rejected" && (
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

      {booking.paymentType === "InPerson" && (
        <p className="mb-3 text-xs text-sky-800">Không chuyển khoản. Trả tiền mặt khi gặp, sau khi cả hai xác nhận học xong.</p>
      )}
      {booking.status === "Confirmed" && (
        <p className="mb-3 text-xs text-slate-500">
          Gia sư {booking.tutorCompleted ? "đã xác nhận dạy xong" : "chưa xác nhận"} · Học sinh {booking.studentCompleted ? "đã xác nhận học xong" : "chưa xác nhận"}
        </p>
      )}
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
      {booking.status === "Completed" && (
        <LessonReview booking={booking} isTutor={canWriteReport} onReviewed={onReviewed} />
      )}
      {booking.status === "Completed" && booking.learnerIsParent && (
        <LessonReportPanel booking={booking} canWrite={canWriteReport} onSave={onSaveReport} />
      )}
    </article>
  );
}

function LessonReview({ booking, isTutor, onReviewed }) {
  const [rating, setRating] = useState(booking.reviewRating || 5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (booking.hasReview || sent) {
    const stars = booking.reviewRating || rating;
    return (
      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
        <p className="text-xs font-semibold text-amber-800">Đánh giá buổi học</p>
        <p className="mt-1 text-amber-500">{ "★".repeat(stars) }{ "☆".repeat(Math.max(0, 5 - stars)) }</p>
        {(booking.reviewComment || comment) && <p className="mt-1 text-sm text-slate-700">{booking.reviewComment || comment}</p>}
      </div>
    );
  }

  if (isTutor) {
    return (
      <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Học sinh chưa đánh giá buổi học này.
      </p>
    );
  }

  return (
    <form
      className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await createTutorReview(booking.tutorId, { bookingId: booking.bookingId, rating, comment });
          setSent(true);
          onReviewed?.();
        } catch (err) {
          setError(err.response?.data?.message || "Không gửi được đánh giá.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm font-semibold text-slate-900">Đánh giá gia sư</p>
      <p className="mt-1 text-xs text-slate-500">Buổi đã hoàn thành. Chọn số sao và viết nhận xét.</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => setRating(star)} className={`text-2xl leading-none ${star <= rating ? "text-amber-500" : "text-slate-300"}`}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Buổi học thế nào, gia sư giải bài có rõ không?" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="mt-2 h-9 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white disabled:opacity-60">
        {busy ? "Đang gửi" : "Gửi đánh giá"}
      </button>
    </form>
  );
}

function LessonReportPanel({ booking, canWrite, onSave }) {
  const [content, setContent] = useState(booking.lessonReport || "");
  const [homework, setHomework] = useState(booking.lessonHomework || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!canWrite) {
    return (
      <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
        <p className="text-xs font-semibold text-brand-700">Đánh giá buổi học từ gia sư</p>
        {booking.lessonReport ? (
          <>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{booking.lessonReport}</p>
            {booking.lessonHomework && (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium">Bài về nhà: </span>
                {booking.lessonHomework}
              </p>
            )}
            {booking.lessonReportAt && (
              <p className="mt-2 text-[11px] text-slate-400">Gửi lúc {booking.lessonReportAt}</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Gia sư chưa gửi đánh giá. Khi có nhận xét, bạn sẽ thấy con đã học những gì ở đây.</p>
        )}
      </div>
    );
  }

  return (
    <form
      className="mt-4 rounded-xl border border-slate-200 p-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!onSave) return;
        setSaving(true);
        setError("");
        try {
          await onSave({ content, homework });
        } catch (err) {
          setError(err.response?.data?.message || "Không gửi được đánh giá.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-xs font-semibold text-slate-700">Đánh giá buổi học cho phụ huynh</p>
      <textarea
        required
        minLength={10}
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Con học những gì, mức độ hiểu bài, điểm cần luyện thêm..."
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        value={homework}
        onChange={(e) => setHomework(e.target.value)}
        placeholder="Bài về nhà (không bắt buộc)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="h-9 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Đang gửi..." : booking.lessonReport ? "Cập nhật đánh giá" : "Gửi cho phụ huynh"}
      </button>
    </form>
  );
}
