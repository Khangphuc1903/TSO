import { useEffect, useMemo, useState } from "react";
import { Ban, Check, ClipboardList, Flag, IdCard, LayoutDashboard, Loader2, Settings, Shield, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getUser, isLoggedIn } from "../auth";
import { adminApi } from "../api/admin";
import { getSubjects } from "../api/tutorSearch";
import { API_ORIGIN } from "../api/axiosClient";

const TABS = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "identity", label: "CCCD / AI", icon: IdCard },
  { id: "users", label: "Tài khoản", icon: Users },
  { id: "reports", label: "Báo cáo", icon: Flag },
  { id: "questions", label: "Ngân hàng câu hỏi", icon: ClipboardList },
  { id: "settings", label: "Cấu hình", icon: Settings },
];

function media(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_ORIGIN}${path}`;
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
  const [questions, setQuestions] = useState([]);
  const [qType, setQType] = useState("");
  const [qForm, setQForm] = useState(emptyQuestion);
  const [editId, setEditId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState([]);

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
    if (tab === "questions") {
      setQuestions(await adminApi.questions(qType || undefined));
      setSubjects(await getSubjects().catch(() => []));
    }
    if (tab === "settings") setSettings(await adminApi.settings());
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadTab().catch((e) => setError(e.response?.data?.message || "Không tải được dữ liệu admin."));
  }, [tab, idFilter, qType, isAdmin]);

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
      <Navbar />
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
              const done = st === "verified";
              const rejected = st === "rejected";
              const pending = !done && !rejected;
              return (
              <div key={c.documentId} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.tutorName} · {c.tutorEmail}</p>
                    <p className="text-xs text-slate-500">
                      CCCD: {done ? "Đã duyệt" : rejected ? "Đã từ chối" : (c.status || "Chờ duyệt")} · Hồ sơ: {c.profileVerification}
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
                <div className="grid sm:grid-cols-3 gap-3">
                  {c.frontUrl && (
                    <figure>
                      <figcaption className="text-[11px] text-slate-500 mb-1">CCCD mặt trước</figcaption>
                      <img src={media(c.frontUrl)} alt="front" className="h-40 w-full object-cover rounded-lg border" />
                    </figure>
                  )}
                  {c.backUrl && (
                    <figure>
                      <figcaption className="text-[11px] text-slate-500 mb-1">CCCD mặt sau</figcaption>
                      <img src={media(c.backUrl)} alt="back" className="h-40 w-full object-cover rounded-lg border" />
                    </figure>
                  )}
                  {c.selfieUrl && (
                    <figure>
                      <figcaption className="text-[11px] text-slate-500 mb-1">Ảnh chụp khuôn mặt</figcaption>
                      <img src={media(c.selfieUrl)} alt="selfie" className="h-40 w-full object-cover rounded-lg border" />
                    </figure>
                  )}
                </div>
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
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.reportId} className="bg-white rounded-2xl border p-4">
                <p className="font-semibold text-sm">{r.reason} · {r.entityType} #{r.entityId}</p>
                <p className="text-xs text-slate-500">{r.reporterName} ({r.reporterEmail}) · {new Date(r.createdAt).toLocaleString("vi-VN")}</p>
                <p className="text-sm mt-2">{r.description}</p>
                <div className="flex gap-2 mt-3">
                  <button type="button" disabled={busy} onClick={() => run(() => adminApi.resolveReport(r.reportId, { action: "Dismiss", note: "Không vi phạm" }))} className="h-8 px-3 rounded-lg border text-xs">Bỏ qua</button>
                  <button type="button" disabled={busy} onClick={() => run(() => adminApi.resolveReport(r.reportId, { action: "Warn", note: "Cảnh cáo" }))} className="h-8 px-3 rounded-lg border text-xs">Cảnh cáo</button>
                  <button type="button" disabled={busy} onClick={() => run(() => adminApi.resolveReport(r.reportId, { action: "Ban", note: "Khóa theo báo cáo" }))} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs">Khóa user</button>
                </div>
              </div>
            ))}
            {reports.length === 0 && <p className="text-sm text-slate-500">Không có báo cáo chờ.</p>}
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
