import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import Navbar from "../components/Navbar";
import TutorResultCard from "../components/TutorResultCard";
import { getSubjects, searchTutors } from "../api/tutorSearch";
import LocationFields from "../components/LocationFields";

export default function FindTutors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, []);

  useEffect(() => {
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
  }, [searchParams]);

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
      setError("Không thể tải danh sách gia sư. Kiểm tra backend đang chạy.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (e) => {
    e.preventDefault();
    const next = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) next[key] = value;
    });
    setSearchParams(next);
  };

  const update = (key) => (e) =>
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[280px_1fr] gap-8">
        <aside className="bg-white rounded-2xl border border-slate-100 p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={16} className="text-brand-600" />
            <h2 className="font-semibold text-slate-900">Bộ lọc</h2>
          </div>

          <form onSubmit={applyFilters} className="space-y-3">
            <label className="block text-sm text-slate-600">
              Từ khóa
              <div className="relative mt-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.keyword}
                  onChange={update("keyword")}
                  placeholder="Tên, môn, trường..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </label>

            <label className="block text-sm text-slate-600">
              Môn học
              <select
                value={filters.subjectId}
                onChange={update("subjectId")}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Tất cả môn</option>
                {subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-600">
              Cấp học
              <select
                value={filters.educationLevel}
                onChange={update("educationLevel")}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Tất cả cấp</option>
                <option value="Primary">Primary School</option>
                <option value="Secondary">Secondary School</option>
                <option value="High">High School</option>
                <option value="University">University</option>
              </select>
            </label>

            <div className="space-y-3">
              <p className="text-sm text-slate-600">Khu vực</p>
              <LocationFields
                allowEmpty
                city={filters.city}
                district={filters.district}
                onChange={({ city, district }) => setFilters((p) => ({ ...p, city, district }))}
              />
            </div>

            <label className="block text-sm text-slate-600">
              Hình thức
              <select
                value={filters.teachingMode}
                onChange={update("teachingMode")}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Tất cả</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm text-slate-600">
                Giá từ
                <input
                  type="number"
                  min="0"
                  value={filters.minPrice}
                  onChange={update("minPrice")}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-600">
                Giá đến
                <input
                  type="number"
                  min="0"
                  value={filters.maxPrice}
                  onChange={update("maxPrice")}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm text-slate-600">
              Kinh nghiệm tối thiểu (năm)
              <input
                type="number"
                min="0"
                value={filters.minExperience}
                onChange={update("minExperience")}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg py-2.5"
            >
              Tìm gia sư
            </button>
          </form>
        </aside>

        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Find Tutors</h1>
              <p className="text-sm text-slate-500 mt-1">
                {loading ? "Đang tải..." : `${total} gia sư phù hợp`}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-500">Đang tìm gia sư...</p>
          ) : tutors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500">
              Không tìm thấy gia sư phù hợp.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {tutors.map((tutor) => (
                <TutorResultCard key={tutor.id} tutor={tutor} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
