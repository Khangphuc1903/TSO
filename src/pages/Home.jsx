import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  GraduationCap,
  ShieldCheck,
  Award,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Star,
  BadgeCheck,
  ChevronRight,
  BookOpen,
  Globe,
  MessageCircle,
  Heart,
  CheckCircle2,
  Play,
  Lock
} from "lucide-react";
import Navbar from "../components/Navbar";
import { getDefaultTutors } from "../api/tutorSearch";
import { formatVnd } from "../utils/format";

export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tutors");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [featured, setFeatured] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(true);

  useEffect(() => {
    setLoadingTutors(true);
    getDefaultTutors()
      .then((items) => {
        if (items.length) setFeatured(items.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoadingTutors(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("keyword", query.trim());
    if (activeTab === "tutors") {
      if (level) params.set("educationLevel", level);
      navigate(`/tutors${params.toString() ? `?${params}` : ""}`);
      return;
    }
    navigate(`/study-groups${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-white to-[#F8FAFC]">
      <Navbar />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E4D] via-[#16307F] to-[#1D3FAE]" />
        <div className="absolute -right-40 -top-40 w-[500px] h-[500px] rounded-full bg-blue-400/8 blur-3xl pointer-events-none" />
        <div className="absolute -left-40 bottom-0 w-[500px] h-[500px] rounded-full bg-indigo-400/8 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 top-1/3 w-64 h-64 rounded-full bg-emerald-400/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 sm:pt-20 lg:pt-24 pb-32 sm:pb-36 lg:pb-40">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="flex flex-wrap items-center gap-2.5 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white/90 border border-white/20 backdrop-blur-md">
                <Sparkles size={14} className="text-amber-300" />
                Nền tảng Gia sư #1 Việt Nam
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-400/15 text-emerald-200 border border-emerald-300/25 backdrop-blur-md">
                <ShieldCheck size={13} className="text-emerald-300" />
                Xác thực 100%
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Tìm <span className="text-blue-200">gia sư chất lượng</span>
              <br />
              & nhóm học tập
              <span className="inline-block ml-2 text-amber-300">✦</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-white/70 mt-5 max-w-xl leading-relaxed">
              Kết nối với hơn 2.500+ gia sư đã xác thực trên khắp cả nước. Thanh toán an toàn qua hệ thống Escrow ký quỹ – hoàn tiền 100% nếu không hài lòng.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-8 mt-8 pt-6 border-t border-white/10">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">2,500+</p>
                <p className="text-[11px] text-white/50 font-medium mt-0.5">Gia sư xác thực</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">50k+</p>
                <p className="text-[11px] text-white/50 font-medium mt-0.5">Học viên tin dùng</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">4.9<span className="text-lg text-amber-300">★</span></p>
                <p className="text-[11px] text-white/50 font-medium mt-0.5">Đánh giá trung bình</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-300">100%</p>
                <p className="text-[11px] text-white/50 font-medium mt-0.5">Bảo đảm hoàn tiền</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SEARCH CARD (Floating) ═══════════════════ */}
      <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 -mt-20">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-300/30 border border-slate-200/80 p-5 sm:p-7">
          {/* Tab buttons */}
          <div className="flex border-b border-slate-100 mb-5">
            <TabButton
              active={activeTab === "tutors"}
              onClick={() => setActiveTab("tutors")}
              icon={<GraduationCap size={17} />}
              label="Tìm Gia sư"
            />
            <TabButton
              active={activeTab === "groups"}
              onClick={() => setActiveTab("groups")}
              icon={<Users size={17} />}
              label="Tìm Nhóm học"
            />
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  activeTab === "tutors"
                    ? "Bạn muốn học gì? (Toán, Lý, Hóa, Tiếng Anh, Lập trình...)"
                    : "Tìm nhóm học theo tên hoặc môn..."
                }
                className="w-full rounded-2xl border border-slate-200 pl-11 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition placeholder:text-slate-400"
              />
            </div>

            {activeTab === "tutors" && (
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition sm:w-52"
              >
                <option value="">Tất cả cấp độ</option>
                <option value="Primary">Tiểu học</option>
                <option value="Secondary">THCS</option>
                <option value="High">THPT</option>
                <option value="University">Đại học</option>
              </select>
            )}

            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl px-7 py-3.5 text-sm transition shadow-lg shadow-brand-600/20 cursor-pointer"
            >
              Tìm kiếm
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick suggestion chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px]">
            <span className="text-slate-400 font-medium">Phổ biến:</span>
            {["Toán", "Tiếng Anh", "Lập trình", "Hóa Học", "Vật Lý", "IELTS"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  setActiveTab("tutors");
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-700 font-semibold border border-slate-200 hover:border-brand-200 transition cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-[11px] uppercase font-extrabold tracking-[0.15em] text-brand-600">Quy trình</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Bắt đầu học trong 3 bước đơn giản
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
            Từ tìm kiếm đến buổi học đầu tiên, mọi thứ được thiết kế để nhanh chóng và an toàn nhất.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <StepCard
            step="01"
            icon={<Search size={24} />}
            title="Tìm & Chọn gia sư"
            desc="Duyệt hồ sơ gia sư đã xác thực, đọc đánh giá từ học viên trước và chọn khung giờ phù hợp."
            color="brand"
          />
          <StepCard
            step="02"
            icon={<Lock size={24} />}
            title="Thanh toán Escrow"
            desc="Học phí được giữ an toàn trong quỹ ký quỹ. Gia sư chỉ nhận tiền sau khi buổi học hoàn thành tốt."
            color="emerald"
          />
          <StepCard
            step="03"
            icon={<Play size={24} />}
            title="Bắt đầu buổi học"
            desc="Gia sư duyệt lịch, bạn nhận link Google Meet hoặc địa chỉ gặp mặt. Học 1-kèm-1 chất lượng cao!"
            color="indigo"
          />
        </div>
      </section>

      {/* ═══════════════════ TRUST STANDARD ═══════════════════ */}
      <section className="relative overflow-hidden py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/60 to-white" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[11px] uppercase font-extrabold tracking-[0.15em] text-brand-600">Cam kết chất lượng</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Tiêu chuẩn tin cậy TSG
            </h2>
            <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
              An toàn và thành công trong học tập là ưu tiên hàng đầu của chúng tôi.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <TrustCard
              icon={<ShieldCheck size={26} />}
              iconBg="bg-brand-50"
              iconColor="text-brand-600"
              title="Xác thực danh tính"
              desc="Mỗi gia sư đều trải qua quy trình xác minh CMND/CCCD và bằng cấp nghiêm ngặt trước khi được hiển thị trên nền tảng."
            />
            <TrustCard
              icon={<Award size={26} />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              title="Kiểm tra năng lực"
              desc="Gia sư phải cung cấp bằng cấp hoặc chứng chỉ có thể xác minh cho từng môn giảng dạy đã đăng ký."
            />
            <TrustCard
              icon={<ShieldAlert size={26} />}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              title="Thanh toán bảo đảm"
              desc="Mọi giao dịch đều qua hệ thống Escrow ký quỹ. Học phí chỉ được giải ngân khi buổi học hoàn thành đạt yêu cầu."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURED TUTORS ═══════════════════ */}
      <section className="max-w-7xl mx-auto py-16 px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] uppercase font-extrabold tracking-[0.15em] text-brand-600">Gia sư nổi bật</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Được đánh giá cao nhất
            </h2>
            <p className="text-xs text-slate-500 mt-1">Những gia sư được học viên tin tưởng và đánh giá xuất sắc trên TSG</p>
          </div>
          <Link
            to="/tutors"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl border border-brand-200 transition"
          >
            Xem tất cả gia sư
            <ArrowRight size={14} />
          </Link>
        </div>

        {loadingTutors ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-sm">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Đang tải danh sách gia sư...</p>
          </div>
        ) : featured.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
            <GraduationCap size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Chưa có gia sư nào. Hãy thử lại sau hoặc kiểm tra kết nối Backend.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.slice(0, 4).map((tutor) => (
              <FeaturedTutorCard key={tutor.id || tutor.name} tutor={tutor} />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════ CTA: NHÓM HỌC ═══════════════════ */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1E4D] via-[#16307F] to-[#1D3FAE] p-8 sm:p-12 lg:p-16">
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90 border border-white/15 mb-4">
                <Users size={13} className="text-blue-200" />
                Cộng đồng học tập
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Học nhóm cùng bạn bè
                <span className="block text-blue-200 mt-1">& gia sư mentor</span>
              </h2>
              <p className="text-sm text-white/70 mt-3 leading-relaxed max-w-md">
                Tham gia hoặc tạo nhóm học tập theo môn. Chat realtime, chia sẻ tài liệu, và cùng nhau tiến bộ mỗi ngày. Hoàn toàn miễn phí!
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  to="/study-groups"
                  className="inline-flex items-center gap-2 bg-white hover:bg-brand-50 text-brand-700 font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition"
                >
                  <Users size={16} />
                  Tìm nhóm học
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/study-groups/new"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-6 py-3 rounded-xl border border-white/20 transition"
                >
                  Tạo nhóm mới
                </Link>
              </div>
            </div>

            {/* Visual highlights */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/15">
                <MessageCircle size={22} className="text-blue-200 mb-2" />
                <p className="text-sm font-bold text-white">Chat realtime</p>
                <p className="text-xs text-white/60 mt-1">Nhắn tin ngay với thành viên nhóm</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/15">
                <GraduationCap size={22} className="text-emerald-200 mb-2" />
                <p className="text-sm font-bold text-white">Gia sư Mentor</p>
                <p className="text-xs text-white/60 mt-1">Mời gia sư hỗ trợ chuyên môn</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/15">
                <Globe size={22} className="text-amber-200 mb-2" />
                <p className="text-sm font-bold text-white">Mọi khu vực</p>
                <p className="text-xs text-white/60 mt-1">Online hoặc gặp mặt trực tiếp</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/15">
                <Heart size={22} className="text-pink-200 mb-2" />
                <p className="text-sm font-bold text-white">Miễn phí 100%</p>
                <p className="text-xs text-white/60 mt-1">Không thu bất kỳ phí nào</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-slate-100 bg-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-brand-600" />
            <span className="text-sm font-bold text-slate-900">TSG – Tutor Study Group</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Lock size={12} /> SSL 256-bit</span>
            <span className="flex items-center gap-1"><ShieldCheck size={12} /> NAPAS 24/7</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} /> PayOS Verified</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 TSG Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────── Sub-components ─────────────────────── */

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
        active
          ? "border-brand-600 text-brand-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StepCard({ step, icon, title, desc, color }) {
  const colorMap = {
    brand: "bg-brand-50 text-brand-600 border-brand-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };
  const stepColor = {
    brand: "text-brand-600",
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-7 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <span className={`text-[11px] uppercase font-black tracking-[0.15em] ${stepColor[color]}`}>
        Bước {step}
      </span>
      <div className={`mx-auto mt-3 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="font-extrabold text-slate-900 text-base mb-2">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function TrustCard({ icon, iconBg, iconColor, title, desc }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-7 text-center shadow-sm hover:shadow-md transition-shadow">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <h3 className="font-extrabold text-slate-900 text-base mb-2">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeaturedTutorCard({ tutor }) {
  const { id, name, subject, tags = [], rating = 0, price = 0, photoUrl, reviews = 0 } = tutor;

  const card = (
    <div className="group bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
      {/* Photo */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        {/* Rating badge */}
        <span className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur text-xs font-bold px-2.5 py-1 rounded-xl shadow-sm border border-slate-100">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          {rating.toFixed(1)}
          {reviews > 0 && <span className="text-slate-400 font-medium">({reviews})</span>}
        </span>

        {/* Verified badge */}
        <span className="absolute bottom-3 left-3 flex items-center gap-1 bg-emerald-500/90 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-sm">
          <BadgeCheck size={13} />
          Đã xác thực
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="font-extrabold text-slate-900 text-base group-hover:text-brand-700 transition truncate">{name}</h3>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{subject}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[11px] bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-md border border-brand-100"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div>
            <span className="font-black text-brand-600 text-base">{formatVnd(price)}</span>
            <span className="text-[11px] text-slate-400 font-medium"> /giờ</span>
          </div>
          <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition shadow-2xs">
            <ChevronRight size={16} />
          </span>
        </div>
      </div>
    </div>
  );

  if (!id) return card;
  return (
    <Link to={`/tutors/${id}`} state={{ tutor }} className="block">
      {card}
    </Link>
  );
}
