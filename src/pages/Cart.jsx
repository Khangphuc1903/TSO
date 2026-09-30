import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Trash2,
  User,
  Sparkles,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { avatarUrl } from "../auth";

export default function Cart() {
  const navigate = useNavigate();
  const {
    cartItems,
    cartCount,
    loading,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    removeItem,
  } = useCart();

  const [deletingId, setDeletingId] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.bookingId));
  const subtotal = selectedItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError("");
    setCouponSuccess("");
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === "TSG50K") {
      setDiscount(50000);
      setCouponSuccess("Áp dụng mã TSG50K thành công! Giảm 50.000 ₫.");
    } else if (code === "TSGNEW" || code === "HOCVIENMOI") {
      const disc = Math.round(subtotal * 0.1);
      setDiscount(disc);
      setCouponSuccess(`Áp dụng mã ${code} thành công! Giảm 10% (${disc.toLocaleString("vi-VN")} ₫).`);
    } else {
      setCouponError("Mã ưu đãi không hợp lệ hoặc đã hết lượt dùng.");
      setDiscount(0);
    }
  };

  const handleRemoveItem = async (bookingId) => {
    if (window.confirm("Bạn có chắc chắn muốn bỏ buổi học này khỏi danh sách?")) {
      setDeletingId(bookingId);
      await removeItem(bookingId);
      setDeletingId(null);
    }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    // Chuyển tới thanh toán buổi học đầu tiên được chọn
    navigate(`/checkout/${selectedItems[0].bookingId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto pt-8 px-4 sm:px-6">
        {/* Breadcrumb & Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link to="/" className="hover:text-slate-800">Trang chủ</Link>
              <span>/</span>
              <span className="text-brand-600 font-medium">Giỏ hàng & Đơn chờ thanh toán</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              Giỏ hàng học tập
              {cartCount > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                  {cartCount} buổi học
                </span>
              )}
            </h1>
          </div>

          <Link
            to="/tutors"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/80 px-4 py-2 rounded-xl transition"
          >
            <GraduationCap size={16} />
            Tìm thêm gia sư
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-16 border border-slate-100 text-center shadow-sm">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Đang kiểm tra giỏ hàng của bạn...</p>
          </div>
        ) : cartItems.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl p-12 sm:p-16 border border-slate-100 text-center shadow-sm max-w-2xl mx-auto my-8">
            <div className="w-20 h-20 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShoppingCart size={36} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Giỏ hàng của bạn đang trống</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Bạn chưa có buổi học nào đang chờ thanh toán. Hãy khám phá danh sách gia sư chất lượng cao và chọn các khung giờ học phù hợp để thêm vào danh sách!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/tutors"
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow-sm inline-flex items-center gap-2"
              >
                <GraduationCap size={18} />
                Khám phá gia sư ngay
              </Link>
              <Link
                to="/bookings"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm transition inline-flex items-center gap-2"
              >
                <Calendar size={18} />
                Xem lịch học của tôi
              </Link>
            </div>
          </div>
        ) : (
          /* CART CONTENT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* CỘT DANH SÁCH MỤC GIỎ HÀNG (7 CỘT) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Toolbar chọn tất cả */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === cartItems.length && cartItems.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <span>Chọn tất cả ({cartItems.length} buổi học)</span>
                </label>
                <span className="text-xs text-slate-400">
                  Đã chọn: <strong className="text-slate-700">{selectedIds.length}</strong>
                </span>
              </div>

              {/* Danh sách các card buổi học */}
              <div className="space-y-3.5">
                {cartItems.map((item) => {
                  const isSelected = selectedIds.includes(item.bookingId);
                  const isDeleting = deletingId === item.bookingId;

                  return (
                    <article
                      key={item.bookingId}
                      className={`bg-white rounded-2xl border p-5 transition-all shadow-sm ${
                        isSelected
                          ? "border-brand-300 ring-1 ring-brand-200 shadow-md"
                          : "border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox chọn */}
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.bookingId)}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                          />
                        </div>

                        {/* Thông tin buổi học */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                                  {item.subjectName}
                                </span>
                                <span className="text-xs text-slate-400">
                                  #{item.bookingId}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <User size={16} className="text-slate-400 shrink-0" />
                                {item.tutorName}
                              </h3>
                            </div>

                            {/* Học phí */}
                            <div className="text-right shrink-0">
                              <p className="text-lg font-extrabold text-brand-600">
                                {Number(item.price || 0).toLocaleString("vi-VN")} ₫
                              </p>
                              <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                Chờ thanh toán
                              </span>
                            </div>
                          </div>

                          {/* Chi tiết ngày, giờ, hình thức */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 py-3 my-2 border-y border-slate-100 bg-slate-50/50 rounded-xl px-3">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-brand-600 shrink-0" />
                              <span>Ngày: <strong>{item.scheduledDate}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-brand-600 shrink-0" />
                              <span>Giờ: <strong>{item.startTime} – {item.endTime}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 sm:col-span-2">
                              <MapPin size={14} className="text-brand-600 shrink-0" />
                              <span>Hình thức: <strong>{item.teachingMode || "Online"}</strong></span>
                            </div>
                          </div>

                          {/* Nút hành động */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleRemoveItem(item.bookingId)}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 font-medium transition py-1"
                            >
                              <Trash2 size={14} />
                              {isDeleting ? "Đang xóa..." : "Xóa khỏi danh sách"}
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/checkout/${item.bookingId}`)}
                              className="inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
                            >
                              Thanh toán buổi này
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* CỘT TỔNG HỢP & TIẾN HÀNH THANH TOÁN (5 CỘT) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm sticky top-24 space-y-6">
                <h3 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <span>Tóm tắt đơn hàng</span>
                  <span className="text-xs font-normal text-slate-500">
                    {selectedItems.length} buổi được chọn
                  </span>
                </h3>

                {/* Form nhập Coupon */}
                <div>
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Mã ưu đãi (TSG50K, TSGNEW)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs uppercase font-medium focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
                    >
                      Áp dụng
                    </button>
                  </form>
                  {couponSuccess && (
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={13} /> {couponSuccess}
                    </p>
                  )}
                  {couponError && (
                    <p className="text-xs text-red-600 mt-2 font-medium">{couponError}</p>
                  )}
                </div>

                {/* Chi tiết chi phí */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Tạm tính học phí ({selectedItems.length} buổi):</span>
                    <span className="font-semibold text-slate-900">
                      {subtotal.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Ưu đãi giảm giá:</span>
                      <span>-{discount.toLocaleString("vi-VN")} ₫</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Phí bảo đảm Escrow:</span>
                    <span className="text-emerald-600 font-medium">Miễn phí</span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <div>
                      <span className="text-base font-bold text-slate-900">Tổng thanh toán:</span>
                      <p className="text-[11px] text-slate-400">Đã bao gồm thuế & phí tạm giữ</p>
                    </div>
                    <span className="text-2xl font-extrabold text-brand-600">
                      {total.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </div>

                {/* Nút hành động */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md shadow-brand-600/20 transition flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  Tiến hành thanh toán ({selectedItems.length})
                </button>

                {/* Badge cam kết bảo vệ */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                    Bảo đảm an toàn học phí TSG Escrow
                  </div>
                  <p className="text-emerald-700/90 leading-relaxed">
                    Học phí được tạm giữ an toàn. Hệ thống tự động hoàn tiền 100% vào tài khoản của bạn nếu gia sư không xác nhận lịch học.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
