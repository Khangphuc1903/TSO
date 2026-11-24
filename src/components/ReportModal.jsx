import { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  Flag,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { createReport, uploadReportEvidence } from "../api/admin";
import { API_ORIGIN } from "../api/axiosClient";

const REVIEW_REASONS = [
  { value: "FakeReview", label: "Đánh giá sai sự thật / Bịa đặt", desc: "Học sinh đánh giá không đúng thực tế diễn ra trong buổi học" },
  { value: "Defamation", label: "Bôi nhọ danh dự / Xúc phạm", desc: "Dùng từ ngữ thô tục, bôi nhọ nhân phẩm của gia sư" },
  { value: "NeverStudied", label: "Chưa từng học / Nhầm lẫn", desc: "Học sinh không tham gia học hoặc đánh giá nhầm ca dạy" },
  { value: "Extortion", label: "Tống tiền / Đe dọa", desc: "Dùng đánh giá 1 sao để ép buộc gia sư làm trái quy định" },
  { value: "Harassment", label: "Quấy rối / Ngôn từ thù ghét", desc: "Hành vi công kích cá nhân, quấy rối độc hại" },
  { value: "Other", label: "Lý do khác", desc: "Các vi phạm khác ảnh hưởng tới quyền lợi chính đáng" },
];

const STUDENT_REASONS = [
  { value: "Harassment", label: "Quấy rối / Thái độ xúc phạm", desc: "Có lời nói, hành vi thiếu tôn trọng hoặc quấy rối gia sư" },
  { value: "Attendance", label: "Bùng lịch / Không tham gia học", desc: "Đặt lịch nhưng không vào lớp hoặc hủy sát giờ liên tục" },
  { value: "Cheating", label: "Yêu cầu làm bài thi hộ / Gian lận", desc: "Yêu cầu gia sư làm hộ bài thi, kiểm tra trái quy chế" },
  { value: "Fraud", label: "Gian lận / Cố tình chiếm đoạt", desc: "Cố tình gian lận thanh toán hoặc giả mạo thông tin" },
  { value: "Safety", label: "Vi phạm an toàn", desc: "Hành vi gây nguy hiểm hoặc đe dọa an toàn của gia sư" },
  { value: "Other", label: "Lý do khác", desc: "Các vi phạm quy chế học tập khác" },
];

const TUTOR_REASONS = [
  { value: "Absence", label: "Vắng mặt / Không dạy đúng giờ", desc: "Gia sư không vào lớp hoặc vào muộn nhiều lần mà không báo trước" },
  { value: "Quality", label: "Chất lượng chuyên môn không đúng", desc: "Kiến thức giảng dạy sai lệch hoặc không đúng như hồ sơ giới thiệu" },
  { value: "Harassment", label: "Quấy rối / Thiếu chuẩn mực", desc: "Có thái độ, ngôn từ hoặc hành vi không phù hợp chuẩn mực sư phạm" },
  { value: "Fraud", label: "Yêu cầu chuyển tiền ngoài", desc: "Gợi ý hoặc ép học viên giao dịch ngoài hệ thống để trốn bảo đảm" },
  { value: "Safety", label: "Vi phạm an toàn cộng đồng", desc: "Gây mất an toàn hoặc vi phạm nghiêm trọng chính sách TSG" },
  { value: "Other", label: "Lý do khác", desc: "Các vấn đề phát sinh khác trong quá trình học" },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType = "Review", // "Review" | "Student" | "Tutor"
  targetId,
  targetName = "",
  subInfo = "",
  onSuccess,
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceMode, setEvidenceMode] = useState("file"); // "file" | "link"
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("Dung lượng tệp vượt quá 25MB. Vui lòng chọn tệp nhỏ hơn.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const res = await uploadReportEvidence(file);
      setUploadedFile({
        url: res.url,
        fileName: res.fileName,
        fileSize: res.fileSize,
        isImage: res.isImage,
      });
      setEvidence(res.url);
    } catch (err) {
      setError(err.response?.data?.message || "Tải tệp bằng chứng thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setEvidence("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  const isReview = targetType === "Review";
  const isStudent = targetType === "Student" || targetType === "User";
  const reasonList = isReview ? REVIEW_REASONS : isStudent ? STUDENT_REASONS : TUTOR_REASONS;

  const title = isReview
    ? "Báo cáo đánh giá sai sự thật"
    : isStudent
    ? "Báo cáo học viên vi phạm"
    : "Báo cáo gia sư vi phạm";

  const targetLabel = isReview
    ? "Đánh giá đang bị báo cáo"
    : isStudent
    ? "Học viên bị báo cáo"
    : "Gia sư bị báo cáo";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!reason) {
      setError("Vui lòng chọn lý do báo cáo.");
      return;
    }
    if (!description.trim()) {
      setError("Vui lòng nhập mô tả chi tiết sự việc để Quản trị viên nắm rõ.");
      return;
    }
    if (!evidence.trim()) {
      setError("Bắt buộc cung cấp bằng chứng (link ảnh chụp màn hình, tin nhắn, biên lai...).");
      return;
    }

    setBusy(true);
    try {
      await createReport({
        entityType: targetType,
        entityId: Number(targetId),
        reason,
        description: description.trim(),
        evidence: evidence.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể gửi báo cáo. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-red-50/50 via-white to-amber-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold shadow-2xs border border-red-200">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-500">Gửi Quản trị viên TSG xem xét và xử lý minh bạch</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="text-base font-bold text-slate-900">Đã gửi báo cáo thành công</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Quản trị viên đã nhận được yêu cầu và bằng chứng của bạn. Đánh giá sai sự thật sẽ được rà soát và xóa bỏ theo quy định.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Thông tin đối tượng bị báo cáo */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {targetLabel}
                </span>
                <p className="font-bold text-slate-900 text-sm">{targetName || `#${targetId}`}</p>
                {subInfo && <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">"{subInfo}"</p>}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Lý do báo cáo (Bắt buộc) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Lý do báo cáo <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {reasonList.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                        reason === r.value
                          ? "bg-red-50/60 border-red-300 ring-1 ring-red-300 text-slate-900"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-0.5 text-red-600"
                      />
                      <div>
                        <span className="font-semibold block">{r.label}</span>
                        <span className="text-[11px] text-slate-400 block">{r.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Chi tiết sự việc / Lý do cụ thể (Bắt buộc) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Mô tả chi tiết sự việc <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isReview
                      ? "Giải thích rõ tại sao đánh giá này sai sự thật, buổi học thực tế diễn ra như thế nào..."
                      : "Mô tả hành vi vi phạm cụ thể của học viên trong buổi học hoặc trao đổi..."
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-400 placeholder:text-slate-400"
                />
              </div>

              {/* 3. Bằng chứng đính kèm (Bắt buộc) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    3. Bằng chứng xác thực (Ảnh chụp / File tài liệu) <span className="text-red-500">*</span>
                  </label>

                  {/* Chuyển đổi giữa Tải file lên hoặc Dán link */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setEvidenceMode("file")}
                      className={`px-2.5 py-0.5 rounded-md transition flex items-center gap-1 ${
                        evidenceMode === "file"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <UploadCloud size={12} />
                      Tải ảnh / File
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvidenceMode("link")}
                      className={`px-2.5 py-0.5 rounded-md transition flex items-center gap-1 ${
                        evidenceMode === "link"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <LinkIcon size={12} />
                      Dán link
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 mb-2 text-[11px] text-amber-900 flex items-start gap-2">
                  <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Bắt buộc cung cấp ảnh chụp màn hình (Zalo, tin nhắn, ca dạy), file tài liệu hoặc link đối chiếu để Admin có căn cứ xử lý và gỡ bỏ.
                  </span>
                </div>

                {evidenceMode === "file" ? (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.mp4,.mov"
                      className="hidden"
                    />

                    {uploading ? (
                      <div className="p-6 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/30 flex flex-col items-center justify-center gap-2 text-center">
                        <Loader2 size={24} className="animate-spin text-red-600" />
                        <span className="text-xs font-bold text-slate-700">Đang tải tệp bằng chứng lên hệ thống...</span>
                        <span className="text-[11px] text-slate-400">Vui lòng chờ trong giây lát</span>
                      </div>
                    ) : uploadedFile ? (
                      <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-center gap-3">
                        {uploadedFile.isImage ? (
                          <img
                            src={uploadedFile.url.startsWith("/") ? `${API_ORIGIN}${uploadedFile.url}` : uploadedFile.url}
                            alt="Bằng chứng"
                            className="w-14 h-14 object-cover rounded-xl border border-emerald-300 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
                            <FileText size={24} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">{uploadedFile.fileName}</p>
                          <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                            <Check size={12} className="text-emerald-600" />
                            {(uploadedFile.fileSize / 1024).toFixed(1)} KB • Đã đính kèm thành công
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={removeUploadedFile}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Xóa tệp đính kèm này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-red-400 hover:bg-red-50/20 cursor-pointer transition text-center flex flex-col items-center justify-center gap-1.5 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-red-100 text-slate-500 group-hover:text-red-600 flex items-center justify-center transition">
                          <UploadCloud size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-700 group-hover:text-red-700 transition">
                          Nhấn để chọn ảnh / file hoặc kéo thả vào đây
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Ảnh chụp (PNG, JPG, WEBP), Tài liệu (PDF, Word, Excel, ZIP), Video (tối đa 25MB)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      placeholder="Dán link Google Drive, Imgur, Zoom, hoặc link tài liệu chứng minh..."
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {busy ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Flag size={14} />
                      Gửi báo cáo cho Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
