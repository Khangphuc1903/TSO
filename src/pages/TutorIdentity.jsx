import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, CheckCircle2, IdCard, Loader2, Sparkles, Upload, X } from "lucide-react";
import Navbar from "../components/Navbar";
import TutorSetupSteps from "../components/TutorSetupSteps";
import { getUser, isLoggedIn } from "../auth";
import { API_ORIGIN } from "../api/axiosClient";
import {
  deleteIdentityCard,
  deleteIdentityFace,
  getTutorIdentity,
  getTutorWorkspace,
  uploadIdentityCard,
  verifyIdentityFace,
} from "../api/study";

function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
}

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

function facePercent(status) {
  const n = Number(status?.faceMatchPercent ?? status?.faceMatchScore);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}

export default function TutorIdentity() {
  const navigate = useNavigate();
  const user = getUser();
  const isTutor = (user?.role || "").toLowerCase() === "tutor";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [hint, setHint] = useState("Nhìn thẳng vào camera. Đưa mặt vào khung oval.");
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [frontKey, setFrontKey] = useState(0);
  const [backKey, setBackKey] = useState(0);
  const [passedTestCount, setPassedTestCount] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [lastSelfie, setLastSelfie] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const applyStatus = (data) => {
    if (data) setStatus(data);
  };

  const load = async () => {
    const [data, ws] = await Promise.all([getTutorIdentity(), getTutorWorkspace().catch(() => null)]);
    setPassedTestCount(ws?.passedTestCount || 0);
    applyStatus(data);
    return data;
  };

  useEffect(() => {
    if (!isLoggedIn() || !isTutor) {
      navigate("/login");
      return;
    }
    load()
      .then((data) => {
        if (data && !data.ocrFilled && data.ocrMessage) setError(data.ocrMessage);
      })
      .catch((e) => setError(apiMessage(e, "Không tải được trạng thái CCCD.")))
      .finally(() => setLoading(false));
    return () => stopCam();
  }, []);

  useEffect(() => {
    const lines = [
      "Nhìn thẳng vào camera.",
      "Đưa mặt vừa khung oval.",
      "Không đeo khẩu trang, không che mặt.",
      "Đủ sáng, không ngược sáng, không mờ.",
    ];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % lines.length;
      setHint((prev) => (error ? prev : lines[i]));
    }, 2500);
    return () => clearInterval(id);
  }, [error]);

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };

  const startCam = async () => {
    setError("");
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play?.().catch(() => {});
        }
      });
    } catch {
      setError("Không bật được camera. Cho phép quyền camera rồi thử lại.");
      setCamOn(false);
    }
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Camera chưa sẵn sàng. Đợi 1 giây rồi chụp.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
    setLastSelfie(file);
    await submitFace(file);
  };

  const submitFace = async (file) => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await verifyIdentityFace(file);
      const data = res.data;
      applyStatus(data);
      const pct = facePercent(data);
      if (data?.identityCompleted) {
        setInfo(res.message || `Khuôn mặt trùng CCCD (${pct}%).`);
        stopCam();
      } else {
        setError(res.message || "Chưa khớp CCCD. Nhìn thẳng, đủ sáng, chụp lại.");
        setHint(res.message || "Nhìn thẳng vào camera, đưa mặt vào oval.");
      }
    } catch (e) {
      const msg = apiMessage(e, "Không so khớp được khuôn mặt.");
      setError(msg);
      setHint(msg);
    } finally {
      setBusy(false);
    }
  };

  const clearSide = async (side) => {
    if (side === "front") {
      setFront(null);
      setFrontKey((k) => k + 1);
      if (status?.idCardFrontUrl) {
        const res = await deleteIdentityCard("front");
        if (res.data) applyStatus(res.data);
      }
    } else {
      setBack(null);
      setBackKey((k) => k + 1);
      if (status?.idCardBackUrl) {
        const res = await deleteIdentityCard("back");
        if (res.data) applyStatus(res.data);
      }
    }
  };

  const onUploadCard = async (e) => {
    e.preventDefault();
    const hasFront = Boolean(front || status?.idCardFrontUrl);
    const hasBack = Boolean(back || status?.idCardBackUrl);
    if (!hasFront || !hasBack) {
      setError("Chọn đủ ảnh mặt trước và mặt sau CCCD.");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await uploadIdentityCard(front, back);
      const data = res.data || (await load());
      applyStatus(data);
      setFront(null);
      setBack(null);
      setFrontKey((k) => k + 1);
      setBackKey((k) => k + 1);
      if (data?.ocrFilled) {
        setInfo(res.message || data.ocrMessage || "Đã đọc CCCD và điền hồ sơ.");
      } else {
        setError(res.message || data?.ocrMessage || "Chưa đọc được số CCCD / họ tên trên ảnh. Chụp rõ, đủ 4 góc, đủ sáng rồi đọc lại.");
      }
    } catch (err) {
      const data = err.response?.data?.data;
      if (data) applyStatus(data);
      setError(apiMessage(err, "Chưa đọc được chữ trên CCCD. Ảnh rõ, đủ sáng, không mất góc."));
    } finally {
      setBusy(false);
    }
  };

  const canReadCard = Boolean((front || status?.idCardFrontUrl) && (back || status?.idCardBackUrl));

  const identityDone = Boolean(status?.identityCompleted);
  const hasCard = Boolean(status?.idCardFrontUrl);
  const pct = facePercent(status);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <section className="relative overflow-hidden pt-12 pb-8 px-6">
        <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)" }} />
        <div className="max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} /> CCCD không chip
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Xác thực <span className="text-brand-600">căn cước</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">Tải hoặc chụp 2 mặt CCCD (không chip, không QR). Hệ thống điền hồ sơ rồi so mặt với ảnh trên thẻ.</p>
          <div className="mt-6">
            <TutorSetupSteps passedTestCount={passedTestCount} identityCompleted={identityDone} current="identity" />
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-4">
        {info && !error && (
          <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{info}</div>
        )}
        {error && (
          <div className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}
        {busy && (
          <div className="text-sm text-brand-800 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Đang xử lý…
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
          </div>
        ) : (
          <>
            <form onSubmit={onUploadCard} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <IdCard size={18} className="text-brand-600" /> 1. Ảnh 2 mặt CCCD
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <CardSlot label="Mặt trước" file={front} url={status?.idCardFrontUrl} inputKey={frontKey} onFile={setFront} onClear={() => clearSide("front")} />
                <CardSlot label="Mặt sau" file={back} url={status?.idCardBackUrl} inputKey={backKey} onFile={setBack} onClear={() => clearSide("back")} />
              </div>
              <p className="text-xs text-slate-500">JPG/PNG, rõ nét, đủ 4 góc, không chói đèn. Bấm đọc lại nếu ảnh đã tải mà chưa ra số CCCD.</p>
              <button type="submit" disabled={busy || !canReadCard} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-60">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                Đọc CCCD và điền hồ sơ
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-3">2. Thông tin hồ sơ</h2>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-400">Họ tên</dt><dd className="font-medium">{status?.fullName || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Giới tính</dt><dd className="font-medium">{genderLabel(status?.gender)}</dd></div>
                <div><dt className="text-xs text-slate-400">Ngày sinh</dt><dd className="font-medium">{status?.dateOfBirth || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Số CCCD</dt><dd className="font-medium">{status?.idNumber || "—"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Quê quán / địa chỉ</dt><dd className="font-medium">{status?.originLocation || status?.address || "—"}</dd></div>
              </dl>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">3. Quét mặt so với CCCD</h2>
                <p className="text-xs text-slate-500 mt-1">Đưa mặt vào oval. Ảnh mờ / không nhìn thẳng / che mặt sẽ báo lỗi.</p>
              </div>
              <div className="relative bg-[#0b3a4a]" style={{ minHeight: 420 }}>
                {camOn ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-[420px] object-cover" />
                ) : (
                  <div className="h-[420px] flex items-center justify-center text-white/70 text-sm">Bật camera để quét mặt</div>
                )}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-48 h-64 rounded-[50%] border-[3px] ${error ? "border-red-400" : identityDone ? "border-emerald-400" : "border-emerald-300"}`}
                    style={{ boxShadow: "0 0 0 9999px rgba(11,58,74,0.55)" }}
                  />
                </div>
                <p className={`absolute bottom-16 left-0 right-0 text-center text-sm font-medium px-4 ${error ? "text-red-200" : "text-white"}`}>
                  {error || hint}
                </p>
                {busy && (
                  <div className="absolute inset-0 bg-[#0b3a4a]/50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-300" size={36} />
                  </div>
                )}
              </div>
              {pct != null && (
                <div className={`px-6 py-3 text-sm ${identityDone ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                  {identityDone ? (
                    <span className="inline-flex items-center gap-1"><CheckCircle2 size={16} /> Trùng CCCD · {pct}%</span>
                  ) : (
                    `Độ khớp ${pct}% — chưa đủ. Chụp lại.`
                  )}
                </div>
              )}
              <div className="px-6 py-4 flex flex-wrap gap-3">
                <button type="button" disabled={!hasCard || busy} onClick={startCam} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50">
                  <Camera size={16} /> {camOn ? "Bật lại camera" : "Bật camera"}
                </button>
                <button type="button" disabled={!camOn || busy} onClick={captureSelfie} className="h-10 px-4 rounded-lg border border-slate-200 text-sm">
                  Chụp trong oval
                </button>
                {lastSelfie && (
                  <button
                    type="button"
                    className="h-10 px-3 rounded-lg border text-sm inline-flex items-center gap-1"
                    onClick={async () => {
                      setLastSelfie(null);
                      if (status?.selfieUrl) {
                        const res = await deleteIdentityFace();
                        if (res.data) applyStatus(res.data);
                      }
                    }}
                  >
                    <X size={14} /> Xóa ảnh mặt
                  </button>
                )}
              </div>
            </div>

            <Link to="/tutor-tests" className="inline-flex text-sm font-medium text-brand-700">
              Tiếp theo: bài kiểm tra chuyên môn →
            </Link>
          </>
        )}
      </main>
    </div>
  );
}

function CardSlot({ label, file, url, inputKey, onFile, onClear }) {
  const preview = file ? URL.createObjectURL(file) : url ? mediaUrl(url) : "";
  return (
    <div className="text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        key={inputKey}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="mt-1 block w-full text-sm"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
      {preview && (
        <div className="relative mt-2">
          <img src={preview} alt={label} className="h-36 w-full object-cover rounded-lg border" />
          <button type="button" onClick={onClear} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 border shadow inline-flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
