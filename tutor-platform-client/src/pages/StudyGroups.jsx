import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Users,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Star,
  MapPin,
  Video,
  Calendar,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  X,
  BookOpen,
  ArrowRight,
  LogOut,
  AlertCircle,
  RotateCcw,
  BadgeCheck,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axiosClient from "../api/axiosClient";
import { useNavigate } from "react-router-dom";

// Default Vietnamese mock study groups matching DTO shape
const DEFAULT_GROUPS = [
  {
    groupId: 1,
    subjectId: 1,
    subjectName: "Toán học",
    title: "Nhóm giải đề thi thử Đại học môn Toán 2024",
    description: "Tập trung giải đề thi thử đại học môn Toán từ các trường chuyên toàn quốc. Thảo luận các câu vận dụng cao điểm 9+.",
    educationLevel: "Lớp 12",
    studyGoal: "Luyện thi THPTQG",
    maxMembers: 8,
    currentMembersCount: 6,
    meetingMode: "Online",
    location: null,
    city: null,
    district: null,
    status: "Open",
    hasMentor: true,
    creatorName: "Nguyễn Văn Hùng",
    mentor: {
      tutorId: 1,
      tutorName: "ThS. Trần Hoàng Nam",
      university: "ĐH Khoa Học Tự Nhiên",
      averageRating: 4.9,
    },
    schedules: [
      { dayOfWeek: 2, startTime: "19:30", endTime: "21:30" },
      { dayOfWeek: 5, startTime: "19:30", endTime: "21:30" },
    ],
  },
  {
    groupId: 2,
    subjectId: 2,
    subjectName: "Tiếng Anh",
    title: "Luyện Speaking IELTS theo chủ đề mục tiêu 7.0+",
    description: "Mỗi buổi luyện nói 1 chủ đề chuyên sâu Part 2 & 3. Sửa phát âm, phản xạ từ vựng và tư duy logic diễn đạt.",
    educationLevel: "Đại học",
    studyGoal: "Chứng chỉ IELTS",
    maxMembers: 6,
    currentMembersCount: 6,
    meetingMode: "Online",
    location: null,
    city: null,
    district: null,
    status: "Full",
    hasMentor: true,
    creatorName: "Lê Thu Hà",
    mentor: {
      tutorId: 2,
      tutorName: "Ms. Sarah Đặng (8.5 IELTS)",
      university: "ĐH Ngoại Thương",
      averageRating: 5.0,
    },
    schedules: [{ dayOfWeek: 7, startTime: "09:00", endTime: "11:00" }],
  },
  {
    groupId: 3,
    subjectId: 3,
    subjectName: "Vật Lý",
    title: "Ôn tập Vật Lý 11 - Chương Điện trường & Dòng điện",
    description: "Cùng làm bài tập trắc nghiệm và củng cố phương pháp giải nhanh vật lý 11. Nhóm gặp học trực tiếp tại quán cafe sách.",
    educationLevel: "Lớp 11",
    studyGoal: "Ôn tập giữa kỳ",
    maxMembers: 6,
    currentMembersCount: 3,
    meetingMode: "Offline",
    location: "The Coffee House, 123 Nguyễn Văn Cừ, Quận 5",
    city: "TP. Hồ Chí Minh",
    district: "Quận 5",
    status: "Open",
    hasMentor: false,
    creatorName: "Phạm Minh Quân",
    mentor: null,
    schedules: [{ dayOfWeek: 6, startTime: "14:00", endTime: "16:30" }],
  },
  {
    groupId: 4,
    subjectId: 4,
    subjectName: "Hóa học",
    title: "Lấy gốc Hóa học Hữu cơ 12 từ đầu",
    description: "Dành cho các bạn muốn học lại từ bản chất Este - Lipit, Cacbohiđrat đến Amin. Học từ từ, giải thích kỹ từng dạng bài.",
    educationLevel: "Lớp 12",
    studyGoal: "Lấy lại căn bản",
    maxMembers: 8,
    currentMembersCount: 4,
    meetingMode: "Online",
    location: null,
    city: null,
    district: null,
    status: "Open",
    hasMentor: true,
    creatorName: "Đỗ Gia Bảo",
    mentor: {
      tutorId: 3,
      tutorName: "Thầy Vũ Minh Tuấn",
      university: "ĐH Sư Phạm TP.HCM",
      averageRating: 4.8,
    },
    schedules: [
      { dayOfWeek: 3, startTime: "20:00", endTime: "21:30" },
      { dayOfWeek: 6, startTime: "20:00", endTime: "21:30" },
    ],
  },
  {
    groupId: 5,
    subjectId: 5,
    subjectName: "Lập trình",
    title: "Tự học Python & Cấu trúc dữ liệu cho người mới",
    description: "Cùng làm bài tập LeetCode mức Easy/Medium và xây dựng project nhỏ bằng Python để chuẩn bị thực tập.",
    educationLevel: "Đại học",
    studyGoal: "Kỹ năng lập trình",
    maxMembers: 10,
    currentMembersCount: 7,
    meetingMode: "Online",
    location: null,
    city: null,
    district: null,
    status: "Open",
    hasMentor: false,
    creatorName: "Ngô Quốc Việt",
    mentor: null,
    schedules: [{ dayOfWeek: 1, startTime: "20:30", endTime: "22:00" }],
  },
  {
    groupId: 6,
    subjectId: 6,
    subjectName: "Toán học",
    title: "Ôn tập Toán 10 chuẩn bị thi học kỳ 2",
    description: "Nhóm tập trung giải các bộ đề thi học kỳ của các trường THPT tại Hà Nội. Học trực tiếp tại thư viện thanh thiếu niên.",
    educationLevel: "Lớp 10",
    studyGoal: "Ôn thi học kỳ",
    maxMembers: 5,
    currentMembersCount: 2,
    meetingMode: "Offline",
    location: "Thư viện Thanh Niên, Ba Đình",
    city: "Hà Nội",
    district: "Ba Đình",
    status: "Open",
    hasMentor: false,
    creatorName: "Trần Mai Anh",
    mentor: null,
    schedules: [{ dayOfWeek: 7, startTime: "14:30", endTime: "16:30" }],
  },
];

const DAYS_OF_WEEK = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

// Accent-insensitive normalization
function normalizeVN(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

// TabButton matching Home.jsx
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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

// Quick filter chip
function FilterChip({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "bg-white text-slate-600 border border-slate-200 hover:border-brand-500 hover:text-brand-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function StudyGroups() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search form state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedMode, setSelectedMode] = useState("");

  // Filters & sorting
  const [activeChip, setActiveChip] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [leaveConfirmGroup, setLeaveConfirmGroup] = useState(null);

  // User state
  const [toastMessage, setToastMessage] = useState(null);
  const [joinedGroups, setJoinedGroups] = useState(new Set());

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/StudyGroups");
      if (res.data?.items && res.data.items.length > 0) {
        setGroups(res.data.items);
      } else {
        setGroups(DEFAULT_GROUPS);
      }
    } catch (err) {
      console.warn("Using default groups data due to API status:", err.message);
      setGroups(DEFAULT_GROUPS);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const filteredGroups = useMemo(() => {
    let result = [...groups];

    // BR-17: Only Open or Full status
    result = result.filter((g) => g.status === "Open" || g.status === "Full");

    // Text search (accent-insensitive)
    if (searchQuery.trim()) {
      const q = normalizeVN(searchQuery);
      result = result.filter(
        (g) =>
          normalizeVN(g.title).includes(q) ||
          normalizeVN(g.description).includes(q) ||
          normalizeVN(g.subjectName).includes(q) ||
          normalizeVN(g.studyGoal).includes(q)
      );
    }

    // Dropdown filters
    if (selectedSubject) {
      const q = normalizeVN(selectedSubject);
      result = result.filter((g) => normalizeVN(g.subjectName).includes(q));
    }
    if (selectedLevel) {
      result = result.filter((g) => g.educationLevel === selectedLevel);
    }
    if (selectedMode) {
      result = result.filter((g) => g.meetingMode === selectedMode);
    }

    // Quick chip filters
    if (activeChip === "hasMentor") {
      result = result.filter((g) => g.hasMentor);
    } else if (activeChip === "online") {
      result = result.filter((g) => g.meetingMode === "Online");
    } else if (activeChip === "offline") {
      result = result.filter((g) => g.meetingMode === "Offline");
    } else if (activeChip === "exam") {
      result = result.filter(
        (g) =>
          normalizeVN(g.studyGoal).includes("luyen thi") ||
          normalizeVN(g.studyGoal).includes("on tap")
      );
    }

    // Sorting
    if (sortBy === "slots") {
      result.sort(
        (a, b) =>
          b.maxMembers - b.currentMembersCount - (a.maxMembers - a.currentMembersCount)
      );
    } else if (sortBy === "mentorFirst") {
      result.sort((a, b) => (b.hasMentor ? 1 : 0) - (a.hasMentor ? 1 : 0));
    } else {
      result.sort((a, b) => b.groupId - a.groupId);
    }

    return result;
  }, [groups, searchQuery, selectedSubject, selectedLevel, selectedMode, activeChip, sortBy]);

  // Handle open create modal (BR-03: Guest auth check)
  const handleOpenCreateModal = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { returnUrl: "/study-groups" } });
      return;
    }
    setIsCreateModalOpen(true);
  };

  // Handle join or trigger leave modal
  const handleJoinOrLeave = (group) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { returnUrl: "/study-groups" } });
      return;
    }

    if (joinedGroups.has(group.groupId)) {
      setLeaveConfirmGroup(group);
    } else {
      // Join group
      setJoinedGroups((prev) => new Set([...prev, group.groupId]));
      setGroups((prev) =>
        prev.map((g) => {
          if (g.groupId === group.groupId) {
            const nextCount = g.currentMembersCount + 1;
            return {
              ...g,
              currentMembersCount: nextCount,
              status: nextCount >= g.maxMembers ? "Full" : "Open",
            };
          }
          return g;
        })
      );
      showToast(`Bạn đã tham gia nhóm "${group.title}" thành công!`);
    }
  };

  // Confirm leave group
  const handleConfirmLeave = () => {
    if (!leaveConfirmGroup) return;
    setJoinedGroups((prev) => {
      const next = new Set(prev);
      next.delete(leaveConfirmGroup.groupId);
      return next;
    });
    setGroups((prev) =>
      prev.map((g) => {
        if (g.groupId === leaveConfirmGroup.groupId) {
          const nextCount = Math.max(0, g.currentMembersCount - 1);
          return {
            ...g,
            currentMembersCount: nextCount,
            status: "Open",
          };
        }
        return g;
      })
    );
    showToast(`Đã rời nhóm "${leaveConfirmGroup.title}"`);
    setLeaveConfirmGroup(null);
  };

  return (
    <div className="bg-surface min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900/90 backdrop-blur text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-slate-700">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ---------------- HERO SECTION (Unified with Home.jsx) ---------------- */}
      <section className="relative overflow-hidden pt-16 pb-20 px-6 text-center">
        {/* Soft radial background glow */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)",
          }}
        />

        {/* Sparkle badge */}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-6">
          <Sparkles size={14} />
          Hơn 500+ Nhóm Học Tập Đang Hoạt Động
        </span>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight max-w-3xl mx-auto mb-4">
          Cùng Tiến Bộ Với <span className="text-brand-600">Nhóm Học Tập</span>
        </h1>

        <p className="text-slate-500 max-w-xl mx-auto mb-8">
          Tham gia các nhóm tự học, trao đổi kiến thức, chuẩn bị cho kỳ thi hoặc nhận hướng dẫn từ các Mentor học tập uy tín.
        </p>

        {/* Search & Discovery Card (Exact match with Home.jsx style) */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-3 text-left">
          {/* Discovery Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 mb-3">
            <div className="flex">
              <TabButton
                active={false}
                onClick={() => navigate("/")}
                icon={<GraduationCap size={16} />}
                label="Find Tutors"
              />
              <TabButton
                active={true}
                onClick={() => {}}
                icon={<Users size={16} />}
                label="Find Study Groups"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Tạo nhóm mới
            </button>
          </div>

          {/* Search Inputs Form */}
          <div className="flex flex-col sm:flex-row gap-2 p-1">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm môn học, chủ đề, tên nhóm (VD: Toán, IELTS)..."
                className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 placeholder:text-slate-400"
              />
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 sm:w-40 bg-white"
            >
              <option value="">Tất cả môn</option>
              <option value="Toán">Toán học</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
              <option value="Vật Lý">Vật Lý</option>
              <option value="Hóa học">Hóa học</option>
              <option value="Lập trình">Lập trình</option>
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 sm:w-36 bg-white"
            >
              <option value="">Trình độ</option>
              <option value="Lớp 10">Lớp 10</option>
              <option value="Lớp 11">Lớp 11</option>
              <option value="Lớp 12">Lớp 12</option>
              <option value="Đại học">Đại học</option>
            </select>

            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 sm:w-36 bg-white"
            >
              <option value="">Hình thức</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </div>
      </section>

      {/* ---------------- FILTER & RESULTS BAR ---------------- */}
      <section className="max-w-6xl mx-auto px-6 w-full mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-slate-100">
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              active={activeChip === "all"}
              onClick={() => setActiveChip("all")}
              label="Tất cả"
            />
            <FilterChip
              active={activeChip === "hasMentor"}
              onClick={() => setActiveChip("hasMentor")}
              icon={<ShieldCheck size={13} className={activeChip === "hasMentor" ? "text-white" : "text-verified-600"} />}
              label="Có Mentor"
            />
            <FilterChip
              active={activeChip === "online"}
              onClick={() => setActiveChip("online")}
              icon={<Video size={13} />}
              label="Học Online"
            />
            <FilterChip
              active={activeChip === "offline"}
              onClick={() => setActiveChip("offline")}
              icon={<MapPin size={13} />}
              label="Học Offline"
            />
            <FilterChip
              active={activeChip === "exam"}
              onClick={() => setActiveChip("exam")}
              label="Luyện thi"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter size={13} />
              <span>Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="font-medium text-slate-700 bg-transparent outline-none cursor-pointer text-xs"
              >
                <option value="newest">Mới nhất</option>
                <option value="slots">Nhiều chỗ trống</option>
                <option value="mentorFirst">Ưu tiên Mentor</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="sm:hidden flex items-center gap-1 bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
            >
              <Plus size={13} /> Tạo nhóm
            </button>
          </div>
        </div>

        {/* Counter */}
        <div className="pt-4 text-xs text-slate-500">
          Tìm thấy <span className="font-semibold text-slate-900">{filteredGroups.length}</span> nhóm học tập phù hợp
        </div>
      </section>

      {/* ---------------- MAIN GROUPS GRID ---------------- */}
      <main className="flex-1 max-w-6xl mx-auto px-6 w-full pb-16">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-72 animate-pulse"
              />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto my-8 shadow-sm">
            <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search size={24} className="text-brand-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Không tìm thấy nhóm học
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Không có nhóm nào phù hợp với bộ lọc hiện tại. Bạn có thể xóa lọc hoặc tự tạo nhóm học mới.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubject("");
                  setSelectedLevel("");
                  setSelectedMode("");
                  setActiveChip("all");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw size={13} /> Xóa bộ lọc
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700"
              >
                <Plus size={13} /> Tạo nhóm mới
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => {
              const isJoined = joinedGroups.has(group.groupId);
              const isFull = group.currentMembersCount >= group.maxMembers;
              const remainingSpots = Math.max(0, group.maxMembers - group.currentMembersCount);
              const progressPct = Math.min(
                100,
                (group.currentMembersCount / group.maxMembers) * 100
              );

              return (
                <div
                  key={group.groupId}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                >
                  {/* Top content */}
                  <div>
                    {/* Visual Card Header */}
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-brand-50/40 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white text-brand-700 shadow-xs border border-brand-100">
                          {group.subjectName}
                        </span>
                        <span className="text-xs text-slate-600 bg-white/80 px-2 py-1 rounded-md border border-slate-200/60">
                          {group.educationLevel}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          group.meetingMode === "Online"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-purple-50 text-purple-700 border border-purple-100"
                        }`}
                      >
                        {group.meetingMode === "Online" ? (
                          <Video size={11} />
                        ) : (
                          <MapPin size={11} />
                        )}
                        {group.meetingMode}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                      <h3
                        onClick={() => setSelectedGroupDetails(group)}
                        className="font-bold text-slate-900 text-base leading-snug line-clamp-2 hover:text-brand-600 cursor-pointer transition-colors"
                      >
                        {group.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                        {group.description}
                      </p>

                      {/* Schedule info */}
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {group.schedules && group.schedules.length > 0
                            ? `${DAYS_OF_WEEK[group.schedules[0].dayOfWeek === 7 ? 0 : group.schedules[0].dayOfWeek]} · ${group.schedules[0].startTime} - ${group.schedules[0].endTime}`
                            : "Lịch linh hoạt"}
                          {group.schedules && group.schedules.length > 1 && (
                            <span className="text-slate-400 ml-1">
                              (+{group.schedules.length - 1} buổi)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Offline location preview */}
                      {group.meetingMode === "Offline" && group.location && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600 px-2 py-1 truncate">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{group.location}</span>
                        </div>
                      )}

                      {/* Mentor section */}
                      {group.hasMentor && group.mentor ? (
                        <div className="mt-3 p-2.5 rounded-xl bg-verified-50/50 border border-verified-600/15 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-verified-600/10 text-verified-600 font-bold text-xs flex items-center justify-center shrink-0">
                              {group.mentor.tutorName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                {group.mentor.tutorName}
                                <BadgeCheck size={12} className="text-verified-600 fill-verified-50" />
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                {group.mentor.university}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-2xs">
                            <Star size={11} className="fill-star text-star" />
                            {group.mentor.averageRating.toFixed(1)}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-100/70 flex items-center gap-2 text-xs text-slate-500">
                          <Users size={13} className="text-slate-400" />
                          <span>Nhóm tự học cùng bạn bè</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions & Capacity */}
                  <div className="px-5 pb-5 pt-2 border-t border-slate-50">
                    {/* Capacity Indicator */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">
                          {group.currentMembersCount} / {group.maxMembers} thành viên
                        </span>
                        <span
                          className={`font-medium ${
                            isFull ? "text-rose-500" : "text-slate-600"
                          }`}
                        >
                          {isFull ? "Đã đủ chỗ" : `Còn ${remainingSpots} chỗ trống`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFull
                              ? "bg-rose-500"
                              : progressPct >= 80
                              ? "bg-amber-500"
                              : "bg-brand-600"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGroupDetails(group)}
                        className="flex-1 text-center py-2 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/60"
                      >
                        Chi tiết
                      </button>

                      {isJoined ? (
                        <button
                          type="button"
                          onClick={() => handleJoinOrLeave(group)}
                          className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-600 transition-colors group/leave flex items-center justify-center gap-1 border border-emerald-200"
                        >
                          <CheckCircle2 size={13} className="group-hover/leave:hidden text-emerald-600" />
                          <LogOut size={13} className="hidden group-hover/leave:block text-rose-600" />
                          <span className="group-hover/leave:hidden">Đã tham gia</span>
                          <span className="hidden group-hover/leave:block">Rời nhóm</span>
                        </button>
                      ) : isFull ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed text-center"
                        >
                          Đã đầy
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJoinOrLeave(group)}
                          className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors text-center shadow-xs"
                        >
                          Tham gia
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ---------------- MODAL: CREATE STUDY GROUP ---------------- */}
      {isCreateModalOpen && (
        <CreateStudyGroupModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newGroup) => {
            setGroups((prev) => [newGroup, ...prev]);
            setJoinedGroups((prev) => new Set([...prev, newGroup.groupId]));
            setIsCreateModalOpen(false);
            showToast("Tạo nhóm học tập thành công!");
          }}
        />
      )}

      {/* ---------------- MODAL: GROUP DETAILS ---------------- */}
      {selectedGroupDetails && (
        <GroupDetailsModal
          group={selectedGroupDetails}
          isJoined={joinedGroups.has(selectedGroupDetails.groupId)}
          onJoin={handleJoinOrLeave}
          onClose={() => setSelectedGroupDetails(null)}
        />
      )}

      {/* ---------------- MODAL: LEAVE CONFIRMATION (SRS 3.2.23) ---------------- */}
      {leaveConfirmGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={22} className="ml-0.5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Xác nhận rời nhóm học
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn rời khỏi nhóm{" "}
              <strong className="text-slate-800">
                "{leaveConfirmGroup.title}"
              </strong>
              ? Nếu nhóm đầy trong tương lai, bạn có thể không thể tham gia lại.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLeaveConfirmGroup(null)}
                className="flex-1 py-2 px-3 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Ở lại nhóm
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="flex-1 py-2 px-3 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
              >
                Xác nhận rời
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

// ---------------- SUBCOMPONENT: CREATE MODAL ----------------
function CreateStudyGroupModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    subjectId: 1,
    educationLevel: "Lớp 12",
    studyGoal: "Luyện thi THPTQG",
    maxMembers: 6,
    meetingMode: "Online",
    location: "",
    city: "",
    district: "",
    description: "",
    startTime: "19:30",
    endTime: "21:30",
    dayOfWeek: 2,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // BVA & Validation checks
    if (!formData.title || formData.title.trim().length < 5) {
      setError("Tiêu đề nhóm phải có ít nhất 5 ký tự.");
      return;
    }
    if (formData.title.length > 200) {
      setError("Tiêu đề nhóm không được vượt quá 200 ký tự.");
      return;
    }
    if (formData.maxMembers < 2 || formData.maxMembers > 12) {
      setError("Số lượng thành viên tối đa phải từ 2 đến 12.");
      return;
    }
    if (formData.meetingMode === "Offline" && !formData.location.trim()) {
      setError("Vui lòng cung cấp địa điểm gặp mặt cho nhóm học Offline.");
      return;
    }
    if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        subjectId: Number(formData.subjectId),
        educationLevel: formData.educationLevel,
        studyGoal: formData.studyGoal,
        maxMembers: Number(formData.maxMembers),
        meetingMode: formData.meetingMode,
        location: formData.location || null,
        city: formData.city || null,
        district: formData.district || null,
        description: formData.description || null,
        scheduleDayOfWeek: Number(formData.dayOfWeek),
        startTime: formData.startTime,
        endTime: formData.endTime,
      };

      const res = await axiosClient.post("/StudyGroups", payload);
      onSuccess(res.data?.data || res.data);
    } catch (err) {
      console.warn("API error during group creation, creating local group:", err);
      // Mock fallback object
      const mockCreated = {
        groupId: Date.now(),
        subjectId: Number(formData.subjectId),
        subjectName:
          formData.subjectId === 1
            ? "Toán học"
            : formData.subjectId === 2
            ? "Tiếng Anh"
            : "Môn học khác",
        title: formData.title,
        description: formData.description,
        educationLevel: formData.educationLevel,
        studyGoal: formData.studyGoal,
        maxMembers: Number(formData.maxMembers),
        currentMembersCount: 1,
        meetingMode: formData.meetingMode,
        location: formData.location,
        status: "Open",
        hasMentor: false,
        creatorName: "Bạn (Trưởng nhóm)",
        mentor: null,
        schedules: [
          {
            dayOfWeek: Number(formData.dayOfWeek),
            startTime: formData.startTime,
            endTime: formData.endTime,
          },
        ],
      };
      onSuccess(mockCreated);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Tạo Nhóm Học Tập Mới
            </h2>
            <p className="text-xs text-slate-500">
              Mời các thành viên cùng trình độ hoặc yêu cầu Mentor đồng hành
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="createGroupForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiêu đề nhóm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="VD: Cùng giải đề Toán THPTQG 2024 - Mục tiêu 9+..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Môn học <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectId: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                >
                  <option value={1}>Toán học</option>
                  <option value={2}>Tiếng Anh</option>
                  <option value={3}>Vật Lý</option>
                  <option value={4}>Hóa học</option>
                  <option value={5}>Lập trình</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cấp bậc / Lớp học <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.educationLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, educationLevel: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                >
                  <option value="Lớp 10">Lớp 10</option>
                  <option value="Lớp 11">Lớp 11</option>
                  <option value="Lớp 12">Lớp 12</option>
                  <option value="Đại học">Đại học</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hình thức học <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.meetingMode}
                  onChange={(e) =>
                    setFormData({ ...formData, meetingMode: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                >
                  <option value="Online">Online (Google Meet/Zoom)</option>
                  <option value="Offline">Offline (Gặp mặt trực tiếp)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số lượng thành viên tối đa (2 - 12)
                </label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={formData.maxMembers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxMembers: parseInt(e.target.value) || 6,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                />
              </div>
            </div>

            {formData.meetingMode === "Offline" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa điểm gặp mặt <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="VD: Thư viện ĐH Sư Phạm, Quán cà phê ABC..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                />
              </div>
            )}

<div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lịch sinh hoạt dự kiến
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) =>
                    setFormData({ ...formData, dayOfWeek: Number(e.target.value) })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white sm:w-36 focus:outline-none focus:border-brand-500"
                >
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <option key={idx} value={idx === 0 ? 7 : idx}>
                      {day}
                    </option>
                  ))}
                </select>

                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-500"
                />
                <span className="text-slate-400 text-xs">đến</span>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mục tiêu &amp; Mô tả hoạt động
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Nêu rõ nội dung thảo luận, yêu cầu đối với thành viên khi tham gia nhóm..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button
            form="createGroupForm"
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {loading ? "Đang tạo..." : "Tạo nhóm ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- SUBCOMPONENT: DETAILS MODAL ----------------
function GroupDetailsModal({ group, isJoined, onJoin, onClose }) {
  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 border border-brand-100">
                {group.subjectName}
              </span>
              <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                {group.educationLevel}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {group.meetingMode}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {group.title}
            </h2>
            <div className="text-xs text-slate-400 mt-1">
              Người tạo nhóm: <span className="text-slate-600 font-medium">{group.creatorName}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Mô tả nhóm học
            </h4>
            <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
              {group.description || "Chưa có mô tả chi tiết cho nhóm học này."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Users size={14} className="text-brand-600" />
                <span>Thành viên</span>
              </div>
              <div className="text-lg font-bold text-slate-800">
                {group.currentMembersCount} / {group.maxMembers}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Clock size={14} className="text-brand-600" />
                <span>Thời gian</span>
              </div>
              <div className="text-xs font-semibold text-slate-800">
                {group.schedules && group.schedules.length > 0
                  ? `${DAYS_OF_WEEK[group.schedules[0].dayOfWeek === 7 ? 0 : group.schedules[0].dayOfWeek]}`
                  : "Chưa cố định"}
              </div>
              <div className="text-[11px] text-slate-500">
                {group.schedules && group.schedules.length > 0
                  ? `${group.schedules[0].startTime} - ${group.schedules[0].endTime}`
                  : ""}
              </div>
            </div>
          </div>

          {group.location && (
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-start gap-2.5">
              <MapPin size={16} className="text-purple-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-purple-900">
                  Địa điểm gặp mặt trực tiếp
                </div>
                <div className="text-xs text-purple-700 mt-0.5">
                  {group.location}
                </div>
              </div>
            </div>
          )}

          {/* Mentor Details */}
          {group.hasMentor && group.mentor && (
            <div className="p-3.5 bg-verified-50/60 border border-verified-600/20 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-verified-700">
                  <ShieldCheck size={15} className="text-verified-600" />
                  Mentor hướng dẫn chuyên môn
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-100">
                  <Star size={11} className="fill-star text-star" />
                  {group.mentor.averageRating.toFixed(1)}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-verified-600/15 text-verified-600 font-bold text-sm flex items-center justify-center">
                  {group.mentor.tutorName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {group.mentor.tutorName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {group.mentor.university}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Đóng
          </button>

          {isJoined ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onJoin(group);
              }}
              className="px-4 py-2 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 flex items-center gap-1"
            >
              <LogOut size={13} />
              Rời khỏi nhóm
            </button>
          ) : group.status === "Full" ? (
            <button
              type="button"
              disabled
              className="px-4 py-2 text-xs font-medium text-slate-400 bg-slate-200 rounded-lg cursor-not-allowed"
            >
              Nhóm đã đủ thành viên
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onJoin(group);
              }}
              className="px-5 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-xs"
            >
              Xác nhận tham gia nhóm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
