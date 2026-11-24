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

export async function listMyGroupFeed() {
  const res = await axiosClient.get("/study-groups/feed/home");
  return res.data;
}

export async function listGroupFeed(keyword) {
  const res = await axiosClient.get("/study-groups/feed", { params: keyword ? { keyword } : {} });
  return res.data;
}

export async function createGroupFeed(payload) {
  const res = await axiosClient.post("/study-groups/feed", payload);
  return res.data;
}

export async function getGroupFeed(groupId) {
  const res = await axiosClient.get(`/study-groups/${groupId}/feed`);
  return res.data;
}

export async function requestGroupJoin(groupId, message) {
  const res = await axiosClient.post(`/study-groups/${groupId}/feed/join`, { message: message || "" });
  return res.data;
}

export async function moderateGroupJoin(groupId, userId, accept) {
  const res = await axiosClient.post(`/study-groups/${groupId}/feed/requests/${userId}`, { accept });
  return res.data;
}

export async function publishGroupPost(groupId, { body, files }) {
  const data = new FormData();
  if (body) data.append("body", body);
  (files || []).forEach((file) => data.append("files", file));
  const res = await axiosClient.post(`/study-groups/${groupId}/feed/posts`, data);
  return res.data;
}

export async function reviewGroupPost(groupId, postId, accept) {
  const res = await axiosClient.post(`/study-groups/${groupId}/feed/posts/${postId}/review`, { accept });
  return res.data;
}

export async function publishGroupComment(groupId, postId, { body, files, parentCommentId }) {
  const data = new FormData();
  if (body) data.append("body", body);
  if (parentCommentId) data.append("parentCommentId", String(parentCommentId));
  (files || []).forEach((file) => data.append("files", file));
  const res = await axiosClient.post(`/study-groups/${groupId}/feed/posts/${postId}/comments`, data);
  return res.data;
}

export async function reportGroupPost(groupId, postId, payload) {
  const res = await axiosClient.post(`/study-groups/${groupId}/feed/posts/${postId}/report`, payload);
  return res.data;
}

export async function reportGroupComment(groupId, commentId, payload) {
  const res = await axiosClient.post(`/study-groups/${groupId}/feed/comments/${commentId}/report`, payload);
  return res.data;
}

export async function removeStudyGroupMember(groupId, userId) {
  const res = await axiosClient.post(`/study-groups/${groupId}/members/${userId}/remove`);
  return res.data;
}
