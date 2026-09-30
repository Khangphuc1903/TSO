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
import Navbar from "../components/Navbar";
import { getUser, isLoggedIn } from "../auth";
import { getSubjects } from "../api/tutorSearch";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref } from "../utils/format";
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
    hourlyRateMin: "",
    hourlyRateMax: "",
    teachingMode: "Both",
    isPublished: false,
    subjectIds: [],
  });
  const [certForm, setCertForm] = useState({
    certificateName: "",
    issuedBy: "",
    issuedDate: "",
    file: null,
  });
  const [slotForm, setSlotForm] = useState({
    isRecurring: true,
    dayOfWeek: 1,
    specificDate: "",
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
      hourlyRateMin: workspace.hourlyRateMin ?? "",
      hourlyRateMax: workspace.hourlyRateMax ?? "",
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
    load().catch(() => setError("Không tải được bảng gia sư. Kiểm tra backend đang chạy."));
  }, [navigate, isTutor]);

  const pendingInvites = useMemo(
    () => invites.filter((i) => i.status === "Pending"),
    [invites]
  );

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
        hourlyRateMin: form.hourlyRateMin === "" ? null : Number(form.hourlyRateMin),
        hourlyRateMax: form.hourlyRateMax === "" ? null : Number(form.hourlyRateMax),
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
    const data = new FormData();
    data.append("certificateName", certForm.certificateName);
    data.append("issuedBy", certForm.issuedBy);
    data.append("issuedDate", certForm.issuedDate);
    data.append("file", certForm.file);
    try {
      const res = await uploadTutorCertificate(data);
      setInfo(res.message);
      setCertForm({ certificateName: "", issuedBy: "", issuedDate: "", file: null });
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
        isRecurring: slotForm.isRecurring,
        dayOfWeek: slotForm.isRecurring ? Number(slotForm.dayOfWeek) : null,
        specificDate: slotForm.isRecurring ? null : slotForm.specificDate,
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
      <Navbar />
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
            Cập nhật hồ sơ dạy học, chứng chỉ, lịch trống và lời mời mentor. Học viên sẽ thấy chứng chỉ trên hồ sơ công khai.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              to="/bookings"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
            >
              <CalendarClock size={16} />
              Xác nhận booking
            </Link>
            {user?.userId && (
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

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 mb-6">
          <div className="flex overflow-x-auto">
            {TABS.map((t) => (
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
              Xác thực danh tính và 2 bài test (chuyên môn, an toàn/sư phạm) sẽ làm sau. Trạng thái
              hiện tại: <strong>{ws?.verificationStatus || "Pending"}</strong>
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
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Giá tối thiểu (VNĐ/giờ)</span>
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} mt-1`}
                  value={form.hourlyRateMin}
                  onChange={(e) => setForm({ ...form, hourlyRateMin: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Giá tối đa (VNĐ/giờ)</span>
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} mt-1`}
                  value={form.hourlyRateMax}
                  onChange={(e) => setForm({ ...form, hourlyRateMax: e.target.value })}
                />
              </label>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700">Môn dạy</span>
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
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              />
              Công khai hồ sơ trên Find Tutors
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
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Tên chứng chỉ</span>
                  <input
                    required
                    className={`${inputClass} mt-1`}
                    value={certForm.certificateName}
                    onChange={(e) => setCertForm({ ...certForm, certificateName: e.target.value })}
                  />
                </label>
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
            <form
              onSubmit={onAddSlot}
              className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-4"
            >
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-brand-600" />
                Thêm khung giờ trống
              </h2>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={slotForm.isRecurring}
                    onChange={() => setSlotForm({ ...slotForm, isRecurring: true })}
                  />
                  Lặp hàng tuần
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!slotForm.isRecurring}
                    onChange={() => setSlotForm({ ...slotForm, isRecurring: false })}
                  />
                  Một buổi cụ thể
                </label>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {slotForm.isRecurring ? (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Thứ</span>
                    <select
                      className={`${inputClass} mt-1`}
                      value={slotForm.dayOfWeek}
                      onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: Number(e.target.value) })}
                    >
                      {DAYS.map((d) => (
                        <option key={d.v} value={d.v}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Ngày</span>
                    <input
                      type="date"
                      required
                      className={`${inputClass} mt-1`}
                      value={slotForm.specificDate}
                      onChange={(e) => setSlotForm({ ...slotForm, specificDate: e.target.value })}
                    />
                  </label>
                )}
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Bắt đầu</span>
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Kết thúc</span>
                  <input
                    type="time"
                    className={`${inputClass} mt-1`}
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                  />
                </label>
              </div>
              <button
                type="submit"
                className="h-10 px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
              >
                Thêm lịch trống
              </button>
            </form>
            <ul className="space-y-3">
              {(ws?.slots || []).length === 0 && (
                <li className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500">
                  Chưa có lịch trống. Học viên chỉ đặt được khi bạn mở khung giờ.
                </li>
              )}
              {(ws?.slots || []).map((s) => (
                <li
                  key={s.slotId}
                  className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {s.isRecurring
                        ? `${dayLabel(s.dayOfWeek)} hàng tuần`
                        : s.specificDate
                          ? new Date(s.specificDate).toLocaleDateString("vi-VN")
                          : "Một buổi"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {s.startTime} – {s.endTime}
                      {s.isBooked ? " · Đã được đặt" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={s.isBooked}
                    className="text-red-500 hover:bg-red-50 rounded-lg p-2 disabled:opacity-40"
                    onClick={async () => {
                      const res = await deleteTutorSlot(s.slotId);
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
