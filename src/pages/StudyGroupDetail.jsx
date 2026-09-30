import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
  BookOpen,
  GraduationCap,
  UserCheck,
  Crown,
  Send,
  Check,
  AlertCircle,
  CheckCircle2,
  Globe,
  Clock,
  Shield,
  ChevronRight,
  Award,
  Heart,
  Zap
} from "lucide-react";
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

  // Loading state
  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {error ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">{error}</h2>
              <Link to="/study-groups" className="text-sm font-semibold text-brand-600 hover:underline">
                ← Quay lại danh sách nhóm học
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-700">Đang tải thông tin nhóm học...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isOwner = Number(user?.userId) === group.createdByUserId;
  const isMember = group.isMember || isOwner;
  const slotsLeft = (group.maxMembers || 10) - (group.memberCount || 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC]">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1E4D] via-[#16307F] to-[#1D3FAE]" />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 sm:py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5">
            <Link to="/study-groups" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition">
              <ArrowLeft size={14} /> Danh sách nhóm học
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-xs text-white/90 font-medium truncate max-w-[200px]">{group.title}</span>
          </div>

          {/* Group Title & Badges */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`text-[11px] px-3 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${
                    group.hasMentor
                      ? "bg-brand-50/20 text-blue-200 border-blue-300/30"
                      : "bg-emerald-400/15 text-emerald-200 border-emerald-300/25"
                  }`}
                >
                  {group.hasMentor ? (
                    <><GraduationCap size={12} /> Có gia sư mentor</>
                  ) : (
                    <><UserCheck size={12} /> Peer Study – Học sinh hỗ trợ nhau</>
                  )}
                </span>
                {isMember && (
                  <span className="text-[11px] px-3 py-1 rounded-full font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/25 inline-flex items-center gap-1">
                    <Check size={12} /> Bạn là thành viên
                  </span>
                )}
                {isOwner && (
                  <span className="text-[11px] px-3 py-1 rounded-full font-bold bg-amber-400/20 text-amber-200 border border-amber-300/25 inline-flex items-center gap-1">
                    <Crown size={12} /> Chủ nhóm
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {group.title}
              </h1>

              {/* Meta info bar */}
              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs sm:text-sm text-white/80">
                {group.subjectName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                    <BookOpen size={14} className="text-blue-200" />
                    {group.subjectName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  <MapPin size={14} className="text-blue-200" />
                  {[group.district, group.city].filter(Boolean).join(", ") || "Online"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  <Users size={14} className="text-blue-200" />
                  {group.memberCount}/{group.maxMembers} thành viên
                  {slotsLeft <= 2 && slotsLeft > 0 && (
                    <span className="text-amber-300 font-bold ml-1">(Sắp đầy!)</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN 2-COLUMN LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-4 relative z-20 pb-20 grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* CARD: MÔ TẢ & THÔNG TIN CHI TIẾT */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <BookOpen size={17} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Giới thiệu nhóm học</h2>
                <p className="text-xs text-slate-400">Mã nhóm: #{group.groupId}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {group.description || "Nhóm học tập chia sẻ bài tập, thảo luận kiến thức và cùng nhau tiến bộ."}
            </p>

            {/* Creator & Mentor info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <img
                  src={avatarUrl(group.creatorName || "Chủ nhóm")}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-brand-100 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Người tạo nhóm</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{group.creatorName}</p>
                </div>
              </div>

              {group.mentorName && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-50/50 border border-brand-100">
                  <img
                    src={avatarUrl(group.mentorName)}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-brand-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase font-bold text-brand-600 tracking-wider flex items-center gap-1">
                      <GraduationCap size={11} /> Gia sư Mentor
                    </p>
                    <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                      {group.mentorName}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        group.mentorStatus === "Accepted"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {group.mentorStatus === "Accepted" ? "Đã nhận" : group.mentorStatus}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error & Info alerts */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2 font-medium">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start gap-2 font-medium">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                <span>{info}</span>
              </div>
            )}

            {/* ACTION AREA */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-4">
              {/* Join request form */}
              {!isMember && group.myJoinStatus !== "Pending" && group.myJoinStatus !== "Accepted" && (
                <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-brand-800">
                    <Heart size={16} className="text-brand-600" />
                    Xin tham gia nhóm học này
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Viết lời giới thiệu bản thân để chủ nhóm xét duyệt. Hãy chia sẻ mục tiêu học tập, lịch rảnh và điểm mạnh của bạn.
                  </p>
                  <textarea
                    rows={3}
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="Ví dụ: Mình đang ôn thi đại học môn Toán, lịch rảnh buổi tối T2-T5. Mong được học cùng mọi người!"
                    className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={join}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl px-5 py-2.5 transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Send size={14} />
                    Gửi lời xin vào nhóm
                  </button>
                </div>
              )}

              {group.myJoinStatus === "Pending" && !isMember && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium flex items-center gap-2">
                  <Clock size={16} className="text-amber-600 shrink-0" />
                  <span>Bạn đã gửi lời xin vào nhóm. Đang chờ chủ nhóm xét duyệt...</span>
                </div>
              )}

              {group.myJoinStatus === "Rejected" && !isMember && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 font-medium">
                  Lời xin trước đó chưa được chấp nhận. Bạn có thể gửi lại lời xin mới phía trên.
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2.5">
                {isMember && (
                  <Link
                    to={`/messages?tab=groups&g=${group.groupId}`}
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl px-5 py-2.5 transition shadow-sm"
                  >
                    <MessageCircle size={15} /> Mở chat nhóm
                  </Link>
                )}
                {!isOwner && (
                  <button
                    type="button"
                    onClick={chatCreator}
                    className="inline-flex items-center gap-2 border border-slate-200 hover:border-brand-200 text-slate-700 hover:text-brand-700 text-xs font-bold rounded-xl px-5 py-2.5 transition bg-white shadow-2xs cursor-pointer"
                  >
                    <MessageCircle size={15} /> Nhắn tin chủ nhóm
                  </button>
                )}
              </div>
            </div>

            {/* OWNER: QUẢN LÝ NHÓM */}
            {isOwner && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-6">
                {/* Duyệt lời xin */}
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-3">
                    <Shield size={15} className="text-brand-600" />
                    Lời xin vào nhóm
                    {(group.joinRequests || []).length > 0 && (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                        {group.joinRequests.length} mới
                      </span>
                    )}
                  </h3>

                  {(group.joinRequests || []).length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">Chưa có lời xin nào đang chờ xét duyệt.</p>
                  ) : (
                    <ul className="space-y-3">
                      {group.joinRequests.map((req) => (
                        <li key={req.userId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                          <div className="flex items-center gap-3 mb-2">
                            <img
                              src={req.avatarUrl || avatarUrl(req.fullName)}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{req.fullName}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed mb-3">
                            {req.joinMessage}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition cursor-pointer"
                              onClick={() => respondJoin(req.userId, true)}
                            >
                              <Check size={14} /> Chấp nhận
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                              onClick={() => respondJoin(req.userId, false)}
                            >
                              Từ chối
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Mời gia sư */}
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-3">
                    <GraduationCap size={15} className="text-brand-600" />
                    Mời gia sư làm Mentor
                  </h3>
                  <div className="flex gap-2">
                    <select
                      value={tutorId}
                      onChange={(e) => setTutorId(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition"
                    >
                      <option value="">Chọn gia sư cần mời</option>
                      {tutors.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={invite}
                      disabled={!tutorId}
                      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl px-5 py-2.5 transition cursor-pointer"
                    >
                      Gửi lời mời
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD: CHAT NHÓM REALTIME */}
          {isMember ? (
            <GroupChatPane
              groupId={Number(groupId)}
              title={group.title}
              members={group.members || []}
              className="h-[520px]"
            />
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 sm:p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100">
                <MessageCircle size={30} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-1">Chat nhóm realtime</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Khi trở thành thành viên, bạn có thể nhắn tin realtime với mọi người trong nhóm. Gửi lời xin vào nhóm để tham gia ngay!
              </p>
            </div>
          )}
        </div>

        {/* SIDEBAR: THÀNH VIÊN NHÓM */}
        <aside className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Users size={17} className="text-brand-600" />
                Thành viên
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                {group.memberCount}/{group.maxMembers}
              </span>
            </div>

            <ul className="space-y-2">
              {(group.members || []).map((m) => {
                const isCreator = m.userId === group.createdByUserId;
                const isSelf = Number(m.userId) === Number(user?.userId);

                return (
                  <li key={m.userId}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!isLoggedIn()) return navigate("/login");
                        if (isSelf) return;
                        const id = await openConversation(m.userId);
                        navigate(`/messages?c=${id}`);
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl hover:bg-slate-50 p-2.5 text-left transition group cursor-pointer"
                    >
                      <img
                        src={m.avatarUrl || avatarUrl(m.fullName)}
                        alt=""
                        className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-brand-200 transition shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          {m.fullName}
                          {isCreator && (
                            <Crown size={13} className="text-amber-500 shrink-0" />
                          )}
                          {isSelf && (
                            <span className="text-[10px] font-medium text-slate-400">(Bạn)</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 group-hover:text-brand-600 transition">
                          {isCreator ? "Chủ nhóm" : isSelf ? "Thành viên" : "Nhắn tin riêng →"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {slotsLeft > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">
                  Còn <span className="font-bold text-brand-600">{slotsLeft}</span> chỗ trống
                </p>
              </div>
            )}
          </div>

          {/* Quick info sidebar card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <Zap size={15} className="text-amber-500" />
              Thông tin nhanh
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Hình thức:</span>
                <span className="font-bold text-slate-800">
                  {group.hasMentor ? "Có gia sư mentor" : "Peer Study"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Môn học:</span>
                <span className="font-bold text-brand-700">{group.subjectName || "Đa môn"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Khu vực:</span>
                <span className="font-bold text-slate-800">
                  {[group.district, group.city].filter(Boolean).join(", ") || "Online"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Chi phí:</span>
                <span className="font-bold text-emerald-700">Miễn phí</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
