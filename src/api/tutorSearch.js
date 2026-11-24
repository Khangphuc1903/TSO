import axiosClient, { API_ORIGIN } from "./axiosClient";
import { avatarUrl } from "../auth";
import { fileHref } from "../utils/format";

export function mapTutor(item) {
  const price = item.hourlyRate ?? item.hourlyRateMin ?? item.hourlyRateMax ?? 0;
  const tags = Array.isArray(item.subjects) ? item.subjects : [];
  const verified = (item.verificationStatus || "").toLowerCase().includes("verif");

  return {
    id: item.tutorId,
    name: item.fullName || "Gia sư",
    university: item.university || "",
    degree: item.major || "",
    tier: verified ? "Verified" : item.verificationStatus || "",
    rating: Number(item.averageRating || 0),
    reviews: Number(item.totalReviews || 0),
    bio: item.bio || "",
    tags,
    subject: tags[0] || item.major || "Tutor",
    price,
    photoUrl: fileHref(item.avatarUrl, API_ORIGIN) || avatarUrl(item.fullName || item.email),
    city: item.city || "",
    district: item.district || "",
    teachingMode: item.teachingMode || "",
    yearsOfExperience: item.yearsOfExperience ?? 0,
    hourlyRate: price,
    hourlyRateMin: price,
    hourlyRateMax: price,
    phoneNumber: item.phoneNumber || "",
    address: item.address || "",
    verificationStatus: item.verificationStatus || "",
    subjectDetails: item.subjectDetails || [],
    certificates: item.certificates || [],
    availableSlots: item.availableSlots || [],
  };
}

export async function getTutorDetail(tutorId) {
  const res = await axiosClient.get(`/TutorSearch/${tutorId}`);
  return mapTutor(res.data);
}

export async function searchTutors(params = {}) {
  const res = await axiosClient.get("/TutorSearch/search", { params });
  const items = res.data?.items || [];
  return {
    totalCount: res.data?.totalCount ?? items.length,
    items: items.map(mapTutor),
    message: res.data?.message || "",
  };
}

export async function getDefaultTutors() {
  const res = await axiosClient.get("/TutorSearch");
  const items = res.data?.items || [];
  return items.map(mapTutor);
}

function foldSubject(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SUBJECT_LABELS = {
  toan: "Toán",
  "tieng viet": "Tiếng Việt",
  "ngu van": "Ngữ Văn",
  "tieng anh": "Tiếng Anh",
  ielts: "IELTS",
  "vat ly": "Vật Lý",
  "hoa hoc": "Hóa Học",
  "sinh hoc": "Sinh Học",
};

function subjectKey(name) {
  const folded = foldSubject(name);
  if (folded === "van" || folded === "ngu van") return "ngu van";
  return folded;
}

export function displaySubjectName(name) {
  return SUBJECT_LABELS[subjectKey(name)] || name;
}

export async function getSubjects() {
  const res = await axiosClient.get("/TutorSearch/subjects");
  const items = res.data?.items || [];
  const map = new Map();
  for (const item of items) {
    const key = subjectKey(item.subjectName);
    const named = { ...item, subjectName: displaySubjectName(item.subjectName) };
    const prev = map.get(key);
    if (!prev || foldSubject(item.subjectName) === "ngu van") map.set(key, named);
  }
  const order = ["toan", "tieng viet", "ngu van", "tieng anh", "ielts", "vat ly", "hoa hoc", "sinh hoc"];
  return [...map.values()].sort((a, b) => {
    const ia = order.indexOf(subjectKey(a.subjectName));
    const ib = order.indexOf(subjectKey(b.subjectName));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}
