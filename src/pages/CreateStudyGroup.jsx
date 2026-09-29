import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  BookOpen,
  Users,
  MapPin,
  GraduationCap,
  Globe,
  MessageCircle,
  Sparkles,
  AlertCircle,
  Send,
  Info,
  CheckCircle2,
  Zap
} from "lucide-react";
import Navbar from "../components/Navbar";
import { isLoggedIn } from "../auth";
import { createStudyGroup } from "../api/studyGroups";
import { getDefaultTutors, getSubjects } from "../api/tutorSearch";
import LocationFields from "../components/LocationFields";
import { regionError } from "../data/locations";

export default function CreateStudyGroup() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    subjectId: "",
    city: "",
    district: "",
    meetingMode: "Online",
    studyGoal: "PeerStudy",
    maxMembers: 6,
    hasMentor: false,
    tutorId: "",
    inviteMessage: "",
  });

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login");
    getSubjects().then(setSubjects).catch(() => []);
    getDefaultTutors().then(setTutors).catch(() => []);
  }, [navigate]);

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const areaMsg = regionError(form.city, form.district);
    if (areaMsg) {
      setError(areaMsg);
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        subjectId: Number(form.subjectId),
        maxMembers: Number(form.maxMembers),
        tutorId: form.hasMentor && form.tutorId ? Number(form.tutorId) : null,
      };
      const res = await createStudyGroup(payload);
      navigate(`/study-groups/${res.group.groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Không tạo được nhóm.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC]">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E4D] via-[#16307F] to-[#1D3FAE]" />
        <div className="absolute -right-32 -top-32 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-8 sm:py-10">
          <Link to="/study-groups" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition mb-4">
            <ArrowLeft size={14} /> Quay lại danh sách nhóm
          </Link>

          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/15 text-emerald-200 border border-emerald-300/25">
              <Plus size={13} /> Tạo mới
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tạo nhóm học mới
          </h1>
          <p className="text-sm text-white/75 mt-2 max-w-lg leading-relaxed">
            Đăng bài tuyển nhóm như một bài post: chọn môn, khu vực, và quyết định có mời gia sư hay chỉ học sinh hỗ trợ nhau qua chat realtime.
          </p>
        </div>
      </section>

      {/* FORM */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 relative z-20 pb-20">
        <form
          onSubmit={submit}
          className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-6"
        >
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2 font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Thông tin cơ bản */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <BookOpen size={16} />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900">Thông tin nhóm học</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tiêu đề nhóm <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={update("title")}
                placeholder="Ví dụ: Nhóm ôn thi ĐH Toán 2026 - Quận 1 HCM"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mô tả mục tiêu & lịch học
              </label>
              <textarea
                value={form.description}
                onChange={update("description")}
                rows={4}
                placeholder="Mô tả mục tiêu nhóm, lịch học dự kiến, yêu cầu với thành viên mới..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Môn học <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.subjectId}
                onChange={update("subjectId")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
              >
                <option value="">Chọn môn học</option>
                {subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Khu vực & Hình thức */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <MapPin size={16} />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900">Khu vực & Hình thức</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LocationFields
                required
                city={form.city}
                district={form.district}
                onChange={({ city, district }) => setForm((p) => ({ ...p, city, district }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Phương thức gặp mặt</label>
                <select
                  value={form.meetingMode}
                  onChange={update("meetingMode")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
                >
                  <option value="Online">Online (Google Meet, Zoom...)</option>
                  <option value="Offline">Offline (Gặp trực tiếp)</option>
                  <option value="Hybrid">Hybrid (Kết hợp)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Số thành viên tối đa</label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={form.maxMembers}
                  onChange={update("maxMembers")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Gia sư Mentor */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <GraduationCap size={16} />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900">Gia sư Mentor (tuỳ chọn)</h2>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-brand-200 bg-slate-50/50 transition cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.hasMentor}
                onChange={update("hasMentor")}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Mời gia sư làm mentor cho nhóm</p>
                <p className="text-xs text-slate-500 mt-0.5">Bỏ chọn nếu chỉ cần học sinh tự hỗ trợ nhau (Peer Study)</p>
              </div>
            </label>

            {/* Tip card */}
            <div className="p-3.5 bg-brand-50/60 rounded-2xl border border-brand-100 text-xs text-brand-800 flex items-start gap-2">
              <Info size={15} className="shrink-0 mt-0.5 text-brand-600" />
              <div>
                <strong>Gia sư Mentor</strong> sẽ hỗ trợ giải đáp thắc mắc, định hướng nội dung học và quản lý tiến độ nhóm.
                <strong> Peer Study</strong> là hình thức tự học, chỉ có các bạn học sinh thảo luận và hỗ trợ lẫn nhau.
              </div>
            </div>

            {form.hasMentor && (
              <div className="space-y-3 pl-4 border-l-2 border-brand-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Chọn gia sư cần mời</label>
                  <select
                    value={form.tutorId}
                    onChange={update("tutorId")}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
                  >
                    <option value="">Chọn gia sư</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Lời nhắn mời gia sư</label>
                  <input
                    value={form.inviteMessage}
                    onChange={update("inviteMessage")}
                    placeholder="Ví dụ: Mong thầy/cô hỗ trợ mentor cho nhóm ôn thi..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm transition shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang tạo nhóm...
              </>
            ) : (
              <>
                <Send size={16} />
                Đăng nhóm học lên cộng đồng TSG
              </>
            )}
          </button>

          {/* Footer tip */}
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Sau khi đăng, bài viết sẽ hiển thị trên trang "Tìm nhóm học". Bạn sẽ nhận được thông báo khi có người xin tham gia.
          </p>
        </form>
      </main>
    </div>
  );
}
