import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { isLoggedIn } from "../auth";
import { createStudyGroup } from "../api/studyGroups";
import { getDefaultTutors, getSubjects } from "../api/tutorSearch";
import LocationFields from "../components/LocationFields";
import { regionError } from "../data/locations";

export default function CreateStudyGroup() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    subjectId: "",
    city: "",
    district: "",
    meetingMode: "Online",
    studyGoal: "PeerStudy",
    maxMembers: 6,
    hasMentor: false,
    tutorId: "",
    inviteMessage: "",
  });

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login");
    getSubjects().then(setSubjects).catch(() => []);
    getDefaultTutors().then(setTutors).catch(() => []);
  }, [navigate]);

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const areaMsg = regionError(form.city, form.district);
    if (areaMsg) {
      setError(areaMsg);
      return;
    }
    try {
      const payload = {
        ...form,
        subjectId: Number(form.subjectId),
        maxMembers: Number(form.maxMembers),
        tutorId: form.hasMentor && form.tutorId ? Number(form.tutorId) : null,
      };
      const res = await createStudyGroup(payload);
      navigate(`/study-groups/${res.group.groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Không tạo được nhóm.");
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <Link to="/study-groups" className="text-sm text-brand-600">← Danh sách nhóm</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-3 mb-2">Tạo nhóm học</h1>
        <p className="text-sm text-slate-500 mb-6">Đăng như một bài post: chọn môn, khu vực, và quyết định có mời gia sư hay chỉ học sinh hỗ trợ nhau.</p>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <input required value={form.title} onChange={update("title")} placeholder="Tiêu đề nhóm" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea value={form.description} onChange={update("description")} rows={4} placeholder="Mô tả mục tiêu học..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select required value={form.subjectId} onChange={update("subjectId")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Chọn môn</option>
            {subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <LocationFields
              required
              city={form.city}
              district={form.district}
              onChange={({ city, district }) => setForm((p) => ({ ...p, city, district }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.meetingMode} onChange={update("meetingMode")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Hybrid">Hybrid</option>
            </select>
            <input type="number" min="2" max="20" value={form.maxMembers} onChange={update("maxMembers")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.hasMentor} onChange={update("hasMentor")} />
            Mời gia sư mentor (bỏ chọn = chỉ học sinh hỗ trợ nhau)
          </label>
          {form.hasMentor && (
            <>
              <select value={form.tutorId} onChange={update("tutorId")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Chọn gia sư</option>
                {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input value={form.inviteMessage} onChange={update("inviteMessage")} placeholder="Lời nhắn mời gia sư" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </>
          )}
          <button className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium">Đăng nhóm học</button>
        </form>
      </main>
    </div>
  );
}
