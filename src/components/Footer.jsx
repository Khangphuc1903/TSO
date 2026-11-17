import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const FOOTER_COLUMNS = [
  {
    title: "Nền tảng",
    links: [
      { label: "Tìm gia sư", to: "/tutors" },
      { label: "Nhóm học", to: "/study-groups" },
      { label: "Về chúng tôi", to: "/about" },
    ],
  },
  {
    title: "An toàn",
    links: [
      { label: "FAQ / Trợ giúp", to: "/faq" },
      { label: "Liên hệ", to: "/contact" },
      { label: "Đánh giá", to: "/reviews" },
    ],
  },
  {
    title: "Tài khoản",
    links: [
      { label: "Đăng nhập", to: "/login" },
      { label: "Đăng ký", to: "/register" },
      { label: "Trở thành gia sư", to: "/register" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#0F294A] text-slate-300">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-extrabold text-white">TSG<span className="text-[#2DD4BF]">Tutor</span></span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Nền tảng kết nối học viên với gia sư đã xác thực CCCD, đạt bài test và thanh toán ký quỹ.
          </p>
          <div className="flex items-center gap-1.5 text-sm text-slate-300">
            <ShieldCheck size={16} className="text-[#2DD4BF]" />
            VNPT eKYC · PayOS
          </div>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-bold tracking-wide text-white mb-4">{col.title}</h4>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-slate-400 transition-colors hover:text-[#5EEAD4]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-slate-500">
          © {new Date().getFullYear()} TSG Tutor · Học thật, tiến bộ thật
        </div>
      </div>
    </footer>
  );
}
