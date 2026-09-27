import axiosClient from "./axiosClient";
import { avatarUrl } from "../auth";

export function mapTutor(item) {
  const price = item.hourlyRateMin ?? item.hourlyRateMax ?? 0;
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
    photoUrl: item.avatarUrl || avatarUrl(item.fullName || item.email),
    city: item.city || "",
    district: item.district || "",
    teachingMode: item.teachingMode || "",
    yearsOfExperience: item.yearsOfExperience ?? 0,
    hourlyRateMin: item.hourlyRateMin,
    hourlyRateMax: item.hourlyRateMax,
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

export async function getSubjects() {
  const res = await axiosClient.get("/TutorSearch/subjects");
  return res.data?.items || [];
}
