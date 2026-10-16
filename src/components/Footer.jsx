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
    <footer className="bg-brand-50/60">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-brand-700">TSG</span>
            <span className="text-[11px] font-semibold bg-verified-50 text-verified-600 px-2 py-0.5 rounded-full">
              VERIFIED
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Nền tảng kết nối học viên với gia sư đã xác thực CCCD, đạt bài test và thanh toán ký quỹ.
          </p>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <ShieldCheck size={16} className="text-verified-600" />
            VNPT eKYC · PayOS
          </div>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-bold tracking-wide text-slate-900 mb-4">{col.title}</h4>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-slate-600 hover:text-brand-600 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-brand-100">
        <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-slate-500">
          © {new Date().getFullYear()} TSG Tutor Platform
        </div>
      </div>
    </footer>
  );
}
