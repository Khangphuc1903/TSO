import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const ITEMS = [
  { q: "Làm sao trở thành gia sư?", a: "Đăng ký / Google, chọn vai trò Gia sư, xác thực CCCD, đạt bài test chuyên môn, rồi mở lịch dạy." },
  { q: "Thanh toán hoạt động thế nào?", a: "Học viên thanh toán qua PayOS (VietQR). Buổi học được xác nhận bởi gia sư; hoàn tiền theo chính sách hủy trên Admin." },
  { q: "CCCD được xử lý ra sao?", a: "Ảnh CCCD gửi VNPT eKYC để OCR và so khớp khuôn mặt. Admin duyệt các ca điểm thấp hoặc bị từ chối tự động." },
  { q: "Bị khóa tài khoản thì sao?", a: "Admin khóa khi có báo cáo nghiêm trọng. Liên hệ form Contact kèm email đã đăng ký để được xem xét mở khóa." },
  { q: "Nhóm học có mất phí?", a: "Tham gia / tạo nhóm học trên TSG không thu phí nền tảng. Mentoring 1-1 với gia sư mới tính theo lịch booking." },
];

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold text-slate-900">FAQ / Trung tâm trợ giúp</h1>
        <p className="text-slate-500 mt-2 text-sm">Câu hỏi thường gặp về xác thực, thanh toán và an toàn.</p>
        <div className="mt-8 space-y-2">
          {ITEMS.map((item, i) => (
            <button
              key={item.q}
              type="button"
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full text-left bg-white rounded-2xl border px-4 py-3"
            >
              <span className="flex justify-between gap-3 font-medium text-slate-900">
                {item.q}
                <ChevronDown size={16} className={`mt-1 ${open === i ? "rotate-180" : ""}`} />
              </span>
              {open === i && <p className="text-sm text-slate-600 mt-2">{item.a}</p>}
            </button>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
