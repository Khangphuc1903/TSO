import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { sendContact } from "../api/admin";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await sendContact(form);
      setInfo(res.message || "Đã gửi.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được. Thử lại sau.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Liên hệ hỗ trợ</h1>
          <p className="text-slate-600 mt-3">Form này gửi về bộ phận hỗ trợ TSG. Bạn cũng có thể gọi hotline trong giờ hành chính.</p>
          <p className="flex items-center gap-2 text-sm mt-6"><Mail size={16} className="text-brand-600" /> khangphuc1903@gmail.com</p>
          <p className="flex items-center gap-2 text-sm mt-2"><Phone size={16} className="text-brand-600" /> 1900-2828</p>
        </div>
        <form onSubmit={onSubmit} className="bg-white rounded-2xl border p-6 space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {info && <div className="text-sm text-emerald-700">{info}</div>}
          <input required className="w-full h-10 border rounded-lg px-3 text-sm" placeholder="Họ tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" className="w-full h-10 border rounded-lg px-3 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <textarea required rows={5} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nội dung" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <button disabled={busy} className="h-10 px-4 rounded-lg bg-brand-600 text-white text-sm">{busy ? "Đang gửi..." : "Gửi"}</button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
