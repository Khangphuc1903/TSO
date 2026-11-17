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

export async function getBidBoard() {
  const res = await axiosClient.get("/study-groups/bids/board");
  return res.data;
}

export async function getMyBids() {
  const res = await axiosClient.get("/study-groups/bids/mine");
  return res.data;
}

export async function placeStudyGroupBid(id, payload) {
  const res = await axiosClient.post(`/study-groups/${id}/bids`, payload);
  return res.data;
}

export async function withdrawStudyGroupBid(id) {
  const res = await axiosClient.post(`/study-groups/${id}/bids/withdraw`);
  return res.data;
}

export async function voteStudyGroupBid(groupId, bidId) {
  const res = await axiosClient.post(`/study-groups/${groupId}/bids/${bidId}/vote`);
  return res.data;
}

export async function selectStudyGroupBid(groupId, bidId) {
  const res = await axiosClient.post(`/study-groups/${groupId}/bids/${bidId}/select`);
  return res.data;
}

export async function inviteTutorToGroup(id, tutorId, inviteMessage) {
  const res = await axiosClient.post(`/study-groups/${id}/invite-tutor`, { tutorId, inviteMessage });
  return res.data;
}

export async function getMyStudyDesk() {
  const res = await axiosClient.get("/study-groups/my-desk");
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

export async function sendStudyGroupAttachment(id, { content, file }) {
  const data = new FormData();
  if (content) data.append("content", content);
  data.append("file", file);
  const res = await axiosClient.post(`/study-groups/${id}/messages/attachment`, data);
  return res.data;
}

export async function removeStudyGroupMember(groupId, userId) {
  const res = await axiosClient.post(`/study-groups/${groupId}/members/${userId}/remove`);
  return res.data;
}
