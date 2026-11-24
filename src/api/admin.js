import axiosClient from "./axiosClient";

export const adminApi = {
  metrics: () => axiosClient.get("/admin/metrics").then((r) => r.data),
  identity: (filter) => axiosClient.get("/admin/identity", { params: { filter } }).then((r) => r.data),
  reviewIdentity: (documentId, body) => axiosClient.post(`/admin/identity/${documentId}/review`, body).then((r) => r.data),
  identityImage: (documentId, side) => axiosClient.get(`/admin/identity/${documentId}/image`, { params: { side }, responseType: "blob" }).then((r) => r.data),
  users: (q) => axiosClient.get("/admin/users", { params: { q } }).then((r) => r.data),
  ban: (userId, ban, reason) => axiosClient.post(`/admin/users/${userId}/ban`, { ban, reason }).then((r) => r.data),
  reports: (status) => axiosClient.get("/admin/reports", { params: { status } }).then((r) => r.data),
  resolveReport: (id, body) => axiosClient.post(`/admin/reports/${id}/resolve`, body).then((r) => r.data),
  reviews: (params) => axiosClient.get("/admin/reviews", { params }).then((r) => r.data),
  deleteReview: (id, reason) => axiosClient.delete(`/admin/reviews/${id}`, { params: { reason } }).then((r) => r.data),
  restoreReview: (id) => axiosClient.post(`/admin/reviews/${id}/restore`).then((r) => r.data),
  questions: (testType) => axiosClient.get("/admin/questions", { params: { testType } }).then((r) => r.data),
  createQuestion: (body) => axiosClient.post("/admin/questions", body).then((r) => r.data),
  updateQuestion: (id, body) => axiosClient.put(`/admin/questions/${id}`, body).then((r) => r.data),
  toggleQuestion: (id) => axiosClient.post(`/admin/questions/${id}/toggle`).then((r) => r.data),
  payouts: () => axiosClient.get("/admin/payouts").then((r) => r.data),
  confirmPayout: (paymentId) => axiosClient.post(`/admin/payouts/${paymentId}/confirm`).then((r) => r.data),
  revenue: () => axiosClient.get("/admin/revenue").then((r) => r.data),
  settings: () => axiosClient.get("/admin/settings").then((r) => r.data),
  saveSettings: (settings) => axiosClient.put("/admin/settings", { settings }).then((r) => r.data),
};

export const getPublicHome = () => axiosClient.get("/public/home").then((r) => r.data);
export const sendContact = (body) => axiosClient.post("/public/contact", body).then((r) => r.data);
export const createReport = (body) => axiosClient.post("/reports", body).then((r) => r.data);
export const uploadReportEvidence = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.post("/reports/upload-evidence", formData).then((r) => r.data);
};
