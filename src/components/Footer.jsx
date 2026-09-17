import { Link } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Award,
  Globe,
  Heart,
  ArrowRight,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Column (2 spans on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
                <GraduationCap size={22} />
              </span>
              <span className="text-xl font-bold tracking-tight">TSG Platform</span>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Nền tảng kết nối Gia sư & Nhóm học tập hàng đầu. Đảm bảo chất lượng với
              quy trình kiểm duyệt danh tính qua CCCD/AI và bài kiểm tra năng lực sư phạm.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
                <ShieldCheck size={14} className="text-brand-500" />
                100% ID Verified
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
                <Award size={14} className="text-emerald-400" />
                Kiểm định năng lực
              </span>
            </div>
          </div>

          {/* Col 1: Khám phá */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Khám phá
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/"
                  className="hover:text-white transition-colors"
                >
                  Trang chủ (Discovery)
                </Link>
              </li>
              <li>
                <Link
                  to="/study-groups"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-brand-400"
                >
                  Nhóm học tập
                  <span className="bg-brand-500/20 text-brand-400 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    HOT
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/tutors"
                  className="hover:text-white transition-colors"
                >
                  Tìm gia sư uy tín
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Bảng điều khiển học tập
                </Link>
              </li>
              <li>
                <a
                  href="#trust-standard"
                  className="hover:text-white transition-colors"
                >
                  Tiêu chuẩn TSG Trust
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Môn học phổ biến */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Môn học nổi bật
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/study-groups?query=Toán"
                  className="hover:text-white transition-colors"
                >
                  Toán học (Lớp 1 - 12)
                </Link>
              </li>
              <li>
                <Link
                  to="/study-groups?query=Tiếng+Anh"
                  className="hover:text-white transition-colors"
                >
                  Tiếng Anh &amp; IELTS 7.0+
                </Link>
              </li>
              <li>
                <Link
                  to="/study-groups?query=Vật+Lý"
                  className="hover:text-white transition-colors"
                >
                  Vật Lý luyện thi ĐH
                </Link>
              </li>
              <li>
                <Link
                  to="/study-groups?query=Hóa+Học"
                  className="hover:text-white transition-colors"
                >
                  Hóa Học nâng cao
                </Link>
              </li>
              <li>
                <Link
                  to="/study-groups?query=Văn"
                  className="hover:text-white transition-colors"
                >
                  Ngữ Văn &amp; Đọc hiểu
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Dành cho Gia sư & Hỗ trợ */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Dành cho Gia sư
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/register"
                  className="hover:text-white transition-colors font-medium text-brand-400"
                >
                  Đăng ký trở thành Gia sư
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Quy trình xác thực CCCD/AI
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Quy chuẩn an toàn giảng dạy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Cố vấn nhóm học tập (Mentor)
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Trung tâm trợ giúp &amp; CSKH
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© 2026 TSG Platform. Nền tảng Gia sư &amp; Nhóm học tập.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">
              Điều khoản sử dụng
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Chính sách bảo mật
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Quy chế hoạt động
            </a>
            <span className="flex items-center gap-1 text-slate-400">
              <Globe size={13} />
              Tiếng Việt (VN)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
