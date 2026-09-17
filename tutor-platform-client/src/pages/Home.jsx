import { useState } from "react";
import {
  Search,
  Users,
  GraduationCap,
  ShieldCheck,
  Award,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Loader2,
  BookOpen,
} from "lucide-react";
import TutorCard from "../components/TutorCard";
import TrustBadge from "../components/TrustBadge";
import Navbar from "../components/Navbar";
import axiosClient from "../api/axiosClient";
const FEATURED_TUTORS = [
  {
    name: "Dr. Marcus Vance",
    subject: "Data Science & Machine Learning",
    tags: ["Python", "Stats", "AI"],
    rating: 4.9,
    price: 45,
    photoUrl: "https://i.pravatar.cc/300?img=13",
  },
  {
    name: "Sarah Chen, Ph.D",
    subject: "Advanced Mathematics",
    tags: ["Calculus", "Algebra"],
    rating: 5.0,
    price: 55,
    photoUrl: "https://i.pravatar.cc/300?img=32",
  },
  {
    name: "David Rodriguez",
    subject: "Full-Stack Web Development",
    tags: ["React", "Node.js", "CSS"],
    rating: 4.8,
    price: 40,
    photoUrl: "https://i.pravatar.cc/300?img=51",
  },
  {
    name: "Prof. Elena Rostova",
    subject: "English Literature & Essay Writing",
    tags: ["Writing", "Literature"],
    rating: 4.9,
    price: 50,
    photoUrl: "https://i.pravatar.cc/300?img=47",
  },
];

const TRUST_ITEMS = [
  {
    icon: <ShieldCheck size={22} className="text-brand-600" />,
    iconBg: "#EEF2FF",
    title: "ID Verified",
    description:
      "Every tutor undergoes rigorous identity checks to ensure authenticity and marketplace integrity.",
  },
  {
    icon: <Award size={22} className="text-verified-600" />,
    iconBg: "#ECFDF5",
    title: "Subject Tested",
    description:
      "Instructors must pass competency assessments or provide verifiable credentials for listed subjects.",
  },
  {
    icon: <ShieldAlert size={22} className="text-orange-500" />,
    iconBg: "#FFF1EC",
    title: "Safe & Secure",
    description:
      "All sessions run through our encrypted platform with robust reporting tools and 24/7 moderation.",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("tutors"); // "tutors" | "groups"
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");

  // Search results state
  const [result, setResult] = useState(null); // { subjects, tutors } — null until first search
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  // The existing search box performs both "Tìm môn học" and "Tìm gia sư":
  // subject keyword/level  -> GET /api/SubjectSearch/search
  // tutor keyword/level    -> GET /api/TutorSearch/search
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    setSearchError("");
    setSubjectFilter("");

    const params = {
      keyword: query.trim() || undefined,
      educationLevel: level || undefined,
    };

    try {
      const [subjectsRes, tutorsRes] = await Promise.all([
        axiosClient.get("/SubjectSearch/search", { params }),
        axiosClient.get("/TutorSearch/search", { params }),
      ]);
      setResult({
        subjects: subjectsRes.data.items ?? [],
        tutors: tutorsRes.data.items ?? [],
      });
    } catch (err) {
      setSearchError(
        err.response?.data?.message ||
          "Không thể tìm kiếm lúc này. Vui lòng thử lại sau.",
      );
      setResult(null);
    } finally {
      setSearching(false);
    }
  };

  // Flow: tìm môn học -> chọn môn học -> tìm gia sư theo môn học
  const handleFindTutorsForSubject = async (subjectName) => {
    setSearching(true);
    setSearchError("");
    setSubjectFilter(subjectName);
    try {
      const tutorsRes = await axiosClient.get("/TutorSearch/search", {
        params: { subjectName },
      });
      setResult((prev) => ({
        subjects: prev?.subjects ?? [],
        tutors: tutorsRes.data.items ?? [],
      }));
    } catch (err) {
      setSearchError(
        err.response?.data?.message ||
          "Không thể tìm gia sư cho môn học này lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setSearching(false);
    }
  };

  const clearSubjectFilter = async () => {
    setSearching(true);
    setSearchError("");
    setSubjectFilter("");
    try {
      const tutorsRes = await axiosClient.get("/TutorSearch/search", {
        params: {
          keyword: query.trim() || undefined,
          educationLevel: level || undefined,
        },
      });
      setResult((prev) => ({
        subjects: prev?.subjects ?? [],
        tutors: tutorsRes.data.items ?? [],
      }));
    } catch (err) {
      setSearchError(
        err.response?.data?.message ||
          "Không thể tìm kiếm lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen">
      <Navbar />
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden pt-16 pb-24 px-6 text-center">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)",
          }}
        />

        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-6">
          <Sparkles size={14} />
          Over 10,000 Verified Tutors &amp; Students
        </span>

        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight max-w-3xl mx-auto mb-5">
          Find Your Perfect <span className="text-brand-600">Tutor</span> or
          Study Group
        </h1>

        <p className="text-slate-500 max-w-xl mx-auto mb-10">
          Connect with world-class educators and collaborative peers
          globally. Elevate your learning experience in a secure, verified
          marketplace.
        </p>

        {/* Search card */}
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-3 text-left">
          <div className="flex border-b border-slate-100 mb-3">
            <TabButton
              active={activeTab === "tutors"}
              onClick={() => setActiveTab("tutors")}
              icon={<GraduationCap size={16} />}
              label="Find Tutors"
            />
            <TabButton
              active={activeTab === "groups"}
              onClick={() => setActiveTab("groups")}
              icon={<Users size={16} />}
              label="Find Study Groups"
            />
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 p-1">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to learn? (e.g. Calculus, Python)"
                className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
            </div>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 sm:w-48"
            >
              <option value="">Select Level</option>
              <option value="primary">Primary School</option>
              <option value="secondary">Secondary School</option>
              <option value="highschool">High School</option>
              <option value="university">University</option>
            </select>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              Search
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* ---------------- SEARCH RESULTS ---------------- */}
      {result !== null && (
        <section className="max-w-6xl mx-auto px-6 pb-10">
          {searching && (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Đang tìm kiếm...</span>
            </div>
          )}

          {!searching && searchError && (
            <div className="rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 px-4 py-3">
              {searchError}
            </div>
          )}

          {!searching && !searchError && result && (
            <>
              {subjectFilter && (
                <div className="flex items-center gap-2 mb-6 text-sm text-slate-600">
                  <BookOpen size={16} className="text-brand-600" />
                  <span>
                    Đang xem gia sư dạy <strong>{subjectFilter}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={clearSubjectFilter}
                    className="ml-2 text-xs font-medium text-brand-600 hover:underline"
                  >
                    Xóa lọc
                  </button>
                </div>
              )}

              {/* Tìm môn học */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-slate-900 mb-3">
                  Môn học tìm được ({result.subjects.length})
                </h2>
                {result.subjects.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Không tìm thấy môn học nào phù hợp.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.subjects.map((s) => (
                      <button
                        key={s.subjectId}
                        type="button"
                        onClick={() => handleFindTutorsForSubject(s.subjectName)}
                        title={`Tìm gia sư dạy ${s.subjectName}`}
                        className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-colors"
                      >
                        <BookOpen size={14} className="text-brand-600" />
                        {s.subjectName}
                        {s.educationLevel ? (
                          <span className="text-xs text-slate-400">
                            · {s.educationLevel}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tìm gia sư */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">
                  Gia sư tìm được ({result.tutors.length})
                </h2>
                {result.tutors.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Không tìm thấy gia sư nào phù hợp.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {result.tutors.map((t) => (
                      <TutorCard key={t.tutorId} tutor={toTutorCard(t)} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* ---------------- TRUST STANDARD ---------------- */}
      <section className="bg-brand-50/60 py-16 px-6">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            The TSG Trust Standard
          </h2>
          <p className="text-slate-500">
            Your safety and academic success are our top priorities.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
          {TRUST_ITEMS.map((item) => (
            <TrustBadge key={item.title} {...item} />
          ))}
        </div>
      </section>

      {/* ---------------- FEATURED TUTORS ---------------- */}
      <section className="max-w-6xl mx-auto py-16 px-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-semibold text-brand-600 tracking-wide">
              TOP RATED
            </span>
            <h2 className="text-2xl font-bold text-slate-900">
              Featured Tutors
            </h2>
          </div>
          <a
            href="/tutors"
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            View All Tutors
            <ArrowRight size={14} />
          </a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURED_TUTORS.map((tutor) => (
            <TutorCard key={tutor.name} tutor={tutor} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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

// Map a backend TutorSearchResultItem to the TutorCard props used by the UI
function toTutorCard(t) {
  return {
    name: t.fullName || "Gia sư",
    subject:
      (t.subjects && t.subjects.length ? t.subjects.join(", ") : t.major) ||
      "",
    tags: [t.teachingMode, t.city, t.district].filter(Boolean).slice(0, 3),
    rating: t.averageRating || 0,
    price: t.hourlyRateMin ?? t.hourlyRateMax ?? 0,
    photoUrl: t.avatarUrl || "https://i.pravatar.cc/300?img=12",
  };
}
