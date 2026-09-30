import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Calendar,
  BookOpen,
  MapPin,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Lock,
  Tag,
  Download,
  Smartphone,
  RefreshCw,
  Info,
  Award,
  Wallet,
  Zap,
  CheckCheck
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "../components/Navbar";
import { getMyBookings } from "../api/study";
import { createPaymentIntent, getPaymentByBooking, getRefundPreview } from "../api/payment";
import { createAppHub } from "../api/hub";
import { isLoggedIn, avatarUrl } from "../auth";

const BANK_MAP = {
  "970422": "MB Bank (Ngân hàng Quân Đội)",
  "970415": "VietinBank (Công Thương)",
  "970436": "Vietcombank (Ngoại Thương)",
  "970418": "BIDV (Đầu Tư & Phát Triển)",
  "970407": "Techcombank (Kỹ Thương)",
  "970423": "TPBank (Tiên Phong)",
  "970432": "VPBank (Việt Nam Thịnh Vượng)",
  "970416": "ACB (Á Châu)",
  "970405": "Agribank (Nông Nghiệp)",
  "970403": "Sacombank",
  "970441": "VIB (Quốc Tế)",
  "970448": "OCB (Phương Đông)",
  "970443": "SHB",
  "970437": "HDBank",
  "970426": "MSB (Hàng Hải)",
  "970449": "LPBank (Bưu Điện Liên Việt)",
  "970454": "BVBank (Bản Việt)",
  "970438": "BaoViet Bank",
  "970414": "OceanBank",
  "970419": "NCB (Quốc Dân)",
  "970430": "PGBank",
  "970433": "VietBank",
  "970440": "SeABank",
  "970457": "Woori Bank",
  "970458": "UOB",
  "970462": "Shinhan Bank",
  "970428": "Nam A Bank",
  "970429": "SCB",
  "970452": "Kienlongbank",
  "970431": "Eximbank"
};

export default function Checkout() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [refundInfo, setRefundInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [qrImageError, setQrImageError] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  // 15-minute countdown timer
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  const initPayment = useCallback(async (bId) => {
    try {
      setPaying(true);
      const res = await createPaymentIntent(Number(bId));
      setPaymentData(res);
    } catch {
      // Cho phép người dùng bấm lại nút nếu auto-init gặp sự cố mạng
    } finally {
      setPaying(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [bookings, refund] = await Promise.all([
          getMyBookings().catch(() => []),
          getRefundPreview(bookingId).catch(() => null),
        ]);

        const found = bookings.find((b) => b.bookingId === Number(bookingId));
        if (isMounted) {
          if (!found) {
            setError("Không tìm thấy thông tin đơn đặt lịch này.");
          } else if (found.status === "Confirmed" || found.paymentStatus === "Success") {
            navigate(`/payment/result?bookingId=${bookingId}&status=success`);
            return;
          } else {
            setBooking(found);
            setRefundInfo(refund);
            // Tự động khởi tạo payment link ngay khi mở trang để học sinh quét QR tức thì
            initPayment(found.bookingId);
          }
        }
      } catch {
        if (isMounted) setError("Lỗi tải thông tin đơn hàng.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [bookingId, navigate, initPayment]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / (15 * 60)) * 100));

  // SignalR & Polling for Realtime Payment Confirmation
  useEffect(() => {
    let hub = null;
    let pollInterval = null;

    try {
      hub = createAppHub();
      hub.on("PaymentSucceeded", (data) => {
        if (Number(data.bookingId) === Number(bookingId)) {
          navigate(`/payment/result?bookingId=${bookingId}&status=success`);
        }
      });
      hub.start().catch(() => {});
    } catch {}

    // Polling fallback every 3.5 seconds if QR is displayed
    if (paymentData) {
      pollInterval = setInterval(async () => {
        try {
          const res = await getPaymentByBooking(bookingId);
          if (res && res.status === "Success") {
            navigate(`/payment/result?bookingId=${bookingId}&status=success`);
          }
        } catch {}
      }, 3500);
    }

    return () => {
      if (hub) hub.stop();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [bookingId, paymentData, navigate]);

  const handleStartPayment = async () => {
    try {
      setPaying(true);
      setError("");
      const res = await createPaymentIntent(Number(bookingId));
      setPaymentData(res);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể khởi tạo link thanh toán PayOS.");
    } finally {
      setPaying(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(""), 2500);
  };

  const applyCouponCode = (code) => {
    const cleanCode = code.trim().toUpperCase();
    setCouponCode(cleanCode);
    setCouponError("");
    setCouponSuccess("");

    const basePrice = Number(booking?.price || 0);
    if (cleanCode === "TSG50K") {
      setDiscount(50000);
      setCouponSuccess("Áp dụng mã TSG50K thành công! Giảm 50.000 ₫.");
    } else if (cleanCode === "TSGNEW" || cleanCode === "HOCVIENMOI") {
      const disc = Math.round(basePrice * 0.1);
      setDiscount(disc);
      setCouponSuccess(`Áp dụng mã ${cleanCode} thành công! Giảm 10% (${disc.toLocaleString("vi-VN")} ₫).`);
    } else {
      setCouponError("Mã ưu đãi không hợp lệ.");
      setDiscount(0);
    }
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    applyCouponCode(couponCode);
  };

  const handleCheckStatus = async () => {
    try {
      setCheckingStatus(true);
      setStatusMessage("");
      const res = await getPaymentByBooking(bookingId);
      if (res && res.status === "Success") {
        navigate(`/payment/result?bookingId=${bookingId}&status=success`);
      } else {
        setStatusMessage("Hệ thống chưa ghi nhận tiền về tài khoản. Nếu bạn vừa chuyển tiền xong, vui lòng chờ 3-5 giây để cổng PayOS và ngân hàng đồng bộ dữ liệu.");
        setTimeout(() => setStatusMessage(""), 7000);
      }
    } catch {
      setStatusMessage("Chưa tìm thấy giao dịch khớp lệnh. Vui lòng kiểm tra lại số tiền và chính xác nội dung chuyển khoản.");
      setTimeout(() => setStatusMessage(""), 6000);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDownloadQr = () => {
    if (paymentData?.qrImageUrl) {
      const link = document.createElement("a");
      link.href = paymentData.qrImageUrl;
      link.target = "_blank";
      link.download = `VietQR-TSG-BuoiHoc-${bookingId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const originalPrice = Number(booking?.price || 0);
  const finalPrice = Math.max(0, originalPrice - discount);
  const qrValue = paymentData?.qrCode || paymentData?.checkoutUrl || "";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck size={24} className="text-brand-600" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Đang thiết lập cổng thanh toán an toàn...</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Kết nối bảo mật 256-bit SSL với cổng VietQR Open Banking và kiểm tra quỹ tạm giữ TSG Escrow.
          </p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{error}</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Đơn đặt lịch này có thể đã được thanh toán, bị hủy hoặc không tồn tại trong hệ thống.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate("/cart")}
                className="w-full sm:w-auto bg-brand-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-brand-700 transition"
              >
                Vào giỏ hàng
              </button>
              <button
                onClick={() => navigate("/bookings")}
                className="w-full sm:w-auto bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                Xem lịch học của tôi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC] pb-24 text-slate-800">
      <Navbar />

      <main className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        {/* BREADCRUMB & BACK LINK */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Link to="/" className="hover:text-slate-800 transition">Trang chủ</Link>
            <span className="text-slate-300">/</span>
            <Link to="/cart" className="hover:text-slate-800 transition">Giỏ hàng</Link>
            <span className="text-slate-300">/</span>
            <span className="text-brand-600 font-semibold">Thanh toán bảo đảm #{booking?.bookingId}</span>
          </div>

          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600 transition bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs"
          >
            <ArrowLeft size={14} />
            Quay lại giỏ hàng
          </Link>
        </div>

        {/* MODERN STEPPER TIẾN TRÌNH THEO PHONG CÁCH EDUTCH / STITCH */}
        <div className="mb-8 bg-white/80 backdrop-blur rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="max-w-3xl mx-auto flex items-center justify-between relative">
            {/* Step 1: Chọn lịch & gia sư */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/20 ring-4 ring-emerald-50">
                <Check size={18} strokeWidth={2.5} />
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Bước 1</p>
                <p className="text-xs font-bold text-slate-900">Chọn lịch & Gia sư</p>
              </div>
            </div>

            {/* Line 1 */}
            <div className="flex-1 h-0.5 mx-3 sm:mx-6 bg-emerald-400 relative">
              <div className="absolute inset-0 bg-emerald-500" />
            </div>

            {/* Step 2: Thanh toán tạm giữ (Active) */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-brand-600/30 ring-4 ring-brand-100 animate-pulse">
                2
              </div>
              <div>
                <p className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">Bước 2</p>
                <p className="text-xs font-extrabold text-slate-900">Thanh toán Escrow</p>
              </div>
            </div>

            {/* Line 2 */}
            <div className="flex-1 h-0.5 mx-3 sm:mx-6 bg-slate-200" />

            {/* Step 3: Gia sư duyệt */}
            <div className="flex items-center gap-3 relative z-10 opacity-60">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bước 3</p>
                <p className="text-xs font-medium text-slate-600">Gia sư duyệt & Học</p>
              </div>
            </div>
          </div>
        </div>

        {/* HERO EXECUTIVE ESCROW BANNER WITH TIMER */}
        <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1E4D] via-[#16307F] to-[#1D3FAE] p-6 sm:p-8 text-white shadow-xl shadow-brand-900/15">
          {/* Subtle background glow effect */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 backdrop-blur-md">
                  <ShieldCheck size={14} className="text-emerald-300" />
                  100% TSG Escrow Bảo Vệ
                </span>
                <span className="text-xs text-white/70 hidden sm:inline">•</span>
                <span className="text-xs text-white/80 font-medium">
                  Cơ chế giải ngân an toàn tuyệt đối cho người học
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Thanh toán tạm giữ an toàn qua Quỹ TSG Escrow
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-2 leading-relaxed">
                Khoản học phí của bạn được ký quỹ an toàn tại ngân hàng và <strong>chưa chuyển cho gia sư</strong>. Gia sư chỉ được giải ngân sau khi buổi học diễn ra trọn vẹn và đạt yêu cầu. Bạn được hoàn trả 100% nếu gia sư từ chối hoặc bận lịch.
              </p>

              {/* 3 mini assurance highlights */}
              <div className="flex flex-wrap gap-4 pt-4 mt-2 border-t border-white/10 text-xs text-white/90">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-300" />
                  <span>Hoàn 100% nếu bị hủy lịch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock size={14} className="text-blue-200" />
                  <span>Bảo mật chuẩn ngân hàng 256-bit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-300" />
                  <span>Xác nhận tự động trong 2 giây</span>
                </div>
              </div>
            </div>

            {/* Countdown pill widget */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center shrink-0 min-w-[210px] text-center shadow-inner">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock size={16} className="text-amber-300 animate-spin-slow" />
                <span className="text-[11px] uppercase font-bold tracking-wider text-white/80">Thời gian giữ chỗ</span>
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-black text-amber-300 tracking-wider">
                {formatTimer(timeLeft)}
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${timerPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-white/60 mt-1.5">Lịch học sẽ được giải phóng khi hết giờ</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm flex items-center gap-3 shadow-sm">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* 2-COLUMN MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI (7 CỘT) - CHI TIẾT BUỔI HỌC, PHƯƠNG THỨC & CHÍNH SÁCH */}
          <div className="lg:col-span-7 space-y-6">
            {/* CARD 1: THÔNG TIN BUỔI HỌC & GIA SƯ */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shadow-2xs border border-brand-100">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Thông tin buổi học</h2>
                    <p className="text-xs text-slate-400">Mã đơn đặt lịch: #{booking?.bookingId}</p>
                  </div>
                </div>

                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Chờ thanh toán
                </span>
              </div>

              {/* Thông tin gia sư phụ trách */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 mb-5">
                <img
                  src={avatarUrl(booking?.tutorName || "Gia sư")}
                  alt={booking?.tutorName}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-brand-100 shrink-0 shadow-xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base truncate">
                      {booking?.tutorName || "Gia sư chuyên môn"}
                    </h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-verified-50 text-verified-600 border border-verified-600/20 inline-flex items-center gap-1 shrink-0">
                      <Award size={12} className="text-verified-600" />
                      Gia sư đã xác thực
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Môn học phụ trách: <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">{booking?.subjectName || "Đang cập nhật"}</span>
                  </p>
                </div>
              </div>

              {/* Grid 4 chi tiết thời gian & địa điểm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-2xs hover:border-brand-200 transition">
                  <span className="text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
                    <Calendar size={15} className="text-brand-600" /> Ngày diễn ra:
                  </span>
                  <p className="text-sm font-extrabold text-slate-800">{booking?.scheduledDate || "Chưa xác định"}</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-2xs hover:border-brand-200 transition">
                  <span className="text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
                    <Clock size={15} className="text-brand-600" /> Khung giờ học:
                  </span>
                  <p className="text-sm font-extrabold text-slate-800">{booking?.startTime} – {booking?.endTime}</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-2xs sm:col-span-2 hover:border-brand-200 transition">
                  <span className="text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
                    <MapPin size={15} className="text-brand-600" /> Hình thức & Địa điểm:
                  </span>
                  <p className="text-sm font-bold text-slate-800">
                    {booking?.teachingMode === "Online"
                      ? "Học trực tuyến 1-kèm-1 qua Google Meet (Link lớp học được kích hoạt tự động sau khi gia sư duyệt)"
                      : `Học trực tiếp (${booking?.location || "Tại địa chỉ đã thỏa thuận với gia sư"})`}
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: PHƯƠNG THỨC THANH TOÁN TIÊU CHUẨN */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm shadow-2xs border border-brand-100">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Phương thức thanh toán</h2>
                    <p className="text-xs text-slate-400">Chọn kênh chuyển khoản tiện lợi nhất cho bạn</p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                  Miễn 100% phí giao dịch
                </span>
              </div>

              {/* Tùy chọn VietQR PayOS Active */}
              <div className="p-5 border-2 border-brand-500 bg-gradient-to-r from-brand-50/50 to-indigo-50/30 rounded-2xl relative shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-brand-100">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                        <QrCode size={18} className="text-emerald-600" />
                        Chuyển khoản VietQR Open Banking (PayOS)
                      </span>
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Khớp lệnh 2 giây
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử (MoMo, ZaloPay, Viettel Money). Hệ thống tự động điền sẵn số tài khoản, người nhận, số tiền và nội dung chuyển khoản. Không lo sai sót!
                    </p>

                    {/* Logo ngân hàng đối tác */}
                    <div className="pt-3 border-t border-brand-100/70">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Hỗ trợ tất cả ngân hàng NAPAS 24/7:</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">Vietcombank</span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">Techcombank</span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">MB Bank</span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">BIDV</span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">ACB</span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">TPBank</span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">VPBank</span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">MoMo</span>
                        <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-bold border border-brand-200">+35 App khác</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: CHÍNH SÁCH BẢO HỘ HỌC VIÊN & HOÀN TIỀN MINH BẠCH */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm transition hover:shadow-md">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-2xs border border-emerald-100">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Chính sách bảo vệ học viên & Hoàn hủy</h2>
                  <p className="text-xs text-slate-400">Minh bạch 100% theo quy chuẩn TSG Escrow</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                {refundInfo?.description || "Bạn hoàn toàn an tâm khi thanh toán qua hệ thống. Mọi giao dịch đều được đảm bảo bởi chính sách hoàn tiền tự động của TSG:"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="inline-block w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs leading-8 mb-2">
                    100%
                  </span>
                  <p className="font-extrabold text-emerald-800 text-sm">Hoàn tiền 100%</p>
                  <p className="text-[11px] text-emerald-700/80 mt-1 leading-normal">
                    Khi hủy trước &ge; 24h hoặc gia sư từ chối / bận lịch
                  </p>
                </div>

                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 shadow-2xs">
                  <span className="inline-block w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black text-xs leading-8 mb-2">
                    50%
                  </span>
                  <p className="font-extrabold text-amber-800 text-sm">Hoàn tiền 50%</p>
                  <p className="text-[11px] text-amber-700/80 mt-1 leading-normal">
                    Khi học viên chủ động hủy trước từ 12h đến 24h
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="inline-block w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs leading-8 mb-2">
                    0%
                  </span>
                  <p className="font-extrabold text-slate-700 text-sm">Không hoàn tiền</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Hủy sát giờ dưới 12h (đảm bảo quyền lợi gia sư)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (5 CỘT) - TỔNG HỢP CHI PHÍ & KHUNG QUÉT QR VIETQR PAYOS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xl shadow-slate-200/50 sticky top-20 space-y-6">
              {/* Header tóm tắt */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Wallet size={20} className="text-brand-600" />
                  <h2 className="text-lg font-extrabold text-slate-900">Chi tiết thanh toán</h2>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                  Buổi học #{booking?.bookingId}
                </span>
              </div>

              {/* Nhập mã giảm giá Coupon */}
              <div className="space-y-2">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nhập mã ưu đãi (TSG50K, TSGNEW)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs uppercase font-semibold focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </form>

                {/* Gợi ý coupon nhanh */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Mã gợi ý:</span>
                  <button
                    type="button"
                    onClick={() => applyCouponCode("TSG50K")}
                    className="px-2 py-0.5 rounded bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold border border-brand-200 transition cursor-pointer"
                  >
                    TSG50K (-50k)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCouponCode("TSGNEW")}
                    className="px-2 py-0.5 rounded bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold border border-brand-200 transition cursor-pointer"
                  >
                    TSGNEW (-10%)
                  </button>
                </div>

                {couponSuccess && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 font-semibold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <CheckCircle2 size={14} className="shrink-0" /> {couponSuccess}
                  </p>
                )}
                {couponError && (
                  <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-xl border border-red-200">
                    {couponError}
                  </p>
                )}
              </div>

              {/* Bảng phân rã chi phí */}
              <div className="space-y-3 text-xs sm:text-sm bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Học phí buổi học:</span>
                  <span className="font-bold text-slate-900">
                    {originalPrice.toLocaleString("vi-VN")} ₫
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles size={13} /> Khuyến mãi áp dụng:
                    </span>
                    <span>-{discount.toLocaleString("vi-VN")} ₫</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    Phí bảo chứng TSG Escrow:
                  </span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCheck size={14} className="text-emerald-600" /> Miễn phí
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">Tổng thanh toán:</span>
                    <p className="text-[10px] text-slate-400">Tiền được tạm giữ đến khi hoàn thành buổi học</p>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-brand-600 tracking-tight">
                    {finalPrice.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>

              {/* KHU VỰC HIỂN THỊ VIETQR PAYOS */}
              {!paymentData ? (
                <button
                  onClick={handleStartPayment}
                  disabled={paying}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-4 px-4 rounded-2xl text-sm shadow-lg shadow-brand-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {paying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang khởi tạo mã VietQR...
                    </>
                  ) : (
                    <>
                      <QrCode size={18} />
                      Tạo mã VietQR thanh toán
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Khung hiển thị QR code chuẩn VietQR */}
                  <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-3xl border border-slate-200/90 text-center relative shadow-sm">
                    {/* Header VietQR & Napas */}
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-800 mb-3">
                      <Smartphone size={16} className="text-brand-600" />
                      Mở ứng dụng Ngân hàng để quét mã VietQR:
                    </div>

                    {paymentData.qrImageUrl && !qrImageError ? (
                      <div className="bg-white p-3 rounded-2xl shadow-sm inline-block border border-slate-200/80 relative group max-w-[290px] mx-auto">
                        <img
                          src={paymentData.qrImageUrl}
                          alt="Mã thanh toán VietQR"
                          className="w-full h-auto object-contain rounded-xl"
                          onError={() => setQrImageError(true)}
                        />
                        <div className="mt-2.5 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadQr}
                            className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-brand-200 shadow-2xs"
                          >
                            <Download size={14} /> Lưu mã QR về máy
                          </button>
                        </div>
                      </div>
                    ) : qrValue ? (
                      <div className="bg-white p-4 rounded-2xl shadow-sm inline-block border border-slate-200 relative group">
                        <QRCodeSVG
                          value={qrValue}
                          size={220}
                          level="M"
                          includeMargin={true}
                          className="mx-auto rounded-lg"
                        />
                        <div className="mt-2 text-[11px] text-slate-500 font-medium">
                          Quét mã bằng bất kỳ App Ngân hàng hoặc Camera điện thoại
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center py-8">
                        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">
                          Đang khởi tạo mã thanh toán VietQR...
                        </p>
                      </div>
                    )}

                    {/* Thanh realtime radar pulse */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50/90 py-2 px-3 rounded-xl border border-emerald-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      <span>Đang chờ hệ thống ngân hàng xác nhận giao dịch...</span>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                      Màn hình sẽ tự động chuyển hướng sang biên lai thành công khi nhận được tín hiệu.
                    </p>
                  </div>

                  {/* THÔNG TIN CHUYỂN KHOẢN THỦ CÔNG */}
                  <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <CreditCard size={15} className="text-brand-600" /> Thông tin chuyển khoản thủ công
                      </span>
                      <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                        24/7 NAPAS
                      </span>
                    </div>

                    {/* Ngân hàng */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ngân hàng:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {BANK_MAP[paymentData.bin] || paymentData.bin || "Ngân hàng Phương Đông (OCB)"}
                      </span>
                    </div>

                    {/* Số tài khoản */}
                    {paymentData.accountNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Số tài khoản:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentData.accountNumber, "accountNumber")}
                          className="font-mono font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-brand-300 shadow-2xs transition cursor-pointer"
                        >
                          {paymentData.accountNumber}
                          {copiedField === "accountNumber" ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} className="text-slate-400" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Chủ tài khoản */}
                    {paymentData.accountName && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Người thụ hưởng:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentData.accountName, "accountName")}
                          className="font-bold text-slate-800 flex items-center gap-1 uppercase hover:text-brand-600 cursor-pointer"
                        >
                          {paymentData.accountName}
                          {copiedField === "accountName" ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} className="text-slate-400" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Số tiền */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Số tiền:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(paymentData.amount || finalPrice), "amount")}
                        className="font-mono font-black text-emerald-600 text-sm sm:text-base flex items-center gap-1.5 hover:text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-emerald-300 shadow-2xs transition cursor-pointer"
                      >
                        {(paymentData.amount || finalPrice).toLocaleString("vi-VN")} ₫
                        {copiedField === "amount" ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} className="text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Nội dung chuyển khoản */}
                    {paymentData.description && (
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-slate-600 font-medium">Nội dung CK:</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentData.description, "desc")}
                            className="font-mono font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 hover:bg-brand-100 transition cursor-pointer shadow-2xs"
                          >
                            {paymentData.description}
                            {copiedField === "desc" ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} className="text-brand-500" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-amber-700 font-medium bg-amber-50/70 p-2 rounded-xl border border-amber-200/80 leading-relaxed">
                          ⚠️ <strong>Quan trọng:</strong> Vui lòng giữ nguyên nội dung chuyển khoản để PayOS tự động nhận diện và kích hoạt buổi học ngay tức khắc.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Nút hành động kiểm tra & Mở link */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleCheckStatus}
                      disabled={checkingStatus}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      {checkingStatus ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang kiểm tra từ ngân hàng...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={15} />
                          Tôi đã chuyển khoản – Kiểm tra ngay
                        </>
                      )}
                    </button>

                    {statusMessage && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2 shadow-2xs">
                        <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                        <span className="leading-relaxed">{statusMessage}</span>
                      </div>
                    )}

                    {paymentData.checkoutUrl && (
                      <a
                        href={paymentData.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 border border-slate-200"
                      >
                        <ExternalLink size={14} />
                        Mở trang PayOS (nếu thanh toán qua thẻ ATM / Quốc tế)
                      </a>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                      <span>Mã giao dịch PayOS:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(paymentData.orderCode), "orderCode")}
                        className="font-mono font-bold text-slate-800 hover:text-brand-600 flex items-center gap-1 transition"
                      >
                        #{paymentData.orderCode}
                        {copiedField === "orderCode" ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} className="text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Thông tin bảo mật chân thẻ */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock size={12} /> SSL 256-bit
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck size={12} /> Open Banking NAPAS
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> PayOS Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
