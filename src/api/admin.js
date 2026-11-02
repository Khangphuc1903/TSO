import axiosClient from "./axiosClient";

export const adminApi = {
  metrics: () => axiosClient.get("/admin/metrics").then((r) => r.data),
  identity: (filter) => axiosClient.get("/admin/identity", { params: { filter } }).then((r) => r.data),
  reviewIdentity: (documentId, body) => axiosClient.post(`/admin/identity/${documentId}/review`, body).then((r) => r.data),
  users: (q) => axiosClient.get("/admin/users", { params: { q } }).then((r) => r.data),
  ban: (userId, ban, reason) => axiosClient.post(`/admin/users/${userId}/ban`, { ban, reason }).then((r) => r.data),
  reports: (status) => axiosClient.get("/admin/reports", { params: { status } }).then((r) => r.data),
  resolveReport: (id, body) => axiosClient.post(`/admin/reports/${id}/resolve`, body).then((r) => r.data),
  questions: (testType) => axiosClient.get("/admin/questions", { params: { testType } }).then((r) => r.data),
  createQuestion: (body) => axiosClient.post("/admin/questions", body).then((r) => r.data),
  updateQuestion: (id, body) => axiosClient.put(`/admin/questions/${id}`, body).then((r) => r.data),
  toggleQuestion: (id) => axiosClient.post(`/admin/questions/${id}/toggle`).then((r) => r.data),
  settings: () => axiosClient.get("/admin/settings").then((r) => r.data),
  saveSettings: (settings) => axiosClient.put("/admin/settings", { settings }).then((r) => r.data),
};

export const getPublicHome = () => axiosClient.get("/public/home").then((r) => r.data);
export const sendContact = (body) => axiosClient.post("/public/contact", body).then((r) => r.data);
export const createReport = (body) => axiosClient.post("/reports", body).then((r) => r.data);
