import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Plus, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import { searchStudyGroups } from "../api/studyGroups";
import { getSubjects } from "../api/tutorSearch";
import LocationFields from "../components/LocationFields";

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

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nhóm học</h1>
            <p className="text-sm text-slate-500 mt-1">Tìm bạn học theo môn và khu vực. Có thể có mentor hoặc chỉ học sinh hỗ trợ nhau.</p>
          </div>
          <Link to="/study-groups/new" className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2">
            <Plus size={16} /> Tạo nhóm
          </Link>
        </div>

        <form onSubmit={apply} className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            value={filters.keyword}
            onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value }))}
            placeholder="Từ khóa"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={filters.subjectId}
            onChange={(e) => setFilters((p) => ({ ...p, subjectId: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Tất cả môn</option>
            {subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
            ))}
          </select>
          <LocationFields
            allowEmpty
            city={filters.city}
            district={filters.district}
            onChange={({ city, district }) => setFilters((p) => ({ ...p, city, district }))}
          />
          <div className="flex gap-2 lg:col-span-2">
            <select
              value={filters.hasMentor}
              onChange={(e) => setFilters((p) => ({ ...p, hasMentor: e.target.value }))}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Mọi hình thức</option>
              <option value="true">Có mời gia sư</option>
              <option value="false">Chỉ học sinh</option>
            </select>
            <button className="bg-brand-600 text-white rounded-lg px-4 text-sm">Lọc</button>
          </div>
        </form>

        {loading ? (
          <p className="text-slate-500">Đang tải...</p>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500">
            Chưa có nhóm phù hợp. Hãy tạo bài đăng nhóm mới.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {groups.map((g) => (
              <Link key={g.groupId} to={`/study-groups/${g.groupId}`} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-brand-200">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">{g.title}</h3>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${g.hasMentor ? "bg-brand-50 text-brand-700" : "bg-verified-50 text-verified-600"}`}>
                    {g.hasMentor ? "Có gia sư" : "Peer study"}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">{g.description || "Nhóm học chia sẻ bài tập và hỗ trợ nhau."}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                  <span>{g.subjectName}</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={12} />{[g.district, g.city].filter(Boolean).join(", ") || "Online"}</span>
                  <span className="inline-flex items-center gap-1"><Users size={12} />{g.memberCount}/{g.maxMembers}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
