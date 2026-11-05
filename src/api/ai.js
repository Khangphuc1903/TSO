import axiosClient from "./axiosClient";

export async function diagnoseHomework(file, studentNote = "") {
  const formData = new FormData();
  formData.append("file", file);
  if (studentNote) {
    formData.append("studentNote", studentNote);
  }
  const res = await axiosClient.post("/ai/diagnose", formData);
  return res.data;
}

export async function getMyDiagnoses() {
  const res = await axiosClient.get("/ai/diagnoses/mine");
  return res.data;
}

export async function getDiagnosisById(id) {
  const res = await axiosClient.get(`/ai/diagnoses/${id}`);
  return res.data;
}

export async function naturalSearchTutors(prompt) {
  const res = await axiosClient.post("/ai/natural-search", { prompt });
  return res.data;
}

export async function getKnowledgeTopics(subjectId = null) {
  const params = subjectId ? { subjectId } : {};
  const res = await axiosClient.get("/ai/topics", { params });
  return res.data;
}
