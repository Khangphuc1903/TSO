export const STUDY_LEVELS = [
  {
    value: "Tiểu học",
    grade: "Cấp 1",
    grades: "Lớp 1 – 5",
    hint: "Chỉ học cùng bạn tiểu học",
  },
  {
    value: "THCS",
    grade: "Cấp 2",
    grades: "Lớp 6 – 9",
    hint: "Chỉ học cùng bạn THCS",
  },
  {
    value: "THPT",
    grade: "Cấp 3",
    grades: "Lớp 10 – 12",
    hint: "Chỉ học cùng bạn THPT",
  },
];

export function levelLabel(value) {
  return STUDY_LEVELS.find((item) => item.value === value)?.grade || value || "";
}

export function splitStudyCopy(description) {
  const text = (description || "").trim();
  if (!text) return { goal: "", note: "" };
  const [goal, ...rest] = text.split(/\n\n+/);
  return { goal: goal.trim(), note: rest.join("\n\n").trim() };
}
