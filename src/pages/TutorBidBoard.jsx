import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock, GraduationCap, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import { getUser, isLoggedIn, loginPath } from "../auth";
import { getBidBoard, getMyBids } from "../api/studyGroups";
import { levelLabel } from "../data/studyLevels";
import { formatVnd } from "../utils/format";

export default function TutorBidBoard() {
  const navigate = useNavigate();
  const tutor = (getUser()?.role || "").toLowerCase() === "tutor";
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate(loginPath("/study-groups/bids"));
      return;
    }
    if (!tutor) {
      setError("Bảng chào thầu chỉ gia sư mới xem được.");
      return;
    }
    getBidBoard()
      .then((data) => setItems(data.items || data || []))
      .catch((err) => setError(err.response?.data?.message || "Không tải được bảng chào thầu."));
    getMyBids()
      .then((data) => setMine(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [navigate, tutor]);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <section className="bg-gradient-to-br from-[#0F294A] via-[#143763] to-[#0D5C63] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Chỉ giáo viên thấy</p>
          <h1 className="mt-2 text-3xl font-extrabold">Bảng chào thầu nhóm học</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75">
            Học sinh lập nhóm và đưa ngân sách. Bạn gửi giáo trình, chứng chỉ và giá. Nhóm bình chọn rồi chốt một gia sư.
          </p>
        </div>
      </section>
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!error && items.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Chưa có nhóm nào đang tìm gia sư.
          </div>
        )}
        <div className="grid gap-4">
          {items.map((g) => (
            <Link
              key={g.groupId}
              to={`/study-groups/${g.groupId}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{g.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[g.subjectName, g.educationLevel ? levelLabel(g.educationLevel) : "", `${g.memberCount}/${g.maxMembers} học sinh`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <p className="font-bold text-brand-700">{formatVnd(g.budgetPerSession)}/buổi</p>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-slate-700">{g.tutorRequirements}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Users size={13} /> {g.bidCount || 0} hồ sơ</span>
                {g.bidDeadline && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} /> Hạn {new Date(g.bidDeadline).toLocaleDateString("vi-VN")}
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-700">
                  Xem và ứng tuyển <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {mine.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
              <GraduationCap size={16} /> Hồ sơ bạn đã gửi
            </h2>
            <ul className="space-y-2">
              {mine.map((b) => (
                <li key={b.bidId}>
                  <Link to={`/study-groups/${b.groupId}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <span className="font-medium text-slate-900">{b.groupTitle || `Nhóm #${b.groupId}`}</span>
                    <span className="text-slate-500">{formatVnd(b.proposedPrice)} · {b.status === "Won" ? "Được chọn" : b.status === "Lost" ? "Không chọn" : b.status === "Withdrawn" ? "Đã rút" : "Đang chờ"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
