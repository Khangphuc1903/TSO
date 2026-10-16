import { GraduationCap, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function About() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-14">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4">
          <Sparkles size={14} /> Về TSG
        </span>
        <h1 className="text-3xl font-bold text-slate-900">Tutor Study Group</h1>
        <p className="text-slate-600 mt-4 leading-relaxed">
          TSG kết nối học viên với gia sư đã xác thực CCCD (VNPT eKYC), đạt bài kiểm tra chuyên môn,
          và thanh toán ký quỹ PayOS. Chúng tôi xây nền tảng để buổi học an toàn, minh bạch, có thể hoàn tiền theo chính sách.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          <div className="bg-white rounded-2xl border p-5">
            <ShieldCheck className="text-brand-600 mb-2" />
            <p className="font-semibold">Xác thực</p>
            <p className="text-sm text-slate-500 mt-1">CCCD + khuôn mặt + bài test theo môn/lớp.</p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <GraduationCap className="text-brand-600 mb-2" />
            <p className="font-semibold">Học tập</p>
            <p className="text-sm text-slate-500 mt-1">Gia sư 1-1 và nhóm học có mentor.</p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <HeartHandshake className="text-brand-600 mb-2" />
            <p className="font-semibold">Đồng hành</p>
            <p className="text-sm text-slate-500 mt-1">Hỗ trợ, báo cáo vi phạm, admin rà soát AI.</p>
          </div>
        </div>
        <Link to="/contact" className="inline-flex mt-8 text-sm font-medium text-brand-700">Liên hệ đội ngũ →</Link>
      </main>
      <Footer />
    </div>
  );
}
