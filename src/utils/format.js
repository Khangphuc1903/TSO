export function formatVnd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0 ₫";
  return `${Math.round(n).toLocaleString("vi-VN")} ₫`;
}

export function fileHref(path, origin) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = origin || "";
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function slotHours(slot) {
  if (!slot?.startTime || !slot?.endTime) return 1;
  const [sh, sm] = String(slot.startTime).split(":").map(Number);
  const [eh, em] = String(slot.endTime).split(":").map(Number);
  const hours = (eh * 60 + (em || 0) - (sh * 60 + (sm || 0))) / 60;
  return hours > 0 ? hours : 1;
}
