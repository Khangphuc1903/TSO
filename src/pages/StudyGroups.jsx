import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Users,
  Plus,
  Clock,
  MapPin,
  Video,
  Sparkles,
  Filter,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  X,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Star,
  Layers,
  Calendar,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  LogOut,
} from "lucide-react";
import Navbar from "../components/Navbar";
import axiosClient from "../api/axiosClient";
import { useSearchParams, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

const DEFAULT_GROUPS = [
  {
    groupId: 1,
    subjectId: 4,
    subjectName: "Vật Lý",
    title: "Ôn thi Vật Lý Đại học 2026 - Mục tiêu 9+",
    description:
      "Nhóm tập trung giải các đề thi thử chuyên sâu môn Vật Lý, tổng ôn lý thuyết và làm các dạng bài tập phân loại 9-10 điểm.",
    educationLevel: "HighSchool",
    studyGoal: "ExamPrep",
    maxMembers: 6,
    currentMembersCount: 4,
    meetingMode: "Online",
    location: "Google Meet",
    city: "Hà Nội",
    district: "Cầu Giấy",
    status: "Open",
    hasMentor: true,
    creatorName: "Trần Thị Học Sinh",
    mentor: {
      tutorId: 2,
      tutorName: "Nguyễn Văn Gia Sư",
      university: "Đại học Bách Khoa",
      averageRating: 4.9,
    },
    schedules: [
      { dayOfWeek: 2, startTime: "19:30", endTime: "21:00" },
      { dayOfWeek: 5, startTime: "19:30", endTime: "21:00" },
    ],
  },
  {
    groupId: 2,
    subjectId: 1,
    subjectName: "Toán",
    title: "Chiến binh Toán 12 - Luyện đề THPT Quốc Gia",
    description:
      "Thảo luận phương pháp giải nhanh trắc nghiệm Toán, chia sẻ tài liệu và cùng giải đề thi thử chất lượng cao mỗi cuối tuần.",
    educationLevel: "HighSchool",
    studyGoal: "ExamPrep",
    maxMembers: 8,
    currentMembersCount: 5,
    meetingMode: "Offline",
    location: "The Coffee House, 120 Cầu Giấy",
    city: "Hà Nội",
    district: "Cầu Giấy",
    status: "Open",
    hasMentor: false,
    creatorName: "Lê Minh Tuấn",
    mentor: null,
    schedules: [{ dayOfWeek: 6, startTime: "08:30", endTime: "11:00" }],
  },
  {
    groupId: 3,
    subjectId: 3,
    subjectName: "Tiếng Anh",
    title: "IELTS 7.0+ Speaking & Writing Mastermind",
    description:
      "Nhóm luyện phản xạ Speaking theo chủ đề và peer-review bài viết Task 1 & Task 2 hàng tuần cùng Mentor đạt IELTS 8.0.",
    educationLevel: "University",
    studyGoal: "SkillPractice",
    maxMembers: 5,
    currentMembersCount: 3,
    meetingMode: "Online",
    location: "Discord Voice Server",
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    status: "Open",
    hasMentor: true,
    creatorName: "Phạm Hồng Nhung",
    mentor: {
      tutorId: 2,
      tutorName: "Nguyễn Văn Gia Sư",
      university: "ĐH Ngoại Thương",
      averageRating: 5.0,
    },
    schedules: [{ dayOfWeek: 3, startTime: "20:00", endTime: "21:30" }],
  },
  {
    groupId: 4,
    subjectId: 5,
    subjectName: "Hóa Học",
    title: "Nhóm Hóa Học 11 - Bài tập nâng cao",
    description:
      "Cùng nhau làm bài tập nhóm trên lớp, chuẩn bị bài trước khi đến trường và thảo luận giải các dạng bài tập hóa học hữu cơ phức tạp.",
    educationLevel: "HighSchool",
    studyGoal: "GroupAssignment",
    maxMembers: 4,
    currentMembersCount: 3,
    meetingMode: "Offline",
    location: "Thư viện Trung tâm ĐHQG",
    city: "TP. Hồ Chí Minh",
    district: "Thủ Đức",
    status: "Open",
    hasMentor: false,
    creatorName: "Đỗ Quốc Bảo",
    mentor: null,
    schedules: [{ dayOfWeek: 0, startTime: "14:00", endTime: "16:30" }],
  },
];

const DAYS_OF_WEEK = [
  "Chủ Nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

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

export default function StudyGroups() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(
    searchParams.get("level")
      ? searchParams.get("level").toLowerCase() === "highschool"
        ? "HighSchool"
        : searchParams.get("level").toLowerCase() === "secondary"
        ? "Secondary"
        : searchParams.get("level").toLowerCase() === "university"
        ? "University"
        : ""
      : ""
  );
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [activeChip, setActiveChip] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Modals & User state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [leaveConfirmGroup, setLeaveConfirmGroup] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [joinedGroups, setJoinedGroups] = useState(new Set([1])); // user joined group 1

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch groups from backend API
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/StudyGroups");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setGroups(res.data);
      }
    } catch (err) {
      console.warn("Backend /api/StudyGroups offline, using seeded mock data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Filtered & Sorted Groups
  const filteredGroups = useMemo(() => {
    return groups
      .filter((group) => {
        // Text search (Vietnamese diacritic-insensitive)
        if (searchQuery.trim()) {
          const q = normalizeVN(searchQuery);
          const matchTitle = normalizeVN(group.title).includes(q);
          const matchDesc = normalizeVN(group.description).includes(q);
          const matchSub = normalizeVN(group.subjectName).includes(q);
          if (!matchTitle && !matchDesc && !matchSub) return false;
        }

        // Subject filter (fuzzy matches with/without accents)
        if (selectedSubject) {
          const normSel = normalizeVN(selectedSubject);
          const normSub = normalizeVN(group.subjectName);
          if (!normSub.includes(normSel) && !normSel.includes(normSub)) {
            return false;
          }
        }

        // Education Level filter
        if (selectedLevel && group.educationLevel?.toLowerCase() !== selectedLevel.toLowerCase()) {
          return false;
        }

        // Study Goal filter
        if (selectedGoal && group.studyGoal?.toLowerCase() !== selectedGoal.toLowerCase()) {
          return false;
        }

        // Meeting Mode filter
        if (selectedMode && group.meetingMode?.toLowerCase() !== selectedMode.toLowerCase()) {
          return false;
        }

        // BR-17: Only Study Groups with Status = 'Open' or 'Full' are visible in search results
        if (group.status && group.status !== "Open" && group.status !== "Full") {
          return false;
        }

        // Chip filters
        if (activeChip === "hasMentor" && !group.hasMentor) return false;
        if (activeChip === "online" && group.meetingMode?.toLowerCase() !== "online") return false;
        if (activeChip === "offline" && group.meetingMode?.toLowerCase() !== "offline") return false;
        if (activeChip === "examPrep" && group.studyGoal !== "ExamPrep") return false;
        if (activeChip === "assignment" && group.studyGoal !== "GroupAssignment") return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "slots") {
          const aSlots = a.maxMembers - a.currentMembersCount;
          const bSlots = b.maxMembers - b.currentMembersCount;
          return bSlots - aSlots;
        }
        if (sortBy === "mentorFirst") {
          return (b.hasMentor ? 1 : 0) - (a.hasMentor ? 1 : 0);
        }
        return b.groupId - a.groupId;
      });
  }, [
    groups,
    searchQuery,
    selectedSubject,
    selectedLevel,
    selectedGoal,
    selectedMode,
    activeChip,
    sortBy,
  ]);

  const handleOpenCreateModal = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("Vui lòng đăng nhập để tạo nhóm học tập!");
      setTimeout(() => navigate("/login"), 1200);
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleJoinOrLeave = (group) => {
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("Vui lòng đăng nhập để tham gia nhóm học tập!");
      setTimeout(() => navigate("/login"), 1200);
      return;
    }

    if (joinedGroups.has(group.groupId)) {
      // SRS 3.2.23: Confirm Leave dialog
      setLeaveConfirmGroup(group);
      return;
    }

    // Join group
    setJoinedGroups((prev) => new Set([...prev, group.groupId]));
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === group.groupId
          ? { ...g, currentMembersCount: Math.min(g.maxMembers, g.currentMembersCount + 1) }
          : g
      )
    );
    showToast(`Đã tham gia nhóm "${group.title}" thành công!`);
  };

  const handleConfirmLeave = () => {
    if (!leaveConfirmGroup) return;
    const groupId = leaveConfirmGroup.groupId;
    const groupTitle = leaveConfirmGroup.title;

    setJoinedGroups((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId
          ? { ...g, currentMembersCount: Math.max(1, g.currentMembersCount - 1) }
          : g
      )
    );
    showToast(`Bạn đã rời khỏi nhóm "${groupTitle}".`);
    setLeaveConfirmGroup(null);
  };

  return (
    <div className="bg-surface min-h-screen">
      <Navbar />

      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border border-slate-700">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ---------------- HERO & SEARCH SECTION ---------------- */}
      <section className="relative overflow-hidden pt-12 pb-16 px-6 text-center">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(65% 55% at 50% 0%, rgba(59,91,219,0.14), transparent)",
          }}
        />

        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4 border border-brand-100">
          <Sparkles size={14} />
          Collaborative Study Groups • Find or Form Your Squad
        </span>

        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight max-w-3xl mx-auto mb-4">
          Find Your Perfect <span className="text-brand-600">Study Group</span>
        </h1>

        <p className="text-slate-500 max-w-2xl mx-auto mb-8 text-base">
          Kết nối cùng bạn bè cùng chí hướng, ôn thi chuyên sâu hoặc tham gia các nhóm
          học có Gia sư cố vấn (Mentor) để đạt kết quả học tập vượt bậc.
        </p>

        {/* Search & Filter Form (Dựa trên form chuẩn từ Home) */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-4 text-left">
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm môn học, chủ đề, tên nhóm (VD: Toán 12, IELTS, Lý...)"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              />
            </div>

            {/* Subject Selector */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white md:w-40"
            >
              <option value="">Tất cả môn</option>
              <option value="Toán">Toán học</option>
              <option value="Vật Lý">Vật Lý</option>
              <option value="Hóa Học">Hóa Học</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
              <option value="Văn">Ngữ Văn</option>
              <option value="Sinh Học">Sinh Học</option>
            </select>

            {/* Education Level Selector */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white md:w-44"
            >
              <option value="">Cấp bậc học</option>
              <option value="Secondary">Cấp 2 (Secondary)</option>
              <option value="HighSchool">Cấp 3 (High School)</option>
              <option value="University">Đại học (University)</option>
            </select>

            {/* Meeting Mode Selector */}
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 bg-white md:w-36"
            >
              <option value="">Hình thức</option>
              <option value="Online">Online</option>
              <option value="Offline">Gặp trực tiếp</option>
            </select>

            {/* Primary Action Button */}
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl px-5 py-2.5 text-sm transition-colors whitespace-nowrap shadow-sm"
            >
              <Plus size={16} />
              Tạo nhóm mới
            </button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Lọc nhanh:
            </span>
            <ChipButton
              label="Tất cả"
              active={activeChip === "all"}
              onClick={() => setActiveChip("all")}
            />
            <ChipButton
              label="⭐ Có Mentor hỗ trợ"
              active={activeChip === "hasMentor"}
              onClick={() => setActiveChip("hasMentor")}
            />
            <ChipButton
              label="💻 Học Online"
              active={activeChip === "online"}
              onClick={() => setActiveChip("online")}
            />
            <ChipButton
              label="📍 Gặp Offline"
              active={activeChip === "offline"}
              onClick={() => setActiveChip("offline")}
            />
            <ChipButton
              label="🎯 Ôn thi (Exam Prep)"
              active={activeChip === "examPrep"}
              onClick={() => setActiveChip("examPrep")}
            />
            <ChipButton
              label="📝 Bài tập nhóm"
              active={activeChip === "assignment"}
              onClick={() => setActiveChip("assignment")}
            />

            {(searchQuery || selectedSubject || selectedLevel || selectedMode || activeChip !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubject("");
                  setSelectedLevel("");
                  setSelectedMode("");
                  setActiveChip("all");
                }}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium ml-auto flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw size={12} /> Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- MAIN GROUPS LIST ---------------- */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        {/* Results Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Nhóm học tập đang mở
            </h2>
            <p className="text-sm text-slate-500">
              Tìm thấy{" "}
              <span className="font-semibold text-brand-600">
                {filteredGroups.length}
              </span>{" "}
              nhóm phù hợp với tiêu chí của bạn
            </p>
          </div>

          {/* Sorter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="newest">Mới nhất</option>
              <option value="slots">Còn nhiều chỗ trống</option>
              <option value="mentorFirst">Có Mentor ưu tiên</option>
            </select>
          </div>
        </div>

        {/* Empty state */}
        {filteredGroups.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
              <Users size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Chưa tìm thấy nhóm học nào phù hợp
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Bạn có thể thử tìm kiếm với từ khóa khác hoặc là người đầu tiên tạo nhóm học cho môn này!
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl px-5 py-2.5 transition-colors"
            >
              <Plus size={16} />
              Tạo nhóm học ngay
            </button>
          </div>
        )}

        {/* Grid of Study Group Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const isJoined = joinedGroups.has(group.groupId);
            const isFull = group.currentMembersCount >= group.maxMembers;

            return (
              <div
                key={group.groupId}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-brand-200"
              >
                <div>
                  {/* Top Bar */}
                  <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-brand-50 text-brand-700 font-semibold text-xs px-2.5 py-1 rounded-lg">
                        {group.subjectName}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-lg">
                        {group.educationLevel === "HighSchool"
                          ? "Cấp 3"
                          : group.educationLevel === "Secondary"
                          ? "Cấp 2"
                          : "Đại học"}
                      </span>
                    </div>

                    {/* Meeting Mode Tag */}
                    {group.meetingMode === "Online" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                        <Video size={12} />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                        <MapPin size={12} />
                        {group.city || "Offline"}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 pt-4">
                    <h3 className="font-bold text-slate-900 text-base mb-2 group-hover:text-brand-600 transition-colors line-clamp-1">
                      {group.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                      {group.description}
                    </p>

                    {/* Schedule */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <Clock size={14} className="text-brand-600 shrink-0" />
                      <span className="font-medium">
                        {group.schedules && group.schedules.length > 0
                          ? group.schedules
                              .map(
                                (s) =>
                                  `${DAYS_OF_WEEK[s.dayOfWeek ?? 0]}: ${s.startTime} - ${s.endTime}`
                              )
                              .join(" | ")
                          : "Lịch linh hoạt"}
                      </span>
                    </div>

                    {/* Mentor Banner */}
                    {group.hasMentor && group.mentor ? (
                      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-xl p-2.5 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            ★
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-900">
                                {group.mentor.tutorName}
                              </span>
                              <ShieldCheck size={13} className="text-amber-600" />
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              Mentor • {group.mentor.university || "Chuyên gia"}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 bg-white px-2 py-0.5 rounded-md shadow-xs border border-amber-200">
                          <Star size={11} className="fill-amber-500 text-amber-500" />
                          {group.mentor.averageRating.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Users size={14} className="text-slate-400" />
                          <span>Nhóm tự học (Peer-study)</span>
                        </div>
                        <span className="text-[11px] text-brand-600 font-medium bg-brand-50 px-2 py-0.5 rounded">
                          Mời được Mentor
                        </span>
                      </div>
                    )}

                    {/* Member Slots Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500">Thành viên:</span>
                        <span className="font-semibold text-slate-700">
                          {group.currentMembersCount} / {group.maxMembers} người
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFull
                              ? "bg-slate-400"
                              : group.currentMembersCount >= group.maxMembers - 1
                              ? "bg-amber-500"
                              : "bg-brand-600"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (group.currentMembersCount / group.maxMembers) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                  <button
                    onClick={() => setSelectedGroupDetails(group)}
                    className="flex-1 py-2 px-3 border border-slate-200 hover:bg-white text-slate-700 text-xs font-semibold rounded-xl transition-colors text-center"
                  >
                    Xem chi tiết
                  </button>

                  <button
                    onClick={() => handleJoinOrLeave(group)}
                    disabled={isFull && !isJoined}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      isJoined
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 group/btn"
                        : isFull
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <span className="flex items-center gap-1 group-hover/btn:hidden">
                          <CheckCircle2 size={13} />
                          Đã tham gia
                        </span>
                        <span className="hidden items-center gap-1 group-hover/btn:flex text-rose-600">
                          <LogOut size={13} />
                          Rời nhóm
                        </span>
                      </>
                    ) : isFull ? (
                      "Đã đầy"
                    ) : (
                      "Tham gia nhóm"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- MODAL: CREATE STUDY GROUP ---------------- */}
      {isCreateModalOpen && (
        <CreateStudyGroupModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newGroup) => {
            setGroups((prev) => [newGroup, ...prev]);
            showToast(`Đã tạo thành công nhóm "${newGroup.title}"!`);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* ---------------- MODAL: VIEW DETAILS ---------------- */}
      {selectedGroupDetails && (
        <GroupDetailsModal
          group={selectedGroupDetails}
          isJoined={joinedGroups.has(selectedGroupDetails.groupId)}
          onJoin={() => {
            const group = selectedGroupDetails;
            setSelectedGroupDetails(null);
            handleJoinOrLeave(group);
          }}
          onClose={() => setSelectedGroupDetails(null)}
        />
      )}

      {/* ---------------- MODAL: CONFIRM LEAVE GROUP (SRS 3.2.23) ---------------- */}
      {leaveConfirmGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 animate-scale-in border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <LogOut size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              Xác nhận rời nhóm học
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
              Bạn có chắc chắn muốn rời khỏi nhóm{" "}
              <span className="font-semibold text-slate-800">
                "{leaveConfirmGroup.title}"
              </span>
              ? Chỗ trống này sẽ được nhường lại cho các thành viên khác.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setLeaveConfirmGroup(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                Ở lại nhóm
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Xác nhận rời
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Common Footer */}
      <Footer />
    </div>
  );
}

// ----------------- SUB-COMPONENTS -----------------

function ChipButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
        active
          ? "bg-brand-600 text-white shadow-xs"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

// Modal tạo nhóm mới
function CreateStudyGroupModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    subjectName: "Toán",
    subjectId: 1,
    educationLevel: "HighSchool",
    studyGoal: "ExamPrep",
    maxMembers: 6,
    meetingMode: "Online",
    location: "Google Meet",
    city: "Hà Nội",
    district: "Cầu Giấy",
    description: "",
    scheduleDayOfWeek: 2,
    startTime: "19:30",
    endTime: "21:00",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const SUBJECT_MAP = {
    Toán: 1,
    Văn: 2,
    "Tiếng Anh": 3,
    "Vật Lý": 4,
    "Hóa Học": 5,
    "Sinh Học": 6,
  };

  const handleSubjectChange = (name) => {
    setForm({ ...form, subjectName: name, subjectId: SUBJECT_MAP[name] || 1 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setError("Vui lòng nhập tên nhóm học!");
      return;
    }
    if (trimmedTitle.length < 5) {
      setError("Tên nhóm phải có ít nhất 5 ký tự!");
      return;
    }
    if (trimmedTitle.length > 200) {
      setError("Tên nhóm không được vượt quá 200 ký tự!");
      return;
    }

    const membersCount = parseInt(form.maxMembers, 10);
    if (isNaN(membersCount) || membersCount < 2 || membersCount > 12) {
      setError("Số lượng thành viên tối đa phải từ 2 đến 12 người!");
      return;
    }

    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      setError("Giờ kết thúc phải sau giờ bắt đầu!");
      return;
    }

    if (form.meetingMode === "Offline" && (!form.location || !form.location.trim())) {
      setError("Vui lòng nhập địa chỉ cụ thể cho nhóm học Offline!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Gửi API tạo nhóm tới Backend
      await axiosClient.post("/StudyGroups", {
        subjectId: form.subjectId,
        title: form.title,
        description: form.description,
        educationLevel: form.educationLevel,
        studyGoal: form.studyGoal,
        maxMembers: parseInt(form.maxMembers, 10),
        meetingMode: form.meetingMode,
        location: form.location,
        city: form.city,
        district: form.district,
        createdByUserId: 3, // mặc định student ID
      });
    } catch (err) {
      console.warn("Backend API not reachable or error, saving locally", err);
    }

    // Cập nhật state UI
    const newGroup = {
      groupId: Date.now(),
      subjectId: form.subjectId,
      subjectName: form.subjectName,
      title: form.title,
      description: form.description || "Nhóm học tập mới được tạo.",
      educationLevel: form.educationLevel,
      studyGoal: form.studyGoal,
      maxMembers: parseInt(form.maxMembers, 10),
      currentMembersCount: 1,
      meetingMode: form.meetingMode,
      location: form.location,
      city: form.city,
      district: form.district,
      status: "Open",
      hasMentor: false,
      creatorName: "Bạn (Tôi)",
      mentor: null,
      schedules: [
        {
          dayOfWeek: parseInt(form.scheduleDayOfWeek, 10),
          startTime: form.startTime,
          endTime: form.endTime,
        },
      ],
    };

    setLoading(false);
    onSuccess(newGroup);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-surface">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Tạo Nhóm Học Tập Mới</h3>
            <p className="text-xs text-slate-500">
              Chiêu mộ đồng đội cùng tiến bộ trong học tập
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên nhóm học *
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Nhóm giải đề Toán 12 nâng cao - Đích đến 9 điểm"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Môn học
              </label>
              <select
                value={form.subjectName}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-white"
              >
                <option value="Toán">Toán học</option>
                <option value="Vật Lý">Vật Lý</option>
                <option value="Hóa Học">Hóa Học</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Văn">Ngữ Văn</option>
                <option value="Sinh Học">Sinh Học</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cấp học
              </label>
              <select
                value={form.educationLevel}
                onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-white"
              >
                <option value="HighSchool">Cấp 3 (High School)</option>
                <option value="Secondary">Cấp 2 (Secondary)</option>
                <option value="University">Đại học (University)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mục tiêu học tập
              </label>
              <select
                value={form.studyGoal}
                onChange={(e) => setForm({ ...form, studyGoal: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-white"
              >
                <option value="ExamPrep">Ôn thi (Exam Prep)</option>
                <option value="GroupAssignment">Bài tập nhóm (Assignment)</option>
                <option value="SkillPractice">Luyện kỹ năng (Skill Practice)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số lượng thành viên tối đa
              </label>
              <input
                type="number"
                min="2"
                max="12"
                value={form.maxMembers}
                onChange={(e) => setForm({ ...form, maxMembers: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hình thức gặp
              </label>
              <select
                value={form.meetingMode}
                onChange={(e) => setForm({ ...form, meetingMode: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-white"
              >
                <option value="Online">Online (Google Meet / Zoom)</option>
                <option value="Offline">Offline (Gặp trực tiếp)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa điểm / Nền tảng
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="VD: Google Meet hoặc Quán Cafe..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lịch học trong tuần
              </label>
              <select
                value={form.scheduleDayOfWeek}
                onChange={(e) => setForm({ ...form, scheduleDayOfWeek: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-white"
              >
                <option value="1">Thứ 2</option>
                <option value="2">Thứ 3</option>
                <option value="3">Thứ 4</option>
                <option value="4">Thứ 5</option>
                <option value="5">Thứ 6</option>
                <option value="6">Thứ 7</option>
                <option value="0">Chủ Nhật</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giờ kết thúc
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mô tả chi tiết nhóm & mục tiêu
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Chia sẻ cách thức hoạt động của nhóm, tài liệu tham khảo, yêu cầu thành viên..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {loading ? "Đang tạo..." : "Xác nhận tạo nhóm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal xem chi tiết nhóm
function GroupDetailsModal({ group, isJoined, onJoin, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-surface">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-brand-50 text-brand-700 font-semibold text-xs px-2.5 py-1 rounded-lg">
                {group.subjectName}
              </span>
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-lg">
                {group.educationLevel}
              </span>
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-lg font-medium">
                {group.meetingMode}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{group.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Mục tiêu & Nội dung nhóm
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {group.description}
            </p>
          </div>

          {/* Grid Info */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-surface p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 block mb-1">Hình thức & Địa điểm</span>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                {group.meetingMode === "Online" ? <Video size={16} className="text-blue-500" /> : <MapPin size={16} className="text-emerald-500" />}
                <span>{group.location || "Online"}</span>
              </div>
            </div>

            <div className="bg-surface p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 block mb-1">Thành viên tham gia</span>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Users size={16} className="text-brand-600" />
                <span>{group.currentMembersCount} / {group.maxMembers} thành viên</span>
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="bg-surface p-3.5 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-400 block mb-1">Lịch học cố định</span>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Clock size={16} className="text-brand-600 shrink-0" />
              <span>
                {group.schedules && group.schedules.length > 0
                  ? group.schedules
                      .map(
                        (s) =>
                          `${DAYS_OF_WEEK[s.dayOfWeek ?? 0]}: ${s.startTime} - ${s.endTime}`
                      )
                      .join(" | ")
                  : "Lịch sinh hoạt linh hoạt theo nhóm"}
              </span>
            </div>
          </div>

          {/* Mentor info */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Thông tin Cố vấn (Mentor)
            </h4>
            {group.hasMentor && group.mentor ? (
              <div className="flex items-center justify-between p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    ★
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 text-sm">{group.mentor.tutorName}</h4>
                      <ShieldCheck size={14} className="text-amber-600" />
                    </div>
                    <p className="text-xs text-slate-500">{group.mentor.university} • Gia sư đã xác thực</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                    <Star size={13} className="fill-amber-500 text-amber-500" />
                    {group.mentor.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <span>Nhóm này hiện tại là nhóm tự học giữa các học sinh/sinh viên.</span>
                <span className="text-brand-600 font-semibold cursor-pointer hover:underline">
                  Đề xuất mời Mentor
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={onJoin}
              disabled={!isJoined && group.currentMembersCount >= group.maxMembers}
              className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                isJoined
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : group.currentMembersCount >= group.maxMembers
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-brand-600 hover:bg-brand-700 text-white"
              }`}
            >
              {isJoined ? (
                <>
                  <LogOut size={16} />
                  Rời nhóm học
                </>
              ) : (
                "Xác nhận tham gia nhóm"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
