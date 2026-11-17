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
  CheckCircle2,
  Zap
} from "lucide-react";
import Navbar from "../components/Navbar";
import { isLoggedIn } from "../auth";
import { createStudyGroup } from "../api/studyGroups";
import { getDefaultTutors, getSubjects } from "../api/tutorSearch";
import LocationFields from "../components/LocationFields";
import { regionError } from "../data/locations";
import { STUDY_LEVELS } from "../data/studyLevels";

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
    educationLevel: "",
    studyAim: "",
    scheduleNote: "",
    city: "",
    district: "",
    meetingMode: "Online",
    studyGoal: "PeerStudy",
    maxMembers: 6,
    hasMentor: false,
    tutorId: "",
    inviteMessage: "",
    hiringMode: "Standard",
    budgetPerSession: "500000",
    bidDeadline: "",
    tutorRequirements: "",
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
    if (!form.educationLevel) {
      setError("Hãy chọn cấp học. Cấp 3 không được ghép nhóm với cấp 1.");
      return;
    }
    if (form.studyAim.trim().length < 12) {
      setError("Viết mục tiêu môn học thành một câu rõ, ít nhất 12 ký tự.");
      return;
    }
    if (areaMsg) {
      setError(areaMsg);
      return;
    }
    const reverse = form.hiringMode === "ReverseBid";
    if (reverse) {
      const budget = Number(form.budgetPerSession);
      if (!Number.isFinite(budget) || budget < 50000) {
        setError("Ngân sách mỗi buổi tối thiểu 50.000đ cho cả nhóm.");
        return;
      }
      if (form.tutorRequirements.trim().length < 20) {
        setError("Viết yêu cầu dành cho gia sư, ít nhất 20 ký tự.");
        return;
      }
      if (!form.bidDeadline) {
        setError("Chọn hạn để gia sư chào thầu.");
        return;
      }
      const members = Number(form.maxMembers);
      if (members < 3 || members > 5) {
        setError("Nhóm đấu thầu có từ 3 đến 5 học sinh.");
        return;
      }
    }
    try {
      setSubmitting(true);
      const { studyAim, scheduleNote, ...rest } = form;
      const payload = {
        ...rest,
        description: [studyAim.trim(), scheduleNote.trim()].filter(Boolean).join("\n\n"),
        educationLevel: form.educationLevel,
        subjectId: Number(form.subjectId),
        maxMembers: Number(form.maxMembers),
        hiringMode: reverse ? "ReverseBid" : "Standard",
        hasMentor: reverse ? false : form.hasMentor,
        tutorId: !reverse && form.hasMentor && form.tutorId ? Number(form.tutorId) : null,
        budgetPerSession: reverse ? Number(form.budgetPerSession) : null,
        bidDeadline: reverse ? form.bidDeadline : null,
        tutorRequirements: reverse ? form.tutorRequirements.trim() : null,
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
        <div className="absolute inset-0 bg-hero" />
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
            Nhóm chỉ ghép bạn cùng cấp. Học sinh cấp 3 không học chung với cấp 1.
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
              <div className="mb-2 flex items-end justify-between gap-3">
                <label className="block text-xs font-bold text-slate-700">
                  Cấp học của nhóm <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-medium text-slate-400">Cùng cấp mới được vào nhóm</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {STUDY_LEVELS.map((level) => {
                  const active = form.educationLevel === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, educationLevel: level.value }))}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-brand-500 bg-brand-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-brand-200"
                      }`}
                    >
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-brand-600">{level.grade}</span>
                      <span className="mt-0.5 block text-sm font-extrabold text-slate-900">{level.value}</span>
                      <span className="mt-1 block text-[11px] leading-4 text-slate-500">{level.grades}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Ví dụ: nhóm THPT chỉ hiện với học sinh cấp 3. Bạn lớp 11 không thấy và không xin được vào nhóm tiểu học.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Môn học <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.subjectId}
                  onChange={update("subjectId")}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="">Chọn môn học</option>
                  {subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Tiêu đề nhóm <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.title}
                  onChange={update("title")}
                  placeholder="Luyện đề Chuyên Anh thi vào 10"
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Mục tiêu môn học <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={form.studyAim}
                onChange={update("studyAim")}
                rows={3}
                placeholder="Cùng dựng lại gốc hình học không gian, để mỗi bài sai mở ra một cách nghĩ chắc hơn."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold italic leading-relaxed text-slate-800 placeholder:font-bold placeholder:italic placeholder:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Xem trước trên thẻ nhóm</p>
                <p className="mt-1 text-sm font-bold italic leading-relaxed text-slate-800">
                  {form.studyAim.trim() || "Cùng dựng lại gốc hình học không gian, để mỗi bài sai mở ra một cách nghĩ chắc hơn."}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Ghi chú lịch học</label>
              <input
                value={form.scheduleNote}
                onChange={update("scheduleNote")}
                placeholder="Tối 2-4-6, 20:00, online"
                className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
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
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
                  min={form.hiringMode === "ReverseBid" ? 3 : 2}
                  max={form.hiringMode === "ReverseBid" ? 5 : 20}
                  value={form.maxMembers}
                  onChange={update("maxMembers")}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <GraduationCap size={16} />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900">Cách học của nhóm</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, hiringMode: "Standard", maxMembers: p.maxMembers > 5 ? p.maxMembers : 6 }))}
                className={`rounded-2xl border p-4 text-left transition ${
                  form.hiringMode !== "ReverseBid" ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-sm font-bold text-slate-900">Học cùng bạn</p>
                <p className="text-xs text-slate-500 mt-1">Bài hiện công khai. Học sinh cùng cấp xin vào nhóm.</p>
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, hiringMode: "ReverseBid", hasMentor: false, tutorId: "", maxMembers: 5 }))}
                className={`rounded-2xl border p-4 text-left transition ${
                  form.hiringMode === "ReverseBid" ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/20" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-sm font-bold text-slate-900">Cần gia sư cho cả nhóm</p>
                <p className="text-xs text-slate-500 mt-1">Bài chỉ giáo viên thấy. Giáo viên ứng tuyển, nhóm chọn.</p>
              </button>
            </div>

            {form.hiringMode !== "ReverseBid" && (
              <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasMentor}
                  onChange={update("hasMentor")}
                  className="w-4 h-4 rounded text-brand-600 border-slate-300"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">Mời sẵn một gia sư</p>
                  <p className="text-xs text-slate-500 mt-0.5">Bỏ qua nếu chỉ cần các bạn học cùng nhau.</p>
                </div>
              </label>
            )}

            {form.hiringMode !== "ReverseBid" && form.hasMentor && (
              <div className="space-y-3 pl-4 border-l-2 border-brand-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Chọn gia sư cần mời</label>
                  <select
                    value={form.tutorId}
                    onChange={update("tutorId")}
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="">Chọn gia sư</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  value={form.inviteMessage}
                  onChange={update("inviteMessage")}
                  placeholder="Lời nhắn mời gia sư"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            )}

            {form.hiringMode === "ReverseBid" && (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-xs text-amber-900">
                  Bài này không hiện ở trang tìm nhóm của học sinh. Chỉ gia sư đã đăng hồ sơ thấy yêu cầu và gửi giáo trình, chứng chỉ, giá.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngân sách cả nhóm / buổi (đ)</label>
                    <input
                      type="number"
                      min="50000"
                      step="10000"
                      value={form.budgetPerSession}
                      onChange={update("budgetPerSession")}
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Hạn gia sư ứng tuyển</label>
                    <input
                      type="date"
                      value={form.bidDeadline}
                      onChange={update("bidDeadline")}
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Yêu cầu dành cho gia sư</label>
                  <textarea
                    rows={4}
                    value={form.tutorRequirements}
                    onChange={update("tutorRequirements")}
                    placeholder="Ví dụ: Có chứng chỉ IELTS 7.5 trở lên, đã luyện thi vào 10 chuyên Anh, dạy được nhóm 4 bạn cuối tuần."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
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
            {form.hiringMode === "ReverseBid"
              ? "Sau khi đăng, chỉ gia sư thấy bài. Gửi link nhóm cho bạn cùng học nếu muốn họ vào nhóm và cùng chọn gia sư."
              : "Sau khi đăng, bài viết sẽ hiển thị trên trang Tìm nhóm học."}
          </p>
        </form>
      </main>
    </div>
  );
}
