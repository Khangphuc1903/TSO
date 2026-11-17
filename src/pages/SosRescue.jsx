import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Radio, Siren, Sparkles, Zap } from "lucide-react";
import { getUser, isLoggedIn, loginPath } from "../auth";
import { getSubjects } from "../api/tutorSearch";
import { createAppHub } from "../api/hub";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref, formatVnd } from "../utils/format";
import {
  claimSosRequest,
  createSosRequest,
  getMySosRequests,
  getOpenSosRequests,
  getSosConfig,
} from "../api/sos";

function statusLabel(status) {
  if (status === "Open") return "Đang chờ gia sư";
  if (status === "Claimed") return "Đã nhận";
  if (status === "Expired") return "Hết hạn";
  return status;
}

export default function SosRescue() {
  const navigate = useNavigate();
  const user = getUser();
  const isTutor = (user?.role || "").toLowerCase() === "tutor";
  const isStudent = (user?.role || "").toLowerCase() === "student";

  const [config, setConfig] = useState({ feeAmount: 25000, durationMinutes: 15 });
  const [subjects, setSubjects] = useState([]);
  const [mine, setMine] = useState([]);
  const [open, setOpen] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [form, setForm] = useState({ subjectId: "", questionNote: "", image: null });
  const preview = form.image ? URL.createObjectURL(form.image) : "";
  const hubRef = useRef(null);
  const fileRef = useRef(null);

  const loadStudent = async () => {
    const data = await getMySosRequests();
    setMine(Array.isArray(data) ? data : []);
  };
  const loadTutor = async () => {
    const list = await getOpenSosRequests();
    setOpen(Array.isArray(list) ? list : []);
    window.dispatchEvent(new Event("sos-updated"));
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate(loginPath("/sos"));
      return;
    }
    getSosConfig().then(setConfig).catch(() => {});
    getSubjects().then(setSubjects).catch(() => setSubjects([]));
    if (isStudent) loadStudent().catch(() => setError("Không tải được yêu cầu SOS."));
    if (isTutor) loadTutor().catch(() => setError("Chỉ gia sư đã xác thực và đang hoạt động mới nhận được SOS."));

    const hub = createAppHub();
    hubRef.current = hub;
    const refreshTutor = () => {
      if (isTutor) loadTutor().catch(() => {});
    };
    hub.on("SosRequestCreated", refreshTutor);
    hub.on("SosRequestClaimedByOther", refreshTutor);
    hub.on("SosRequestExpired", refreshTutor);
    hub.on("SosRequestClaimed", (payload) => {
      if (payload?.sessionId) navigate(`/sos/session/${payload.sessionId}`);
    });
    hub.on("SosSessionStarted", (payload) => {
      if (payload?.sessionId) navigate(`/sos/session/${payload.sessionId}`);
    });
    hub.on("SosRequestExpired", () => {
      if (isStudent) loadStudent().catch(() => {});
    });
    hub.start().catch(() => {});
    return () => {
      hub.stop();
    };
  }, [navigate, isStudent, isTutor]);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!form.subjectId || !form.image) {
      setError("Chọn môn và chụp/tải ảnh bài tập.");
      return;
    }
    setSaving(true);
    try {
      await createSosRequest({
        subjectId: Number(form.subjectId),
        questionNote: form.questionNote,
        image: form.image,
      });
      setInfo("Đã phát SOS tới gia sư đúng môn này. Gia sư môn khác không nhận tín hiệu.");
      setForm({ subjectId: form.subjectId, questionNote: "", image: null });
      await loadStudent();
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được SOS.");
    } finally {
      setSaving(false);
    }
  };

  const onClaim = async (requestId) => {
    if (claimingId) return;
    setClaimingId(requestId);
    setError("");
    try {
      const res = await claimSosRequest(requestId);
      if (res?.sessionId) navigate(`/sos/session/${res.sessionId}`);
      else await loadTutor();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.title || "Không nhận được đơn. Hãy thử lại.");
      loadTutor().catch(() => {});
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4C0519] via-[#0F294A] to-[#0D5C63] px-6 pb-14 pt-10 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-full mb-4">
            <Siren size={14} />
            Flash Micro-Tutoring
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold">Cứu viện bài tập 15 phút</h1>
          <p className="text-white/75 mt-3 max-w-2xl text-sm leading-relaxed">
            11 giờ đêm kẹt một câu? Chụp ảnh bài, bấm SOS. Chỉ gia sư đang dạy đúng môn đó nhận thanh báo.
            Hết 15 phút, học sinh đánh giá gia sư.
          </p>
          <div className="flex flex-wrap gap-4 mt-6 text-sm">
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
              <Zap size={14} /> Phí {formatVnd(config.feeAmount)}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
              <Clock size={14} /> {config.durationMinutes} phút
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
              <Radio size={14} /> Realtime AppHub
            </span>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 mt-8 pb-16 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">{error}</div>
        )}
        {info && (
          <div className="rounded-xl bg-verified-50 border border-verified-100 text-verified-700 text-sm px-4 py-3">
            {info}
          </div>
        )}

        {isStudent && (
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <form onSubmit={onCreate} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles size={16} className="text-rose-500" /> Gửi SOS
              </h2>
              <label className="block text-sm">
                <span className="text-slate-600">Môn học</span>
                <select
                  required
                  value={form.subjectId}
                  onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Chọn môn</option>
                  {subjects.map((s) => (
                    <option key={s.subjectId || s.id} value={s.subjectId || s.id}>
                      {s.subjectName || s.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="block text-sm">
                <span className="text-slate-600">Ảnh đề bài</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required={!form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.files?.[0] || null }))}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-700 hover:border-rose-200 hover:bg-rose-50"
                >
                  <span className="font-medium text-slate-900">Chọn ảnh</span>
                  <span className="truncate text-slate-500">{form.image?.name || "Chưa chọn tệp"}</span>
                </button>
              </div>
              {preview && <img src={preview} alt="" className="max-h-48 rounded-xl object-cover" />}
              <label className="block text-sm">
                <span className="text-slate-600">Ghi chú (không bắt buộc)</span>
                <textarea
                  rows={3}
                  value={form.questionNote}
                  onChange={(e) => setForm((f) => ({ ...f, questionNote: e.target.value }))}
                  placeholder="Mình kẹt bước này..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50"
              >
                {saving ? "Đang phát tín hiệu..." : `SOS Cứu viện · ${formatVnd(config.feeAmount)}`}
              </button>
            </form>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Yêu cầu của bạn</h2>
              <div className="space-y-3">
                {mine.length === 0 && <p className="text-sm text-slate-500">Chưa có SOS nào.</p>}
                {mine.map((r) => (
                  <div key={r.requestId} className="rounded-xl border border-slate-100 p-3 flex gap-3">
                    <img
                      src={fileHref(r.imageUrl, API_ORIGIN)}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover bg-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{r.subjectName}</p>
                      <p className="text-xs text-slate-500">{statusLabel(r.status)} · {formatVnd(r.feeAmount)}</p>
                      {r.sessionId && (
                        <Link to={`/sos/session/${r.sessionId}`} className="text-xs text-brand-600 font-medium">
                          Vào phòng 15 phút
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isTutor && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">Luôn sẵn sàng cứu viện</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Không cần bật thêm. Chỉ SOS đúng môn bạn đang dạy mới hiện ở đây.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-white" />
                Đang nhận SOS
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Đơn đang chờ</h2>
              {open.length === 0 && <p className="text-sm text-slate-500">Chưa có đơn SOS nào đang mở.</p>}
              <div className="grid sm:grid-cols-2 gap-4">
                {open.map((r) => (
                  <article key={r.requestId} className="rounded-xl border border-slate-100 overflow-hidden">
                    <img src={fileHref(r.imageUrl, API_ORIGIN)} alt="" className="h-40 w-full object-cover bg-slate-100" />
                    <div className="p-3">
                      <p className="font-medium text-slate-900">{r.subjectName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.questionNote || "Không có ghi chú"}</p>
                      <p className="text-sm font-semibold text-rose-600 mt-2">{formatVnd(r.feeAmount)}</p>
                      <button
                        type="button"
                        onClick={() => onClaim(r.requestId)}
                        disabled={claimingId === r.requestId}
                        className="mt-3 w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60"
                      >
                        {claimingId === r.requestId ? "Đang nhận..." : "Nhận đơn đầu tiên"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isStudent && !isTutor && (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500">Tài khoản này không dùng SOS.</div>
        )}
      </main>
    </div>
  );
}
