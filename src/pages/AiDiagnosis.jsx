import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Brain,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Award,
  Star,
  ShieldCheck,
  ChevronRight,
  FileText,
  HelpCircle,
  History,
  X,
  Loader2,
  Calendar,
  MessageSquare,
  Zap,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { diagnoseHomework, getMyDiagnoses, getDiagnosisById } from "../api/ai";
import { isLoggedIn } from "../auth";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref } from "../utils/format";

function normalizeDiagnosis(d) {
  if (!d) return null;
  return {
    diagnosisId: d.diagnosisId ?? d.DiagnosisId,
    createdAt: d.createdAt ?? d.CreatedAt,
    imageUrl: d.imageUrl ?? d.ImageUrl,
    ocrText: d.ocrText ?? d.OcrText,
    subjectName: d.subjectName ?? d.SubjectName,
    gradeLevel: d.gradeLevel ?? d.GradeLevel,
    topicName: d.topicName ?? d.TopicName,
    severity: d.severity ?? d.Severity,
    aiSummary: d.aiSummary ?? d.AiSummary,
    studentMistake: d.studentMistake ?? d.StudentMistake,
    gapDetail: d.gapDetail ?? d.GapDetail,
    studyPlan: d.studyPlan ?? d.StudyPlan,
    suggestedTutors: (d.suggestedTutors ?? d.SuggestedTutors ?? []).map((t) => ({
      tutorId: t.tutorId ?? t.TutorId,
      rankNo: t.rankNo ?? t.RankNo,
      matchScore: t.matchScore ?? t.MatchScore,
      avatarUrl: fileHref(t.avatarUrl ?? t.AvatarUrl, API_ORIGIN),
      fullName: t.fullName ?? t.FullName,
      university: t.university ?? t.University,
      averageRating: t.averageRating ?? t.AverageRating ?? 5.0,
      totalReviews: t.totalReviews ?? t.TotalReviews ?? 0,
      testScore: t.testScore ?? t.TestScore,
      reason: t.reason ?? t.Reason,
      hourlyRateMin: t.hourlyRateMin ?? t.HourlyRateMin ?? 0,
      hourlyRateMax: t.hourlyRateMax ?? t.HourlyRateMax ?? 0,
    })),
  };
}

export default function AiDiagnosis() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("diagnose"); // "diagnose" | "history"
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [studentNote, setStudentNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const scanSteps = [
    "Đang tải ảnh và đọc đề bài qua Gemini Multimodal Vision...",
    "Phân tích bước làm & bóc tách nguyên nhân sai lầm cốt lõi...",
    "Định danh chuyên đề & khối lớp chuẩn chương trình GDPT 2018...",
    "Truy vấn điểm bài test chuyên môn & đề xuất Top 3 Gia sư tối ưu...",
  ];

  useEffect(() => {
    if (!isLoggedIn()) {
      // Optional: allow viewing or redirect to login when action taken
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP).");
      return;
    }

    setError("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDiagnose = async () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (!selectedFile) {
      setError("Vui lòng chọn hoặc chụp ảnh bài tập/đề thi để chẩn đoán.");
      return;
    }

    setError("");
    setAnalyzing(true);
    setScanStep(0);

    const stepInterval = setInterval(() => {
      setScanStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const data = await diagnoseHomework(selectedFile, studentNote);
      setResult(normalizeDiagnosis(data));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Không thể chẩn đoán bài tập lúc này. Vui lòng thử lại."
      );
    } finally {
      clearInterval(stepInterval);
      setAnalyzing(false);
    }
  };

  const loadHistory = async () => {
    if (!isLoggedIn()) return;
    try {
      setLoadingHistory(true);
      const data = await getMyDiagnoses();
      const list = Array.isArray(data) ? data : data?.data || [];
      setHistory(list.map(normalizeDiagnosis));
    } catch (err) {
      console.warn("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewHistoryItem = (item) => {
    const norm = normalizeDiagnosis(item);
    setResult(norm);
    setActiveTab("diagnose");
    if (norm?.imageUrl) {
      setPreviewUrl(resolveImage(norm.imageUrl));
    }
  };

  const resolveImage = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${API_ORIGIN}${url}`;
  };

  const getSeverityBadge = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "critical") {
      return {
        bg: "bg-red-50 text-red-700 border-red-200",
        label: "Mất gốc nghiêm trọng",
        desc: "Học sinh bị hổng định nghĩa & định lý nền tảng.",
      };
    }
    if (s === "moderate") {
      return {
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        label: "Hổng phương pháp giải",
        desc: "Học sinh nhớ định lý nhưng thiếu kỹ thuật xử lý dạng bài.",
      };
    }
    return {
      bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      label: "Cần củng cố phản xạ",
      desc: "Nắm được hướng làm nhưng sai ở bước chuyển ý hoặc tính toán.",
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* HERO TITLE */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-brand-100 border border-purple-200 text-purple-900 text-xs font-bold mb-3 shadow-2xs">
            <Sparkles size={14} className="text-purple-600 animate-pulse" />
            AI Smart Matchmaker &amp; Khảo Thí GDPT 2018
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Chẩn đoán Lỗ hổng Kiến thức qua Ảnh
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Học sinh không còn phải lo lắng khi chỉ biết mình "học kém". Tải ảnh bài tập làm sai hoặc
            đề kiểm tra, <strong>AI Gemini</strong> sẽ chỉ ra chính xác chuyên đề bạn đang bị hổng và
            gợi ý <strong>Top 3 Gia sư</strong> có điểm thi chuyên môn cao nhất về phần đó!
          </p>

          {/* TABS SELECTOR */}
          <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl mt-6 border border-slate-300/50">
            <button
              type="button"
              onClick={() => setActiveTab("diagnose")}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "diagnose"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Brain size={16} className="text-brand-600" />
              Chẩn đoán qua ảnh
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                loadHistory();
              }}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History size={16} className="text-purple-600" />
              Lịch sử chẩn đoán
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs sm:text-sm flex items-center gap-3 shadow-xs">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: CHẨN ĐOÁN BÀI TẬP */}
        {activeTab === "diagnose" && (
          <div className="space-y-8">
            {/* KHUNG TẢI ẢNH NẾU CHƯA CÓ KẾT QUẢ HOẶC ĐANG CHỌN ẢNH */}
            {!result && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-3xl mx-auto space-y-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-brand-200 hover:border-brand-500 bg-brand-50/20 hover:bg-brand-50/40 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center shadow-inner">
                      <Upload size={28} />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-bold text-slate-900">
                        Bấm để tải ảnh bài tập / đề thi làm sai lên
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hỗ trợ ảnh chụp điện thoại, ảnh scan bài kiểm tra (JPG, PNG, WEBP tối đa 10MB)
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] font-semibold text-slate-600 border border-slate-200">
                      <Sparkles size={12} className="text-amber-500" />
                      Gemini 2.5 Flash Multimodal Vision
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-80">
                      <img
                        src={previewUrl}
                        alt="Đề bài chẩn đoán"
                        className="w-full h-auto max-h-80 object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur transition cursor-pointer"
                        title="Chọn ảnh khác"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ghi chú thêm cho AI (Tùy chọn):
                      </label>
                      <input
                        type="text"
                        value={studentNote}
                        onChange={(e) => setStudentNote(e.target.value)}
                        placeholder="VD: Em làm câu 45 đề thử thi Toán, không biết cách tính khoảng cách từ điểm đến mặt phẳng..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleDiagnose}
                        disabled={analyzing}
                        className="flex-1 py-3 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Đang phân tích chuyên sâu...
                          </>
                        ) : (
                          <>
                            <Brain size={18} />
                            Bắt đầu chẩn đoán với AI ✨
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearFile}
                        disabled={analyzing}
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HIỆU ỨNG QUÉT AI SCANNER TRONG KHI ĐANG PHÂN TÍCH */}
            {analyzing && (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 max-w-2xl mx-auto shadow-2xl relative overflow-hidden text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/20 border border-brand-400/40 flex items-center justify-center relative">
                  <Brain size={32} className="text-brand-400 animate-pulse" />
                  <span className="absolute -inset-1 rounded-2xl bg-brand-500/30 blur-md animate-ping" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    Hệ thống AI đang chẩn đoán lỗ hổng kiến thức
                  </h3>
                  <p className="text-xs text-indigo-200 font-medium animate-pulse">
                    {scanSteps[scanStep]}
                  </p>
                </div>

                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-brand-400 to-purple-400 h-1.5 transition-all duration-500 rounded-full"
                    style={{ width: `${((scanStep + 1) / scanSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* KẾT QUẢ CHẨN ĐOÁN CHI TIẾT */}
            {result && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* THANH ĐIỀU HƯỚNG BẤM CHẨN ĐOÁN ẢNH MỚI */}
                <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Đã chẩn đoán thành công hồ sơ #{result.diagnosisId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3.5 py-1.5 rounded-xl border border-brand-200 transition cursor-pointer"
                  >
                    <Upload size={14} /> Chẩn đoán bài tập khác
                  </button>
                </div>

                {/* THẺ BÁO CÁO PHÂN TÍCH CHUYÊN SÂU */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Cột trái: Ảnh bài tập & OCR */}
                  <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText size={15} className="text-brand-600" />
                        Ảnh bài tập đã tải lên
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {result.createdAt ? new Date(result.createdAt).toLocaleDateString("vi-VN") : "Hôm nay"}
                      </span>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-900 flex items-center justify-center max-h-72">
                      <img
                        src={resolveImage(result.imageUrl)}
                        alt="Đề bài"
                        className="w-full h-auto max-h-72 object-contain"
                      />
                    </div>

                    {result.ocrText && (
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
                        <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                          Đề bài nhận diện qua OCR:
                        </p>
                        <p className="font-mono text-[11px] line-clamp-4 leading-relaxed">
                          {result.ocrText}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cột phải: Bản phân tích lỗ hổng sư phạm */}
                  <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
                    {/* Header thông tin môn & mức độ */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black uppercase tracking-wider">
                            {result.subjectName || "Toán"}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                            {result.gradeLevel || "Chương trình GDPT"}
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2">
                          {result.topicName || "Chẩn đoán lỗ hổng kiến thức"}
                        </h2>
                      </div>

                      {/* Mức độ nghiêm trọng */}
                      {(() => {
                        const badge = getSeverityBadge(result.severity);
                        return (
                          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${badge.bg}`}>
                            {badge.label}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Tóm tắt lỗ hổng */}
                    <div className="p-4 bg-brand-50/60 border border-brand-200/70 rounded-2xl space-y-1.5">
                      <p className="text-xs font-extrabold text-brand-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles size={14} className="text-brand-600" />
                        Kết luận chẩn đoán của AI:
                      </p>
                      <p className="text-xs sm:text-sm text-brand-950 font-medium leading-relaxed">
                        {result.aiSummary}
                      </p>
                    </div>

                    {/* Phân tích lỗi sai & kiến thức cần bù đắp */}
                    <div className="space-y-4 text-xs sm:text-sm">
                      {result.studentMistake && (
                        <div className="p-4 bg-red-50/70 border border-red-100 rounded-2xl space-y-1">
                          <span className="font-bold text-red-800 flex items-center gap-1.5">
                            <AlertCircle size={15} className="text-red-600" />
                            Phân tích bước làm sai của học sinh:
                          </span>
                          <p className="text-red-900/90 leading-relaxed pl-5">
                            {result.studentMistake}
                          </p>
                        </div>
                      )}

                      {result.gapDetail && (
                        <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl space-y-1">
                          <span className="font-bold text-amber-900 flex items-center gap-1.5">
                            <BookOpen size={15} className="text-amber-700" />
                            Bản chất kiến thức cần củng cố lại:
                          </span>
                          <p className="text-amber-950/90 leading-relaxed pl-5">
                            {result.gapDetail}
                          </p>
                        </div>
                      )}

                      {result.studyPlan && (
                        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1">
                          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <GraduationCap size={15} className="text-emerald-700" />
                            Kế hoạch học tập 3-4 buổi cùng gia sư để lấy lại gốc:
                          </span>
                          <p className="text-emerald-950/90 leading-relaxed pl-5">
                            {result.studyPlan}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* KHU VỰC TOP 3 GIA SƯ ĐƯỢC AI ĐỀ XUẤT (SMART MATCHMAKING) */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Award size={22} className="text-amber-500" />
                        Top 3 Gia Sư Chuyên Môn Cao Nhất Về Chuyên Đề Này
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Hệ thống tự động lọc các gia sư đã <strong>vượt qua bài test chuyên môn</strong> với
                        điểm số cao nhất và có nhiều kinh nghiệm trị mất gốc chuyên đề{" "}
                        <strong className="text-slate-700">{result.topicName}</strong>.
                      </p>
                    </div>
                  </div>

                  {result.suggestedTutors && result.suggestedTutors.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {result.suggestedTutors.map((tutor) => {
                        const rankColors = [
                          { badge: "bg-amber-400 text-amber-950", border: "border-amber-300 ring-2 ring-amber-400/20", title: "Gia sư phù hợp nhất" },
                          { badge: "bg-slate-300 text-slate-900", border: "border-slate-200", title: "Lựa chọn xuất sắc #2" },
                          { badge: "bg-amber-700/60 text-white", border: "border-slate-200", title: "Lựa chọn xuất sắc #3" },
                        ];
                        const rankStyle = rankColors[(tutor.rankNo || 1) - 1] || rankColors[0];

                        return (
                          <div
                            key={tutor.tutorId}
                            className={`bg-slate-50/70 hover:bg-white rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between shadow-2xs hover:shadow-md ${rankStyle.border}`}
                          >
                            <div className="space-y-4">
                              {/* Rank header */}
                              <div className="flex items-center justify-between">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${rankStyle.badge}`}>
                                  Top {tutor.rankNo}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-black text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                                  <Zap size={12} className="text-brand-600 fill-brand-600" />
                                  {tutor.matchScore}% Phù hợp
                                </span>
                              </div>

                              {/* Tutor info */}
                              <div className="flex items-center gap-3">
                                <img
                                  src={
                                    tutor.avatarUrl ||
                                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                                  }
                                  alt={tutor.fullName}
                                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-sm text-slate-900 truncate">
                                    {tutor.fullName}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {tutor.university || "Gia sư chuyên nghiệp"}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="flex items-center text-[11px] font-bold text-amber-600">
                                      <Star size={12} className="fill-amber-400 text-amber-400 mr-0.5" />
                                      {tutor.averageRating > 0 ? tutor.averageRating.toFixed(1) : "5.0"}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      ({tutor.totalReviews} đánh giá)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Test Score Badge */}
                              {tutor.testScore && (
                                <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                                    <ShieldCheck size={14} className="text-emerald-600" />
                                    Bài test chuyên môn:
                                  </span>
                                  <span className="font-extrabold text-emerald-900 font-mono">
                                    {tutor.testScore.toFixed(0)}%
                                  </span>
                                </div>
                              )}

                              {/* Reason AI matched */}
                              <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-[11px] text-slate-600 leading-relaxed space-y-1">
                                <p className="font-bold text-slate-800 flex items-center gap-1">
                                  <Sparkles size={11} className="text-brand-600" /> Lý do đề xuất:
                                </p>
                                <p className="italic text-slate-500">{tutor.reason}</p>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-slate-400">Học phí:</span>
                                <span className="font-extrabold text-slate-900 font-mono">
                                  {(tutor.hourlyRateMin || 0).toLocaleString("vi-VN")} ₫/h
                                </span>
                              </div>
                            </div>

                            {/* Action button */}
                            <div className="pt-4 border-t border-slate-200/70 mt-4 flex items-center gap-2">
                              <Link
                                to={`/tutors/${tutor.tutorId}`}
                                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition text-center flex items-center justify-center gap-1.5"
                              >
                                Đặt lịch học <ArrowRight size={13} />
                              </Link>
                              <Link
                                to={`/messages?tutorId=${tutor.tutorId}`}
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                                title="Nhắn tin"
                              >
                                <MessageSquare size={15} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
                      Chưa tìm thấy gia sư chuyên sâu cho môn này. Vui lòng vào trang Tìm gia sư để xem thêm.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LỊCH SỬ CHẨN ĐOÁN */}
        {activeTab === "history" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History size={18} className="text-purple-600" />
                Lịch sử các ca chẩn đoán lỗ hổng bài tập
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                {history.length} ca chẩn đoán
              </span>
            </div>

            {loadingHistory ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin text-brand-600" />
                <span>Đang tải lịch sử chẩn đoán...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                <Brain size={36} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Chưa có ca chẩn đoán nào</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Hãy chuyển sang tab "Chẩn đoán qua ảnh" và tải lên ảnh bài tập đầu tiên để AI phân tích giúp bạn!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("diagnose")}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Bắt đầu chẩn đoán ngay
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((item) => (
                  <div
                    key={item.diagnosisId}
                    onClick={() => handleViewHistoryItem(item)}
                    className="bg-white hover:border-brand-300 p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition cursor-pointer flex gap-4 items-start"
                  >
                    <img
                      src={resolveImage(item.imageUrl)}
                      alt="Thumbnail"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-100 bg-slate-900 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                          {item.subjectName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "Gần đây"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.topicName}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {item.aiSummary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
