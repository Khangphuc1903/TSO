import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Radio, Siren, Sparkles, Zap } from "lucide-react";
import Navbar from "../components/Navbar";
import { getUser, isLoggedIn } from "../auth";
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
  getSosReady,
  setSosReady,
  sosHeartbeat,
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
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subjectId: "", questionNote: "", image: null });
  const preview = form.image ? URL.createObjectURL(form.image) : "";
  const hubRef = useRef(null);

  const loadStudent = async () => {
    const data = await getMySosRequests();
    setMine(Array.isArray(data) ? data : []);
  };
  const loadTutor = async () => {
    const [r, list] = await Promise.all([getSosReady(), getOpenSosRequests().catch(() => [])]);
    setReady(Boolean(r?.isSosReady));
    setOpen(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    getSosConfig().then(setConfig).catch(() => {});
    getSubjects().then(setSubjects).catch(() => setSubjects([]));
    if (isStudent) loadStudent().catch(() => setError("Không tải được yêu cầu SOS."));
    if (isTutor) loadTutor().catch(() => setError("Bật SOS Ready sau khi hồ sơ đã xác thực và đăng công khai."));

    const hub = createAppHub();
    hubRef.current = hub;
    hub.on("SosRequestCreated", () => {
      if (isTutor) loadTutor().catch(() => {});
    });
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

  useEffect(() => {
    if (!isTutor || !ready) return;
    sosHeartbeat().catch(() => {});
    const t = setInterval(() => sosHeartbeat().catch(() => {}), 25000);
    return () => clearInterval(t);
  }, [isTutor, ready]);

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
      setInfo("Đã phát SOS. Gia sư online sẽ nhận tín hiệu ngay.");
      setForm({ subjectId: form.subjectId, questionNote: "", image: null });
      await loadStudent();
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được SOS.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleReady = async () => {
    setError("");
    try {
      const res = await setSosReady(!ready);
      setReady(Boolean(res?.isSosReady));
      if (res?.isSosReady) await loadTutor();
      else setOpen([]);
    } catch (err) {
      setError(err.response?.data?.message || "Không đổi trạng thái SOS. Hồ sơ cần verified + đăng công khai.");
    }
  };

  const onClaim = async (requestId) => {
    setError("");
    try {
      const res = await claimSosRequest(requestId);
      if (res?.sessionId) navigate(`/sos/session/${res.sessionId}`);
      else await loadTutor();
    } catch (err) {
      setError(err.response?.data?.message || "Đơn đã được người khác nhận.");
      loadTutor().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <section className="relative overflow-hidden pt-10 pb-8 px-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-rose-950 via-brand-900 to-brand-800" />
        <div className="max-w-5xl mx-auto text-white">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-full mb-4">
            <Siren size={14} />
            Flash Micro-Tutoring
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold">Cứu viện bài tập 15 phút</h1>
          <p className="text-white/75 mt-3 max-w-2xl text-sm leading-relaxed">
            11 giờ đêm kẹt một câu? Chụp ảnh bài, bấm SOS. Gia sư đang bật chế độ sẵn sàng nhận tín hiệu
            qua SignalR, vào phòng chat + gọi audio 15 phút. Nhóm học chỉ chat (ảnh/tệp), không gọi —
            gọi chỉ có trong phiên SOS.
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

      <main className="max-w-5xl mx-auto px-6 -mt-4 pb-16 space-y-6">
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
              <label className="block text-sm">
                <span className="text-slate-600">Ảnh đề bài</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required={!form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.files?.[0] || null }))}
                  className="mt-1 w-full text-sm"
                />
              </label>
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
                <h2 className="font-semibold text-slate-900">Chế độ sẵn sàng cứu viện</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Bật khi bạn online. Đơn SOS đúng môn đã xác thực sẽ hiện ngay.
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleReady}
                className={`h-11 px-5 rounded-xl font-semibold text-sm ${
                  ready ? "bg-verified-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {ready ? "Đang sẵn sàng" : "Bật SOS Ready"}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Đơn đang chờ</h2>
              {!ready && <p className="text-sm text-slate-500">Bật SOS Ready để nhận đơn.</p>}
              {ready && open.length === 0 && <p className="text-sm text-slate-500">Chưa có đơn SOS cho môn của bạn.</p>}
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
                        className="mt-3 w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
                      >
                        Nhận đơn đầu tiên
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
