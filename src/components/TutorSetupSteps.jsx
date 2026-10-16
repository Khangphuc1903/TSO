import { Check, ClipboardList, CalendarClock, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";

export default function TutorSetupSteps({ passedTestCount = 0, identityCompleted = false, current = "tests" }) {
  const testsDone = passedTestCount > 0;
  const steps = [
    {
      id: "identity",
      n: 1,
      title: "Xác thực danh tính",
      desc: identityCompleted
        ? "Đã hoàn tất CCCD và khuôn mặt."
        : "Upload CCCD, điền hồ sơ, so khớp khuôn mặt.",
      done: identityCompleted,
      to: "/tutor-identity",
    },
    {
      id: "tests",
      n: 2,
      title: "Bài kiểm tra chuyên môn",
      desc: testsDone
        ? `Đã đạt ${passedTestCount} bài chuyên môn. Làm tiếp an toàn và sư phạm.`
        : "Chọn THCS/THPT, xác nhận môn, làm đề 25 phút rồi bài an toàn và sư phạm.",
      done: testsDone,
      to: "/tutor-tests",
    },
    {
      id: "schedule",
      n: 3,
      title: "Mở lịch dạy",
      desc:
        testsDone && identityCompleted
          ? "Đã đủ điều kiện thêm lịch trống."
          : "Khóa đến khi xác thực CCCD và đạt ít nhất 1 bài test.",
      done: testsDone && identityCompleted,
      to: testsDone && identityCompleted ? "/tutor" : undefined,
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-3">
      {steps.map((s) => {
        const active = current === s.id;
        const Icon = s.id === "identity" ? ScanLine : s.id === "tests" ? ClipboardList : CalendarClock;
        const inner = (
          <div
            className={`h-full rounded-2xl border p-4 transition-colors ${
              s.done
                ? "border-emerald-200 bg-emerald-50/70"
                : active
                  ? "border-brand-200 bg-brand-50"
                  : "border-slate-100 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  s.done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {s.done ? <Check size={16} /> : s.n}
              </span>
              <Icon size={18} className={s.done ? "text-emerald-600" : "text-brand-600"} />
            </div>
            <p className="mt-3 font-semibold text-slate-900 text-sm">{s.title}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
          </div>
        );
        if (s.to) {
          return (
            <Link key={s.id} to={s.to} className="block h-full">
              {inner}
            </Link>
          );
        }
        return (
          <div key={s.id} className="h-full">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
