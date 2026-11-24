import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, IdCard, Loader2, Sparkles, X } from "lucide-react";
import TutorSetupSteps from "../components/TutorSetupSteps";
import { getUser, isLoggedIn } from "../auth";
import { applyEkycResult, getEkycConfig, getTutorIdentity, getTutorWorkspace, submitManualIdentity } from "../api/study";
import { invalidateTutorGate } from "../tutorGate";

function genderLabel(value) {
  if (value === "Male" || value === "Nam") return "Nam";
  if (value === "Female" || value === "Nữ") return "Nữ";
  return value || "—";
}

function apiMessage(err, fallback) {
  const d = err?.response?.data;
  if (typeof d === "string" && d.trim()) return d;
  return d?.message || d?.Message || fallback;
}

const AI_OVERLOAD =
  "AI quá tải. Hãy chụp ảnh căn cước và ảnh mặt để admin duyệt. Ảnh chỉ giữ tối đa 24 giờ và bị xóa ngay khi admin duyệt.";

function rawToken(value) {
  const text = String(value || "").trim();
  return text.toLowerCase().startsWith("bearer ") ? text.slice(7).trim() : text;
}

function facePercent(status) {
  const n = Number(status?.faceMatchPercent ?? status?.faceMatchScore);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}

export default function TutorIdentity() {
  const navigate = useNavigate();
  const user = getUser();
  const isTutor = (user?.role || "").toLowerCase() === "tutor";
  const frameRef = useRef(null);
  const configRef = useRef(null);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [sdkOpen, setSdkOpen] = useState(false);
  const [waitingAi, setWaitingAi] = useState(false);
  const scanStarted = useRef(0);
  const failTimer = useRef(0);
  const formRef = useRef(null);
  const [manual, setManual] = useState({
    fullName: "",
    idNumber: "",
    dateOfBirth: "",
    gender: "Nam",
    address: "",
    front: null,
    selfie: null,
  });
  const [passedTestCount, setPassedTestCount] = useState(0);

  const load = async () => {
    const [data, ws] = await Promise.all([getTutorIdentity(), getTutorWorkspace().catch(() => null)]);
    setPassedTestCount(ws?.passedTestCount || 0);
    setStatus(data);
    setManual((current) => ({
      ...current,
      fullName: current.fullName || data?.fullName || user?.fullName || "",
      dateOfBirth: current.dateOfBirth || data?.dateOfBirth || "",
      address: current.address || data?.address || data?.originLocation || "",
      gender: data?.gender === "Female" || data?.gender === "Nữ" ? "Nữ" : current.gender,
    }));
    return data;
  };

  useEffect(() => {
    if (!isLoggedIn() || !isTutor) {
      navigate("/login");
      return;
    }
    load()
      .catch((e) => setError(apiMessage(e, "Không tải được trạng thái CCCD.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type === "VNPT_READY" && configRef.current && frameRef.current?.contentWindow) {
        frameRef.current.contentWindow.postMessage({ type: "VNPT_LAUNCH", config: configRef.current }, window.location.origin);
        return;
      }
      if (data.type === "VNPT_TIMEOUT" || data.type === "VNPT_ERROR") {
        failToManual();
        return;
      }
      if (data.type === "VNPT_RESULT") {
        setSdkOpen(false);
        submitResult(data.result);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const openManual = (message) => {
    setSdkOpen(false);
    setWaitingAi(false);
    setError("");
    setInfo(message || AI_OVERLOAD);
    setManual((current) => ({
      ...current,
      fullName: current.fullName || status?.fullName || user?.fullName || "",
      dateOfBirth: current.dateOfBirth || status?.dateOfBirth || "",
      address: current.address || status?.address || status?.originLocation || "",
    }));
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const failToManual = () => {
    const elapsed = Date.now() - (scanStarted.current || Date.now());
    const remain = Math.max(0, 20000 - elapsed);
    window.clearTimeout(failTimer.current);
    setWaitingAi(true);
    setInfo("Đang chờ AI đọc căn cước và đối chiếu khuôn mặt...");
    failTimer.current = window.setTimeout(() => openManual(AI_OVERLOAD), remain);
  };

  const submitManual = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await submitManualIdentity(manual);
      setStatus(res.data);
      setInfo(res.message || "Đã gửi ảnh căn cước và ảnh người. Admin sẽ đối chiếu.");
      invalidateTutorGate();
    } catch (err) {
      setError(apiMessage(err, "Không gửi được ảnh đối chiếu."));
    } finally {
      setBusy(false);
    }
  };

  const submitResult = async (result) => {
    window.clearTimeout(failTimer.current);
    setWaitingAi(false);
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await applyEkycResult({ result });
      setStatus(res.data);
      setInfo(res.message || "VNPT đã trả kết quả.");
      invalidateTutorGate();
      setSdkOpen(false);
    } catch (err) {
      setError(apiMessage(err, "Không lưu được kết quả VNPT."));
    } finally {
      setBusy(false);
    }
  };

  const openVnpt = async () => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const cfg = await getEkycConfig();
      scanStarted.current = Date.now();
      if (!cfg.configured) {
        failToManual();
        return;
      }
      configRef.current = {
        BACKEND_URL: cfg.backendUrl,
        TOKEN_ID: cfg.tokenId,
        TOKEN_KEY: cfg.tokenKey,
        AUTHORIZION: rawToken(cfg.authorization),
        CHALLENGE_CODE: cfg.challengeCode,
        FLOW_TAKEN: "BOTH",
        CHECK_LIVENESS_CARD: true,
        CHECK_LIVENESS_FACE: true,
        COMPARE_FACE: true,
        DEFAULT_LANGUAGE: "vi",
      };
      setSdkOpen(true);
      window.clearTimeout(failTimer.current);
      failTimer.current = window.setTimeout(() => openManual(AI_OVERLOAD), 20000);
    } catch (err) {
      scanStarted.current = scanStarted.current || Date.now();
      failToManual();
    } finally {
      setBusy(false);
    }
  };

  const identityDone = Boolean(status?.identityCompleted);
  const pct = facePercent(status);

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden pt-12 pb-8 px-6">
        <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)" }} />
        <div className="max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} /> VNPT eKYC
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Xác thực <span className="text-brand-600">căn cước</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Điền thông tin căn cước, chụp ảnh thẻ và ảnh người. Admin đối chiếu hai ảnh trước khi duyệt.
          </p>
          <div className="mt-6">
            <TutorSetupSteps passedTestCount={passedTestCount} identityCompleted={identityDone} current="identity" />
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-4">
        {info && !error && (
          <div className={`text-sm rounded-lg px-3 py-2 border ${info.includes("AI quá tải") ? "text-amber-900 bg-amber-50 border-amber-100" : "text-emerald-800 bg-emerald-50 border-emerald-100"}`}>{info}</div>
        )}
        {error && (
          <div className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-24 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
          </div>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <IdCard size={18} className="text-brand-600" /> Quét bằng VNPT eKYC
              </h2>
              <p className="text-sm text-slate-500">Ảnh căn cước đi qua máy chủ VNPT. Trang này không giữ ảnh để bạn xem lại.</p>
              {status?.imagesHeldForAdmin && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  VNPT chưa tự duyệt. Admin được xem ảnh đến {status.holdExpiresAt ? new Date(status.holdExpiresAt).toLocaleString("vi-VN") : "24 giờ nữa"}, rồi ảnh bị xóa.
                </p>
              )}
              {identityDone && (
                <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                  <CheckCircle2 size={16} /> Đã xác thực{pct != null ? ` · khớp ${pct}%` : ""}. Ảnh CCCD không còn lưu.
                </p>
              )}
              {waitingAi && (
                <p className="text-sm text-slate-600 inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Đang chờ AI, tối đa 20 giây...
                </p>
              )}
              {!identityDone && !waitingAi && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={openVnpt}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-60"
                >
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <IdCard size={16} />}
                  Mở máy quét VNPT
                </button>
              )}
            </section>

            {identityDone ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="font-semibold text-slate-900 mb-3">Thông tin đã duyệt</h2>
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-slate-400">Họ tên</dt><dd className="font-medium">{status?.fullName || "—"}</dd></div>
                  <div><dt className="text-xs text-slate-400">Giới tính</dt><dd className="font-medium">{genderLabel(status?.gender)}</dd></div>
                  <div><dt className="text-xs text-slate-400">Ngày sinh</dt><dd className="font-medium">{status?.dateOfBirth || "—"}</dd></div>
                  <div><dt className="text-xs text-slate-400">Số CCCD</dt><dd className="font-medium">{status?.idNumber || "—"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Địa chỉ</dt><dd className="font-medium">{status?.originLocation || status?.address || "—"}</dd></div>
                </dl>
              </div>
            ) : (
              <form ref={formRef} onSubmit={submitManual} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Gửi ảnh để admin đối chiếu</h2>
                  <p className="text-sm text-slate-500 mt-1">Cần ảnh căn cước và ảnh người. Admin xem hai ảnh cạnh nhau rồi mới duyệt.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <PhotoPick
                    label="Ảnh căn cước"
                    hint="Chụp mặt trước thẻ, đủ số và ảnh trên thẻ."
                    file={manual.front}
                    capture="environment"
                    onFile={(file) => setManual((m) => ({ ...m, front: file }))}
                  />
                  <PhotoPick
                    label="Ảnh người"
                    hint="Chụp rõ mặt để đối chiếu với ảnh trên căn cước."
                    file={manual.selfie}
                    capture="user"
                    onFile={(file) => setManual((m) => ({ ...m, selfie: file }))}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-sm">
                    Họ tên
                    <input required value={manual.fullName} onChange={(e) => setManual((m) => ({ ...m, fullName: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border px-3" />
                  </label>
                  <label className="block text-sm">
                    Số CCCD
                    <input required inputMode="numeric" value={manual.idNumber} onChange={(e) => setManual((m) => ({ ...m, idNumber: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border px-3" />
                  </label>
                  <label className="block text-sm">
                    Ngày sinh
                    <input required type="date" value={manual.dateOfBirth} onChange={(e) => setManual((m) => ({ ...m, dateOfBirth: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border px-3" />
                  </label>
                  <label className="block text-sm">
                    Giới tính
                    <select value={manual.gender} onChange={(e) => setManual((m) => ({ ...m, gender: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border px-3">
                      <option>Nam</option>
                      <option>Nữ</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm">
                  Địa chỉ
                  <input value={manual.address} onChange={(e) => setManual((m) => ({ ...m, address: e.target.value }))} className="mt-1 h-10 w-full rounded-lg border px-3" />
                </label>
                <button disabled={busy} className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white disabled:opacity-60">
                  {busy ? "Đang gửi..." : "Gửi để admin đối chiếu"}
                </button>
              </form>
            )}

            <Link to="/tutor-tests" className="inline-flex text-sm font-medium text-brand-700">
              Tiếp theo: bài kiểm tra chuyên môn →
            </Link>
          </>
        )}
      </main>

      {sdkOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0F294A]">
          <div className="flex items-center justify-between gap-3 px-4 py-2 text-white">
            <p className="text-sm">Đang quét với AI. Sau 20 giây chưa có kết quả sẽ báo AI quá tải và chuyển sang chụp căn cước với ảnh mặt.</p>
            <button
              type="button"
              onClick={() => setSdkOpen(false)}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-white px-3 text-sm font-semibold text-slate-800"
            >
              <X size={16} /> Đóng
            </button>
          </div>
            <iframe
            ref={frameRef}
            title="VNPT eKYC"
            src="/vnpt-ekyc/host.html"
            className="min-h-0 w-full flex-1 border-0"
            onLoad={() => frameRef.current?.contentWindow?.postMessage({ type: "VNPT_PING" }, window.location.origin)}
          />
        </div>
      )}
    </div>
  );
}

function PhotoPick({ label, hint, file, capture, onFile }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setUrl("");
      return undefined;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-800">{label}</span>
      <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      <span className="mt-2 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
        {url ? (
          <img src={url} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="px-3 text-center text-xs text-slate-400">Chưa có ảnh</span>
        )}
      </span>
      <input
        required
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={capture}
        className="mt-2 block w-full text-sm"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
    </label>
  );
}
