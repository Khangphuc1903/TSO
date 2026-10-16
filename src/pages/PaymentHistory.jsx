import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Wallet } from "lucide-react";
import Navbar from "../components/Navbar";
import { isLoggedIn } from "../auth";
import { getMyPayments } from "../api/payment";

const STATUS_LABEL = {
  Pending: "Đang chờ",
  Success: "Đã thanh toán",
  Failed: "Thất bại",
  Refunded: "Đã hoàn tiền",
  PartiallyRefunded: "Hoàn một phần",
};

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    getMyPayments()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setError("Không tải được lịch sử thanh toán."))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={20} className="text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900">Lịch sử thanh toán</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">Các khoản đã thanh toán, hoàn tiền và đang chờ qua PayOS.</p>
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        {loading ? (
          <p className="text-slate-500 inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Đang tải...
          </p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <p className="text-slate-500 mb-4">Chưa có giao dịch nào.</p>
            <Link to="/bookings" className="text-sm font-medium text-brand-600 hover:underline">
              Xem lịch học →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => (
              <li key={p.paymentId} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{p.subjectName || `Buổi học #${p.bookingId}`}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.tutorName || "Gia sư"} · {p.scheduledDate || ""} · {p.paymentMethod || "PayOS"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{Number(p.amount).toLocaleString("vi-VN")} ₫</p>
                  <p className="text-xs text-slate-500 mt-1">{STATUS_LABEL[p.status] || p.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
