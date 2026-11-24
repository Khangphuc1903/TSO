import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createGroupFeed } from "../api/studyGroups";
import { getSubjects } from "../api/tutorSearch";
import { getUser, isLoggedIn, loginPath } from "../auth";

export default function CreateStudyGroup() {
  const navigate = useNavigate();
  const tutor = (getUser()?.role || "").toLowerCase() === "tutor";
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", subjectId: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate(loginPath("/study-groups/new"));
      return;
    }
    getSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = await createGroupFeed({
        title: form.title.trim(),
        description: form.description.trim(),
        subjectId: Number(form.subjectId),
      });
      navigate(`/study-groups/${data.groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Không tạo được nhóm.");
    } finally {
      setSaving(false);
    }
  };

  if (!tutor) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Chỉ gia sư được tạo nhóm</h1>
        <p className="mt-2 text-sm text-slate-500">Học sinh và phụ huynh có thể xin vào nhóm do gia sư tạo.</p>
        <Link to="/study-groups" className="mt-5 inline-block text-sm font-medium text-brand-700">Về danh sách nhóm</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link to="/study-groups" className="text-sm text-brand-700">← Danh sách nhóm</Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Tạo nhóm</h1>
      <p className="mt-1 text-sm text-slate-500">Bạn sẽ duyệt từng người muốn vào nhóm.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <label className="block text-sm text-slate-600">
          Tên nhóm
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="Toán 12 - hỏi bài mỗi tối" />
        </label>
        <label className="block text-sm text-slate-600">
          Môn
          <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">Chọn môn</option>
            {subjects.map((subject) => (
              <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-600">
          Mô tả
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="Nhóm để học sinh hỏi bài và trao đổi." />
        </label>
        <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {saving ? "Đang tạo..." : "Tạo nhóm"}
        </button>
      </form>
    </div>
  );
}
