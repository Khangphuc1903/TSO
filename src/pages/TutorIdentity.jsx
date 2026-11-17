import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, IdCard, Loader2, Sparkles, X } from "lucide-react";
import Navbar from "../components/Navbar";
import TutorSetupSteps from "../components/TutorSetupSteps";
import { getUser, isLoggedIn } from "../auth";
import { applyEkycResult, getEkycConfig, getTutorIdentity, getTutorWorkspace } from "../api/study";
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
  const [passedTestCount, setPassedTestCount] = useState(0);

  const load = async () => {
    const [data, ws] = await Promise.all([getTutorIdentity(), getTutorWorkspace().catch(() => null)]);
    setPassedTestCount(ws?.passedTestCount || 0);
    setStatus(data);
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
      if (data.type === "VNPT_ERROR") {
        setSdkOpen(false);
        setError(data.message || "Không mở được VNPT eKYC.");
        return;
      }
      if (data.type === "VNPT_RESULT") {
        submitResult(data.result);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const submitResult = async (result) => {
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
      if (!cfg.configured) {
        setError(cfg.message || "Chưa cấu hình VNPT eKYC.");
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
    } catch (err) {
      setError(apiMessage(err, "Không lấy được cấu hình VNPT."));
    } finally {
      setBusy(false);
    }
  };

  const identityDone = Boolean(status?.identityCompleted);
  const pct = facePercent(status);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
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
            Quét CCCD và khuôn mặt bằng VNPT. AI của VNPT khớp thì duyệt luôn và không lưu ảnh. Chưa khớp thì admin xem trong 24 giờ, sau đó ảnh bị xóa.
          </p>
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
              <button
                type="button"
                disabled={busy}
                onClick={openVnpt}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : <IdCard size={16} />}
                Mở máy quét VNPT
              </button>
            </section>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-3">Thông tin VNPT đọc được</h2>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-400">Họ tên</dt><dd className="font-medium">{status?.fullName || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Giới tính</dt><dd className="font-medium">{genderLabel(status?.gender)}</dd></div>
                <div><dt className="text-xs text-slate-400">Ngày sinh</dt><dd className="font-medium">{status?.dateOfBirth || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Số CCCD</dt><dd className="font-medium">{status?.idNumber || "—"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Địa chỉ</dt><dd className="font-medium">{status?.originLocation || status?.address || "—"}</dd></div>
              </dl>
            </div>

            <Link to="/tutor-tests" className="inline-flex text-sm font-medium text-brand-700">
              Tiếp theo: bài kiểm tra chuyên môn →
            </Link>
          </>
        )}
      </main>

      {sdkOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0F294A]">
          <div className="flex items-center justify-between gap-3 px-4 py-2 text-white">
            <p className="text-sm">Đang quét với VNPT. Nếu vòng tròn xanh đứng quá 40 giây, đóng và mở lại.</p>
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
