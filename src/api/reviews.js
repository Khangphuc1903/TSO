import axiosClient from "./axiosClient";

export async function getTutorReviews(tutorId) {
  const res = await axiosClient.get(`/reviews/tutor/${tutorId}`);
  return res.data;
}

export async function createTutorReview(tutorId, payload) {
  const res = await axiosClient.post(`/reviews/tutor/${tutorId}`, payload);
  return res.data;
}

export async function getEligibleReviewBookings(tutorId) {
  const res = await axiosClient.get(`/reviews/tutor/${tutorId}/eligible`);
  return res.data;
}
