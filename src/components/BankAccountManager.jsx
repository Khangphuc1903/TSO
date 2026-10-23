import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  QrCode,
  Download,
  Edit3,
  ShieldCheck,
  Loader2,
  Upload,
  Sparkles,
  X,
} from "lucide-react";
import { getBankAccount, saveBankAccount, uploadQrImage } from "../api/payment";
import { API_ORIGIN } from "../api/axiosClient";

export const VIETNAMESE_BANKS = [
  { code: "MB", bin: "970422", name: "MB Bank (Ngân hàng Quân Đội)" },
  { code: "VCB", bin: "970436", name: "Vietcombank (Ngoại Thương Việt Nam)" },
  { code: "TCB", bin: "970407", name: "Techcombank (Kỹ Thương Việt Nam)" },
  { code: "BIDV", bin: "970418", name: "BIDV (Đầu Tư & Phát Triển Việt Nam)" },
  { code: "ICB", bin: "970415", name: "VietinBank (Công Thương Việt Nam)" },
  { code: "ACB", bin: "970416", name: "ACB (Ngân hàng Á Châu)" },
  { code: "TPB", bin: "970423", name: "TPBank (Tiên Phong)" },
  { code: "VPB", bin: "970432", name: "VPBank (Việt Nam Thịnh Vượng)" },
  { code: "VBA", bin: "970405", name: "Agribank (Nông Nghiệp & PTNT)" },
  { code: "OCB", bin: "970448", name: "OCB (Phương Đông)" },
  { code: "STB", bin: "970403", name: "Sacombank (Sài Gòn Thương Tín)" },
  { code: "VIB", bin: "970441", name: "VIB (Quốc Tế)" },
  { code: "SHB", bin: "970443", name: "SHB (Sài Gòn - Hà Nội)" },
  { code: "HDB", bin: "970437", name: "HDBank (Phát Triển TP.HCM)" },
  { code: "MSB", bin: "970426", name: "MSB (Hàng Hải)" },
  { code: "LPB", bin: "970449", name: "LPBank (Bưu Điện Liên Việt)" },
  { code: "SEAB", bin: "970440", name: "SeABank (Đông Nam Á)" },
  { code: "BVB", bin: "970454", name: "BVBank (Bản Việt)" },
  { code: "CAKE", bin: "546034", name: "CAKE by VPBank" },
  { code: "TIMO", bin: "963388", name: "Timo by BVBank" },
];

/**
 * Chuẩn hóa URL hiển thị ảnh mã QR (hỗ trợ cả ảnh tĩnh lưu trên backend /uploads/qr/... lẫn url bên ngoài)
 */
export const resolveQrUrl = (url) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

/**
 * Phân tích chuỗi VietQR EMVCo (NAPAS) từ dữ liệu quét mã QR
 */
export function parseVietQrPayload(text) {
  if (!text || typeof text !== "string") return null;
  text = text.trim();

  const parseTLV = (str) => {
    const dict = {};
    let i = 0;
    while (i + 4 <= str.length) {
      const tag = str.substring(i, i + 2);
      const len = parseInt(str.substring(i + 2, i + 4), 10);
      if (isNaN(len) || i + 4 + len > str.length) break;
      dict[tag] = str.substring(i + 4, i + 4 + len);
      i += 4 + len;
    }
    return dict;
  };

  let bin = "";
  let accountNumber = "";
  let holderName = "";

  // 1. Phân tích chuẩn EMVCo VietQR
  if (text.startsWith("000201") || text.includes("A000000727")) {
    const root = parseTLV(text);
    if (root["59"]) holderName = root["59"].trim();

    const tag38Str = root["38"] || root["26"];
    if (tag38Str) {
      const tag38 = parseTLV(tag38Str);
      const sub01 = tag38["01"];
      if (sub01) {
        const nested = parseTLV(sub01);
        if (nested["00"]) bin = nested["00"];
        if (nested["01"]) accountNumber = nested["01"];
        if (!bin && /^\d{6}$/.test(sub01)) bin = sub01;
      }
      if (!accountNumber && tag38["02"] && /^\d+$/.test(tag38["02"])) {
        accountNumber = tag38["02"];
      }
    }

    if (!bin) {
      for (const b of VIETNAMESE_BANKS) {
        if (b.bin && text.includes(b.bin)) {
          bin = b.bin;
          break;
        }
      }
    }
  }

  // 2. Phân tích định dạng link VietQR (img.vietqr.io/image/970422-0909000002-...)
  if (!bin && (text.includes("vietqr") || text.includes("/image/"))) {
    const match = text.match(/image\/([0-9A-Za-z]+)-([0-9A-Za-z]+)/);
    if (match) {
      bin = match[1];
      accountNumber = match[2];
    }
    try {
      const parsedUrl = new URL(text);
      const nameParam = parsedUrl.searchParams.get("accountName");
      if (nameParam) holderName = decodeURIComponent(nameParam);
    } catch {}
  }

  const matchedBank = VIETNAMESE_BANKS.find(
    (b) => b.bin === bin || b.code.toUpperCase() === bin.toUpperCase()
  );

  return {
    bin,
    bank: matchedBank || null,
    accountNumber: accountNumber ? accountNumber.replace(/\s+/g, "") : "",
    holderName: holderName ? holderName.toUpperCase() : "",
    raw: text,
  };
}

/**
 * Quét mã QR từ file ảnh với BarcodeDetector (nếu có) hoặc jsQR Canvas
 */
export const scanImageFile = async (file) => {
  // 1. Thử BarcodeDetector (nếu trình duyệt Chromium hỗ trợ)
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const imgBitmap = await createImageBitmap(file);
      const barcodes = await barcodeDetector.detect(imgBitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fallback xuống jsQR
    }
  }

  // 2. Fallback sử dụng jsQR với HTML5 Canvas
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          let width = img.width;
          let height = img.height;
          // Scale ảnh tối ưu tốc độ nhận diện
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const imageData = ctx.getImageData(0, 0, width, height);
          let code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (!code || !code.data) {
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });
          }

          resolve(code && code.data ? code.data : null);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export default function BankAccountManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  // Upload & Scan state
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState("");
  const [useCustomQr, setUseCustomQr] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState(null); // { type: 'success' | 'warn' | 'error', message: '' }

  const [form, setForm] = useState({
    bankCode: "MB",
    bankName: "MB Bank (Ngân hàng Quân Đội)",
    accountNumber: "",
    accountHolderName: "",
    isDefault: true,
  });

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getBankAccount();
      if (data && data.accountNumber) {
        setAccount(data);
        setForm({
          bankCode: data.bankCode || "MB",
          bankName: data.bankName || "",
          accountNumber: data.accountNumber || "",
          accountHolderName: data.accountHolderName || "",
          isDefault: data.isDefault ?? true,
        });

        // Nếu tài khoản đã có ảnh QR tùy chỉnh tải lên (/uploads/qr/...)
        if (data.qrCodeUrl && data.qrCodeUrl.startsWith("/uploads/qr/")) {
          setUseCustomQr(true);
          setUploadedPreview(resolveQrUrl(data.qrCodeUrl));
        } else {
          setUseCustomQr(false);
        }

        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    } catch {
      setError("Không thể tải thông tin tài khoản ngân hàng.");
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBankChange = (e) => {
    const code = e.target.value;
    const found = VIETNAMESE_BANKS.find((b) => b.code === code);
    setForm((p) => ({
      ...p,
      bankCode: code,
      bankName: found ? found.name : code,
    }));
  };

  // Xử lý khi người dùng chọn tải ảnh mã QR lên
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn đúng tệp hình ảnh (PNG, JPG, WEBP).");
      return;
    }

    setError("");
    setScanNotice(null);
    setUploadedFile(file);
    const localUrl = URL.createObjectURL(file);
    setUploadedPreview(localUrl);
    setUseCustomQr(true);

    // Tiến hành quét tự động thông tin từ mã QR
    try {
      setScanning(true);
      const rawText = await scanImageFile(file);

      if (rawText) {
        const parsed = parseVietQrPayload(rawText);
        if (parsed && (parsed.bank || parsed.accountNumber || parsed.holderName)) {
          setForm((prev) => ({
            ...prev,
            bankCode: parsed.bank ? parsed.bank.code : prev.bankCode,
            bankName: parsed.bank ? parsed.bank.name : prev.bankName,
            accountNumber: parsed.accountNumber || prev.accountNumber,
            accountHolderName: parsed.holderName || prev.accountHolderName,
          }));

          setScanNotice({
            type: "success",
            message: `Quét mã QR thành công! Đã tự động nhận diện: ${
              parsed.bank ? parsed.bank.name : ""
            } ${parsed.accountNumber ? "• Số TK: " + parsed.accountNumber : ""} ${
              parsed.holderName ? "• Chủ TK: " + parsed.holderName : ""
            }`,
          });
        } else {
          setScanNotice({
            type: "warn",
            message:
              "Đã nhận diện mã QR trên ảnh! Vui lòng kiểm tra và hoàn thiện số tài khoản & tên bên dưới.",
          });
        }
      } else {
        setScanNotice({
          type: "warn",
          message:
            "Chưa quét được thông tin tự động từ ảnh này (ảnh có thể hơi mờ hoặc góc nghiêng). Đừng lo! Bạn chỉ cần gõ số tài khoản bên dưới, ảnh QR bạn tải lên vẫn sẽ được dùng để nhận tiền.",
        });
      }
    } catch {
      setScanNotice({
        type: "warn",
        message: "Không thể quét tự động. Vui lòng nhập số tài khoản & tên chủ thẻ thủ công.",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleClearUploadedQr = () => {
    setUploadedFile(null);
    setUploadedPreview("");
    setUseCustomQr(false);
    setScanNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Preview VietQR URL sinh động nếu người dùng chọn sinh mã tự động
  const selectedBank =
    VIETNAMESE_BANKS.find((b) => b.code === form.bankCode) || VIETNAMESE_BANKS[0];
  const cleanAccNum = form.accountNumber.trim().replace(/\s+/g, "");
  const cleanHolder = form.accountHolderName.trim().toUpperCase();

  const generatedVietQrUrl =
    cleanAccNum && cleanHolder
      ? `https://img.vietqr.io/image/${selectedBank.bin || form.bankCode}-${cleanAccNum}-compact2.png?accountName=${encodeURIComponent(
          cleanHolder
        )}`
      : "";

  // Link hiển thị cuối cùng trên Card xem trước
  const activePreviewUrl = useCustomQr ? uploadedPreview : generatedVietQrUrl;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!cleanAccNum) {
      setError("Vui lòng nhập số tài khoản ngân hàng.");
      return;
    }
    if (!cleanHolder) {
      setError("Vui lòng nhập họ và tên chủ tài khoản.");
      return;
    }

    try {
      setSaving(true);

      let finalQrCodeUrl = "";

      // 1. Nếu có upload file mới, đẩy file lên backend lưu trữ
      if (uploadedFile) {
        const uploadRes = await uploadQrImage(uploadedFile);
        if (uploadRes && uploadRes.url) {
          finalQrCodeUrl = uploadRes.url;
        }
      } else if (useCustomQr && account?.qrCodeUrl) {
        // Giữ lại link ảnh custom đã lưu trước đó
        finalQrCodeUrl = account.qrCodeUrl;
      }

      // 2. Lưu thông tin tài khoản ngân hàng
      const res = await saveBankAccount({
        bankCode: form.bankCode,
        bankName: form.bankName,
        accountNumber: cleanAccNum,
        accountHolderName: cleanHolder,
        qrCodeUrl: finalQrCodeUrl,
        isDefault: form.isDefault,
      });

      setAccount(res);
      setUploadedFile(null);
      if (res.qrCodeUrl && res.qrCodeUrl.startsWith("/uploads/qr/")) {
        setUseCustomQr(true);
        setUploadedPreview(resolveQrUrl(res.qrCodeUrl));
      } else {
        setUseCustomQr(false);
      }
      setIsEditing(false);
      setSuccess("Cập nhật thông tin tài khoản ngân hàng và mã QR nhận tiền thành công!");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể lưu thông tin tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
        <Loader2 size={20} className="animate-spin text-brand-600" />
        <span>Đang tải thông tin tài khoản ngân hàng...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard size={20} className="text-brand-600" />
            Tài khoản Ngân hàng &amp; Mã QR Thanh toán
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dùng để nhận tiền thù lao giảng dạy (Gia sư) hoặc nhận hoàn tiền tự động (Học sinh).
          </p>
        </div>

        {account && !isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setScanNotice(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-200 transition cursor-pointer"
          >
            <Edit3 size={14} /> Thay đổi tài khoản / Tải ảnh khác
          </button>
        )}
      </div>

      {/* ALERT MESSAGES */}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2 shadow-2xs">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* DISPLAY EXISTING ACCOUNT VIEW */}
      {account && !isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Card thông tin ngân hàng kiểu thẻ VIP */}
          <div className="md:col-span-7 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-8">
              <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold backdrop-blur border border-white/10 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                Tài khoản nhận tiền chính thức
              </span>
              <span className="text-xs font-black tracking-widest uppercase text-white/50">NAPAS 24/7</span>
            </div>

            <div className="mb-6">
              <p className="text-[11px] uppercase tracking-wider text-white/60 mb-1">Số tài khoản:</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black tracking-wider text-amber-300">
                  {account.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(account.accountNumber)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition cursor-pointer"
                  title="Sao chép số tài khoản"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60">Chủ tài khoản:</p>
                <p className="font-bold text-sm tracking-wide uppercase text-white mt-0.5">
                  {account.accountHolderName}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60">Ngân hàng:</p>
                <p className="font-bold text-sm text-white mt-0.5 truncate">{account.bankName}</p>
              </div>
            </div>
          </div>

          {/* Card mã QR cá nhân */}
          <div className="md:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 text-center shadow-xs">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
              <QrCode size={16} className="text-brand-600" />
              Mã QR nhận tiền của bạn
            </div>

            {account.qrCodeUrl ? (
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 inline-block shadow-2xs">
                  <img
                    src={resolveQrUrl(account.qrCodeUrl)}
                    alt="Mã QR nhận tiền"
                    className="w-48 h-auto max-h-56 mx-auto object-contain rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    {account.qrCodeUrl.startsWith("/uploads/qr/")
                      ? "Ảnh QR gốc do bạn tải lên"
                      : "Mã VietQR tự động sinh"}
                  </span>
                </div>

                <div>
                  <a
                    href={resolveQrUrl(account.qrCodeUrl)}
                    target="_blank"
                    rel="noreferrer"
                    download={`QR-${account.accountNumber}.png`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition"
                  >
                    <Download size={13} /> Tải mã QR về máy
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-8">Chưa có ảnh mã QR</p>
            )}

            <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
              Admin sẽ quét trực tiếp mã QR này khi duyệt giải ngân tiền thù lao cho bạn.
            </p>
          </div>
        </div>
      ) : (
        /* FORM CHỈNH SỬA / THÊM MỚI TÀI KHOẢN */
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-brand-600" />
                Thiết lập thông tin tài khoản
              </h3>
            </div>

            {/* KHU VỰC TẢI ẢNH MÃ QR TỰ ĐỘNG QUÉT THÔNG TIN */}
            <div className="bg-gradient-to-br from-brand-50/50 via-indigo-50/30 to-purple-50/30 p-4 rounded-2xl border border-brand-100/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-600" />
                  Tải ảnh mã QR ngân hàng của bạn lên
                </label>
                {useCustomQr && (
                  <button
                    type="button"
                    onClick={handleClearUploadedQr}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <X size={13} /> Bỏ ảnh, dùng mã sinh tự động
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Hệ thống sẽ <strong>tự động quét và điền</strong> số tài khoản, ngân hàng từ ảnh mã QR,
                đồng thời <strong>dùng luôn ảnh này</strong> làm mã nhận tiền của bạn thay vì sinh mã tự động.
              </p>

              {/* Input file ẩn */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Drag/Drop Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                  useCustomQr
                    ? "border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/50"
                    : "border-brand-200 hover:border-brand-400 bg-white hover:bg-brand-50/20"
                }`}
              >
                {scanning ? (
                  <div className="py-3 flex flex-col items-center justify-center gap-2 text-brand-700">
                    <Loader2 size={24} className="animate-spin text-brand-600" />
                    <span className="text-xs font-semibold">Đang nhận diện mã QR từ ảnh...</span>
                  </div>
                ) : useCustomQr && uploadedPreview ? (
                  <div className="flex items-center justify-center gap-4 py-1">
                    <img
                      src={uploadedPreview}
                      alt="Ảnh QR vừa chọn"
                      className="w-14 h-14 object-cover rounded-xl border border-emerald-200 shadow-2xs"
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Đã chọn ảnh mã QR của bạn
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Nhấn vào đây nếu muốn chọn ảnh khác từ máy
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col items-center justify-center gap-1.5 text-slate-600">
                    <div className="w-10 h-10 rounded-full bg-brand-100/80 text-brand-700 flex items-center justify-center shadow-2xs">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Bấm để chọn ảnh mã QR từ ngân hàng của bạn
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Hỗ trợ chụp màn hình app MB, Vietcombank, Techcombank, v.v... (JPG, PNG, WEBP)
                    </p>
                  </div>
                )}
              </div>

              {/* Thông báo kết quả quét mã QR */}
              {scanNotice && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    scanNotice.type === "success"
                      ? "bg-emerald-100/70 border border-emerald-200 text-emerald-900"
                      : "bg-amber-100/70 border border-amber-200 text-amber-900"
                  }`}
                >
                  {scanNotice.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-snug">{scanNotice.message}</span>
                </div>
              )}
            </div>

            {/* FORM FIELDS */}
            {/* Chọn ngân hàng */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ngân hàng thụ hưởng <span className="text-red-500">*</span>
              </label>
              <select
                value={form.bankCode}
                onChange={handleBankChange}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
              >
                {VIETNAMESE_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Số tài khoản */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số tài khoản ngân hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder="VD: 0909000002 hoặc 001100..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Chỉ nhập số, không bao gồm khoảng trắng hoặc ký tự đặc biệt.
              </p>
            </div>

            {/* Tên chủ tài khoản */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tên chủ tài khoản (In hoa không dấu) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.accountHolderName}
                onChange={(e) =>
                  setForm({ ...form, accountHolderName: e.target.value.toUpperCase() })
                }
                placeholder="VD: NGUYEN VAN A"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tên phải trùng khớp chính xác với tên đăng ký trên tài khoản ngân hàng.
              </p>
            </div>

            {/* Nút hành động */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || scanning}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 transition flex items-center gap-2 cursor-pointer"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {useCustomQr ? "Lưu tài khoản & Ảnh mã QR" : "Lưu tài khoản & Tạo mã VietQR"}
              </button>

              {account && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setScanNotice(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
              )}
            </div>
          </div>

          {/* PREVIEW MÃ QR LIVE */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 text-center shadow-xs space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-1 flex items-center justify-center gap-1.5">
                <QrCode size={15} className="text-brand-600" />
                {useCustomQr ? "Xem trước ảnh mã QR của bạn" : "Xem trước mã VietQR tự động sinh"}
              </h4>
              <p className="text-[11px] text-slate-400">
                {useCustomQr
                  ? "Hệ thống sẽ dùng trực tiếp ảnh này để Admin quét chuyển tiền cho bạn"
                  : "Mã QR này sẽ hiển thị cho Admin quét khi thanh toán tiền cho bạn"}
              </p>
            </div>

            {activePreviewUrl ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 inline-block shadow-2xs space-y-2">
                <img
                  src={activePreviewUrl}
                  alt="QR Preview"
                  className="w-48 h-auto max-h-56 mx-auto object-contain rounded-xl"
                />

                <div className="pt-2 border-t border-slate-200/60">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1 ${
                      useCustomQr
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {useCustomQr ? "Ảnh do bạn tải lên" : "Mã VietQR tự động sinh"}
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold">{form.bankName}</p>
                  <p className="font-mono text-xs font-bold text-slate-800">{cleanAccNum}</p>
                  <p className="text-xs font-extrabold text-brand-700 uppercase">{cleanHolder}</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs flex flex-col items-center justify-center min-h-[220px]">
                <QrCode size={36} className="text-slate-300 mb-2" />
                <p>Tải ảnh QR lên hoặc gõ số tài khoản</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Mã QR thanh toán sẽ tự động hiển thị tại đây
                </p>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
