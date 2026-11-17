import axiosClient from "./axiosClient";

export async function getSosConfig() {
  const res = await axiosClient.get("/sos/config");
  return res.data;
}

export async function createSosRequest({ subjectId, topicId, questionNote, image }) {
  const data = new FormData();
  data.append("subjectId", String(subjectId));
  if (topicId) data.append("topicId", String(topicId));
  if (questionNote) data.append("questionNote", questionNote);
  data.append("image", image);
  const res = await axiosClient.post("/sos/requests", data);
  return res.data;
}

export async function getMySosRequests() {
  const res = await axiosClient.get("/sos/requests/mine");
  return res.data;
}

export async function getOpenSosRequests() {
  const res = await axiosClient.get("/sos/requests/open");
  return res.data;
}

export async function claimSosRequest(requestId) {
  const res = await axiosClient.post(`/sos/requests/${requestId}/claim`);
  return res.data;
}

export async function getSosRequest(requestId) {
  const res = await axiosClient.get(`/sos/requests/${requestId}`);
  return res.data;
}

export async function setSosReady(isReady) {
  const res = await axiosClient.put("/sos/ready", { isReady });
  return res.data;
}

export async function getSosReady() {
  const res = await axiosClient.get("/sos/ready");
  return res.data;
}

export async function sosHeartbeat() {
  await axiosClient.post("/sos/heartbeat");
}

export async function getSosSession(sessionId) {
  const res = await axiosClient.get(`/sos/sessions/${sessionId}`);
  return res.data;
}

export async function endSosSession(sessionId) {
  const res = await axiosClient.post(`/sos/sessions/${sessionId}/end`);
  return res.data;
}

export async function reviewSosSession(sessionId, { rating, comment }) {
  const res = await axiosClient.post(`/sos/sessions/${sessionId}/review`, { rating, comment });
  return res.data;
}
