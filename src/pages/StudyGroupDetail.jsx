import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, MessageCircle, Sparkles, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import GroupChatPane from "../components/GroupChatPane";
import { avatarUrl, getUser, isLoggedIn } from "../auth";
import { getStudyGroup, inviteTutorToGroup, joinStudyGroup, respondJoinRequest } from "../api/studyGroups";
import { getDefaultTutors } from "../api/tutorSearch";
import { openConversation } from "../api/study";

export default function StudyGroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tutors, setTutors] = useState([]);
  const [tutorId, setTutorId] = useState("");
  const [joinMessage, setJoinMessage] = useState("");

  const load = () => getStudyGroup(groupId).then(setGroup);

  useEffect(() => {
    load().catch(() => setError("Không tải được nhóm."));
    getDefaultTutors().then(setTutors).catch(() => []);
  }, [groupId]);

  const join = async () => {
    if (!isLoggedIn()) return navigate("/login");
    if (!joinMessage.trim() || joinMessage.trim().length < 10) {
      setError("Viết lời xin vào nhóm (ít nhất 10 ký tự) để chủ nhóm xét duyệt.");
      return;
    }
    try {
      const res = await joinStudyGroup(groupId, joinMessage.trim());
      setInfo(res.message);
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được lời xin.");
    }
  };

  const respondJoin = async (applicantId, accept) => {
    try {
      const res = await respondJoinRequest(groupId, applicantId, accept);
      setInfo(res.message);
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Không duyệt được lời xin.");
    }
  };

  const invite = async () => {
    try {
      const res = await inviteTutorToGroup(groupId, Number(tutorId), "Mời bạn mentor nhóm này");
      setInfo(res.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Không mời được gia sư.");
    }
  };

  const chatCreator = async () => {
    if (!isLoggedIn()) return navigate("/login");
    const id = await openConversation(group.createdByUserId);
    navigate(`/messages?c=${id}`);
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <p className="p-10 text-slate-500">{error || "Đang tải..."}</p>
      </div>
    );
  }

  const isOwner = Number(user?.userId) === group.createdByUserId;
  const isMember = group.isMember || isOwner;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <section className="relative overflow-hidden pt-10 pb-4 px-6">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)" }}
        />
        <div className="max-w-6xl mx-auto">
          <Link to="/study-groups" className="inline-flex items-center gap-1 text-sm text-brand-600 mb-4">
            <ArrowLeft size={16} /> Nhóm học
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full">
            <Sparkles size={14} />
            Chat realtime cho thành viên nhóm
          </span>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 pb-16 grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{group.title}</h1>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  group.hasMentor ? "bg-brand-50 text-brand-700" : "bg-verified-50 text-verified-600"
                }`}
              >
                {group.hasMentor ? "Có gia sư" : "Chỉ học sinh"}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-2">{group.description}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
              <span>{group.subjectName}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} className="text-brand-600" />
                {[group.district, group.city].filter(Boolean).join(", ") || "Online"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={14} className="text-brand-600" />
                {group.memberCount}/{group.maxMembers}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-2">Người tạo: {group.creatorName}</p>
            {group.mentorName && (
              <p className="text-sm text-slate-500">
                Mentor: {group.mentorName} ({group.mentorStatus})
              </p>
            )}

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
            )}
            {info && (
              <div className="mt-4 text-sm text-verified-600 bg-verified-50 rounded-lg px-3 py-2">{info}</div>
            )}

            <div className="flex flex-wrap gap-2 mt-6">
              {!isMember && group.myJoinStatus !== "Pending" && group.myJoinStatus !== "Accepted" && (
                <div className="w-full space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Lời xin vào nhóm</label>
                  <textarea
                    rows={3}
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="Viết lý do muốn tham gia, mục tiêu học, lịch rảnh..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={join}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                  >
                    Gửi lời xin
                  </button>
                </div>
              )}
              {group.myJoinStatus === "Pending" && !isMember && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 w-full">
                  Đã gửi lời xin. Đang chờ chủ nhóm xác nhận.
                </p>
              )}
              {group.myJoinStatus === "Rejected" && !isMember && (
                <p className="text-sm text-slate-600 w-full">Lần xin trước bị từ chối. Bạn có thể gửi lại lời xin mới.</p>
              )}
              {isMember && (
                <Link
                  to={`/messages?tab=groups&g=${group.groupId}`}
                  className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                >
                  <MessageCircle size={16} /> Mở chat nhóm
                </Link>
              )}
              {!isOwner && (
                <button
                  type="button"
                  onClick={chatCreator}
                  className="border border-slate-200 text-sm font-medium rounded-lg px-4 py-2.5 hover:border-brand-200 hover:text-brand-600 transition-colors"
                >
                  Nhắn chủ nhóm
                </button>
              )}
            </div>

            {isOwner && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-sm font-medium mb-3">Lời xin vào nhóm</p>
                {(group.joinRequests || []).length === 0 ? (
                  <p className="text-sm text-slate-500 mb-4">Chưa có lời xin đang chờ.</p>
                ) : (
                  <ul className="space-y-3 mb-6">
                    {group.joinRequests.map((req) => (
                      <li key={req.userId} className="rounded-xl border border-slate-100 p-3">
                        <p className="text-sm font-medium text-slate-900">{req.fullName}</p>
                        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{req.joinMessage}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg bg-brand-600 text-white text-xs font-medium"
                            onClick={() => respondJoin(req.userId, true)}
                          >
                            Chấp nhận
                          </button>
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-medium"
                            onClick={() => respondJoin(req.userId, false)}
                          >
                            Từ chối
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm font-medium mb-2">Mời gia sư mentor</p>
                <div className="flex gap-2">
                  <select
                    value={tutorId}
                    onChange={(e) => setTutorId(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  >
                    <option value="">Chọn gia sư</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={invite} className="bg-slate-900 text-white rounded-lg px-4 text-sm">
                    Mời
                  </button>
                </div>
              </div>
            )}
          </div>

          {isMember ? (
            <GroupChatPane
              groupId={Number(groupId)}
              title={group.title}
              members={group.members || []}
              className="h-[520px]"
            />
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <Users className="mx-auto text-brand-600 mb-2" />
              <p className="font-medium text-slate-900">Chat nhóm dành cho thành viên</p>
              <p className="text-sm text-slate-500 mt-1">Tham gia nhóm để nhắn tin realtime với các bạn học.</p>
            </div>
          )}
        </div>

        <aside className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 h-fit">
          <h2 className="font-semibold text-slate-900 mb-4">Thành viên</h2>
          <ul className="space-y-3">
            {(group.members || []).map((m) => (
              <li key={m.userId}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!isLoggedIn()) return navigate("/login");
                    if (Number(m.userId) === Number(user?.userId)) return;
                    const id = await openConversation(m.userId);
                    navigate(`/messages?c=${id}`);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl hover:bg-slate-50 p-1 text-left"
                >
                  <img src={m.avatarUrl || avatarUrl(m.fullName)} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{m.fullName}</p>
                    <p className="text-xs text-slate-400">
                      {m.userId === group.createdByUserId ? "Chủ nhóm" : "Nhắn tin riêng"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}
