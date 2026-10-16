import axiosClient from "./axiosClient";

export async function getNotifications() {
  const res = await axiosClient.get("/notifications");
  return res.data;
}

export function emitInboxUpdated() {
  window.dispatchEvent(new Event("inbox-updated"));
}

export async function getInboxBadges() {
  const [n, c] = await Promise.all([
    axiosClient.get("/notifications/unread-count"),
    axiosClient.get("/conversations/unread-count"),
  ]);
  return {
    notifications: Number(n.data?.count || 0),
    conversations: Number(c.data?.count || 0),
  };
}

export async function markNotificationRead(id) {
  await axiosClient.post(`/notifications/${id}/read`);
  emitInboxUpdated();
}

export async function markAllNotificationsRead() {
  await axiosClient.post("/notifications/read-all");
  emitInboxUpdated();
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
  emitInboxUpdated();
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

export async function completeBooking(id) {
  const res = await axiosClient.post(`/bookings/${id}/complete`);
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

export async function uploadMyAvatar(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await axiosClient.post("/auth/avatar", form);
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

export async function becomeTutor() {
  const res = await axiosClient.post("/auth/become-tutor");
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

export async function getTutorTestCatalog() {
  const res = await axiosClient.get("/tutor/me/tests/catalog");
  return Array.isArray(res.data) ? res.data : [];
}

export async function getTutorTestHistory() {
  const res = await axiosClient.get("/tutor/me/tests/history");
  return Array.isArray(res.data) ? res.data : [];
}

export async function registerTutorTest(payload) {
  const res = await axiosClient.post("/tutor/me/tests/register", payload);
  return res.data;
}

export async function getTutorTestCommon() {
  const res = await axiosClient.get("/tutor/me/tests/common");
  return Array.isArray(res.data) ? res.data : [];
}

export async function getTutorTestQuestions(subjectId, gradeLevel, testType) {
  const res = await axiosClient.get("/tutor/me/tests/questions", {
    params: { subjectId, gradeLevel, testType },
    timeout: 30000,
  });
  return res.data;
}

export async function submitTutorTest(payload) {
  const res = await axiosClient.post("/tutor/me/tests/submit", payload, { timeout: 30000 });
  return res.data;
}

export async function getTutorIdentity() {
  const res = await axiosClient.get("/tutor/me/identity");
  return res.data;
}

export async function getEkycConfig() {
  const res = await axiosClient.get("/tutor/me/identity/ekyc-config");
  return res.data;
}

export async function applyEkycResult(payload) {
  const res = await axiosClient.post("/tutor/me/identity/ekyc-result", payload, { timeout: 120000 });
  return res.data;
}

export async function uploadIdentityCard(front, back) {
  const form = new FormData();
  if (front) form.append("front", front);
  if (back) form.append("back", back);
  const res = await axiosClient.post("/tutor/me/identity/card", form, { timeout: 120000 });
  return res.data;
}

export async function applyIdentityProfile(payload) {
  const res = await axiosClient.put("/tutor/me/identity/profile", payload);
  return res.data;
}

export async function verifyIdentityFace(selfie) {
  const form = new FormData();
  form.append("selfie", selfie);
  const res = await axiosClient.post("/tutor/me/identity/face", form, { timeout: 50000 });
  return res.data;
}

export async function deleteIdentityCard(side) {
  const res = await axiosClient.delete("/tutor/me/identity/card", { params: { side } });
  return res.data;
}

export async function deleteIdentityFace() {
  const res = await axiosClient.delete("/tutor/me/identity/face");
  return res.data;
}
