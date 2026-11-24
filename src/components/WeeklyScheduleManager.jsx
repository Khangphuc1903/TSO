import { useMemo, useState } from "react";
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createTutorSlot, updateTutorSlot, deleteTutorSlot } from "../api/study";

const WEEKDAYS = [
  { v: 1, label: "Thứ 2", short: "T2" },
  { v: 2, label: "Thứ 3", short: "T3" },
  { v: 3, label: "Thứ 4", short: "T4" },
  { v: 4, label: "Thứ 5", short: "T5" },
  { v: 5, label: "Thứ 6", short: "T6" },
  { v: 6, label: "Thứ 7", short: "T7" },
  { v: 7, label: "Chủ nhật", short: "CN" },
];

function calculateDuration(start, end) {
  if (!start || !end) return "";
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  const diffMinutes = eH * 60 + eM - (sH * 60 + sM);
  if (diffMinutes <= 0) return "Giờ kết thúc phải sau giờ bắt đầu";
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (mins === 0) return `${hours} tiếng`;
  if (hours === 0) return `${mins} phút`;
  return `${hours} tiếng ${mins} phút`;
}

export default function WeeklyScheduleManager({
  slots = [],
  onChanged = () => {},
  canEdit = true,
  className = "",
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Modal State cho Thêm / Chỉnh sửa ca học
  const [editingSlot, setEditingSlot] = useState(null); // null = đóng, {} = modal mở
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [formState, setFormState] = useState({
    dayOfWeek: 1,
    startTime: "18:00",
    endTime: "20:00",
  });
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Chuẩn hóa và gom nhóm các ca dạy theo từng Thứ (Thứ 2 đến Chủ nhật)
  const slotsByDay = useMemo(() => {
    const map = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

    for (const slot of slots) {
      let dow = slot.dayOfWeek;
      // Nếu slot cũ có specificDate mà thiếu dayOfWeek
      if ((dow == null || dow < 1 || dow > 7) && slot.specificDate) {
        const parts = slot.specificDate.split("-");
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const jsDay = d.getDay();
          dow = jsDay === 0 ? 7 : jsDay;
        }
      }
      const safeDow = dow >= 1 && dow <= 7 ? dow : 1;
      if (map[safeDow]) {
        map[safeDow].push({
          ...slot,
          resolvedDayOfWeek: safeDow,
        });
      }
    }

    // Sắp xếp các ca trong từng Thứ theo giờ bắt đầu
    for (let d = 1; d <= 7; d++) {
      map[d].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }

    return map;
  }, [slots]);

  // Thống kê tổng số ca và số ngày có ca
  const stats = useMemo(() => {
    let totalSlots = 0;
    let activeDays = 0;
    for (let d = 1; d <= 7; d++) {
      const count = slotsByDay[d]?.length || 0;
      totalSlots += count;
      if (count > 0) activeDays++;
    }
    return { totalSlots, activeDays };
  }, [slotsByDay]);

  // Mở modal thêm ca cho một thứ cụ thể
  const handleOpenAdd = (dayOfWeek = 1) => {
    setModalMode("add");
    setEditingSlot({});
    setFormState({
      dayOfWeek: Number(dayOfWeek),
      startTime: "18:00",
      endTime: "20:00",
    });
    setModalError("");
  };

  // Mở modal chỉnh sửa ca đã có
  const handleOpenEdit = (slot) => {
    setModalMode("edit");
    setEditingSlot(slot);
    setFormState({
      dayOfWeek: slot.resolvedDayOfWeek || slot.dayOfWeek || 1,
      startTime: slot.startTime || "18:00",
      endTime: slot.endTime || "20:00",
    });
    setModalError("");
  };

  // Lưu ca dạy (Thêm mới hoặc Cập nhật)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!formState.startTime || !formState.endTime) {
      setModalError("Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc.");
      return;
    }
    if (formState.endTime <= formState.startTime) {
      setModalError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        await createTutorSlot({
          isRecurring: true,
          dayOfWeek: Number(formState.dayOfWeek),
          specificDate: null,
          startTime: formState.startTime,
          endTime: formState.endTime,
        });
        setToastMessage(`Đã thêm ca dạy mới cho ${WEEKDAYS.find((w) => w.v === Number(formState.dayOfWeek))?.label}!`);
      } else {
        await updateTutorSlot(editingSlot.slotId, {
          isRecurring: true,
          dayOfWeek: Number(formState.dayOfWeek),
          specificDate: null,
          startTime: formState.startTime,
          endTime: formState.endTime,
        });
        setToastMessage("Đã cập nhật khung giờ dạy thành công!");
      }
      setEditingSlot(null);
      await onChanged();
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      setModalError(err.response?.data?.message || "Lỗi khi lưu khung giờ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa một ca dạy
  const handleDeleteSlot = async (slotId, label) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ca dạy (${label}) này?`)) return;
    try {
      await deleteTutorSlot(slotId);
      setToastMessage("Đã xóa khung giờ dạy.");
      await onChanged();
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa khung giờ này.");
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden mb-6 transition-all ${className}`}>
      {/* Header khu vực Lịch cố định tuần */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-brand-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Thu gọn/Mở rộng"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Calendar size={20} className="text-brand-600" />
                  Lịch dạy cố định hàng tuần (Thứ 2 – Chủ nhật)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {stats.totalSlots} ca dạy · {stats.activeDays}/7 ngày
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi Thứ có thể dạy nhiều ca khác nhau. Bạn có thể bấm <span className="font-semibold text-slate-700">Chỉnh sửa</span> để sửa giờ hoặc <span className="font-semibold text-slate-700">+ Thêm ca</span> bất cứ lúc nào.
              </p>
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => handleOpenAdd(1)}
              className="h-9 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Plus size={15} />
              Thêm ca dạy mới
            </button>
          )}
        </div>

        {toastMessage && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={15} className="text-emerald-600" />
            {toastMessage}
          </div>
        )}
      </div>

      {/* Nội dung danh sách 7 ngày trong tuần */}
      {isExpanded && (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {WEEKDAYS.map((day) => {
              const daySlots = slotsByDay[day.v] || [];
              const hasSlots = daySlots.length > 0;

              return (
                <div
                  key={day.v}
                  className={`rounded-2xl border p-3 flex flex-col justify-between transition-all ${
                    hasSlots
                      ? "bg-slate-50/50 border-slate-200/90 shadow-2xs hover:border-brand-300"
                      : "bg-white border-dashed border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Header ngày (Tên thứ + Badge số ca) */}
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            hasSlots ? "bg-brand-600 ring-2 ring-brand-100" : "bg-slate-300"
                          }`}
                        />
                        <span className="font-bold text-sm text-slate-900">{day.label}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          hasSlots
                            ? "bg-brand-50 text-brand-700 border border-brand-200"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {hasSlots ? `${daySlots.length} ca` : "Nghỉ"}
                      </span>
                    </div>

                    {/* Danh sách các ca học của Thứ đó */}
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.slotId}
                          className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs group hover:border-brand-300 transition-all"
                        >
                          {/* Khung giờ */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 flex items-center gap-1 text-[11px] sm:text-xs">
                              <Clock size={11} className="text-brand-600 shrink-0" />
                              {slot.startTime} – {slot.endTime}
                            </span>
                            {slot.isBooked && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                                Đã đặt
                              </span>
                            )}
                          </div>

                          {/* Thời lượng */}
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {calculateDuration(slot.startTime, slot.endTime)}
                          </div>

                          {/* Các nút sửa / xóa ca */}
                          {canEdit && (
                            <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(slot)}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-brand-700 hover:bg-brand-50 flex items-center gap-1 transition-colors"
                                title="Chỉnh sửa giờ ca này"
                              >
                                <Pencil size={11} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                disabled={slot.isBooked}
                                onClick={() =>
                                  handleDeleteSlot(
                                    slot.slotId,
                                    `${day.label} lúc ${slot.startTime}-${slot.endTime}`
                                  )
                                }
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                                title={slot.isBooked ? "Ca đã có người đặt, không thể xóa" : "Xóa ca này"}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {!hasSlots && (
                        <div className="py-3 text-center text-slate-400 text-xs italic">
                          Chưa có ca dạy
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nút thêm ca cho riêng Thứ này */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenAdd(day.v)}
                      className="mt-3 w-full py-1.5 px-2 rounded-xl border border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50/50 text-slate-600 hover:text-brand-700 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <Plus size={13} />
                      Thêm ca
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL THÊM / CHỈNH SỬA KHUNG GIỜ */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 relative">
            <button
              type="button"
              onClick={() => setEditingSlot(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-brand-600" />
              {modalMode === "add" ? "Thêm ca dạy cố định mới" : "Chỉnh sửa khung giờ dạy"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {modalMode === "add"
                ? "Chọn Thứ và đặt khoảng thời gian từ mấy giờ đến mấy giờ."
                : "Cập nhật lại Thứ hoặc khung thời gian cho ca học này."}
            </p>

            {modalError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} className="shrink-0" />
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Chọn thứ trong tuần */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thứ trong tuần
                </label>
                <select
                  value={formState.dayOfWeek}
                  onChange={(e) =>
                    setFormState({ ...formState, dayOfWeek: Number(e.target.value) })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                >
                  {WEEKDAYS.map((w) => (
                    <option key={w.v} value={w.v}>
                      {w.label} hàng tuần
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn giờ bắt đầu và giờ kết thúc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bắt đầu từ mấy giờ
                  </label>
                  <input
                    type="time"
                    required
                    value={formState.startTime}
                    onChange={(e) =>
                      setFormState({ ...formState, startTime: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đến mấy giờ
                  </label>
                  <input
                    type="time"
                    required
                    value={formState.endTime}
                    onChange={(e) =>
                      setFormState({ ...formState, endTime: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Tóm tắt thời lượng */}
              <div className="p-3 rounded-xl bg-brand-50/60 border border-brand-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Thời lượng ca học:</span>
                <span className="font-bold text-brand-700">
                  {calculateDuration(formState.startTime, formState.endTime)}
                </span>
              </div>

              {/* Nút lưu / hủy */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  {isSubmitting
                    ? "Đang lưu..."
                    : modalMode === "add"
                    ? "Thêm ca dạy"
                    : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
