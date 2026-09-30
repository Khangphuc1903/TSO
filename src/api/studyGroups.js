import axiosClient from "./axiosClient";

export async function searchStudyGroups(params = {}) {
  const res = await axiosClient.get("/study-groups", { params });
  return res.data;
}

export async function getStudyGroup(id) {
  const res = await axiosClient.get(`/study-groups/${id}`);
  return res.data;
}

export async function createStudyGroup(payload) {
  const res = await axiosClient.post("/study-groups", payload);
  return res.data;
}

export async function joinStudyGroup(id, message) {
  const res = await axiosClient.post(`/study-groups/${id}/join`, { message });
  return res.data;
}

export async function respondJoinRequest(groupId, applicantId, accept) {
  const res = await axiosClient.post(`/study-groups/${groupId}/join-requests/${applicantId}/respond`, { accept });
  return res.data;
}

export async function inviteTutorToGroup(id, tutorId, inviteMessage) {
  const res = await axiosClient.post(`/study-groups/${id}/invite-tutor`, { tutorId, inviteMessage });
  return res.data;
}

export async function getMyStudyGroupChats() {
  const res = await axiosClient.get("/study-groups/mine");
  return res.data;
}

export async function getStudyGroupMessages(id) {
  const res = await axiosClient.get(`/study-groups/${id}/messages`);
  return res.data;
}

export async function sendStudyGroupMessage(id, content) {
  const res = await axiosClient.post(`/study-groups/${id}/messages`, { content });
  return res.data;
}
