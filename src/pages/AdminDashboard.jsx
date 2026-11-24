import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  BarChart3,
  Check,
  ClipboardList,
  Flag,
  IdCard,
  Landmark,
  LayoutDashboard,
  Loader2,
  Settings,
  Shield,
  Users,
  X,
  Star,
  Trash2,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  Search,
  MessageSquareDiff,
  ShieldAlert,
  FileText,
  Paperclip,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUser, isLoggedIn } from "../auth";
import { adminApi } from "../api/admin";
import { VIETNAMESE_BANKS } from "../components/BankAccountManager";
import { getSubjects } from "../api/tutorSearch";
import { API_ORIGIN } from "../api/axiosClient";

const TABS = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "identity", label: "CCCD / AI", icon: IdCard },
  { id: "users", label: "Tài khoản", icon: Users },
  { id: "reports", label: "Báo cáo vi phạm", icon: Flag },
  { id: "reviews", label: "Quản lý đánh giá", icon: Star },
  { id: "questions", label: "Ngân hàng câu hỏi", icon: ClipboardList },
  { id: "revenue", label: "Doanh số", icon: BarChart3 },
  { id: "payouts", label: "Chi trả", icon: Landmark },
  { id: "settings", label: "Cấu hình", icon: Settings },
];

const REPORT_REASONS = {
  FakeReview: "Đánh giá sai sự thật / Bịa đặt",
  Defamation: "Bôi nhọ danh dự / Xúc phạm",
  NeverStudied: "Chưa từng học / Nhầm ca dạy",
  Extortion: "Tống tiền / Đe dọa",
  Harassment: "Quấy rối / Thiếu văn hóa",
  Attendance: "Bùng lịch / Không tham gia",
  Cheating: "Gian lận / Yêu cầu làm bài hộ",
  Quality: "Chất lượng không đúng cam kết",
  Absence: "Vắng mặt / Không dạy đúng giờ",
  Fraud: "Gian lận",
  Safety: "An toàn",
  Other: "Khác",
};

function vnd(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

const ROLE_LABELS = {
  Tutor: "Gia sư",
  Student: "Học viên",
  Parent: "Phụ huynh",
  Admin: "Quản trị",
};

function HoldImage({ id, side, label }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let url = "";
    let alive = true;
    adminApi.identityImage(id, side).then((blob) => {
      url = URL.createObjectURL(blob);
      if (alive) setSrc(url);
    }).catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, side]);
  return (
    <figure>
      <figcaption className="text-[11px] text-slate-500 mb-1">{label}</figcaption>
      {src ? <img src={src} alt={label} className="h-56 w-full object-contain rounded-lg border bg-slate-50" /> : <div className="h-56 rounded-lg border bg-slate-50" />}
    </figure>
  );
}

function media(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_ORIGIN}${path}`;
}

const BOOKING_STATUS = {
  Pending: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
  Rejected: "Từ chối",
};

function payoutQr(row) {
  const bank = VIETNAMESE_BANKS.find((item) => item.code === row.tutorBankCode);
  const amount = Math.round(Number(row.tutorShare) || 0);
  if (bank && row.tutorAccountNumber && amount > 0) {
    const info = encodeURIComponent(`TSG ${row.bookingId}`.slice(0, 25));
    const name = encodeURIComponent(row.tutorAccountName || "");
    return `https://img.vietqr.io/image/${bank.bin}-${row.tutorAccountNumber}-compact2.png?amount=${amount}&addInfo=${info}&accountName=${name}`;
  }
  return media(row.tutorQrCodeUrl);
}

const emptyQuestion = {
  testType: "Professional",
  subjectId: "",
  gradeLevel: "",
  content: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
  difficulty: "Medium",
  isActive: true,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const me = getUser();
  const isAdmin = (me?.role || "").toLowerCase() === "admin";
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [identity, setIdentity] = useState([]);
  const [idFilter, setIdFilter] = useState("pending");
  const [users, setUsers] = useState([]);
  const [userQ, setUserQ] = useState("");
  const [reports, setReports] = useState([]);
  const [reportsFilter, setReportsFilter] = useState("all");
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewQ, setReviewQ] = useState("");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [reviewRating, setReviewRating] = useState("all");
  const [reviewTutor, setReviewTutor] = useState("all");
  const [reviewOnlyReported, setReviewOnlyReported] = useState(false);
  const [tutorsOptions, setTutorsOptions] = useState([]);
  const [deleteReviewModal, setDeleteReviewModal] = useState(null);
  const [deleteReviewReason, setDeleteReviewReason] = useState("");
  const [questions, setQuestions] = useState([]);
  const [qType, setQType] = useState("");
  const [qForm, setQForm] = useState(emptyQuestion);
  const [editId, setEditId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [revenue, setRevenue] = useState(null);

  useEffect(() => {
    if (!isLoggedIn() || !isAdmin) {
      navigate("/login");
    }
  }, [isAdmin, navigate]);

  const loadTab = async () => {
    setError("");
    if (tab === "overview") setMetrics(await adminApi.metrics());
    if (tab === "identity") setIdentity(await adminApi.identity(idFilter));
    if (tab === "users") setUsers(await adminApi.users(userQ));
    if (tab === "reports") setReports(await adminApi.reports("Pending"));
    if (tab === "reviews") {
      setReviewsList(await adminApi.reviews({
        search: reviewQ.trim() || undefined,
        status: reviewStatus !== "all" ? reviewStatus : undefined,
        onlyReported: reviewOnlyReported ? true : undefined,
        rating: reviewRating !== "all" ? Number(reviewRating) : undefined,
        tutorId: reviewTutor !== "all" ? Number(reviewTutor) : undefined,
      }));
    }
    if (tab === "questions") {
      setQuestions(await adminApi.questions(qType || undefined));
      setSubjects(await getSubjects().catch(() => []));
    }
    if (tab === "settings") setSettings(await adminApi.settings());
    if (tab === "revenue") setRevenue(await adminApi.revenue());
    if (tab === "payouts") setPayouts(await adminApi.payouts());
  };

  useEffect(() => {
    if (!isAdmin) return;
    setInfo("");
    loadTab().catch((e) => setError(e.response?.data?.message || "Không tải được dữ liệu admin."));
  }, [tab, idFilter, qType, reviewStatus, reviewRating, reviewTutor, reviewOnlyReported, isAdmin]);

  useEffect(() => {
    if (reviewsList.length > 0) {
      setTutorsOptions((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        for (const r of reviewsList) {
          if (!map.has(r.tutorId)) {
            map.set(r.tutorId, {
              id: r.tutorId,
              name: r.tutorName || `Gia sư #${r.tutorId}`,
              email: r.tutorEmail,
            });
          }
        }
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
    }
  }, [reviewsList]);

  const displayedReviews = useMemo(() => {
    return reviewsList.filter((rev) => {
      if (reviewRating !== "all" && rev.rating !== Number(reviewRating)) return false;
      if (reviewTutor !== "all" && String(rev.tutorId) !== String(reviewTutor)) return false;
      return true;
    });
  }, [reviewsList, reviewRating, reviewTutor]);

  useEffect(() => {
    if (!info) return undefined;
    const timer = setTimeout(() => setInfo(""), 3500);
    return () => clearTimeout(timer);
  }, [info]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      setInfo(res?.message || "Đã lưu.");
      await loadTab();
    } catch (e) {
      setError(e.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const cards = useMemo(() => {
    if (!metrics) return [];
    const thisMonth = (metrics.monthlyGrowth || []).at(-1);
    return [
      ["Người dùng", metrics.totalUsers],
      ["Gia sư", metrics.totalTutors],
      ["Học viên", metrics.totalStudents],
      ["Gia sư mới tháng này", thisMonth?.tutors ?? 0],
      ["Học viên mới tháng này", thisMonth?.students ?? 0],
      ["Đã khóa", metrics.bannedUsers],
      ["CCCD chờ", metrics.pendingIdentity],
      ["AI thấp tin cậy", metrics.lowConfidenceFaces],
      ["Báo cáo chờ", metrics.pendingReports],
      ["Booking", metrics.bookings],
      ["Thanh toán OK", metrics.paidPayments],
      ["Bài test đạt", metrics.testsPassed],
    ];
  }, [metrics]);

  return (
    <div className="min-h-screen bg-surface">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Chỉ số hệ thống, duyệt CCCD, khóa tài khoản, báo cáo, câu hỏi, phí/chính sách.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium ${
                  tab === t.id ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        {info && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{info}</div>}

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {cards.map(([k, v]) => (
                <div key={k} className="bg-white rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs text-slate-500">{k}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{v}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-900">Tăng trưởng theo tháng (12 tháng gần nhất)</h2>
              <p className="text-xs text-slate-500 mt-1">Số tài khoản mới đăng ký theo vai trò và số booking tạo trong tháng.</p>
              {(() => {
                const rows = metrics?.monthlyGrowth || [];
                const maxBar = Math.max(1, ...rows.map((m) => Math.max(m.tutors || 0, m.students || 0, m.parents || 0, m.bookings || 0)));
                return (
                  <>
                    <div className="mt-4 overflow-x-auto">
                      <div className="flex items-end gap-3 min-w-[640px] h-40">
                        {rows.map((m) => (
                          <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end justify-center gap-0.5 h-28">
                              <div className="w-1/4 bg-brand-600 rounded-t" style={{ height: `${((m.tutors || 0) / maxBar) * 100}%` }} title={`Gia sư ${m.tutors}`} />
                              <div className="w-1/4 bg-sky-400 rounded-t" style={{ height: `${((m.students || 0) / maxBar) * 100}%` }} title={`Học viên ${m.students}`} />
                              <div className="w-1/4 bg-violet-400 rounded-t" style={{ height: `${((m.parents || 0) / maxBar) * 100}%` }} title={`Phụ huynh ${m.parents}`} />
                              <div className="w-1/4 bg-amber-400 rounded-t" style={{ height: `${((m.bookings || 0) / maxBar) * 100}%` }} title={`Booking ${m.bookings}`} />
                            </div>
                            <span className="text-[10px] text-slate-500">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-brand-600 inline-block" /> Gia sư mới</span>
                      <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-sky-400 inline-block" /> Học viên mới</span>
                      <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-violet-400 inline-block" /> Phụ huynh mới</span>
                      <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-amber-400 inline-block" /> Booking</span>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-slate-500 border-b">
                          <tr>
                            <th className="py-2">Tháng</th>
                            <th>Gia sư mới</th>
                            <th>Học viên mới</th>
                            <th>Phụ huynh mới</th>
                            <th>Tổng user mới</th>
                            <th>Booking</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((m) => (
                            <tr key={m.label} className="border-b border-slate-50">
                              <td className="py-2 font-medium">{m.label}</td>
                              <td>{m.tutors}</td>
                              <td>{m.students}</td>
                              <td>{m.parents}</td>
                              <td>{m.total}</td>
                              <td>{m.bookings}</td>
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr><td colSpan={6} className="py-3 text-slate-500">Chưa có dữ liệu.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-900">Gia sư được booking nhiều nhất</h2>
              <p className="text-xs text-slate-500 mt-1">Top 10 theo tổng số lượt đặt lịch (mọi trạng thái).</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-slate-500 border-b">
                    <tr>
                      <th className="py-2">#</th>
                      <th>Gia sư</th>
                      <th>Email</th>
                      <th>Tổng booking</th>
                      <th>Hoàn thành</th>
                      <th>Hủy / từ chối</th>
                      <th>Doanh thu (confirmed/completed)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics?.topBookedTutors || []).map((t, i) => (
                      <tr key={t.tutorId} className="border-b border-slate-50">
                        <td className="py-2">{i + 1}</td>
                        <td className="font-medium">{t.fullName}</td>
                        <td className="text-slate-500">{t.email}</td>
                        <td>{t.bookingCount}</td>
                        <td>{t.completedCount}</td>
                        <td>{t.cancelledCount}</td>
                        <td>{Number(t.revenue || 0).toLocaleString("vi-VN")} đ</td>
                      </tr>
                    ))}
                    {(!metrics?.topBookedTutors || metrics.topBookedTutors.length === 0) && (
                      <tr><td colSpan={7} className="py-3 text-slate-500">Chưa có booking.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "identity" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                ["pending", "Chờ duyệt"],
                ["low", "AI thấp tin cậy"],
                ["verified", "Đã duyệt"],
                ["", "Tất cả"],
              ].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setIdFilter(v)} className={`h-8 px-3 rounded-lg text-xs ${idFilter === v ? "bg-brand-600 text-white" : "bg-white border"}`}>
                  {l}
                </button>
              ))}
            </div>
            {identity.map((c) => {
              const st = (c.status || "").toLowerCase();
              const done = st === "approved" || st === "verified";
              const rejected = st === "rejected";
              const expired = st === "expired";
              const pending = st === "pending";
              return (
              <div key={c.documentId} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.tutorName} · {c.tutorEmail}</p>
                    <p className="text-xs text-slate-500">
                      CCCD: {done ? "Đã duyệt" : rejected ? "Đã từ chối" : expired ? "Hết 24 giờ, ảnh đã xóa" : "Chờ duyệt"} · Hồ sơ: {c.profileVerification}
                      {pending && c.lowConfidence ? " · Dưới 85% — cần admin so chiếu" : ""}
                      {done && c.faceMatch ? " · ≥ 85% auto duyệt" : ""}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      OCR: {c.ocrName || "—"} / {c.ocrIdNumber || "—"} · Face {c.faceStatus || "—"}{" "}
                      {c.faceScore != null ? `(${Number(c.faceScore) <= 1 ? (Number(c.faceScore) * 100).toFixed(1) : Number(c.faceScore).toFixed(1)}%)` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {done && (
                      <span className="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs inline-flex items-center gap-1 border border-emerald-100">
                        <Check size={14} /> Đã duyệt
                      </span>
                    )}
                    {rejected && (
                      <span className="h-8 px-3 rounded-lg bg-red-50 text-red-700 text-xs inline-flex items-center gap-1 border border-red-100">
                        <X size={14} /> Đã từ chối
                      </span>
                    )}
                    {pending && (
                      <>
                        <button disabled={busy} type="button" onClick={() => run(() => adminApi.reviewIdentity(c.documentId, { approve: true }))} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs inline-flex items-center gap-1">
                          <Check size={14} /> Duyệt
                        </button>
                        <button disabled={busy} type="button" onClick={() => run(() => adminApi.reviewIdentity(c.documentId, { approve: false, reason: "Admin từ chối sau rà soát" }))} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs inline-flex items-center gap-1">
                          <X size={14} /> Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {c.imagesAvailable ? (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-800">
                      Ảnh chỉ giữ tạm đến {c.holdExpiresAt ? new Date(c.holdExpiresAt).toLocaleString("vi-VN") : "24 giờ"}. Duyệt hoặc từ chối xong, ảnh bị xóa ngay.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {c.hasFront && <HoldImage id={c.documentId} side="front" label="Ảnh căn cước" />}
                      {c.hasSelfie && <HoldImage id={c.documentId} side="selfie" label="Ảnh người" />}
                      {c.hasBack && <HoldImage id={c.documentId} side="back" label="CCCD mặt sau" />}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Ảnh CCCD đã bị xóa, không còn xem được.</p>
                )}
                {c.tests?.length > 0 && (
                  <p className="text-xs text-slate-600">
                    Điểm test: {c.tests.map((t) => `${t.subjectName}${t.gradeLevel ? " " + t.gradeLevel : ""} ${t.scorePercent}%${t.isPassed ? " đạt" : ""}`).join(" · ")}
                  </p>
                )}
              </div>
            );
            })}
            {identity.length === 0 && <p className="text-sm text-slate-500">Không có hồ sơ.</p>}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => adminApi.users(userQ).then((d) => { setUsers(d); return { message: "Đã lọc." }; }));
              }}
              className="flex gap-2"
            >
              <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Tìm email / tên" className="h-10 flex-1 rounded-lg border px-3 text-sm" />
              <button type="submit" className="h-10 px-4 rounded-lg bg-brand-600 text-white text-sm">Tìm</button>
            </form>
            <div className="bg-white rounded-2xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.userId} className="border-t">
                      <td className="p-3">
                        <p className="font-medium">{u.fullName}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{u.status}</td>
                      <td className="p-3 text-right">
                        {u.role !== "Admin" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => adminApi.ban(u.userId, u.status !== "Banned", "Admin dashboard"))}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border text-xs"
                          >
                            <Ban size={12} /> {u.status === "Banned" ? "Mở khóa" : "Khóa"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-4">
            {/* Thanh lọc loại báo cáo */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setReportsFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  reportsFilter === "all" ? "bg-slate-900 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
                }`}
              >
                Tất cả ({reports.length})
              </button>
              <button
                type="button"
                onClick={() => setReportsFilter("Review")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  reportsFilter === "Review" ? "bg-amber-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
                }`}
              >
                📝 Báo cáo Đánh giá ({reports.filter((r) => r.entityType === "Review").length})
              </button>
              <button
                type="button"
                onClick={() => setReportsFilter("Student")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  reportsFilter === "Student" ? "bg-blue-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
                }`}
              >
                🎓 Báo cáo Học viên ({reports.filter((r) => r.entityType === "Student" || r.reportedRole === "Student").length})
              </button>
              <button
                type="button"
                onClick={() => setReportsFilter("Tutor")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  reportsFilter === "Tutor" ? "bg-purple-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
                }`}
              >
                👨‍🏫 Báo cáo Gia sư ({reports.filter((r) => r.entityType === "Tutor" || r.reportedRole === "Tutor").length})
              </button>
            </div>

            {/* Danh sách các báo cáo */}
            {reports
              .filter((r) => {
                if (reportsFilter === "Review") return r.entityType === "Review";
                if (reportsFilter === "Student") return r.entityType === "Student" || r.reportedRole === "Student";
                if (reportsFilter === "Tutor") return r.entityType === "Tutor" || r.reportedRole === "Tutor";
                return true;
              })
              .map((r) => {
                const isReview = r.entityType === "Review";
                const isStudent = r.entityType === "Student" || r.reportedRole === "Student";

                return (
                  <div key={r.reportId} className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            isReview
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : isStudent
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }`}
                        >
                          {isReview ? "📝 Báo cáo Đánh giá sai sự thật" : isStudent ? "🎓 Báo cáo Học viên vi phạm" : "👨‍🏫 Báo cáo Gia sư"}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">#{r.reportId}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-xs mb-3">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Người gửi báo cáo:
                        </span>
                        <p className="font-bold text-slate-900 text-sm">{r.reporterName}</p>
                        <p className="text-slate-500">{r.reporterEmail}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Đối tượng bị khiếu nại:
                        </span>
                        <p className="font-bold text-slate-900 text-sm">
                          {r.reportedName || `${r.entityType} #${r.entityId}`}
                          {r.reportedRole ? ` (${ROLE_LABELS[r.reportedRole] || r.reportedRole})` : ""}
                        </p>
                        {r.reportedEmail && <p className="text-slate-500">{r.reportedEmail}</p>}
                      </div>
                    </div>

                    {/* Lý do báo cáo */}
                    <div className="mb-2">
                      <span className="font-bold text-xs text-slate-700">Lý do: </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                        {REPORT_REASONS[r.reason] || r.reason}
                      </span>
                    </div>

                    {/* Nội dung đánh giá / bài viết bị khiếu nại */}
                    {r.contentSnippet && (
                      <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/80 mb-3 text-xs">
                        <span className="font-bold text-amber-900 block mb-1">Nội dung đánh giá đang bị khiếu nại:</span>
                        <p className="text-slate-800 italic">{r.contentSnippet}</p>
                      </div>
                    )}

                    {/* Mô tả sự việc */}
                    {r.description && (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 mb-3 text-xs">
                        <span className="font-bold text-slate-700 block mb-1">Mô tả sự việc từ người báo cáo:</span>
                        <p className="text-slate-800 leading-relaxed">{r.description}</p>
                      </div>
                    )}

                    {/* Bằng chứng xác thực */}
                    {r.evidence && (() => {
                      const isRelative = r.evidence.startsWith("/");
                      const isUrl = r.evidence.startsWith("http://") || r.evidence.startsWith("https://") || isRelative;
                      const fullUrl = isRelative ? `${API_ORIGIN}${r.evidence}` : r.evidence;
                      const lower = r.evidence.toLowerCase();
                      const isImg = lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".bmp");
                      const isDoc = lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".doc") || lower.endsWith(".xlsx") || lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".mp4");

                      return (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 mb-4 text-xs space-y-2">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <Check size={14} className="text-emerald-600" />
                            Bằng chứng xác thực đính kèm:
                          </span>

                          {isImg ? (
                            <div className="space-y-1.5 pt-1">
                              <a href={fullUrl} target="_blank" rel="noreferrer" className="block w-fit group">
                                <img
                                  src={fullUrl}
                                  alt="Bằng chứng"
                                  className="max-h-56 max-w-full rounded-xl object-contain border border-emerald-300 bg-white group-hover:opacity-90 transition shadow-2xs"
                                />
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 group-hover:text-emerald-900 font-bold underline mt-1.5">
                                  <ExternalLink size={11} /> Nhấn để xem ảnh gốc kích thước đầy đủ
                                </span>
                              </a>
                            </div>
                          ) : isDoc ? (
                            <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-emerald-200">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <FileText size={16} />
                              </div>
                              <span className="font-mono text-[11px] text-slate-800 truncate flex-1">{r.evidence.split("/").pop()}</span>
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shrink-0"
                              >
                                <ExternalLink size={11} /> Xem / Tải về
                              </a>
                            </div>
                          ) : isUrl ? (
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline"
                            >
                              <ExternalLink size={12} />
                              Mở liên kết tài liệu / bằng chứng ngoài
                            </a>
                          ) : (
                            <p className="text-slate-700 leading-relaxed font-mono text-[11px] bg-white p-2 rounded-xl border border-emerald-100">
                              {r.evidence}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Nút hành động giải quyết báo cáo */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                      {isReview ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                adminApi.resolveReport(r.reportId, {
                                  action: "DeleteReview",
                                  note: "Xóa đánh giá sai sự thật sau khi kiểm tra bằng chứng",
                                })
                              )
                            }
                            className="h-8 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                          >
                            <Trash2 size={13} />
                            Xóa đánh giá này
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                adminApi.resolveReport(r.reportId, {
                                  action: "Warn",
                                  note: "Cảnh cáo học viên viết đánh giá sai lệch",
                                })
                              )
                            }
                            className="h-8 px-3 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-xs"
                          >
                            Cảnh cáo học viên
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                adminApi.resolveReport(r.reportId, {
                                  action: "Warn",
                                  note: `Cảnh cáo vi phạm theo báo cáo #${r.reportId}`,
                                })
                              )
                            }
                            className="h-8 px-3 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-xs"
                          >
                            Cảnh cáo {isStudent ? "học viên" : "người dùng"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                adminApi.resolveReport(r.reportId, {
                                  action: "Ban",
                                  note: `Khóa tài khoản theo báo cáo #${r.reportId}`,
                                })
                              )
                            }
                            className="h-8 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                          >
                            <Ban size={13} />
                            Khóa tài khoản
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            adminApi.resolveReport(r.reportId, {
                              action: "Dismiss",
                              note: "Bác bỏ - Bằng chứng chưa đủ căn cứ vi phạm",
                            })
                          )
                        }
                        className="h-8 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs ml-auto"
                      >
                        Bác bỏ báo cáo
                      </button>
                    </div>
                  </div>
                );
              })}

            {reports.length === 0 && (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 text-sm">
                Hiện không có báo cáo nào đang chờ xử lý.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: QUẢN LÝ ĐÁNH GIÁ (REVIEWS) */}
        {tab === "reviews" && (
          <div className="space-y-4">
            {/* Header Thống kê Đánh giá */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border p-4 shadow-2xs">
                <span className="text-xs text-slate-400 font-semibold uppercase">Tổng đánh giá</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{reviewsList.length}</p>
              </div>
              <div className="bg-white rounded-2xl border p-4 shadow-2xs">
                <span className="text-xs text-emerald-600 font-semibold uppercase">Đang hiển thị</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {reviewsList.filter((r) => !r.isHidden).length}
                </p>
              </div>
              <div className="bg-white rounded-2xl border p-4 shadow-2xs">
                <span className="text-xs text-red-500 font-semibold uppercase">Đã xóa / Ẩn</span>
                <p className="text-2xl font-black text-red-600 mt-1">
                  {reviewsList.filter((r) => r.isHidden).length}
                </p>
              </div>
              <div className="bg-white rounded-2xl border p-4 shadow-2xs">
                <span className="text-xs text-amber-600 font-semibold uppercase">Có khiếu nại từ gia sư</span>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {reviewsList.filter((r) => r.reportCount > 0).length}
                </p>
              </div>
            </div>

            {/* Thanh tìm kiếm & bộ lọc đánh giá */}
            <div className="bg-white rounded-2xl border p-4 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                {/* Tìm kiếm từ khóa */}
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo nội dung, tên gia sư, học viên..."
                    value={reviewQ}
                    onChange={(e) => setReviewQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadTab()}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Lọc theo Giáo viên / Gia sư */}
                <select
                  value={reviewTutor}
                  onChange={(e) => setReviewTutor(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white max-w-full md:max-w-[210px]"
                >
                  <option value="all">👨‍🏫 Tất cả giáo viên</option>
                  {tutorsOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {/* Lọc theo Số sao */}
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="all">⭐ Tất cả số sao</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 sao</option>
                  <option value="4">⭐⭐⭐⭐ 4 sao</option>
                  <option value="3">⭐⭐⭐ 3 sao</option>
                  <option value="2">⭐⭐ 2 sao</option>
                  <option value="1">⭐ 1 sao</option>
                </select>

                {/* Lọc theo Trạng thái */}
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="visible">Đang hiển thị</option>
                  <option value="hidden">Đã ẩn / Đã xóa</option>
                </select>

                <button
                  type="button"
                  onClick={loadTab}
                  className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Search size={14} />
                  Tìm
                </button>

                {(reviewQ || reviewStatus !== "all" || reviewRating !== "all" || reviewTutor !== "all" || reviewOnlyReported) && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewQ("");
                      setReviewStatus("all");
                      setReviewRating("all");
                      setReviewTutor("all");
                      setReviewOnlyReported(false);
                    }}
                    className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition shrink-0"
                    title="Đặt lại tất cả bộ lọc"
                  >
                    Đặt lại
                  </button>
                )}
              </div>

              {/* Dòng bổ trợ: Nút chọn nhanh sao & Checkbox khiếu nại */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
                  <span className="text-slate-400 font-semibold text-[11px] mr-1 shrink-0">Lọc nhanh sao:</span>
                  {[
                    { label: "Tất cả", val: "all" },
                    { label: "5 ★", val: "5", count: reviewsList.filter((r) => r.rating === 5).length },
                    { label: "4 ★", val: "4", count: reviewsList.filter((r) => r.rating === 4).length },
                    { label: "3 ★", val: "3", count: reviewsList.filter((r) => r.rating === 3).length },
                    { label: "2 ★", val: "2", count: reviewsList.filter((r) => r.rating === 2).length },
                    { label: "1 ★", val: "1", count: reviewsList.filter((r) => r.rating === 1).length },
                  ].map((pill) => {
                    const active = reviewRating === pill.val;
                    return (
                      <button
                        key={pill.val}
                        type="button"
                        onClick={() => setReviewRating(pill.val)}
                        className={`h-7 px-2.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shrink-0 ${
                          active
                            ? "bg-amber-500 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <span>{pill.label}</span>
                        {pill.count !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                              active ? "bg-white/25 text-white" : "bg-white text-slate-700 shadow-2xs"
                            }`}
                          >
                            {pill.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 shrink-0">
                  <input
                    type="checkbox"
                    checked={reviewOnlyReported}
                    onChange={(e) => setReviewOnlyReported(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>Chỉ xem các đánh giá có khiếu nại / báo cáo từ gia sư</span>
                </label>
              </div>
            </div>

            {/* Bảng danh sách đánh giá */}
            <div className="bg-white rounded-2xl border overflow-x-auto shadow-2xs">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Gia sư</th>
                    <th className="p-3">Học viên</th>
                    <th className="p-3">Số sao</th>
                    <th className="p-3">Nội dung đánh giá</th>
                    <th className="p-3">Khiếu nại</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedReviews.map((rev) => (
                    <tr key={rev.reviewId} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-mono font-bold text-slate-400">#{rev.reviewId}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setReviewTutor(String(rev.tutorId))}
                          className="text-left group"
                          title="Click để chỉ lọc đánh giá của gia sư này"
                        >
                          <p className="font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-1">
                            {rev.tutorName}
                            {reviewTutor === String(rev.tutorId) && (
                              <span className="text-[10px] text-brand-600 font-normal">(đang lọc)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{rev.tutorEmail}</p>
                        </button>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{rev.studentName}</p>
                        <p className="text-[11px] text-slate-400">{rev.studentEmail}</p>
                      </td>
                      <td className="p-3">
                        <span className="font-black text-amber-500 text-sm">
                          {"★".repeat(rev.rating)}
                        </span>
                        <span className="text-slate-300">{"☆".repeat(Math.max(0, 5 - rev.rating))}</span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="text-slate-800 line-clamp-2">{rev.comment || "Không có nhận xét văn bản"}</p>
                        {rev.tutorReply && (
                          <p className="text-[11px] text-brand-700 bg-brand-50/60 rounded-md p-1 mt-1 line-clamp-1">
                            ↳ Gia sư: {rev.tutorReply}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(rev.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </td>
                      <td className="p-3">
                        {rev.reportCount > 0 ? (
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-1">
                              <Flag size={10} /> {rev.reportCount} khiếu nại
                            </span>
                            {rev.latestReportReason && (
                              <p className="text-[10px] text-slate-500 mt-1 max-w-[140px] truncate" title={rev.latestReportReason}>
                                {REPORT_REASONS[rev.latestReportReason] || rev.latestReportReason}
                              </p>
                            )}
                            {rev.latestReportEvidence && (() => {
                              const isRel = rev.latestReportEvidence.startsWith("/");
                              const full = isRel ? `${API_ORIGIN}${rev.latestReportEvidence}` : rev.latestReportEvidence;
                              return (
                                <a
                                  href={full}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline mt-0.5"
                                >
                                  <Paperclip size={10} /> Xem bằng chứng
                                </a>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Bình thường</span>
                        )}
                      </td>
                      <td className="p-3">
                        {rev.isHidden ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Đã ẩn / Đã xóa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Hiển thị
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {!rev.isHidden ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteReviewModal(rev);
                              setDeleteReviewReason("Đánh giá sai sự thật / Bịa đặt");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition"
                            title="Xóa đánh giá khỏi trang gia sư"
                          >
                            <Trash2 size={12} />
                            Xóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                const res = await adminApi.restoreReview(rev.reviewId);
                                setReviewsList(
                                  await adminApi.reviews({
                                    search: reviewQ.trim() || undefined,
                                    status: reviewStatus !== "all" ? reviewStatus : undefined,
                                    onlyReported: reviewOnlyReported ? true : undefined,
                                    rating: reviewRating !== "all" ? Number(reviewRating) : undefined,
                                    tutorId: reviewTutor !== "all" ? Number(reviewTutor) : undefined,
                                  })
                                );
                                return res;
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition"
                          >
                            <RotateCcw size={12} />
                            Khôi phục
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedReviews.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Không tìm thấy đánh giá nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal xác nhận xóa đánh giá */}
            {deleteReviewModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                <div className="bg-white rounded-3xl max-w-md w-full border p-6 shadow-2xl relative space-y-4">
                  <button
                    type="button"
                    onClick={() => setDeleteReviewModal(null)}
                    className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>

                  <div className="flex items-center gap-2.5 text-red-600">
                    <Trash2 size={22} />
                    <h3 className="font-bold text-slate-900 text-base">Xóa đánh giá khỏi hồ sơ gia sư</h3>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Đánh giá này sẽ bị ẩn khỏi hồ sơ gia sư và hệ thống sẽ tự động tính toán lại điểm đánh giá trung bình.
                  </p>

                  <div className="p-3 rounded-2xl bg-slate-50 border text-xs space-y-1">
                    <p><span className="font-bold text-slate-700">Gia sư: </span>{deleteReviewModal.tutorName}</p>
                    <p><span className="font-bold text-slate-700">Học viên: </span>{deleteReviewModal.studentName}</p>
                    <p><span className="font-bold text-slate-700">Đánh giá: </span>{deleteReviewModal.rating} sao</p>
                    <p><span className="font-bold text-slate-700">Nhận xét: </span>"{deleteReviewModal.comment}"</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lý do xóa đánh giá <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={deleteReviewReason}
                      onChange={(e) => setDeleteReviewReason(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                    >
                      <option value="Đánh giá sai sự thật / Bịa đặt">Đánh giá sai sự thật / Bịa đặt</option>
                      <option value="Bôi nhọ danh dự / Xúc phạm gia sư">Bôi nhọ danh dự / Xúc phạm gia sư</option>
                      <option value="Học viên chưa từng học hoặc nhầm ca">Học viên chưa từng học hoặc nhầm ca</option>
                      <option value="Tống tiền / Đe dọa đánh giá xấu">Tống tiền / Đe dọa đánh giá xấu</option>
                      <option value="Ngôn từ độc hại / Vi phạm quy tắc">Ngôn từ độc hại / Vi phạm quy tắc</option>
                      <option value="Khác">Lý do khác</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteReviewModal(null)}
                      className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const res = await adminApi.deleteReview(deleteReviewModal.reviewId, deleteReviewReason);
                          setDeleteReviewModal(null);
                          setReviewsList(
                            await adminApi.reviews({
                              search: reviewQ.trim() || undefined,
                              status: reviewStatus !== "all" ? reviewStatus : undefined,
                              onlyReported: reviewOnlyReported ? true : undefined,
                            })
                          );
                          return res;
                        })
                      }
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Xác nhận xóa đánh giá
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "questions" && (
          <div className="grid lg:grid-cols-2 gap-4">
            <form
              className="bg-white rounded-2xl border p-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const body = {
                  ...qForm,
                  subjectId: qForm.subjectId ? Number(qForm.subjectId) : null,
                };
                run(async () => {
                  const res = editId ? await adminApi.updateQuestion(editId, body) : await adminApi.createQuestion(body);
                  setQForm(emptyQuestion);
                  setEditId(null);
                  return res;
                });
              }}
            >
              <p className="font-semibold">{editId ? "Sửa câu hỏi" : "Thêm câu hỏi"}</p>
              <select className="w-full h-10 border rounded-lg px-2 text-sm" value={qForm.testType} onChange={(e) => setQForm({ ...qForm, testType: e.target.value })}>
                <option value="Professional">Chuyên môn</option>
                <option value="Safety">An toàn</option>
              </select>
              {qForm.testType !== "Safety" && (
                <select className="w-full h-10 border rounded-lg px-2 text-sm" value={qForm.subjectId} onChange={(e) => setQForm({ ...qForm, subjectId: e.target.value })}>
                  <option value="">Môn</option>
                  {subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                  ))}
                </select>
              )}
              <input className="w-full h-10 border rounded-lg px-3 text-sm" placeholder="Khối/lớp" value={qForm.gradeLevel} onChange={(e) => setQForm({ ...qForm, gradeLevel: e.target.value })} />
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Nội dung" value={qForm.content} onChange={(e) => setQForm({ ...qForm, content: e.target.value })} />
              {["A", "B", "C", "D"].map((k) => (
                <input key={k} className="w-full h-9 border rounded-lg px-3 text-sm" placeholder={`Đáp án ${k}`} value={qForm[`option${k}`]} onChange={(e) => setQForm({ ...qForm, [`option${k}`]: e.target.value })} />
              ))}
              <select className="w-full h-10 border rounded-lg px-2 text-sm" value={qForm.correctAnswer} onChange={(e) => setQForm({ ...qForm, correctAnswer: e.target.value })}>
                {["A", "B", "C", "D"].map((k) => <option key={k}>{k}</option>)}
              </select>
              <button disabled={busy} className="h-10 px-4 rounded-lg bg-brand-600 text-white text-sm">{busy ? <Loader2 className="animate-spin" size={16} /> : "Lưu"}</button>
            </form>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => setQType("")} className={`h-8 px-3 text-xs rounded-lg ${!qType ? "bg-brand-600 text-white" : "border bg-white"}`}>Tất cả</button>
                <button type="button" onClick={() => setQType("Professional")} className={`h-8 px-3 text-xs rounded-lg ${qType === "Professional" ? "bg-brand-600 text-white" : "border bg-white"}`}>Chuyên môn</button>
                <button type="button" onClick={() => setQType("Safety")} className={`h-8 px-3 text-xs rounded-lg ${qType === "Safety" ? "bg-brand-600 text-white" : "border bg-white"}`}>An toàn</button>
              </div>
              {questions.map((q) => (
                <div key={q.questionId} className="bg-white border rounded-xl p-3 text-sm">
                  <p className="font-medium">{q.content}</p>
                  <p className="text-xs text-slate-500 mt-1">{q.testType} · {q.subjectName || "—"} · {q.gradeLevel || "—"} · {q.isActive ? "Hiện" : "Ẩn"}</p>
                  <div className="flex gap-2 mt-2">
                    <button type="button" className="text-xs text-brand-700" onClick={() => { setEditId(q.questionId); setQForm({ ...q, subjectId: q.subjectId || "" }); }}>Sửa</button>
                    <button type="button" className="text-xs" onClick={() => run(() => adminApi.toggleQuestion(q.questionId))}>{q.isActive ? "Ẩn" : "Hiện"}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "revenue" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Doanh số là tổng học phí booking đã thanh toán. Sau khi trừ tiền hoàn, phần còn lại chia 20% cho web và 80% cho gia sư. Cột chuyển khoản là số tiền gia sư thực nhận.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="bg-white rounded-2xl border p-4">
                <p className="text-xs text-slate-500">Doanh số booking</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{vnd(revenue?.gross)}</p>
                <p className="text-xs text-slate-500 mt-1">{revenue?.bookingCount || 0} buổi đã thanh toán</p>
              </div>
              <div className="bg-white rounded-2xl border p-4">
                <p className="text-xs text-slate-500">Web thực nhận · 20%</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{vnd(revenue?.platformFee)}</p>
                <p className="text-xs text-slate-500 mt-1">Sau khi trừ {vnd(revenue?.refunded)} hoàn tiền</p>
              </div>
              <div className="bg-white rounded-2xl border p-4">
                <p className="text-xs text-slate-500">Gia sư thực nhận · 80%</p>
                <p className="mt-1 text-xl font-extrabold text-brand-700">{vnd(revenue?.tutorShare)}</p>
                <p className="text-xs text-slate-500 mt-1">Tổng số cần chuyển cho gia sư</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="p-3">Gia sư</th>
                    <th className="p-3">Doanh số</th>
                    <th className="p-3">Đã hoàn</th>
                    <th className="p-3">Web nhận</th>
                    <th className="p-3">Chuyển cho gia sư</th>
                    <th className="p-3">Tài khoản</th>
                  </tr>
                </thead>
                <tbody>
                  {(revenue?.tutors || []).map((row) => (
                    <tr key={row.tutorId} className="border-t">
                      <td className="p-3">
                        <p className="font-medium">{row.tutorName}</p>
                        <p className="text-xs text-slate-500">{row.bookings} buổi</p>
                      </td>
                      <td className="p-3">{vnd(row.gross)}</td>
                      <td className="p-3">{vnd(row.refunded)}</td>
                      <td className="p-3">{vnd(row.platformFee)}</td>
                      <td className="p-3 font-bold text-brand-700">{vnd(row.tutorShare)}</td>
                      <td className="p-3 text-xs text-slate-600">
                        {row.bankName && row.accountNumber
                          ? `${row.bankName} · ${row.accountNumber} · ${row.accountName}`
                          : "Chưa lưu số tài khoản"}
                      </td>
                    </tr>
                  ))}
                  {(revenue?.tutors || []).length === 0 && (
                    <tr><td className="p-4 text-slate-500" colSpan={6}>Chưa có booking đã thanh toán.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {(revenue?.months || []).length > 0 && (
              <div className="bg-white rounded-2xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="p-3">Tháng</th>
                      <th className="p-3">Buổi</th>
                      <th className="p-3">Doanh số</th>
                      <th className="p-3">Thực nhận</th>
                      <th className="p-3">Web</th>
                      <th className="p-3">Gia sư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.months.map((row) => (
                      <tr key={row.label} className="border-t">
                        <td className="p-3">{row.label}</td>
                        <td className="p-3">{row.bookings}</td>
                        <td className="p-3">{vnd(row.gross)}</td>
                        <td className="p-3">{vnd(row.net)}</td>
                        <td className="p-3">{vnd(row.platformFee)}</td>
                        <td className="p-3 font-medium">{vnd(row.tutorShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "payouts" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Mỗi buổi đã thu tiền có mã QR của gia sư và số tiền cần chuyển (sau khi trừ hoàn và 20% nền tảng). Bấm xác nhận khi đã chuyển xong, đơn được ghi hoàn thành.
            </p>
            {payouts.length === 0 ? (
              <div className="bg-white rounded-2xl border p-6 text-sm text-slate-500">Chưa có thanh toán thành công.</div>
            ) : payouts.map((row) => (
              <article key={row.paymentId} className="bg-white rounded-2xl border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">Buổi học #{row.bookingId} · {row.subjectName || "Môn học"}</p>
                    <p className="text-slate-500 mt-1">{row.studentName} thanh toán cho {row.tutorName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Chuyển cho gia sư</p>
                    <p className="font-extrabold text-brand-700">{vnd(row.tutorShare)}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <p>Học viên trả: <span className="font-bold">{vnd(row.amount)}</span></p>
                  <p>Đã hoàn: <span className="font-bold">{vnd(row.refunded)}</span></p>
                  <p>Khấu trừ web 20%: <span className="font-bold">{vnd(row.platformFee)}</span></p>
                  <p>Gia sư nhận: <span className="font-bold">{vnd(row.tutorShare)}</span></p>
                </div>
                <div className="mt-4 flex flex-wrap items-start gap-4">
                  {payoutQr(row) ? (
                    <img src={payoutQr(row)} alt="Mã QR của gia sư" className="w-44 rounded-xl border bg-white" />
                  ) : (
                    <p className="text-sm text-amber-700">Gia sư chưa lưu QR hoặc số tài khoản.</p>
                  )}
                  <div>
                    <p className="text-xs text-slate-500">Số tiền cần chuyển</p>
                    <p className="text-2xl font-extrabold text-brand-700">{vnd(row.tutorShare)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Trạng thái đơn: {BOOKING_STATUS[row.bookingStatus] || row.bookingStatus || "—"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {row.tutorBankName && row.tutorAccountNumber
                        ? `${row.tutorBankName} · ${row.tutorAccountNumber} · ${row.tutorAccountName}`
                        : "Gia sư chưa lưu số tài khoản."}
                    </p>
                    {row.tutorPaidAt ? (
                      <p className="mt-3 text-sm font-semibold text-emerald-700">
                        Đã chuyển · đơn hoàn thành · {new Date(row.tutorPaidAt).toLocaleString("vi-VN")}
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || Number(row.tutorShare) <= 0}
                        onClick={() => run(() => adminApi.confirmPayout(row.paymentId))}
                        className="mt-3 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Xác nhận đã chuyển
                      </button>
                    )}
                  </div>
                </div>
                {(row.refunds || []).map((refund) => (
                  <p key={refund.refundId} className="mt-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-amber-900">
                    Hoàn {Number(refund.amount || 0).toLocaleString("vi-VN")} ₫ ({refund.refundPercent}%).
                    {" "}Tài khoản học viên: {refund.studentBankName && refund.studentAccountNumber
                      ? `${refund.studentBankName} · ${refund.studentAccountNumber} · ${refund.studentAccountName}`
                      : "Học viên chưa lưu số tài khoản."}
                  </p>
                ))}
              </article>
            ))}
          </div>
        )}

        {tab === "settings" && (
          <form
            className="bg-white rounded-2xl border p-6 space-y-3 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => adminApi.saveSettings(settings));
            }}
          >
            {settings.map((s, i) => (
              <label key={s.key} className="block text-sm">
                <span className="font-medium">{s.description || s.key}</span>
                <input
                  className="mt-1 w-full h-10 border rounded-lg px-3"
                  value={s.value}
                  onChange={(e) => {
                    const next = [...settings];
                    next[i] = { ...s, value: e.target.value };
                    setSettings(next);
                  }}
                />
              </label>
            ))}
            <button disabled={busy} className="h-10 px-4 rounded-lg bg-brand-600 text-white text-sm">Lưu cấu hình</button>
          </form>
        )}
      </main>
    </div>
  );
}
