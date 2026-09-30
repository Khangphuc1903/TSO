import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserRound,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BookingLessonCard from "../components/BookingLessonCard";
import { avatarUrl, getUser, isLoggedIn } from "../auth";
import {
  changePassword,
  confirmBooking,
  getMyBookings,
  getMyProfile,
  getNotifications,
  openConversation,
  rejectBooking,
  updateMyProfile,
} from "../api/study";
import LocationFields from "../components/LocationFields";
import { phoneError, regionError } from "../data/locations";

const TABS = [
  { id: "info", label: "Thông tin", icon: UserRound },
  { id: "password", label: "Mật khẩu", icon: Lock },
  { id: "today", label: "Hôm nay", icon: CalendarClock },
  { id: "pending", label: "Chờ xác nhận", icon: ShieldCheck },
  { id: "history", label: "Lịch sử", icon: Bell },
];

const inputClass =
  "w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500";

export default function Profile() {
  const navigate = useNavigate();
  const session = getUser();
  const isTutor = (session?.role || "").toLowerCase() === "tutor";

  const [tab, setTab] = useState("info");
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    city: "",
    district: "",
  });
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  const load = async () => {
    const [p, b, n] = await Promise.all([
      getMyProfile(),
      getMyBookings(),
      getNotifications().catch(() => ({ items: [] })),
    ]);
    setProfile(p);
    setForm({
      fullName: p.fullName || "",
      phoneNumber: p.phoneNumber || "",
      gender: p.gender || "",
      dateOfBirth: p.dateOfBirth || "",
      address: p.address || "",
      city: p.city || "",
      district: p.district || "",
    });
    setBookings(Array.isArray(b) ? b : []);
    setReminders((n.items || []).filter((x) => x.type === "LessonReminder"));
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    load().catch(() => setError("Không tải được hồ sơ. Hãy đăng nhập lại."));
  }, [navigate]);

  const today = useMemo(
    () => bookings.filter((b) => b.isToday && (b.status === "Confirmed" || b.status === "Pending")),
    [bookings]
  );
  const pending = useMemo(() => bookings.filter((b) => b.status === "Pending"), [bookings]);

  const chat = async (b) => {
    const other = isTutor ? b.studentId : b.tutorId;
    const id = await openConversation(other, b.bookingId);
    navigate(`/messages?c=${id}`);
  };

  const tutorActions = (b) =>
    isTutor && b.status === "Pending" ? (
      <>
        <button
          type="button"
          className="h-9 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          onClick={async () => {
            const res = await confirmBooking(b.bookingId);
            setInfo(res.message);
            await load();
          }}
        >
          Xác nhận
        </button>
        <button
          type="button"
          className="h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          onClick={async () => {
            const res = await rejectBooking(b.bookingId);
            setInfo(res.message);
            await load();
          }}
        >
          Từ chối
        </button>
      </>
    ) : null;

  const saveInfo = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const phoneMsg = phoneError(form.phoneNumber);
    if (phoneMsg) {
      setError(phoneMsg);
      return;
    }
    const areaMsg = regionError(form.city, form.district);
    if (areaMsg) {
      setError(areaMsg);
      return;
    }
    setSaving(true);
    try {
      const res = await updateMyProfile(form);
      setInfo(res.message);
      setProfile(res.profile);
      const stored = getUser() || {};
      localStorage.setItem(
        "user",
        JSON.stringify({ ...stored, email: res.profile.email, role: res.profile.role })
      );
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được thông tin.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (pwd.newPassword !== pwd.confirm) {
      setError("Mật khẩu mới không khớp.");
      return;
    }
    try {
      const res = await changePassword({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setInfo(res.message);
      setPwd({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Không đổi được mật khẩu.");
    }
  };

  const photo = profile?.avatarUrl || avatarUrl(profile?.fullName || profile?.email || session?.email);
  const locationText = [profile?.district, profile?.city].filter(Boolean).join(", ") || "Chưa cập nhật khu vực";

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
            Tài khoản đã xác thực trên TSG
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Trang <span className="text-brand-600">cá nhân</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Quản lý hồ sơ, đổi mật khẩu, theo dõi lịch học và đơn chờ xác nhận trong một nơi.
          </p>
          {isTutor && (
            <Link
              to="/tutor"
              className="inline-flex mt-4 h-10 items-center px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
            >
              Mở bảng gia sư
            </Link>
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <img src={photo} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-50" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">{profile?.fullName || "Hồ sơ của bạn"}</h2>
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-verified-50 text-verified-600 px-2 py-1 rounded-full">
                  <ShieldCheck size={12} />
                  {profile?.role || session?.role || "User"}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{profile?.email || session?.email}</p>
              <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-2">
                <MapPin size={14} /> {locationText}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <StatChip label="Buổi hôm nay" value={today.length} />
            <StatChip label="Chờ xác nhận" value={pending.length} />
            <StatChip label="Tổng lịch học" value={bookings.length} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-100 px-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const count = t.id === "pending" ? pending.length : t.id === "today" ? today.length : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setError("");
                    setInfo("");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    tab === t.id
                      ? "border-brand-600 text-brand-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon size={16} />
                  {t.label}
                  {count > 0 && (
                    <span className="text-[10px] bg-brand-50 text-brand-700 rounded-full px-1.5">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 sm:p-8">
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

            {tab === "info" && (
              <form onSubmit={saveInfo} className="grid sm:grid-cols-2 gap-4">
                <Field label="Họ tên" icon={<User size={18} />}>
                  <input
                    required
                    className={inputClass}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                  />
                </Field>
                <Field label="Số điện thoại (10 số)" icon={<Phone size={18} />}>
                  <input
                    required
                    inputMode="numeric"
                    maxLength={10}
                    className={inputClass}
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="0912345678"
                  />
                </Field>
                <label className="block text-sm text-slate-600">
                  Giới tính
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                    <option value="Other">Khác</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-600">
                  Ngày sinh
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  />
                </label>
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
                  <LocationFields
                    required
                    city={form.city}
                    district={form.district}
                    onChange={({ city, district }) => setForm((p) => ({ ...p, city, district }))}
                  />
                </div>
                <Field className="sm:col-span-2" label="Địa chỉ" icon={<Mail size={18} />}>
                  <input
                    className={inputClass}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Số nhà, đường..."
                  />
                </Field>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
                  >
                    {saving ? "Đang lưu..." : "Lưu thông tin"}
                    {!saving && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>
            )}

            {tab === "password" && (
              <form onSubmit={savePassword} className="max-w-md space-y-4">
                <PasswordField
                  label="Mật khẩu hiện tại"
                  value={pwd.currentPassword}
                  show={showPwd.current}
                  onToggle={() => setShowPwd((s) => ({ ...s, current: !s.current }))}
                  onChange={(v) => setPwd({ ...pwd, currentPassword: v })}
                />
                <PasswordField
                  label="Mật khẩu mới"
                  value={pwd.newPassword}
                  show={showPwd.next}
                  onToggle={() => setShowPwd((s) => ({ ...s, next: !s.next }))}
                  onChange={(v) => setPwd({ ...pwd, newPassword: v })}
                />
                <PasswordField
                  label="Nhập lại mật khẩu mới"
                  value={pwd.confirm}
                  show={showPwd.confirm}
                  onToggle={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}
                  onChange={(v) => setPwd({ ...pwd, confirm: v })}
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
                >
                  Đổi mật khẩu
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {tab === "today" && (
              <div className="space-y-4">
                {reminders.length > 0 && (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                    <p className="text-xs font-semibold tracking-wide text-brand-600 mb-2">THÔNG BÁO TỚI NGÀY HỌC</p>
                    <ul className="space-y-2">
                      {reminders.map((n) => (
                        <li key={n.notificationId} className="text-sm text-slate-700">
                          <span className="font-medium">{n.title}</span>
                          {n.content ? ` — ${n.content}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {today.length === 0 ? (
                  <EmptyState text="Hôm nay bạn không có buổi học nào." />
                ) : (
                  <div className="grid gap-4">
                    {today.map((b) => (
                      <BookingLessonCard
                        key={b.bookingId}
                        booking={b}
                        counterpartName={isTutor ? b.studentName : b.tutorName}
                        onChat={() => chat(b)}
                        actions={tutorActions(b)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "pending" && (
              <div>
                <p className="text-sm text-slate-500 mb-4">
                  {isTutor
                    ? "Đơn học viên đang chờ bạn xác nhận lịch."
                    : "Các buổi bạn đã đặt, đang chờ gia sư xác nhận."}
                </p>
                {pending.length === 0 ? (
                  <EmptyState text="Không có đơn chờ xác nhận." />
                ) : (
                  <div className="grid gap-4">
                    {pending.map((b) => (
                      <BookingLessonCard
                        key={b.bookingId}
                        booking={b}
                        counterpartName={isTutor ? b.studentName : b.tutorName}
                        onChat={() => chat(b)}
                        actions={tutorActions(b)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "history" && (
              <div>
                {bookings.length === 0 ? (
                  <EmptyState text="Chưa có lịch sử đặt lịch." />
                ) : (
                  <div className="grid gap-4">
                    {bookings.map((b) => (
                      <BookingLessonCard
                        key={b.bookingId}
                        booking={b}
                        counterpartName={isTutor ? b.studentName : b.tutorName}
                        onChat={() => chat(b)}
                        actions={tutorActions(b)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Link
            to="/notifications"
            className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <span className="font-medium text-slate-900">Tất cả thông báo</span>
            <ArrowRight size={16} className="text-brand-600" />
          </Link>
          <Link
            to="/bookings"
            className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <span className="font-medium text-slate-900">Trang lịch học</span>
            <ArrowRight size={16} className="text-brand-600" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function Field({ label, icon, children, className = "" }) {
  return (
    <label className={`block text-sm text-slate-600 ${className}`}>
      {label}
      <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        {children}
      </div>
    </label>
  );
}

function PasswordField({ label, value, show, onToggle, onChange }) {
  return (
    <label className="block text-sm text-slate-600">
      {label}
      <div className="relative mt-1">
        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type={show ? "text" : "password"}
          required
          minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-surface px-6 py-12 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
