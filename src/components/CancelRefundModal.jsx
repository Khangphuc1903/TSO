import { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { getRefundPreview, cancelAndRefundBooking } from "../api/payment";

export default function CancelRefundModal({ bookingId, onClose, onSuccess }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPreview() {
      try {
        setLoading(true);
        const data = await getRefundPreview(bookingId);
        setPreview(data);
      } catch (err) {
        setError("Không thể tải thông tin hoàn tiền.");
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, [bookingId]);

  const handleCancel = async (e) => {
    e.preventDefault();
    try {
      setCancelling(true);
      setError("");
      const res = await cancelAndRefundBooking(bookingId, reason || "Học viên hủy lịch");
      onSuccess(res.message);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể hủy buổi học.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Hủy buổi học #{bookingId}</h3>
            <p className="text-xs text-slate-500">Xem chính sách hoàn tiền trước khi xác nhận</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang tính toán chính sách hoàn tiền...
          </div>
        ) : error && !preview ? (
          <div className="py-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
        ) : (
          <form onSubmit={handleCancel} className="space-y-4">
            {/* Box Refund Calculation */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Thời gian còn lại:</span>
                <span className="font-semibold text-slate-800">
                  {preview?.hoursRemaining > 0 ? `${preview?.hoursRemaining} giờ` : "Đã qua giờ học"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Chính sách áp dụng:</span>
                <span className="font-medium text-brand-600">{preview?.policyType}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tỉ lệ hoàn tiền:</span>
                <span className={`font-bold ${preview?.refundPercentage > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                  {preview?.refundPercentage}%
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900">Số tiền bạn được hoàn:</span>
                <span className="text-lg font-extrabold text-emerald-600">
                  {Number(preview?.refundAmount || 0).toLocaleString("vi-VN")} ₫
                </span>
              </div>
            </div>

            {error && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</div>}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do hủy buổi học
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do hủy (ví dụ: bận việc đột xuất, đổi lịch,...)"
                className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Giữ lại buổi học
              </button>
              <button
                type="submit"
                disabled={cancelling}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition"
              >
                {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
