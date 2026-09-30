import axiosClient from "./axiosClient";

export async function getNotifications() {
  const res = await axiosClient.get("/notifications");
  return res.data;
}

export async function markNotificationRead(id) {
  await axiosClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await axiosClient.post("/notifications/read-all");
}

export async function getConversations() {
  const res = await axiosClient.get("/conversations");
  return res.data;
}

export async function openConversation(otherUserId, bookingId) {
  const res = await axiosClient.post("/conversations", { otherUserId, bookingId: bookingId || null });
  return res.data.conversationId;
}

export async function getMessages(conversationId) {
  const res = await axiosClient.get(`/conversations/${conversationId}/messages`);
  return res.data;
}

export async function sendMessage(conversationId, content) {
  const res = await axiosClient.post(`/conversations/${conversationId}/messages`, { content });
  return res.data;
}

export async function getMyBookings() {
  const res = await axiosClient.get("/bookings/mine");
  return res.data;
}

export async function confirmBooking(id) {
  const res = await axiosClient.post(`/bookings/${id}/confirm`);
  return res.data;
}

export async function rejectBooking(id) {
  const res = await axiosClient.post(`/bookings/${id}/reject`);
  return res.data;
}

export async function getMyProfile() {
  const res = await axiosClient.get("/auth/me");
  return res.data;
}

export async function updateMyProfile(payload) {
  const res = await axiosClient.put("/auth/profile", payload);
  return res.data;
}

export async function completeOnboarding(payload) {
  const res = await axiosClient.post("/auth/complete-onboarding", payload);
  return res.data;
}

export async function changePassword(payload) {
  const res = await axiosClient.post("/auth/change-password", payload);
  return res.data;
}

export async function getTutorWorkspace() {
  const res = await axiosClient.get("/tutor/me");
  return res.data;
}

export async function updateTutorWorkspace(payload) {
  const res = await axiosClient.put("/tutor/me", payload);
  return res.data;
}

export async function uploadTutorCertificate(formData) {
  const res = await axiosClient.post("/tutor/me/certificates", formData);
  return res.data;
}

export async function deleteTutorCertificate(id) {
  const res = await axiosClient.delete(`/tutor/me/certificates/${id}`);
  return res.data;
}

export async function createTutorSlot(payload) {
  const res = await axiosClient.post("/tutor/me/slots", payload);
  return res.data;
}

export async function deleteTutorSlot(id) {
  const res = await axiosClient.delete(`/tutor/me/slots/${id}`);
  return res.data;
}

export async function getTutorInvites() {
  const res = await axiosClient.get("/tutor/me/invites");
  return res.data;
}

export async function respondTutorInvite(groupId, accept) {
  const res = await axiosClient.post(`/tutor/me/invites/${groupId}/respond`, { accept });
  return res.data;
}
