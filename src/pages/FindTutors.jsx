import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Brain,
  Zap,
  RotateCcw,
  Tag,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";
import TutorResultCard from "../components/TutorResultCard";
import { getSubjects, searchTutors } from "../api/tutorSearch";
import { naturalSearchTutors } from "../api/ai";
import { wishlistApi } from "../api/wishlist";
import { isLoggedIn } from "../auth";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref } from "../utils/format";
import LocationFields from "../components/LocationFields";
import { SkeletonTutorCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";

export default function FindTutors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(() => new Set());

  // AI Natural Search state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const [filters, setFilters] = useState({
    keyword: searchParams.get("keyword") || "",
    subjectId: searchParams.get("subjectId") || "",
    city: searchParams.get("city") || "",
    district: searchParams.get("district") || "",
    teachingMode: searchParams.get("teachingMode") || "",
    educationLevel: searchParams.get("educationLevel") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    minExperience: searchParams.get("minExperience") || "",
  });

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
    if (isLoggedIn()) {
      wishlistApi
        .ids()
        .then((ids) => setSavedIds(new Set((ids || []).map(Number))))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (aiActive) return; // Do not overwrite if AI mode is active
    const next = {
      keyword: searchParams.get("keyword") || "",
      subjectId: searchParams.get("subjectId") || "",
      city: searchParams.get("city") || "",
      district: searchParams.get("district") || "",
      teachingMode: searchParams.get("teachingMode") || "",
      educationLevel: searchParams.get("educationLevel") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      minExperience: searchParams.get("minExperience") || "",
    };
    setFilters(next);
    loadTutors(next);
  }, [searchParams, aiActive]);

  const loadTutors = async (current) => {
    setLoading(true);
    setError("");
    try {
      const params = { isPublishedOnly: true };
      if (current.keyword) params.keyword = current.keyword;
      if (current.subjectId) params.subjectId = Number(current.subjectId);
      if (current.city) params.city = current.city;
      if (current.district) params.district = current.district;
      if (current.teachingMode) params.teachingMode = current.teachingMode;
      if (current.educationLevel) params.educationLevel = current.educationLevel;
      if (current.minPrice) params.minPrice = Number(current.minPrice);
      if (current.maxPrice) params.maxPrice = Number(current.maxPrice);
      if (current.minExperience) params.minExperience = Number(current.minExperience);

      const result = await searchTutors(params);
      setTutors(result.items);
      setTotal(result.totalCount);
      if (result.message) setError(result.message);
    } catch {
      setTutors([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setAiActive(false);
    setAiResult(null);
    const next = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) next[key] = value;
    });
    setSearchParams(next);
  };

  const update = (key) => (e) =>
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  // Xử lý tìm kiếm bằng câu văn tự nhiên qua Gemini
  const handleAiNaturalSearch = async (e) => {
    e?.preventDefault();
    if (!aiPrompt.trim()) return;

    try {
      setAiSearching(true);
      setError("");
      const res = await naturalSearchTutors(aiPrompt.trim());
      const rawTutors = res.tutors || res.Tutors || [];
      const filter = res.filter || res.Filter || {};

      setAiResult({ filter, tutors: rawTutors });
      setAiActive(true);

      // Map AI tutors to TutorResultCard format
      const mapped = rawTutors.map((t) => ({
        id: t.tutorId ?? t.TutorId,
        name: t.fullName ?? t.FullName,
        university: t.university ?? t.University,
        degree: t.university ?? t.University,
        tier: t.verificationStatus ?? t.VerificationStatus,
        rating: t.averageRating ?? t.AverageRating,
        reviews: t.totalReviews ?? t.TotalReviews,
        bio: t.bio ?? t.Bio,
        tags: t.subjectNames ?? t.SubjectNames ?? [],
        price: t.hourlyRateMin ?? t.HourlyRateMin ?? 0,
        photoUrl: fileHref(t.avatarUrl ?? t.AvatarUrl, API_ORIGIN) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        aiReason: t.reason ?? t.Reason,
        matchScore: t.matchScore ?? t.MatchScore,
      }));

      setTutors(mapped);
      setTotal(mapped.length);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Lỗi tìm kiếm qua AI.");
    } finally {
      setAiSearching(false);
    }
  };

  const handleClearAiSearch = () => {
    setAiActive(false);
    setAiResult(null);
    setAiPrompt("");
    loadTutors(filters);
  };

  return (
    <div className="min-h-screen bg-surface">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[280px_1fr] gap-8">
        {/* ASIDE BỘ LỌC CỔ ĐIỂN */}
        <aside className="bg-white rounded-3xl border border-slate-200/90 p-5 h-fit shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-brand-600" />
              <h2 className="font-bold text-slate-900 text-sm">Bộ lọc cơ bản</h2>
            </div>
            {aiActive && (
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                AI Active
              </span>
            )}
          </div>

          <form onSubmit={applyFilters} className="space-y-3.5">
            <label className="block text-xs font-semibold text-slate-700">
              Từ khóa
              <div className="relative mt-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.keyword}
                  onChange={update("keyword")}
                  placeholder="Tên, môn, trường..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </label>

            <label className="block text-xs font-semibold text-slate-700">
              Môn học
              <select
                value={filters.subjectId}
                onChange={update("subjectId")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="">Tất cả môn học</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.educationLevel})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-700">
              Cấp học
              <select
                value={filters.educationLevel}
                onChange={update("educationLevel")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="">Tất cả cấp học</option>
                <option value="Primary">Tiểu học (Cấp 1)</option>
                <option value="Secondary">THCS (Cấp 2)</option>
                <option value="HighSchool">THPT (Cấp 3)</option>
                <option value="University">Đại học</option>
              </select>
            </label>

            <div className="border-t border-slate-100 pt-3">
              <span className="block text-xs font-semibold text-slate-700 mb-1">Khu vực dạy</span>
              <LocationFields
                city={filters.city}
                district={filters.district}
                onChange={({ city, district }) => setFilters((p) => ({ ...p, city, district }))}
              />
            </div>

            <label className="block text-xs font-semibold text-slate-700">
              Hình thức dạy
              <select
                value={filters.teachingMode}
                onChange={update("teachingMode")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="">Tất cả</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Both">Cả Online &amp; Offline</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Giá từ (₫)
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={filters.minPrice}
                  onChange={update("minPrice")}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Giá đến (₫)
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={filters.maxPrice}
                  onChange={update("maxPrice")}
                  placeholder="500000"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </label>
            </div>

            <Button type="submit" className="w-full text-xs py-2.5 rounded-xl cursor-pointer">
              Áp dụng bộ lọc
            </Button>
          </form>
        </aside>

        {/* PHẦN NỘI DUNG CHÍNH */}
        <section className="space-y-6">
          {/* BANNER 1: GỢI Ý CHẨN ĐOÁN LỖ HỔNG BÀI TẬP BẰNG AI */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-wrap items-center justify-between gap-4">
            <div className="relative z-10 max-w-xl space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-bold text-amber-300 border border-white/10">
                <Sparkles size={12} /> Tính năng mới với Gemini 2.5
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Chưa biết con hổng kiến thức ở phần nào?
              </h2>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Tải ảnh bài tập làm sai hoặc bài kiểm tra, AI sẽ phân tích chính xác chuyên đề bị hổng
                và đề xuất Top 3 Gia sư đã đạt điểm cao nhất về chuyên đề đó.
              </p>
            </div>
            <Link
              to="/ai-diagnosis"
              className="relative z-10 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 shrink-0"
            >
              Chẩn đoán qua ảnh ngay <ArrowRight size={14} />
            </Link>
          </div>

          {/* KHUNG TÌM KIẾM BẰNG CÂU VĂN TỰ NHIÊN (AI NATURAL SEARCH) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Brain size={16} className="text-brand-600" />
                Tìm kiếm thông minh bằng câu văn tự nhiên (AI Natural Search)
              </label>
              {aiActive && (
                <button
                  type="button"
                  onClick={handleClearAiSearch}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer transition"
                >
                  <RotateCcw size={13} /> Xóa tìm kiếm AI, về danh sách gốc
                </button>
              )}
            </div>

            <form onSubmit={handleAiNaturalSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="VD: Tìm gia sư nữ dạy Toán 12 ôn thi ĐH khối A1, tính tình kiên nhẫn, dạy online tối 2-4-6 khoảng 180k/buổi..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 pr-10"
                />
                <Sparkles size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-500 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={aiSearching || !aiPrompt.trim()}
                className="px-5 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {aiSearching ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Hỏi AI
                  </>
                )}
              </button>
            </form>

            {/* MẪU PROMPT GỢI Ý */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <span className="font-semibold text-slate-400">Gợi ý câu mẫu:</span>
              <button
                type="button"
                onClick={() => setAiPrompt("Tìm gia sư nữ dạy Toán 12 ôn thi ĐH khối A1, kiên nhẫn, dạy online tầm 200k")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                "Gia sư nữ dạy Toán 12 ôn khối A1 online..."
              </button>
              <button
                type="button"
                onClick={() => setAiPrompt("Cần gia sư Lý 11 dạy kèm lấy lại gốc học lực trung bình tối thứ 3 thứ 5")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                "Gia sư Lý 11 lấy lại gốc tối 3-5..."
              </button>
            </div>

            {/* HIỂN THỊ KẾT QUẢ BÓC TÁCH TỪ AI (NẾU ĐANG CHẠY AI SEARCH) */}
            {aiActive && aiResult?.filter && (
              <div className="mt-3 p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" />
                    AI đã tự động bóc tách bộ lọc từ yêu cầu của bạn:
                  </span>
                  <span className="font-extrabold text-brand-700 font-mono">
                    Tìm thấy {tutors.length} kết quả
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(aiResult.filter.subjectName || aiResult.filter.SubjectName) && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 font-bold text-purple-800 text-[11px]">
                      Môn: {aiResult.filter.subjectName || aiResult.filter.SubjectName}
                    </span>
                  )}
                  {(aiResult.filter.gradeLevel || aiResult.filter.GradeLevel) && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 font-bold text-purple-800 text-[11px]">
                      {aiResult.filter.gradeLevel || aiResult.filter.GradeLevel}
                    </span>
                  )}
                  {(aiResult.filter.gender || aiResult.filter.Gender) && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 font-semibold text-slate-700 text-[11px]">
                      Giới tính: {(aiResult.filter.gender || aiResult.filter.Gender) === "Female" ? "Nữ" : "Nam"}
                    </span>
                  )}
                  {(aiResult.filter.teachingMode || aiResult.filter.TeachingMode) && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 font-semibold text-slate-700 text-[11px]">
                      Hình thức: {aiResult.filter.teachingMode || aiResult.filter.TeachingMode}
                    </span>
                  )}
                  {(aiResult.filter.maxPrice || aiResult.filter.MaxPrice) && (
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 font-bold text-emerald-700 text-[11px] font-mono">
                      Giá &lt;= {(aiResult.filter.maxPrice || aiResult.filter.MaxPrice).toLocaleString("vi-VN")} ₫
                    </span>
                  )}
                  {(aiResult.filter.keywords || aiResult.filter.Keywords)?.map((kw, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 font-medium text-slate-600 text-[11px]">
                      #{kw}
                    </span>
                  ))}
                </div>

                {(aiResult.filter.explanation || aiResult.filter.Explanation) && (
                  <p className="text-[11px] text-purple-800/80 italic pt-1">
                    "{aiResult.filter.explanation || aiResult.filter.Explanation}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* HEADER DANH SÁCH GIA SƯ */}
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {aiActive ? "Kết quả gợi ý từ AI Gemini" : "Danh sách gia sư"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Đang tải dữ liệu..." : `${total} gia sư phù hợp`}
              </p>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-4 rounded-2xl border border-red-200 bg-red-50 text-xs text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTutorCard key={i} />
              ))}
            </div>
          ) : tutors.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-3">
              <EmptyState
                title="Không tìm thấy gia sư phù hợp"
                description={
                  aiActive
                    ? "Thử nới lỏng yêu cầu bằng câu tìm kiếm khác hoặc quay lại danh sách gia sư thường."
                    : "Thử thay đổi từ khóa, môn học hoặc nới lỏng bộ lọc giá và khu vực."
                }
                action={{
                  label: aiActive ? "Quay lại danh sách thường" : "Xóa bộ lọc",
                  onClick: aiActive ? handleClearAiSearch : () =>
                    setFilters({
                      keyword: "",
                      subjectId: "",
                      city: "",
                      district: "",
                      teachingMode: "",
                      educationLevel: "",
                      minPrice: "",
                      maxPrice: "",
                      minExperience: "",
                    }),
                }}
              />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {tutors.map((tutor) => (
                <div key={tutor.id} className="relative">
                  <TutorResultCard
                    tutor={tutor}
                    saved={savedIds.has(Number(tutor.id))}
                    onWishlistChange={(next) => {
                      setSavedIds((prev) => {
                        const copy = new Set(prev);
                        if (next) copy.add(Number(tutor.id));
                        else copy.delete(Number(tutor.id));
                        return copy;
                      });
                    }}
                  />
                  {/* Hiển thị lý do AI đề xuất nếu là kết quả tìm kiếm AI */}
                  {tutor.aiReason && (
                    <div className="mt-2 mx-2 p-2.5 rounded-xl bg-purple-50/80 border border-purple-200/70 text-[11px] text-purple-900 flex items-center justify-between gap-2 shadow-2xs">
                      <span className="font-medium truncate flex items-center gap-1">
                        <Sparkles size={12} className="text-purple-600 shrink-0" />
                        {tutor.aiReason}
                      </span>
                      {tutor.matchScore && (
                        <span className="font-extrabold text-purple-700 shrink-0">
                          {tutor.matchScore}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
