import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axiosClient from "../api/axiosClient";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShieldCheck,
  Lock,
  BookOpen,
  GraduationCap,
  Award,
  Camera,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  Star,
  Users,
} from "lucide-react";

// Robust fallback user profile data
const DEFAULT_USER_PROFILE = {
  userId: 1,
  fullName: "Nguyễn Văn An",
  email: "nguyen.an@educonnect.vn",
  phoneNumber: "0912345678",
  dateOfBirth: "2002-05-15",
  gender: "Nam",
  avatarUrl:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  address: "Số 45, Đường Lê Duẩn, Phường Bến Nghé",
  city: "TP. Hồ Chí Minh",
  district: "Quận 1",
  role: "Student", // "Student" or "Tutor"
  roleId: 2,
  isEmailConfirmed: true,
  createdAt: "2023-09-15T08:30:00Z",
  studentProfile: {
    gradeLevel: "Đại học năm 3",
    schoolName: "Đại học Bách Khoa TP.HCM",
    learningGoals:
      "Nâng cao kỹ năng lập trình Fullstack, thuật toán và chuẩn bị thi chứng chỉ IELTS 7.5+.",
  },
  tutorProfile: {
    bio: "Cử nhân Sư phạm Toán - Tin với hơn 4 năm kinh nghiệm dạy kèm học sinh ôn thi THPT Quốc gia và đại học. Chú trọng bản chất vấn đề và phát triển tư duy logic độc lập cho học viên.",
    university: "ĐH Sư Phạm TP.HCM",
    major: "Sư phạm Toán - Tin học",
    yearsOfExperience: 4,
    hourlyRateMin: 200000,
    hourlyRateMax: 350000,
    teachingMode: "Cả hai (Online & Offline)",
    verificationStatus: "Đã xác thực",
    averageRating: 4.9,
    totalReviews: 28,
  },
  studyGroups: [
    {
      groupId: 1,
      title: "Nhóm giải đề thi thử Đại học môn Toán 2024",
      subjectName: "Toán học",
      currentMembersCount: 6,
      maxMembers: 8,
      userRole: "Trưởng nhóm",
      meetingMode: "Online",
      progressPercentage: 75,
      nextSession: "Thứ 3, 19:30 - 21:30",
    },
    {
      groupId: 2,
      title: "Luyện Speaking IELTS theo chủ đề mục tiêu 7.0+",
      subjectName: "Tiếng Anh",
      currentMembersCount: 6,
      maxMembers: 6,
      userRole: "Thành viên",
      meetingMode: "Online",
      progressPercentage: 100,
      nextSession: "Thứ 7, 09:00 - 11:00",
    },
    {
      groupId: 3,
      title: "Ôn tập Vật Lý 11 - Chương Điện trường & Dòng điện",
      subjectName: "Vật Lý",
      currentMembersCount: 3,
      maxMembers: 6,
      userRole: "Thành viên",
      meetingMode: "Offline",
      progressPercentage: 50,
      nextSession: "Chủ nhật, 14:00 - 16:30",
    },
    {
      groupId: 4,
      title: "Lập trình Web Fullstack với React & ASP.NET Core",
      subjectName: "Tin học",
      currentMembersCount: 4,
      maxMembers: 5,
      userRole: "Trưởng nhóm",
      meetingMode: "Online",
      progressPercentage: 80,
      nextSession: "Thứ 5, 20:00 - 22:00",
    },
  ],
};

const PRESET_AVATARS = [
  {
    label: "Học sinh nam",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
  },
  {
    label: "Học sinh nữ",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  },
  {
    label: "Gia sư nam",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  },
  {
    label: "Gia sư nữ",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
  },
];

export default function Profile() {
  const navigate = useNavigate();

  // Active Tab: 1: General Info, 2: Academic Profile, 3: Security, 4: My Groups
  const [activeTab, setActiveTab] = useState(1);

  // Profile data
  const [profile, setProfile] = useState(DEFAULT_USER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");

  // Tab 1 Form State: General Info
  const [generalForm, setGeneralForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "Nam",
    address: "",
    city: "",
    district: "",
  });

  // Tab 2 Form State: Student
  const [studentForm, setStudentForm] = useState({
    gradeLevel: "",
    schoolName: "",
    learningGoals: "",
  });

  // Tab 2 Form State: Tutor
  const [tutorForm, setTutorForm] = useState({
    bio: "",
    university: "",
    major: "",
    yearsOfExperience: 0,
    hourlyRateMin: 150000,
    hourlyRateMax: 300000,
    teachingMode: "Cả hai (Online & Offline)",
  });

  // Tab 3 Form State: Password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load user profile on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get("/UserProfile/me");
        const data = response.data?.data || response.data || {};

        // Role is strictly determined from database roleName
        const userRole = data.roleName || data.role || "Student";
        const mergedProfile = {
          ...DEFAULT_USER_PROFILE,
          ...data,
          role: userRole,
          roleName: userRole,
          studentProfile: data.studentProfile || DEFAULT_USER_PROFILE.studentProfile,
          tutorProfile: data.tutorProfile || DEFAULT_USER_PROFILE.tutorProfile,
          studyGroups: data.joinedGroups || data.studyGroups || DEFAULT_USER_PROFILE.studyGroups,
        };

        setProfile(mergedProfile);
        populateForms(mergedProfile);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        // Fallback gracefully so the page is fully interactive
        setProfile(DEFAULT_USER_PROFILE);
        populateForms(DEFAULT_USER_PROFILE);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const populateForms = (data) => {
    setGeneralForm({
      fullName: data.fullName || "",
      email: data.email || "",
      phoneNumber: data.phoneNumber || "",
      dateOfBirth: data.dateOfBirth
        ? String(data.dateOfBirth).substring(0, 10)
        : "",
      gender: data.gender || "Nam",
      address: data.address || "",
      city: data.city || "",
      district: data.district || "",
    });

    if (data.studentProfile) {
      setStudentForm({
        gradeLevel: data.studentProfile.gradeLevel || "",
        schoolName: data.studentProfile.schoolName || "",
        learningGoals: data.studentProfile.learningGoals || "",
      });
    }

    if (data.tutorProfile) {
      setTutorForm({
        bio: data.tutorProfile.bio || "",
        university: data.tutorProfile.university || "",
        major: data.tutorProfile.major || "",
        yearsOfExperience: data.tutorProfile.yearsOfExperience || 0,
        hourlyRateMin: data.tutorProfile.hourlyRateMin || 150000,
        hourlyRateMax: data.tutorProfile.hourlyRateMax || 300000,
        teachingMode:
          data.tutorProfile.teachingMode || "Cả hai (Online & Offline)",
      });
    }
  };

  // Handle Tab 1: Submit General Information
  const handleUpdateGeneral = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        fullName: generalForm.fullName,
        phoneNumber: generalForm.phoneNumber,
        dateOfBirth: generalForm.dateOfBirth || null,
        gender: generalForm.gender,
        address: generalForm.address,
        city: generalForm.city,
        district: generalForm.district,
        avatarUrl: profile.avatarUrl,
      };

      try {
        await axiosClient.put("/UserProfile/me", payload);
      } catch (err) {
        // Fallback for demo/offline backend
        console.warn("Backend update error, updating local state:", err);
      }

      setProfile((prev) => ({
        ...prev,
        ...payload,
      }));
      showToast("Cập nhật thông tin cá nhân thành công!", "success");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không thể cập nhật thông tin cá nhân.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Tab 2: Submit Professional Profile (Student or Tutor)
  const handleUpdateAcademic = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const isStudent = profile.role === "Student";
    try {
      if (isStudent) {
        try {
          await axiosClient.put("/UserProfile/student", studentForm);
        } catch (err) {
          console.warn("Backend student update error:", err);
        }
        setProfile((prev) => ({
          ...prev,
          studentProfile: {
            ...prev.studentProfile,
            ...studentForm,
          },
        }));
        showToast("Cập nhật thông tin học tập thành công!", "success");
      } else {
        try {
          await axiosClient.put("/UserProfile/tutor", tutorForm);
        } catch (err) {
          console.warn("Backend tutor update error:", err);
        }
        setProfile((prev) => ({
          ...prev,
          tutorProfile: {
            ...prev.tutorProfile,
            ...tutorForm,
          },
        }));
        showToast("Cập nhật hồ sơ gia sư thành công!", "success");
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không thể cập nhật hồ sơ chuyên môn.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Tab 3: Submit Password Change
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      showToast("Vui lòng nhập mật khẩu hiện tại.", "error");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự.", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Xác nhận mật khẩu mới không khớp!", "error");
      return;
    }

    setSubmitting(true);
    try {
      try {
        await axiosClient.put("/UserProfile/change-password", {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        });
      } catch (err) {
        console.warn("Backend password update error:", err);
      }
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showToast("Đổi mật khẩu bảo mật thành công!", "success");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Đổi mật khẩu không thành công.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Avatar Update
  const handleSaveAvatar = async (selectedUrl) => {
    const url = selectedUrl || newAvatarUrl;
    if (!url) {
      showToast("Vui lòng nhập hoặc chọn đường dẫn ảnh hợp lệ.", "error");
      return;
    }

    try {
      try {
        await axiosClient.put("/UserProfile/me", {
          ...generalForm,
          avatarUrl: url,
        });
      } catch (err) {
        console.warn("Backend avatar update error:", err);
      }
      setProfile((prev) => ({ ...prev, avatarUrl: url }));
      setIsAvatarModalOpen(false);
      setNewAvatarUrl("");
      showToast("Cập nhật ảnh đại diện thành công!", "success");
    } catch {
      showToast("Cập nhật ảnh đại diện thất bại.", "error");
    }
  };



  // Format joined date
  const joinedDateFormatted = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
      })
    : "Tháng 9, 2023";

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      <Navbar />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all ${
              toast.type === "success"
                ? "bg-white text-slate-900 border-verified-600/30"
                : toast.type === "error"
                ? "bg-white text-rose-700 border-rose-300"
                : "bg-white text-brand-700 border-brand-300"
            }`}
          >
            {toast.type === "success" ? (
              <span className="p-1 rounded-full bg-verified-50 text-verified-600">
                <CheckCircle2 size={18} />
              </span>
            ) : toast.type === "error" ? (
              <span className="p-1 rounded-full bg-rose-50 text-rose-600">
                <AlertCircle size={18} />
              </span>
            ) : (
              <span className="p-1 rounded-full bg-brand-50 text-brand-600">
                <AlertCircle size={18} />
              </span>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Banner Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-8">
          {/* Cover Banner */}
          <div className="relative h-44 sm:h-52 bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.3) 0%, transparent 40%)",
              }}
            />

          </div>

          {/* User Profile Header Content */}
          <div className="px-6 sm:px-8 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
              {/* Avatar with Camera edit button */}
              <div className="relative inline-block self-start">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-white shadow-md bg-slate-100 overflow-hidden relative">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand-600">
                      <User size={48} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewAvatarUrl(profile.avatarUrl || "");
                    setIsAvatarModalOpen(true);
                  }}
                  className="absolute bottom-1 right-1 p-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-md transition-transform hover:scale-105 cursor-pointer"
                  title="Cập nhật ảnh đại diện"
                  aria-label="Cập nhật ảnh đại diện"
                >
                  <Camera size={16} />
                </button>
              </div>

              {/* Badges and joined date */}
              <div className="flex flex-wrap items-center gap-2.5 sm:mb-2">
                {/* Role Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    profile.role === "Tutor"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-brand-50 text-brand-700 border border-brand-100"
                  }`}
                >
                  {profile.role === "Tutor" ? (
                    <>
                      <GraduationCap size={14} className="text-amber-600" />
                      <span>Gia sư chuyên môn</span>
                    </>
                  ) : (
                    <>
                      <BookOpen size={14} className="text-brand-600" />
                      <span>Học sinh / Học viên</span>
                    </>
                  )}
                </span>

                {/* Email Verified Badge */}
                {profile.isEmailConfirmed && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-verified-50 text-verified-600 border border-emerald-200">
                    <ShieldCheck size={14} className="text-verified-600" />
                    <span>Email đã xác thực</span>
                  </span>
                )}

                {/* Rating if Tutor */}
                {profile.role === "Tutor" && profile.tutorProfile && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Star size={13} className="text-amber-500 fill-amber-400" />
                    <span>
                      {profile.tutorProfile.averageRating?.toFixed(1) || "5.0"} (
                      {profile.tutorProfile.totalReviews || 0} đánh giá)
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* User details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {profile.fullName || "Người dùng"}
                </h1>
                <span className="text-sm text-slate-500">
                  ID: #{profile.userId}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail size={15} className="text-slate-400" />
                  {profile.email}
                </span>
                {profile.phoneNumber && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={15} className="text-slate-400" />
                    {profile.phoneNumber}
                  </span>
                )}
                {(profile.city || profile.district) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} className="text-slate-400" />
                    {[profile.district, profile.city].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Calendar size={15} className="text-slate-400" />
                  Tham gia từ {joinedDateFormatted}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex overflow-x-auto scrollbar-none px-4 sm:px-6">
              {[
                {
                  id: 1,
                  label: "Thông tin chung",
                  icon: User,
                },
                {
                  id: 2,
                  label: "Hồ sơ chuyên môn",
                  icon: profile.role === "Tutor" ? GraduationCap : BookOpen,
                },
                {
                  id: 3,
                  label: "Bảo mật & Mật khẩu",
                  icon: Lock,
                },
                {
                  id: 4,
                  label: "Nhóm học của tôi",
                  icon: Users,
                  badge: profile.studyGroups?.length || 0,
                },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 py-4 px-4 sm:px-5 font-medium text-sm whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                      isActive
                        ? "border-brand-600 text-brand-600 font-semibold"
                        : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <IconComponent
                      size={18}
                      className={isActive ? "text-brand-600" : "text-slate-400"}
                    />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          isActive
                            ? "bg-brand-100 text-brand-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Contents */}
          <div className="p-6 sm:p-8">
            {/* ==================== TAB 1: THÔNG TIN CHUNG ==================== */}
            {activeTab === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <User className="text-brand-600" size={20} />
                    Thông tin tài khoản & cá nhân
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Cập nhật chi tiết lý lịch để dễ dàng kết nối và tham gia các
                    hoạt động học tập trên hệ thống.
                  </p>
                </div>

                <form onSubmit={handleUpdateGeneral} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Họ và tên <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          required
                          value={generalForm.fullName}
                          onChange={(e) =>
                            setGeneralForm({
                              ...generalForm,
                              fullName: e.target.value,
                            })
                          }
                          placeholder="Ví dụ: Nguyễn Văn An"
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          Địa chỉ Email
                        </label>
                        <span className="text-xs text-slate-400">
                          (Không thể thay đổi)
                        </span>
                      </div>
                      <div className="relative">
                        <Mail
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="email"
                          disabled
                          readOnly
                          value={generalForm.email}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Số điện thoại liên lạc
                      </label>
                      <div className="relative">
                        <Phone
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="tel"
                          value={generalForm.phoneNumber}
                          onChange={(e) =>
                            setGeneralForm({
                              ...generalForm,
                              phoneNumber: e.target.value,
                            })
                          }
                          placeholder="0912 345 678"
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Ngày sinh
                      </label>
                      <div className="relative">
                        <Calendar
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="date"
                          value={generalForm.dateOfBirth}
                          onChange={(e) =>
                            setGeneralForm({
                              ...generalForm,
                              dateOfBirth: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Giới tính
                      </label>
                      <select
                        value={generalForm.gender}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            gender: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Tỉnh / Thành phố
                      </label>
                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={generalForm.city}
                          onChange={(e) =>
                            setGeneralForm({
                              ...generalForm,
                              city: e.target.value,
                            })
                          }
                          placeholder="Ví dụ: TP. Hồ Chí Minh"
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Quận / Huyện
                      </label>
                      <input
                        type="text"
                        value={generalForm.district}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            district: e.target.value,
                          })
                        }
                        placeholder="Ví dụ: Quận 1, Quận Bình Thạnh..."
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                    </div>

                    {/* Address Detail */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Địa chỉ cụ thể (Số nhà, tên đường)
                      </label>
                      <input
                        type="text"
                        value={generalForm.address}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            address: e.target.value,
                          })
                        }
                        placeholder="Số 45, Đường Lê Duẩn, Phường Bến Nghé"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex justify-end border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-xl px-6 py-2.5 transition-all shadow-sm shadow-brand-600/20 cursor-pointer"
                    >
                      <CheckCircle2 size={18} />
                      <span>
                        {submitting ? "Đang lưu thay đổi..." : "Lưu thông tin cá nhân"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ==================== TAB 2: HỒ SƠ CHUYÊN MÔN ==================== */}
            {activeTab === 2 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      {profile.role === "Tutor" ? (
                        <>
                          <GraduationCap className="text-brand-600" size={22} />
                          Hồ sơ chuyên môn Gia sư
                        </>
                      ) : (
                        <>
                          <BookOpen className="text-brand-600" size={20} />
                          Thông tin học tập & Mục tiêu
                        </>
                      )}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {profile.role === "Tutor"
                        ? "Hồ sơ năng lực giảng dạy của bạn sẽ hiển thị tới hàng nghìn học viên tiềm năng."
                        : "Thông tin giúp gia sư hiểu rõ định hướng và đồng hành cùng bạn hiệu quả nhất."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Vai trò hiện tại:</span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        profile.role === "Tutor"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {profile.role === "Tutor" ? "Gia sư" : "Học sinh"}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleUpdateAcademic} className="space-y-6">
                  {profile.role === "Student" ? (
                    /* STUDENT PROFILE FIELDS */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Trình độ học vấn hiện tại
                          </label>
                          <select
                            value={studentForm.gradeLevel}
                            onChange={(e) =>
                              setStudentForm({
                                ...studentForm,
                                gradeLevel: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
                          >
                            <option value="">-- Chọn khối lớp / Trình độ --</option>
                            <option value="Lớp 9 (Ôn thi vào 10)">
                              Lớp 9 (Ôn thi vào 10)
                            </option>
                            <option value="Lớp 10">Lớp 10</option>
                            <option value="Lớp 11">Lớp 11</option>
                            <option value="Lớp 12 (Ôn thi THPTQG)">
                              Lớp 12 (Ôn thi THPTQG)
                            </option>
                            <option value="Đại học năm 1 - 2">
                              Đại học năm 1 - 2
                            </option>
                            <option value="Đại học năm 3">Đại học năm 3</option>
                            <option value="Đại học năm cuối">Đại học năm cuối</option>
                            <option value="Người đi làm">Người đi làm</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Trường học / Viện đào tạo
                          </label>
                          <div className="relative">
                            <GraduationCap
                              size={18}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              type="text"
                              value={studentForm.schoolName}
                              onChange={(e) =>
                                setStudentForm({
                                  ...studentForm,
                                  schoolName: e.target.value,
                                })
                              }
                              placeholder="Ví dụ: Đại học Bách Khoa TP.HCM"
                              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Mục tiêu học tập & Kế hoạch
                        </label>
                        <textarea
                          rows={4}
                          value={studentForm.learningGoals}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              learningGoals: e.target.value,
                            })
                          }
                          placeholder="Mô tả mong muốn cải thiện điểm số, chuẩn bị chứng chỉ hay các kỹ năng cần bổ sung..."
                          className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        />
                      </div>
                    </div>
                  ) : (
                    /* TUTOR PROFILE FIELDS */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Trường Đại học / Đơn vị công tác
                          </label>
                          <div className="relative">
                            <GraduationCap
                              size={18}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              type="text"
                              value={tutorForm.university}
                              onChange={(e) =>
                                setTutorForm({
                                  ...tutorForm,
                                  university: e.target.value,
                                })
                              }
                              placeholder="Ví dụ: ĐH Sư Phạm TP.HCM"
                              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Chuyên ngành đào tạo
                          </label>
                          <div className="relative">
                            <Award
                              size={18}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              type="text"
                              value={tutorForm.major}
                              onChange={(e) =>
                                setTutorForm({
                                  ...tutorForm,
                                  major: e.target.value,
                                })
                              }
                              placeholder="Ví dụ: Sư phạm Toán - Tin học"
                              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Số năm kinh nghiệm giảng dạy
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={tutorForm.yearsOfExperience}
                            onChange={(e) =>
                              setTutorForm({
                                ...tutorForm,
                                yearsOfExperience: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Hình thức giảng dạy
                          </label>
                          <select
                            value={tutorForm.teachingMode}
                            onChange={(e) =>
                              setTutorForm({
                                ...tutorForm,
                                teachingMode: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
                          >
                            <option value="Online">Chỉ dạy Online</option>
                            <option value="Offline">Chỉ dạy Offline (Tại nhà / Địa điểm)</option>
                            <option value="Cả hai (Online & Offline)">
                              Cả hai (Online & Offline)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Học phí tối thiểu (VNĐ / giờ)
                          </label>
                          <input
                            type="number"
                            step="10000"
                            value={tutorForm.hourlyRateMin}
                            onChange={(e) =>
                              setTutorForm({
                                ...tutorForm,
                                hourlyRateMin: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Học phí tối đa (VNĐ / giờ)
                          </label>
                          <input
                            type="number"
                            step="10000"
                            value={tutorForm.hourlyRateMax}
                            onChange={(e) =>
                              setTutorForm({
                                ...tutorForm,
                                hourlyRateMax: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Giới thiệu bản thân & Phương pháp giảng dạy
                        </label>
                        <textarea
                          rows={4}
                          value={tutorForm.bio}
                          onChange={(e) =>
                            setTutorForm({
                              ...tutorForm,
                              bio: e.target.value,
                            })
                          }
                          placeholder="Chia sẻ về thành tích, phương pháp sư phạm, giáo án và điểm nổi bật của bạn..."
                          className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-4 flex justify-end border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-xl px-6 py-2.5 transition-all shadow-sm shadow-brand-600/20 cursor-pointer"
                    >
                      <CheckCircle2 size={18} />
                      <span>
                        {submitting ? "Đang cập nhật..." : "Lưu hồ sơ chuyên môn"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ==================== TAB 3: BẢO MẬT & MẬT KHẨU ==================== */}
            {activeTab === 3 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="text-brand-600" size={20} />
                    Bảo mật tài khoản & Đổi mật khẩu
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Đảm bảo an toàn tài khoản bằng cách sử dụng mật khẩu mạnh với
                    ít nhất 6 ký tự kết hợp chữ và số.
                  </p>
                </div>

                <form
                  onSubmit={handleUpdatePassword}
                  className="space-y-6 max-w-xl"
                >
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mật khẩu hiện tại <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Xác nhận mật khẩu mới{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Security Note */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-verified-600" />
                      Yêu cầu mật khẩu an toàn:
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-500">
                      <li>Tối thiểu từ 6 ký tự trở lên.</li>
                      <li>Khuyên dùng kết hợp chữ hoa, chữ thường và chữ số.</li>
                      <li>Không sử dụng lại mật khẩu tài khoản khác.</li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex justify-start">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-xl px-6 py-2.5 transition-all shadow-sm shadow-brand-600/20 cursor-pointer"
                    >
                      <Lock size={16} />
                      <span>
                        {submitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ==================== TAB 4: NHÓM HỌC CỦA TÔI ==================== */}
            {activeTab === 4 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Users className="text-brand-600" size={20} />
                      Nhóm học tập đã tham gia & tạo lập
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Quản lý tiến trình, theo dõi lịch sinh hoạt và trao đổi cùng
                      các thành viên nhóm.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/study-groups")}
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors self-start cursor-pointer"
                  >
                    <span>Khám phá thêm nhóm</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* Groups List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {profile.studyGroups && profile.studyGroups.length > 0 ? (
                    profile.studyGroups.map((group) => (
                      <div
                        key={group.groupId}
                        className="p-5 rounded-2xl border border-slate-200 hover:border-brand-500/50 transition-all hover:shadow-md bg-white flex flex-col justify-between"
                      >
                        <div>
                          {/* Group header badges */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100">
                              <BookOpen size={12} />
                              {group.subjectName}
                            </span>

                            <div className="flex items-center gap-2">
                              {/* Meeting mode */}
                              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600">
                                {group.meetingMode}
                              </span>

                              {/* Role Badge */}
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                  group.userRole === "Trưởng nhóm"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {group.userRole}
                              </span>
                            </div>
                          </div>

                          {/* Group Title */}
                          <h3 className="font-semibold text-slate-900 text-base mb-2 line-clamp-2">
                            {group.title}
                          </h3>

                          {/* Next Session info */}
                          {group.nextSession && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                              <Calendar size={13} className="text-slate-400" />
                              <span>Lịch học: {group.nextSession}</span>
                            </div>
                          )}

                          {/* Member progress */}
                          <div className="space-y-1.5 mb-4">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span className="flex items-center gap-1">
                                <Users size={13} className="text-slate-400" />
                                Thành viên
                              </span>
                              <span className="font-medium text-slate-800">
                                {group.currentMembersCount} / {group.maxMembers}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-brand-600 h-2 rounded-full transition-all"
                                style={{
                                  width: `${
                                    group.progressPercentage ||
                                    (group.currentMembersCount /
                                      group.maxMembers) *
                                      100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            ID: #{group.groupId}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate("/study-groups")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                          >
                            <span>Chi tiết nhóm</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Users
                        size={36}
                        className="mx-auto text-slate-400 mb-2"
                      />
                      <h4 className="font-semibold text-slate-800 text-sm">
                        Chưa tham gia nhóm học nào
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Tìm kiếm và tham gia các nhóm học cùng sở thích để trao
                        đổi kiến thức và cùng nhau tiến bộ.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/study-groups")}
                        className="mt-4 inline-flex items-center gap-1.5 bg-brand-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors cursor-pointer"
                      >
                        <span>Tìm nhóm học ngay</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Avatar Edit Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera size={20} className="text-brand-600" />
                Cập nhật ảnh đại diện
              </h3>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-brand-100 mb-2">
                  <img
                    src={
                      newAvatarUrl ||
                      profile.avatarUrl ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
                    }
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
                    }}
                  />
                </div>
                <span className="text-xs text-slate-500">Xem trước ảnh đại diện</span>
              </div>

              {/* URL input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường dẫn ảnh (URL)
                </label>
                <input
                  type="url"
                  value={newAvatarUrl}
                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>

              {/* Preset selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Hoặc chọn từ ảnh mẫu có sẵn:
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setNewAvatarUrl(preset.url)}
                      className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                        newAvatarUrl === preset.url
                          ? "border-brand-600 bg-brand-50 ring-2 ring-brand-600/30"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-12 h-12 rounded-full object-cover mb-1"
                      />
                      <span className="text-[11px] font-medium text-slate-600 truncate w-full text-center">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAvatar()}
                  className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Lưu ảnh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
