import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  CalendarClock,
  Clock,
  FileUp,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import TutorSetupSteps from "../components/TutorSetupSteps";
import WeeklyScheduleManager from "../components/WeeklyScheduleManager";
import { getUser, isLoggedIn } from "../auth";
import { getSubjects } from "../api/tutorSearch";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref } from "../utils/format";
import { loadTutorGate } from "../tutorGate";
import { getMySosSessions } from "../api/sos";
import {
  createTutorSlot,
  deleteTutorCertificate,
  deleteTutorSlot,
  getTutorInvites,
  getTutorWorkspace,
  respondTutorInvite,
  updateTutorWorkspace,
  uploadTutorCertificate,
} from "../api/study";

const TABS = [
  { id: "profile", label: "Hồ sơ dạy học" },
  { id: "certs", label: "Chứng chỉ" },
  { id: "slots", label: "Lịch trống" },
  { id: "invites", label: "Lời mời nhóm" },
];

const DAYS = [
  { v: 1, label: "Thứ 2" },
  { v: 2, label: "Thứ 3" },
  { v: 3, label: "Thứ 4" },
  { v: 4, label: "Thứ 5" },
  { v: 5, label: "Thứ 6" },
  { v: 6, label: "Thứ 7" },
  { v: 7, label: "Chủ nhật" },
];

const CERTIFICATE_GROUPS = [
  {
    group: "Ngoại ngữ",
    items: [
      "IELTS",
      "TOEIC",
      "TOEFL iBT",
      "TOEFL ITP",
      "VSTEP",
      "Cambridge Starters",
      "Cambridge Movers",
      "Cambridge Flyers",
      "Cambridge KET (A2 Key)",
      "Cambridge PET (B1 Preliminary)",
      "Cambridge FCE (B2 First)",
      "Cambridge CAE (C1 Advanced)",
      "Cambridge CPE (C2 Proficiency)",
      "TESOL",
      "TEFL",
      "CELTA",
      "HSK",
      "JLPT",
      "TOPIK",
      "DELF",
      "DALF",
      "Goethe-Zertifikat",
      "Chứng chỉ tiếng Nga (ТРКИ)",
    ],
  },
  {
    group: "Học vấn",
    items: [
      "Bằng tốt nghiệp THPT",
      "Bằng cao đẳng",
      "Bằng cử nhân",
      "Bằng kỹ sư",
      "Bằng thạc sĩ",
      "Bằng tiến sĩ",
    ],
  },
  {
    group: "Sư phạm",
    items: [
      "Chứng chỉ nghiệp vụ sư phạm",
      "Chứng chỉ bồi dưỡng thường xuyên",
      "Chứng chỉ phương pháp giảng dạy",
    ],
  },
  {
    group: "Tin học",
    items: [
      "MOS (Microsoft Office Specialist)",
      "IC3",
      "Chứng chỉ ứng dụng CNTT cơ bản",
      "Chứng chỉ ứng dụng CNTT nâng cao",
    ],
  },
  {
    group: "Khác",
    items: [
      "SAT",
      "ACT",
      "GRE",
      "GMAT",
      "Giải học sinh giỏi quốc gia",
      "Giải học sinh giỏi cấp tỉnh",
      "Chứng chỉ sơ cấp cứu",
      "Khác",
    ],
  },
];

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500";

function dayLabel(day) {
  return DAYS.find((d) => d.v === Number(day))?.label || `Thứ ${day}`;
}

export default function TutorDesk() {
  const navigate = useNavigate();
  const user = getUser();
  const isTutor = (user?.role || "").toLowerCase() === "tutor";

  const [tab, setTab] = useState("profile");
  const [tutorReady, setTutorReady] = useState(false);
  const [gateKnown, setGateKnown] = useState(false);
  const [sosHistory, setSosHistory] = useState([]);
  const [ws, setWs] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [invites, setInvites] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bio: "",
    university: "",
    major: "",
    yearsOfExperience: "",
    hourlyRate: "",
    teachingMode: "Both",
    isPublished: false,
    subjectIds: [],
  });
  const [certFileKey, setCertFileKey] = useState(0);
  const [certForm, setCertForm] = useState({
    certificateType: "",
    certificateName: "",
    issuedBy: "",
    issuedDate: "",
    file: null,
  });
  const [slotForm, setSlotForm] = useState({
    dayOfWeek: 1,
    startTime: "18:00",
    endTime: "20:00",
  });

  const load = async () => {
    const [workspace, inv] = await Promise.all([getTutorWorkspace(), getTutorInvites()]);
    setWs(workspace);
    setInvites(inv || []);
    setForm({
      bio: workspace.bio || "",
      university: workspace.university || "",
      major: workspace.major || "",
      yearsOfExperience: workspace.yearsOfExperience ?? "",
      hourlyRate: workspace.hourlyRate ?? workspace.hourlyRateMin ?? workspace.hourlyRateMax ?? "",
      teachingMode: workspace.teachingMode || "Both",
      isPublished: Boolean(workspace.isPublished),
      subjectIds: (workspace.subjects || []).map((s) => s.subjectId),
    });
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (!isTutor) {
      navigate("/profile");
      return;
    }
    getSubjects().then(setSubjects).catch(() => setSubjects([]));
    loadTutorGate(true).then((gate) => {
      setTutorReady(Boolean(gate?.ready));
      setGateKnown(true);
    });
    load().catch(() => setError("Không tải được bảng gia sư. Kiểm tra backend đang chạy."));
    getMySosSessions().then((rows) => setSosHistory(Array.isArray(rows) ? rows : [])).catch(() => setSosHistory([]));
  }, [navigate, isTutor]);

  const pendingInvites = useMemo(
    () => invites.filter((i) => i.status === "Pending"),
    [invites]
  );

  const normalizedSlots = useMemo(() => {
    return (ws?.slots || [])
      .map((s) => {
        let dow = s.dayOfWeek;
        if ((dow == null || dow < 1 || dow > 7) && s.specificDate) {
          const parts = s.specificDate.split("-");
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            const jsDay = d.getDay();
            dow = jsDay === 0 ? 7 : jsDay;
          }
        }
        const safeDow = dow >= 1 && dow <= 7 ? dow : 1;
        return {
          ...s,
          resolvedDayOfWeek: safeDow,
          dayLabel: dayLabel(safeDow),
        };
      })
      .sort((a, b) => {
        if (a.resolvedDayOfWeek !== b.resolvedDayOfWeek) {
          return a.resolvedDayOfWeek - b.resolvedDayOfWeek;
        }
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
  }, [ws?.slots]);
  const canOpenSchedule = Boolean(ws?.canOpenSchedule) || tutorReady;
  const showSetup = gateKnown && !canOpenSchedule;
  const visibleTabs = canOpenSchedule ? TABS : TABS.filter((t) => t.id === "profile" || t.id === "certs");
  const passedTestCount = ws?.passedTestCount || 0;
  const identityCompleted = Boolean(ws?.identityCompleted);
  const setupCurrent = !identityCompleted ? "identity" : canOpenSchedule ? "schedule" : "tests";

  const onSaveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSaving(true);
    try {
      const res = await updateTutorWorkspace({
        bio: form.bio,
        university: form.university,
        major: form.major,
        yearsOfExperience: form.yearsOfExperience === "" ? null : Number(form.yearsOfExperience),
        hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate),
        hourlyRateMin: form.hourlyRate === "" ? null : Number(form.hourlyRate),
        hourlyRateMax: form.hourlyRate === "" ? null : Number(form.hourlyRate),
        teachingMode: form.teachingMode,
        isPublished: form.isPublished,
        subjectIds: form.subjectIds,
      });
      setInfo(res.message);
      setWs(res.workspace);
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const onUploadCert = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!certForm.file) {
      setError("Chọn tệp chứng chỉ.");
      return;
    }
    const certificateName = certForm.certificateType === "Khác"
      ? certForm.certificateName.trim()
      : certForm.certificateType;
    if (!certificateName) {
      setError(certForm.certificateType === "Khác" ? "Nhập tên chứng chỉ." : "Chọn loại chứng chỉ.");
      return;
    }
    const data = new FormData();
    data.append("certificateName", certificateName);
    data.append("issuedBy", certForm.issuedBy);
    data.append("issuedDate", certForm.issuedDate);
    data.append("file", certForm.file);
    try {
      const res = await uploadTutorCertificate(data);
      setInfo(res.message);
      setCertForm({ certificateType: "", certificateName: "", issuedBy: "", issuedDate: "", file: null });
      setCertFileKey((key) => key + 1);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.title || "Không tải được chứng chỉ.");
    }
  };

  const onAddSlot = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      const res = await createTutorSlot({
        isRecurring: true,
        dayOfWeek: Number(slotForm.dayOfWeek),
        specificDate: null,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
      });
      setInfo(res.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Không thêm được lịch trống.");
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden pt-12 pb-8 px-6">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)",
          }}
        />
        <div className="max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} />
            Bảng làm việc gia sư
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Bảng <span className="text-brand-600">làm việc</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            {canOpenSchedule
              ? "Hồ sơ đã xác thực. Quản lý lịch dạy, chào thầu và SOS."
              : "Cập nhật hồ sơ dạy học. Lịch trống mở sau khi xác thực CCCD và đạt bài kiểm tra chuyên môn."}
          </p>
          {showSetup && (
          <div className="mt-6">
            <TutorSetupSteps passedTestCount={passedTestCount} identityCompleted={identityCompleted} current={setupCurrent} />
          </div>
          )}
          <div className="flex flex-wrap gap-3 mt-5">
              {showSetup && (
              <Link
                to="/tutor-identity"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
              >
                <Sparkles size={16} />
                Xác thực CCCD
              </Link>
              )}
              {showSetup && (
              <Link
                to="/tutor-tests"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-white"
              >
                Làm bài test
              </Link>
              )}
              {canOpenSchedule && (
              <Link
                to="/sos"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium"
              >
                Cứu viện SOS
              </Link>
              )}
              {canOpenSchedule && (
              <Link
                to="/bookings"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-white"
              >
              <CalendarClock size={16} />
              Lịch dạy
            </Link>
              )}
            {canOpenSchedule && user?.userId && (
              <Link
                to={`/tutors/${user.userId}`}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-white"
              >
                Xem hồ sơ công khai
              </Link>
            )}
          </div>
        </div>
      </section>

      {canOpenSchedule && (
        <section className="max-w-5xl mx-auto px-6 pb-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-lg font-bold text-slate-900">Lịch sử SOS</h2>
            <p className="text-sm text-slate-500 mt-1">Xem lại hướng dẫn và mở buổi học đã tạo từ phiên cứu viện.</p>
            {sosHistory.length === 0 ? (
              <p className="text-sm text-slate-400 mt-4">Chưa có phiên SOS nào.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {sosHistory.map((item) => (
                  <li key={item.sessionId} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.subjectName || "SOS"} · {item.studentName || "Học sinh"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.endedAt ? "Đã kết thúc" : "Đang diễn ra"}
                        {item.questionNote ? ` · ${item.questionNote}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/sos/session/${item.sessionId}`}
                        className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 inline-flex items-center"
                      >
                        Xem lại hướng dẫn
                      </Link>
                      <Link
                        to={item.bookingId ? `/bookings` : `/sos/session/${item.sessionId}`}
                        className="h-9 px-3 rounded-lg bg-brand-600 text-white text-sm font-medium inline-flex items-center"
                      >
                        Vào lịch dạy
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 mb-6">
          <div className="flex overflow-x-auto">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                {t.id === "invites" && pendingInvites.length > 0 && (
                  <span className="ml-1 text-[10px] bg-brand-600 text-white rounded-full px-1.5">
                    {pendingInvites.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 text-sm text-verified-600 bg-verified-50 border border-emerald-100 rounded-lg px-3 py-2">
            {info}
          </div>
        )}

        {tab === "profile" && (
          <form onSubmit={onSaveProfile} className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-4">
            <p className="text-xs text-slate-500">
              Trạng thái hồ sơ: <strong>{ws?.verificationStatus || "Pending"}</strong>
              {canOpenSchedule
                ? " · Đã xác thực CCCD và đạt bài test, có thể mở lịch dạy."
                : " · Chưa đủ CCCD + bài test — chưa mở được lịch trống."}
            </p>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Giới thiệu</span>
              <textarea
                rows={4}
                className={`${inputClass} mt-1`}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Trường / đại học</span>
                <input
                  className={`${inputClass} mt-1`}
                  value={form.university}
                  onChange={(e) => setForm({ ...form, university: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Chuyên ngành</span>
                <input
                  className={`${inputClass} mt-1`}
                  value={form.major}
                  onChange={(e) => setForm({ ...form, major: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Số năm kinh nghiệm</span>
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} mt-1`}
                  value={form.yearsOfExperience}
                  onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Hình thức dạy</span>
                <select
                  className={`${inputClass} mt-1`}
                  value={form.teachingMode}
                  onChange={(e) => setForm({ ...form, teachingMode: e.target.value })}
                >
                  <option value="Both">Online & Offline</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Giá theo giờ (VNĐ)</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className={`${inputClass} mt-1`}
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  placeholder="Ví dụ: 150000"
                />
                <span className="text-xs text-slate-400 mt-1 block">Một mức giá duy nhất cho 1 giờ dạy. Học phí buổi = giá/giờ × số giờ khung.</span>
              </label>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700">Môn dạy</span>
              {ws?.subjectsLocked ? (
                <p className="mt-2 text-sm text-slate-600">
                  {(ws.subjects || []).filter((s, i, list) => list.findIndex((x) => x.subjectId === s.subjectId) === i).map((s) => s.subjectName).join(", ") || "Chưa chọn"}
                  . Môn đã khóa khi làm bài test, không sửa lại được.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {subjects.map((s) => {
                    const id = s.subjectId;
                    const on = form.subjectIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            subjectIds: on
                              ? f.subjectIds.filter((x) => x !== id)
                              : [...f.subjectIds, id],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          on
                            ? "bg-brand-50 border-brand-200 text-brand-700"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        {s.subjectName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                disabled={!canOpenSchedule}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              />
              Công khai hồ sơ trên Find Tutors
              {!canOpenSchedule && (
                <span className="text-xs text-slate-400">(cần CCCD + bài test)</span>
              )}
            </label>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu hồ sơ"}
            </button>
          </form>
        )}

        {tab === "certs" && (
          <div className="space-y-4">
            <form
              onSubmit={onUploadCert}
              className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-4"
            >
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileUp size={18} className="text-brand-600" />
                Tải chứng chỉ bổ sung
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Loại chứng chỉ</span>
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-3 space-y-3">
                    {CERTIFICATE_GROUPS.map((group) => (
                      <div key={group.group}>
                        <p className="text-xs font-semibold text-slate-400 mb-1.5">{group.group}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((item) => {
                            const on = certForm.certificateType === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setCertForm({ ...certForm, certificateType: item, certificateName: "" })}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                                  on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {certForm.certificateType === "Khác" && (
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Tên chứng chỉ</span>
                    <input
                      required
                      className={`${inputClass} mt-1`}
                      value={certForm.certificateName}
                      onChange={(e) => setCertForm({ ...certForm, certificateName: e.target.value })}
                      placeholder="Nhập tên chứng chỉ"
                    />
                  </label>
                )}
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Cấp bởi</span>
                  <input
                    className={`${inputClass} mt-1`}
                    value={certForm.issuedBy}
                    onChange={(e) => setCertForm({ ...certForm, issuedBy: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Ngày cấp</span>
                  <input
                    type="date"
                    className={`${inputClass} mt-1`}
                    value={certForm.issuedDate}
                    onChange={(e) => setCertForm({ ...certForm, issuedDate: e.target.value })}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Tệp (PDF/ảnh, tối đa 8MB)</span>
                  <input
                    key={certFileKey}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="mt-1 text-sm"
                    onChange={(e) => setCertForm({ ...certForm, file: e.target.files?.[0] || null })}
                  />
                </label>
              </div>
              <button
                type="submit"
                className="h-10 px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
              >
                Tải lên
              </button>
            </form>
            <ul className="space-y-3">
              {(ws?.certificates || []).length === 0 && (
                <li className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500">
                  Chưa có chứng chỉ.
                </li>
              )}
              {(ws?.certificates || []).map((c) => (
                <li
                  key={c.certificateId}
                  className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <Award className="text-brand-600 mt-0.5" size={18} />
                    <div>
                      <p className="font-medium text-slate-900">{c.certificateName}</p>
                      <p className="text-xs text-slate-500">
                        {c.issuedBy || "—"}
                        {c.issuedDate ? ` · ${c.issuedDate}` : ""}
                      </p>
                      <a
        href={fileHref(c.fileUrl, API_ORIGIN)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Xem tệp
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-red-500 hover:bg-red-50 rounded-lg p-2"
                    onClick={async () => {
                      const res = await deleteTutorCertificate(c.certificateId);
                      setInfo(res.message);
                      load();
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "slots" && (
          <div className="space-y-4">
            {!canOpenSchedule ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <Clock className="mx-auto text-brand-600 mb-3" size={28} />
                <p className="font-semibold text-slate-900">Lịch dạy chưa được mở</p>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  {identityCompleted
                    ? "Hoàn thành bài kiểm tra chuyên môn trước khi mở lịch."
                    : "Hoàn tất CCCD và khuôn mặt trước, rồi làm bài test chuyên môn."}
                </p>
                <Link
                  to={identityCompleted ? "/tutor-tests" : "/tutor-identity"}
                  className="inline-flex mt-5 h-10 items-center px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
                >
                  {identityCompleted ? "Đi làm bài test" : "Xác thực CCCD"}
                </Link>
              </div>
            ) : (
              <WeeklyScheduleManager
                slots={ws?.slots || []}
                canEdit={true}
                onChanged={load}
              />
            )}
          </div>
        )}

        {tab === "invites" && (
          <ul className="space-y-3">
            {invites.length === 0 && (
              <li className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-3">
                  <Users size={26} />
                </span>
                <p className="font-medium text-slate-900">Chưa có lời mời nhóm</p>
                <p className="text-sm text-slate-500 mt-1">
                  Khi học viên mời bạn làm mentor, lời mời sẽ hiện ở đây.
                </p>
              </li>
            )}
            {invites.map((inv) => (
              <li key={`${inv.groupId}-${inv.invitedAt}`} className="bg-white rounded-2xl border border-slate-100 px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{inv.title}</p>
                    <p className="text-sm text-slate-500">
                      {inv.subjectName} · Mời bởi {inv.invitedByName}
                    </p>
                    {inv.inviteMessage && (
                      <p className="text-sm text-slate-600 mt-1">{inv.inviteMessage}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {inv.status === "Pending"
                        ? "Đang chờ phản hồi"
                        : inv.status === "Accepted"
                          ? "Đã nhận lời"
                          : "Đã từ chối"}
                    </p>
                  </div>
                  {inv.status === "Pending" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="h-9 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
                        onClick={async () => {
                          const res = await respondTutorInvite(inv.groupId, true);
                          setInfo(res.message);
                          load();
                        }}
                      >
                        Chấp nhận
                      </button>
                      <button
                        type="button"
                        className="h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"
                        onClick={async () => {
                          const res = await respondTutorInvite(inv.groupId, false);
                          setInfo(res.message);
                          load();
                        }}
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                  {inv.status === "Accepted" && (
                    <Link
                      to={`/study-groups/${inv.groupId}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Mở nhóm / chat
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
