import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, GraduationCap, Plus, Users, X } from "lucide-react";
import { avatarUrl, isLoggedIn, loginPath } from "../auth";
import {
  getMyStudyDesk,
  respondJoinRequest,
  selectStudyGroupBid,
} from "../api/studyGroups";
import { levelLabel } from "../data/studyLevels";
import { formatVnd } from "../utils/format";

export default function MyStudyGroups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const load = () => {
    setLoading(true);
    getMyStudyDesk()
      .then((data) => setGroups(data.items || []))
      .catch((err) => setError(err.response?.data?.message || "Không tải được nhóm của bạn."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate(loginPath("/study-groups/mine"));
      return;
    }
    load();
  }, [navigate]);

  const respond = async (groupId, userId, accept) => {
    setBusyKey(`join-${groupId}-${userId}`);
    setError("");
    try {
      const res = await respondJoinRequest(groupId, userId, accept);
      setInfo(res.message || (accept ? "Đã nhận học sinh vào nhóm." : "Đã từ chối lời xin."));
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Không duyệt được lời xin.");
    } finally {
      setBusyKey("");
    }
  };

  const chooseTutor = async (groupId, bidId) => {
    setBusyKey(`bid-${bidId}`);
    setError("");
    try {
      const res = await selectStudyGroupBid(groupId, bidId);
      setInfo(res.message || "Đã chọn gia sư cho nhóm.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Không chọn được gia sư.");
    } finally {
      setBusyKey("");
    }
  };

  const ordered = [...groups].sort((a, b) => pendingCount(b) - pendingCount(a));
  const waiting = ordered.reduce((sum, group) => sum + pendingCount(group), 0);

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Riêng của bạn</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Nhóm của tôi</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Lời xin của học sinh và hồ sơ gia sư nằm ở đây. Trang Nhóm học chỉ dùng để tìm nhóm công khai.
            </p>
          </div>
          <Link
            to="/study-groups/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white"
          >
            <Plus size={16} /> Tạo nhóm
          </Link>
        </div>

        {!loading && (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Nhóm của bạn" value={groups.length} />
            <Stat label="Đang chờ duyệt" value={waiting} />
            <Stat label="Bạn đang tham gia" value={groups.filter((g) => !g.isOwner).length} />
          </div>
        )}

        {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {info && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}

        {loading ? (
          <p className="text-sm text-slate-500">Đang tải nhóm của bạn...</p>
        ) : ordered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center">
            <Users className="mx-auto text-brand-600" size={32} />
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">Bạn chưa có nhóm nào</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Tạo nhóm học cùng bạn, hoặc nhóm cần gia sư. Đơn xin vào sẽ hiện trên trang này.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {ordered.map((group) => (
              <GroupCard
                key={group.groupId}
                group={group}
                busyKey={busyKey}
                onRespond={respond}
                onChoose={chooseTutor}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function pendingCount(group) {
  if (!group.isOwner) return 0;
  const joins = group.joinRequests?.length || 0;
  const bids = (group.bids || []).filter((bid) => bid.status === "Pending").length;
  return joins + bids;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function GroupCard({ group, busyKey, onRespond, onChoose }) {
  const joins = group.isOwner ? group.joinRequests || [] : [];
  const bids = group.isOwner && group.hiringMode === "ReverseBid" ? group.bids || [] : [];
  const winner = bids.find((bid) => bid.status === "Won");
  const hired = Boolean(winner) || group.hasMentor || group.mentorStatus === "Accepted";
  const shownBids = winner ? [winner] : bids.filter((bid) => bid.status === "Pending");
  const pendingBids = shownBids.filter((bid) => bid.status === "Pending");

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">{group.title}</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              {group.isOwner ? "Bạn là chủ nhóm" : "Bạn đang tham gia"}
            </span>
            {group.hiringMode === "ReverseBid" && !hired && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                Đang tìm gia sư
              </span>
            )}
            {group.hiringMode === "ReverseBid" && hired && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                Đã chọn gia sư
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[group.subjectName, levelLabel(group.educationLevel), `${group.memberCount}/${group.maxMembers} thành viên`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Link to={`/study-groups/${group.groupId}`} className="text-sm font-bold text-brand-700">
          Mở nhóm
        </Link>
      </div>

      {group.isOwner && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Users size={15} className="text-brand-600" /> Học sinh xin vào
              {joins.length > 0 && <Count n={joins.length} />}
            </h3>
            {joins.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Chưa có lời xin nào.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {joins.map((req) => (
                  <li key={req.userId} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <img src={req.avatarUrl || avatarUrl(req.fullName)} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      <p className="text-sm font-bold text-slate-900">{req.fullName}</p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{req.joinMessage}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busyKey === `join-${group.groupId}-${req.userId}`}
                        onClick={() => onRespond(group.groupId, req.userId, true)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-xs font-bold text-white disabled:opacity-60"
                      >
                        <Check size={14} /> Chấp nhận
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `join-${group.groupId}-${req.userId}`}
                        onClick={() => onRespond(group.groupId, req.userId, false)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600 disabled:opacity-60"
                      >
                        <X size={14} /> Từ chối
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <GraduationCap size={15} className="text-amber-700" /> {winner ? "Gia sư đã chọn" : "Gia sư ứng tuyển"}
              {pendingBids.length > 0 && <Count n={pendingBids.length} />}
            </h3>
            {group.hiringMode !== "ReverseBid" ? (
              <p className="mt-3 text-sm text-slate-500">Nhóm này học cùng bạn, không nhận hồ sơ gia sư.</p>
            ) : shownBids.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Chưa có gia sư nào gửi hồ sơ.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {shownBids.map((bid) => (
                  <li key={bid.bidId} className="rounded-xl border border-amber-100 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{bid.tutorName}</p>
                        <p className="text-xs text-slate-500">
                          {[bid.university, bid.major].filter(Boolean).join(" · ") || "Hồ sơ gia sư"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand-700">{formatVnd(bid.proposedPrice)}/buổi</p>
                        <p className="text-[11px] text-slate-500">{bidLabel(bid.status)}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold italic text-slate-800">Giáo trình</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{bid.curriculumNote}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">Bằng cấp</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{bid.certificateNote}</p>
                    {group.canSelect && bid.status === "Pending" && (
                      <button
                        type="button"
                        disabled={busyKey === `bid-${bid.bidId}`}
                        onClick={() => onChoose(group.groupId, bid.bidId)}
                        className="mt-3 h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-60"
                      >
                        Chọn gia sư này
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </article>
  );
}

function Count({ n }) {
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{n}</span>;
}

function bidLabel(status) {
  if (status === "Won") return "Đã chọn";
  if (status === "Lost") return "Không chọn";
  return "Đang chờ";
}
