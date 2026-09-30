import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  MessageSquare,
  Calendar,
  Home,
  RefreshCw,
  ShieldCheck,
  Check,
  Award,
  BookOpen,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import Navbar from "../components/Navbar";
import { getPaymentByBooking } from "../api/payment";
import { getMyBookings, openConversation } from "../api/study";
import { avatarUrl } from "../auth";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get("bookingId");
  const orderCode = searchParams.get("orderCode");
  const queryStatus = searchParams.get("status");

  const [payment, setPayment] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [payRes, bookings] = await Promise.all([
          getPaymentByBooking(bookingId).catch(() => null),
          getMyBookings().catch(() => [])
        ]);

        setPayment(payRes);
        const found = bookings.find((b) => b.bookingId === Number(bookingId));
        setBooking(found);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [bookingId]);

  const isSuccess =
    queryStatus === "success" ||
    payment?.status === "Success" ||
    booking?.status === "Confirmed";

  const handleOpenChat = async () => {
    if (booking?.tutorId) {
      try {
        const convId = await openConversation(booking.tutorId, booking.bookingId);
        navigate("/messages");
      } catch {
        navigate("/messages");
      }
    } else {
      navigate("/messages");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
          <h2 className="text-base font-bold text-slate-800">Đang đối soát kết quả giao dịch...</h2>
          <p className="text-xs text-slate-400 mt-1">Kết nối ngân hàng và hệ thống PayOS</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC] pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto pt-8 px-4 sm:px-6">
        {/* STEPPER TIẾN TRÌNH */}
        <div className="mb-8 bg-white/80 backdrop-blur rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                <Check size={15} strokeWidth={2.5} />
              </span>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">Chọn lịch</span>
            </div>
            <div className="flex-1 h-0.5 mx-3 bg-emerald-500" />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                <Check size={15} strokeWidth={2.5} />
              </span>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">Thanh toán</span>
            </div>
            <div className="flex-1 h-0.5 mx-3 bg-emerald-500" />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-brand-600/30 ring-4 ring-brand-100">
                3
              </span>
              <span className="text-xs font-bold text-brand-600">Gia sư duyệt</span>
            </div>
          </div>
        </div>

        {/* THẺ KẾT QUẢ CHÍNH */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl shadow-slate-200/50 text-center">
          {isSuccess ? (
            <>
              {/* Icon thành công với animation */}
              <div className="relative mx-auto w-20 h-20 mb-5">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-md shadow-emerald-500/10">
                  <CheckCircle2 size={44} className="text-emerald-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-brand-600 text-white p-1 rounded-full border-2 border-white shadow-xs">
                  <ShieldCheck size={16} />
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
                <Sparkles size={13} className="text-emerald-600" />
                Giao dịch được TSG Escrow bảo chứng thành công
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                Thanh toán thành công!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                Khoản học phí đã được giữ an toàn trong Quỹ TSG Escrow. Gia sư phụ trách đã nhận được thông báo xác nhận và sẽ duyệt lịch học ngay.
              </p>

              {/* Thông tin biên lai điện tử */}
              <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 text-xs sm:text-sm text-left space-y-3 mb-8 border border-slate-200/80">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <BookOpen size={16} className="text-brand-600" />
                    Biên lai điện tử TSG #{bookingId}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Đã thanh toán
                  </span>
                </div>

                {booking?.tutorName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Gia sư phụ trách:</span>
                    <span className="font-bold text-slate-900">{booking.tutorName}</span>
                  </div>
                )}

                {booking?.subjectName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Môn học:</span>
                    <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                      {booking.subjectName}
                    </span>
                  </div>
                )}

                {booking?.scheduledDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Thời gian buổi học:</span>
                    <span className="font-semibold text-slate-800">
                      {booking.scheduledDate} ({booking.startTime} – {booking.endTime})
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Số tiền đã ký quỹ:</span>
                  <span className="font-mono font-black text-brand-600 text-base sm:text-lg">
                    {Number(payment?.amount || booking?.price || 0).toLocaleString("vi-VN")} ₫
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Kênh thanh toán:</span>
                  <span className="font-medium text-slate-700">VietQR Open Banking (NAPAS 24/7)</span>
                </div>

                {(payment?.transactionCode || orderCode) && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Mã giao dịch PayOS:</span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      #{payment?.transactionCode || orderCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/bookings")}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md shadow-brand-600/25 cursor-pointer"
                >
                  <Calendar size={18} />
                  Xem lịch học của tôi
                </button>

                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
                >
                  <MessageSquare size={18} />
                  Nhắn tin với Gia sư
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-red-200">
                <XCircle size={44} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
                Giao dịch chưa hoàn tất
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                Hệ thống chưa nhận được khoản chuyển từ ngân hàng hoặc giao dịch đã hết hạn. Bạn có thể mở lại trang thanh toán để quét mã VietQR.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/checkout/${bookingId}`)}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md shadow-brand-600/25 cursor-pointer"
                >
                  <RefreshCw size={16} />
                  Thử thanh toán lại
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/bookings")}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
                >
                  <Calendar size={16} />
                  Lịch học của tôi
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
