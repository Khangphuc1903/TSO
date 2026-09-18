import { GraduationCap, BookOpen, Users, Mail, Phone, MapPin, Facebook, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-brand-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white">
              <GraduationCap className="h-8 w-8 text-brand-500" />
              <span className="text-2xl font-bold tracking-tight">EduConnect</span>
            </div>
            <p className="text-sm text-slate-400">
              Nền tảng kết nối gia sư và học sinh hàng đầu Việt Nam. Nâng tầm tri thức, kiến tạo tương lai.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Dành cho Học sinh */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-brand-500" />
              Dành cho Học sinh
            </h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-brand-100 transition-colors">Tìm gia sư</a></li>
              <li><a href="#" className="hover:text-brand-100 transition-colors">Đăng yêu cầu tìm gia sư</a></li>
              <li><a href="/study-groups" className="hover:text-brand-100 transition-colors">Nhóm học tập</a></li>
              <li><a href="#" className="hover:text-brand-100 transition-colors">Cẩm nang học tập</a></li>
            </ul>
          </div>

          {/* Dành cho Gia sư */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Users className="h-4 w-4 mr-2 text-brand-500" />
              Dành cho Gia sư
            </h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-brand-100 transition-colors">Đăng ký làm gia sư</a></li>
              <li><a href="#" className="hover:text-brand-100 transition-colors">Tìm lớp dạy</a></li>
              <li><a href="#" className="hover:text-brand-100 transition-colors">Hướng dẫn giảng dạy</a></li>
              <li><a href="#" className="hover:text-brand-100 transition-colors">Chính sách & Quy định</a></li>
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h3 className="text-white font-semibold mb-4">Hỗ trợ & Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                <span>123 Nguyễn Văn Cừ, Quận 5, TP.HCM</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-slate-400 shrink-0" />
                <span>0123 456 789</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-slate-400 shrink-0" />
                <span>support@educonnect.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-sm text-center text-slate-500">
          <p>&copy; {new Date().getFullYear()} EduConnect. Đã đăng ký bản quyền.</p>
        </div>
      </div>
    </footer>
  );
}
