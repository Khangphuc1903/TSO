import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Plus,
  Users,
  Search,
  SlidersHorizontal,
  BookOpen,
  Sparkles,
  GraduationCap,
  ArrowRight,
  Filter,
  Globe,
  UserCheck,
  ChevronRight,
  Award,
  Zap,
  MessageCircle,
  Clock
} from "lucide-react";
import Navbar from "../components/Navbar";
import { searchStudyGroups } from "../api/studyGroups";
import { getSubjects } from "../api/tutorSearch";
import LocationFields from "../components/LocationFields";
import { avatarUrl } from "../auth";

export default function StudyGroups() {
  const [params, setParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: params.get("keyword") || "",
    subjectId: params.get("subjectId") || "",
    city: params.get("city") || "",
    district: params.get("district") || "",
    hasMentor: params.get("hasMentor") || "",
  });

  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    const next = {
      keyword: params.get("keyword") || "",
      subjectId: params.get("subjectId") || "",
      city: params.get("city") || "",
      district: params.get("district") || "",
      hasMentor: params.get("hasMentor") || "",
    };
    setFilters(next);
    const query = {};
    if (next.keyword) query.keyword = next.keyword;
    if (next.subjectId) query.subjectId = next.subjectId;
    if (next.city) query.city = next.city;
    if (next.district) query.district = next.district;
    if (next.hasMentor !== "") query.hasMentor = next.hasMentor === "true";
    setLoading(true);
    searchStudyGroups(query)
      .then((data) => setGroups(data.items || []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [params]);

  const apply = (e) => {
    e.preventDefault();
    const next = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== "") next[k] = v;
    });
    setParams(next);
  };

  const clearFilters = () => {
    setFilters({ keyword: "", subjectId: "", city: "", district: "", hasMentor: "" });
    setParams({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC]">
      <Navbar />

      {/* HERO BANNER */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E4D] via-[#16307F] to-[#1D3FAE]" />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-32 -bottom-32 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90 border border-white/20 backdrop-blur-md">
                <Users size={14} className="text-blue-200" />
                Cộng đồng học tập
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/15 text-emerald-200 border border-emerald-300/25 backdrop-blur-md">
                <Zap size={13} className="text-emerald-300" />
                Chat nhóm realtime
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Tìm nhóm học tập
              <span className="block text-blue-200 mt-1">cùng chí hướng</span>
            </h1>

            <p className="text-sm sm:text-base text-white/75 mt-4 max-w-xl leading-relaxed">
              Kết nối với những bạn học cùng môn, cùng khu vực. Học nhóm có thể có gia sư mentor hỗ trợ hoặc chỉ các bạn học sinh tự hỗ trợ nhau qua chat realtime.
            </p>

            {/* Thống kê nhanh */}
            <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t border-white/10 text-white/90 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Users size={16} className="text-blue-200" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-lg leading-tight">{loading ? "..." : groups.length}</p>
                  <p className="text-[11px] text-white/60">Nhóm đang hoạt động</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <MessageCircle size={16} className="text-emerald-200" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-lg leading-tight">24/7</p>
                  <p className="text-[11px] text-white/60">Chat realtime</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <GraduationCap size={16} className="text-amber-200" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-lg leading-tight">Miễn phí</p>
                  <p className="text-[11px] text-white/60">Tham gia nhóm học</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA tạo nhóm – Floating button */}
          <div className="absolute right-6 bottom-8 sm:right-10 sm:bottom-10 hidden lg:block">
            <Link
              to="/study-groups/new"
              className="group inline-flex items-center gap-2.5 bg-white hover:bg-brand-50 text-brand-700 font-bold text-sm px-6 py-3.5 rounded-2xl shadow-xl shadow-black/10 transition-all hover:shadow-2xl hover:-translate-y-0.5 border border-brand-100"
            >
              <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center group-hover:bg-brand-700 transition-colors">
                <Plus size={18} />
              </div>
              Tạo nhóm học mới
              <ArrowRight size={16} className="text-brand-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-20 pb-20">
        {/* SEARCH & FILTER BAR */}
        <form
          onSubmit={apply}
          className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-5 sm:p-6 mb-8"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Bộ lọc tìm kiếm nhanh</h2>
              <p className="text-[11px] text-slate-400">Lọc theo môn học, khu vực, hình thức để tìm nhóm phù hợp nhất</p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto text-xs text-slate-500 hover:text-red-500 font-medium transition"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Từ khóa */}
            <div className="relative lg:col-span-2">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.keyword}
                onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value }))}
                placeholder="Tìm theo tên nhóm, mục tiêu..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition placeholder:text-slate-400"
              />
            </div>

            {/* Môn học */}
            <select
              value={filters.subjectId}
              onChange={(e) => setFilters((p) => ({ ...p, subjectId: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition text-slate-700"
            >
              <option value="">Tất cả môn học</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
              ))}
            </select>

            {/* Khu vực */}
            <LocationFields
              allowEmpty
              city={filters.city}
              district={filters.district}
              onChange={({ city, district }) => setFilters((p) => ({ ...p, city, district }))}
            />

            {/* Hình thức & Nút */}
            <div className="flex gap-2 lg:col-span-2 sm:col-span-2 lg:col-span-1">
              <select
                value={filters.hasMentor}
                onChange={(e) => setFilters((p) => ({ ...p, hasMentor: e.target.value }))}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition text-slate-700"
              >
                <option value="">Mọi hình thức</option>
                <option value="true">Có gia sư mentor</option>
                <option value="false">Chỉ học sinh</option>
              </select>
            </div>

            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-5 py-2.5 text-sm font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Filter size={14} />
              Lọc kết quả
            </button>
          </div>
        </form>

        {/* Mobile CTA */}
        <div className="lg:hidden mb-6">
          <Link
            to="/study-groups/new"
            className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-md shadow-brand-600/20 transition"
          >
            <Plus size={18} />
            Tạo nhóm học mới
          </Link>
        </div>

        {/* RESULTS HEADER */}
        <div className="flex items-center justify-between mb-5 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {loading ? "Đang tìm kiếm..." : `${groups.length} nhóm học`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasActiveFilters ? "Kết quả theo bộ lọc của bạn" : "Tất cả nhóm học đang hoạt động trên TSG"}
            </p>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="bg-white/80 backdrop-blur rounded-3xl border border-slate-200/80 p-16 text-center shadow-sm">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-700">Đang tìm nhóm học phù hợp...</p>
            <p className="text-xs text-slate-400 mt-1">Khám phá cộng đồng học tập trên TSG</p>
          </div>
        ) : groups.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 sm:p-16 text-center shadow-sm max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-6 border border-brand-100 shadow-inner">
              <Users size={38} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Chưa có nhóm nào phù hợp</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
              Hãy thử thay đổi bộ lọc hoặc tạo nhóm học mới để mời bạn bè và gia sư mentor tham gia cùng bạn!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/study-groups/new"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-md shadow-brand-600/20 inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Tạo nhóm học ngay
              </Link>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm transition inline-flex items-center gap-2"
                >
                  <Filter size={16} />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        ) : (
          /* GRID KẾT QUẢ */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groups.map((g) => {
              const slotsLeft = (g.maxMembers || 10) - (g.memberCount || 0);
              const isAlmostFull = slotsLeft <= 2;

              return (
                <Link
                  key={g.groupId}
                  to={`/study-groups/${g.groupId}`}
                  className="group bg-white rounded-3xl border border-slate-200/80 p-6 transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:border-brand-200 hover:-translate-y-0.5"
                >
                  {/* Header row with badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-brand-700 transition truncate">
                        {g.title}
                      </h3>
                    </div>
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-bold shrink-0 border ${
                        g.hasMentor
                          ? "bg-brand-50 text-brand-700 border-brand-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {g.hasMentor ? (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap size={12} /> Có gia sư
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <UserCheck size={12} /> Peer study
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Mô tả */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-4">
                    {g.description || "Nhóm học tập chia sẻ bài tập, thảo luận kiến thức và hỗ trợ nhau cùng tiến bộ."}
                  </p>

                  {/* Meta tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {g.subjectName && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-100">
                        <BookOpen size={12} />
                        {g.subjectName}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
                      <MapPin size={12} className="text-slate-400" />
                      {[g.district, g.city].filter(Boolean).join(", ") || "Online"}
                    </span>
                  </div>

                  {/* Footer: thành viên & CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Avatar stack */}
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(g.memberCount || 1, 3))].map((_, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-brand-700"
                          >
                            {String.fromCharCode(65 + i)}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-slate-800">{g.memberCount}</span>
                        <span className="text-slate-400">/{g.maxMembers}</span>
                        {isAlmostFull && (
                          <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                            Sắp đầy
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-bold text-brand-600 group-hover:text-brand-700 flex items-center gap-1 transition">
                      Xem chi tiết
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
