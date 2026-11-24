import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Plus,
  Users,
  Search,
  SlidersHorizontal,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Filter,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "../components/ui/Skeleton";
import { searchStudyGroups } from "../api/studyGroups";
import { getSubjects } from "../api/tutorSearch";
import LocationFields from "../components/LocationFields";
import { avatarUrl, getUser } from "../auth";
import { STUDY_LEVELS, levelLabel, splitStudyCopy } from "../data/studyLevels";

export default function StudyGroups() {
  const [params, setParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const tutor = (getUser()?.role || "").toLowerCase() === "tutor";
  const [sort, setSort] = useState("featured");
  const [filters, setFilters] = useState({
    keyword: params.get("keyword") || "",
    subjectId: params.get("subjectId") || "",
    city: params.get("city") || "",
    district: params.get("district") || "",
    hasMentor: params.get("hasMentor") || "",
    educationLevel: params.get("educationLevel") || "",
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
      educationLevel: params.get("educationLevel") || "",
    };
    setFilters(next);
    const query = {};
    if (next.keyword) query.keyword = next.keyword;
    if (next.subjectId) query.subjectId = next.subjectId;
    if (next.city) query.city = next.city;
    if (next.district) query.district = next.district;
    if (next.educationLevel) query.educationLevel = next.educationLevel;
    if (next.hasMentor !== "") query.hasMentor = next.hasMentor === "true";
    setLoading(true);
    searchStudyGroups(query)
      .then((data) => setGroups(data.items || []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [params]);

  const publish = (nextFilters) => {
    const next = {};
    Object.entries(nextFilters).forEach(([k, v]) => {
      if (v !== "") next[k] = v;
    });
    setParams(next);
  };

  const apply = (e) => {
    e.preventDefault();
    const next = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== "") next[k] = v;
    });
    setParams(next);
  };

  const clearFilters = () => {
    setFilters({ keyword: "", subjectId: "", city: "", district: "", hasMentor: "", educationLevel: "" });
    setParams({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const shown = [...groups].sort((a, b) => {
    if (sort === "available") {
      return ((b.maxMembers || 0) - (b.memberCount || 0)) - ((a.maxMembers || 0) - (a.memberCount || 0));
    }
    if (sort === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC]">

      {/* HERO BANNER */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-32 -bottom-32 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-teal-100">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
                Cộng đồng học tập có gia sư bảo trợ
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Khám phá nhóm học tập
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-200/90 sm:text-base">
                Tìm nhóm cùng cấp học, môn học và khu vực. Học sinh xin vào, gia sư chủ nhóm duyệt rồi mới hiện bài.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/study-groups/mine"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
              >
                Nhóm của tôi
                <ArrowRight size={16} />
              </Link>
              {tutor && (
                <Link
                  to="/study-groups/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/20 hover:bg-brand-700"
                >
                  <Plus size={16} />
                  Tạo nhóm mới
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="relative z-20 mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {/* SEARCH & FILTER BAR */}
        <form
          onSubmit={apply}
          className="-mt-8 mb-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_-5px_rgba(11,34,65,0.08)] sm:p-6"
        >
          <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bộ lọc tìm kiếm nhanh</h2>
                <p className="text-xs text-slate-500">Lọc theo cấp học trước, sau đó chọn môn học và khu vực phù hợp</p>
              </div>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="text-xs font-medium text-slate-500 hover:text-red-500">
                  Xóa bộ lọc
                </button>
              )}
            </div>
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200/60 bg-slate-100/90 p-1">
              <button
                type="button"
                onClick={() => {
                  const next = { ...filters, educationLevel: "" };
                  setFilters(next);
                  publish(next);
                }}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold sm:text-sm ${
                  filters.educationLevel === "" ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/60" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả cấp
              </button>
              {STUDY_LEVELS.map((level) => {
                const active = filters.educationLevel === level.value;
                return (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => {
                      const next = { ...filters, educationLevel: level.value };
                      setFilters(next);
                      publish(next);
                    }}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold sm:text-sm ${
                      active ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/60" : "font-medium text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {level.grade} • {level.value}
                  </button>
                );
              })}
            </div>
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

        {tutor && (
        <div className="lg:hidden mb-6">
          <Link
            to="/study-groups/new"
            className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-md shadow-brand-600/20 transition"
          >
            <Plus size={18} />
            Tạo nhóm học mới
          </Link>
        </div>
        )}

        {/* RESULTS HEADER */}
        <div className="mb-6 flex flex-col justify-between gap-2 px-1 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">
                {loading ? "Đang tìm kiếm..." : `${shown.length} nhóm học`}
              </h2>
              {!loading && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">Đang hoạt động</span>}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              {hasActiveFilters ? "Kết quả theo bộ lọc của bạn" : "Tất cả nhóm học đang hoạt động trên TSGTutor"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Sắp xếp
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:border-brand-500">
              <option value="featured">Nổi bật nhất</option>
              <option value="available">Còn chỗ trống</option>
              <option value="newest">Mới tạo gần đây</option>
            </select>
          </label>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            aria-busy="true"
            aria-label="Đang tìm nhóm học"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 sm:p-16 text-center shadow-sm max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-6 border border-brand-100 shadow-inner">
              <Users size={38} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Chưa có nhóm nào phù hợp</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
              {tutor
                ? "Hãy đổi bộ lọc hoặc tạo một nhóm mới. Học sinh sẽ xin vào và chờ bạn duyệt."
                : "Hãy đổi bộ lọc. Chỉ gia sư được tạo nhóm. Bạn có thể xin vào nhóm đang có."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {tutor && (
              <Link
                to="/study-groups/new"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-md shadow-brand-600/20 inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Tạo nhóm học ngay
              </Link>
              )}
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((g, index) => {
              const maxMembers = g.maxMembers || 10;
              const memberCount = g.memberCount || 0;
              const slotsLeft = maxMembers - memberCount;
              const isFull = slotsLeft <= 0;
              const copy = splitStudyCopy(g.description);
              const seekingTutor = g.hiringMode === "ReverseBid";
              const capacityLabel = isFull ? "Đã đầy" : slotsLeft <= 2 ? "Sắp đầy" : "Còn chỗ";
              const capacityClass = isFull
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : slotsLeft <= 2
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700";
              const fill = Math.min(100, Math.round((memberCount / maxMembers) * 100));

              return (
                <Link
                  key={g.groupId}
                  to={`/study-groups/${g.groupId}`}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg"
                  style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
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
                        seekingTutor
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : g.hasMentor
                          ? "bg-brand-50 text-brand-700 border-brand-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {seekingTutor ? (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap size={12} /> Đang tìm gia sư
                        </span>
                      ) : g.hasMentor ? (
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
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {copy.goal || "Cùng nhau học đúng trình độ, để mỗi buổi đều chạm đúng chỗ mình đang hổng."}
                  </p>
                  {seekingTutor && (
                    <p className="mb-4 text-xs font-semibold text-amber-800">
                      Học sinh khác có thể xin vào nhóm. Gia sư chỉ gửi hồ sơ ứng tuyển.
                    </p>
                  )}

                  {/* Meta tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {g.educationLevel && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                        <GraduationCap size={12} />
                        {levelLabel(g.educationLevel)} · {g.educationLevel}
                      </span>
                    )}
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
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B2241] text-[10px] font-bold text-white ring-2 ring-white">
                          {(g.creatorName || g.title || "N").trim().charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {memberCount}<span className="font-normal text-slate-400">/{maxMembers}</span>
                        </span>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${capacityClass}`}>
                        {capacityLabel}
                      </span>
                    </div>
                    <div className="mb-3.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${isFull ? "bg-rose-500" : "bg-brand-600"}`} style={{ width: `${fill}%` }} />
                    </div>
                    <span className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 py-2.5 text-xs font-semibold text-slate-800 transition group-hover:border-brand-600 group-hover:bg-brand-600 group-hover:text-white sm:text-sm">
                      {isFull ? "Đã đầy · Xem nhóm" : "Xem chi tiết"}
                      <ChevronRight size={16} />
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
