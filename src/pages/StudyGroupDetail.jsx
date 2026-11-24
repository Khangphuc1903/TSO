import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Flag, ImagePlus, MessageCircle, Send, Users } from "lucide-react";
import {
  getGroupFeed,
  getStudyGroup,
  joinStudyGroup,
  moderateGroupJoin,
  publishGroupComment,
  publishGroupPost,
  reviewGroupPost,
  reportGroupComment,
  reportGroupPost,
  requestGroupJoin,
  respondJoinRequest,
} from "../api/studyGroups";
import { API_ORIGIN } from "../api/axiosClient";
import { avatarUrl, getUser, isLoggedIn, loginPath } from "../auth";

const REASONS = [
  { id: "Spam", label: "Spam" },
  { id: "Harassment", label: "Quấy rối" },
  { id: "Inappropriate", label: "Nội dung không phù hợp" },
  { id: "Other", label: "Khác" },
];

export function media(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
}

export function face(person) {
  return person?.avatarUrl ? media(person.avatarUrl) : avatarUrl(person?.fullName);
}

function when(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN") : "";
}

export function RoleMark({ role }) {
  if (!role) return null;
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{role}</span>;
}

export function Files({ files }) {
  const images = (files || []).filter((file) => file.kind === "image");
  const docs = (files || []).filter((file) => file.kind !== "image");
  if (!images.length && !docs.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((file) => (
            <a key={file.fileUrl} href={media(file.fileUrl)} target="_blank" rel="noreferrer">
              <img src={media(file.fileUrl)} alt={file.fileName} className="h-40 w-full rounded-xl object-cover" />
            </a>
          ))}
        </div>
      )}
      {docs.map((file) => (
        <a key={file.fileUrl} href={media(file.fileUrl)} target="_blank" rel="noreferrer" className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-brand-700">
          {file.fileName || "Tệp đính kèm"}
        </a>
      ))}
    </div>
  );
}

export function Composer({ placeholder, onSend, onCancel }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setError("");
    setBusy(true);
    try {
      await onSend({ body: text.trim(), files });
      setText("");
      setFiles([]);
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent text-sm outline-none"
      />
      {files.length > 0 && (
        <p className="mb-2 text-xs text-slate-500">{files.map((file) => file.name).join(", ")}</p>
      )}
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-600">
          <ImagePlus size={15} /> Ảnh / tệp
          <input
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 6))}
          />
        </label>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-white">
              Hủy trả lời
            </button>
          )}
          <button type="button" disabled={busy} onClick={send} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">
            <Send size={13} /> {busy ? "Đang gửi" : "Đăng"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReportBox({ onSubmit, onClose }) {
  const [reason, setReason] = useState("Spam");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await onSubmit({ reason, description });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được báo cáo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs">
        {REASONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Mô tả thêm cho admin" className="mt-2 w-full rounded-lg border border-amber-200 px-2 py-1.5 text-xs" />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={busy} onClick={send} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white">Gửi báo cáo</button>
        <button type="button" onClick={onClose} className="text-xs text-slate-500">Hủy</button>
      </div>
    </div>
  );
}

export default function StudyGroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [joinNote, setJoinNote] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [report, setReport] = useState(null);
  const me = getUser();
  const mineId = String(me?.userId || "");

  const load = async () => {
    const [feed, classic] = await Promise.all([
      getGroupFeed(groupId).catch(() => null),
      getStudyGroup(groupId).catch(() => null),
    ]);
    const requests = (feed?.joinRequests?.length ? feed.joinRequests : (classic?.joinRequests || [])).map((person) => ({
      userId: person.userId,
      fullName: person.fullName,
      avatarUrl: person.avatarUrl,
      role: person.role || "",
      message: person.message || person.joinMessage || "",
    }));
    if (feed) {
      setGroup({ ...feed, joinRequests: requests });
      setError("");
      return;
    }
    if (classic) {
      const role = (getUser()?.role || "").toLowerCase();
      setGroup({
        groupId: classic.groupId,
        title: classic.title,
        description: classic.description,
        subjectName: classic.subjectName,
        ownerName: classic.creatorName,
        ownerRole: "",
        memberCount: classic.memberCount,
        isOwner: classic.isOwner,
        isMember: classic.isMember,
        canModerate: classic.isOwner && role === "tutor",
        myStatus: classic.myJoinStatus || "None",
        joinRequests: requests,
        posts: [],
      });
      setError("");
      return;
    }
    setError("Không tải được nhóm.");
  };

  useEffect(() => {
    load();
  }, [groupId]);

  useEffect(() => {
    if (!group) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [group]);

  const join = async () => {
    if (!isLoggedIn()) {
      navigate(loginPath(`/study-groups/${groupId}`));
      return;
    }
    setError("");
    try {
      let data;
      try {
        data = await requestGroupJoin(groupId, joinNote);
      } catch (err) {
        if (err.response?.status !== 404) throw err;
        if ((joinNote || "").trim().length < 10) {
          setError("Viết lời xin ít nhất 10 ký tự để gia sư nhận được thông báo.");
          return;
        }
        data = await joinStudyGroup(groupId, joinNote.trim());
      }
      setNote(data.message || "Đã gửi lời xin. Gia sư sẽ nhận thông báo.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Không xin vào được.");
    }
  };

  const reviewPost = async (postId, accept) => {
    setError("");
    try {
      const data = await reviewGroupPost(groupId, postId, accept);
      setNote(data.message || (accept ? "Đã duyệt bài." : "Đã từ chối bài."));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Không duyệt được bài.");
    }
  };

  const moderate = async (userId, accept) => {
    setError("");
    try {
      try {
        await moderateGroupJoin(groupId, userId, accept);
      } catch (err) {
        if (err.response?.status !== 404) throw err;
        await respondJoinRequest(groupId, userId, accept);
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Không duyệt được.");
    }
  };

  if (!group) {
    return <div className="px-6 py-16 text-center text-sm text-slate-500">{error || "Đang tải nhóm..."}</div>;
  }

  const pendingPosts = (group.posts || []).filter((post) => post.status === "Pending");
  const publishedPosts = (group.posts || []).filter((post) => post.status !== "Pending");
  const members = [...(group.members || [])].sort((a, b) => {
    const rank = (person) => (person.fullName === group.ownerName ? 0 : person.role === "Gia sư" ? 1 : 2);
    return rank(a) - rank(b);
  });

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <div className="mx-auto grid max-w-6xl items-start gap-4 px-4 py-8 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
        <aside className="hidden space-y-3 lg:sticky lg:top-20 lg:block">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <Link to="/study-groups" className="text-xs font-medium text-brand-700">← Tất cả nhóm</Link>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Giới thiệu</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{group.description || "Nhóm hỏi bài do gia sư phụ trách."}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Môn</dt>
                <dd className="font-medium text-slate-800">{group.subjectName || "Tổng hợp"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Thành viên</dt>
                <dd className="font-medium text-slate-800">{group.memberCount}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Trưởng nhóm</dt>
                <dd className="mt-1 font-medium text-slate-800">{group.ownerName} <RoleMark role={group.ownerRole || "Gia sư"} /></dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="min-w-0">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-brand-700">{group.subjectName}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{group.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{group.description || "Nhóm hỏi bài."}</p>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Users size={14} /> {group.memberCount} thành viên · Chủ nhóm {group.ownerName}
            <RoleMark role={group.ownerRole} />
          </p>
          {!group.isMember && (
            <div className="mt-4">
              {group.myStatus === "Pending" ? (
                <p className="text-sm text-amber-700">Lời xin đang chờ gia sư duyệt.</p>
              ) : (
                <div className="space-y-2">
                  <input value={joinNote} onChange={(e) => setJoinNote(e.target.value)} placeholder="Lời nhắn cho gia sư (không bắt buộc)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <button type="button" onClick={join} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">Xin vào nhóm</button>
                </div>
              )}
            </div>
          )}
        </header>

        {(error || note) && <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{error || note}</p>}

        {group.canModerate && (
          <section id="duyet" className="mt-4 scroll-mt-24 rounded-2xl border border-amber-300 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Duyệt học sinh</h2>
            {(group.joinRequests || []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa có học sinh chờ duyệt.</p>
            ) : (
              <p className="mt-1 text-sm text-amber-800">Có {group.joinRequests.length} người xin vào nhóm.</p>
            )}
            {(group.joinRequests || []).length > 0 && (
            <ul className="mt-3 space-y-3">
              {group.joinRequests.map((person) => (
                <li key={person.userId} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img src={face(person)} alt="" className="h-9 w-9 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{person.fullName} <RoleMark role={person.role} /></p>
                      {person.message && <p className="text-xs text-slate-500">{person.message}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moderate(person.userId, true)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white">Duyệt</button>
                    <button type="button" onClick={() => moderate(person.userId, false)} className="rounded-lg border px-3 py-1.5 text-xs">Từ chối</button>
                  </div>
                </li>
              ))}
            </ul>
            )}
          </section>
        )}

        {group.isMember ? (
          <div className="mt-4 space-y-4">
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-semibold text-slate-800">Hỏi bài</p>
              <Composer
                placeholder="Đặt câu hỏi. Bài của học sinh hiện sau khi gia sư duyệt."
                onSend={(payload) => publishGroupPost(groupId, payload).then((data) => {
                  setNote(data?.message || "Đã gửi bài.");
                  setError("");
                  return load();
                })}
              />
            </section>
            {pendingPosts.length > 0 && (
              <section id="bai-cho" className="scroll-mt-24 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h2 className="text-sm font-bold text-amber-950">
                  {group.canModerate ? `Bài chờ duyệt (${pendingPosts.length})` : "Bài của bạn đang chờ gia sư duyệt"}
                </h2>
                <div className="mt-3 space-y-3">
                  {pendingPosts.map((post) => (
                    <article key={post.postId} className="rounded-xl bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {post.author?.fullName} <RoleMark role={post.author?.role} />
                      </p>
                      {post.body && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{post.body}</p>}
                      <Files files={post.files} />
                      {group.canModerate && (
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => reviewPost(post.postId, true)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white">Duyệt</button>
                          <button type="button" onClick={() => reviewPost(post.postId, false)} className="rounded-lg border px-3 py-1.5 text-xs">Từ chối</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
            {publishedPosts.length === 0 && <p className="text-center text-sm text-slate-400">Chưa có bài đã duyệt.</p>}
            {publishedPosts.map((post) => (
              <article key={post.postId} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img src={face(post.author)} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {post.author?.fullName} <RoleMark role={post.author?.role} />
                      </p>
                      <p className="text-xs text-slate-400">{when(post.createdAt)} · Hỏi bài</p>
                    </div>
                  </div>
                  {mineId !== String(post.author?.userId || "") && (
                    <button type="button" onClick={() => setReport({ type: "post", id: post.postId })} className="text-slate-400" title="Báo cáo bài đăng">
                      <Flag size={15} />
                    </button>
                  )}
                </div>
                {post.body && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{post.body}</p>}
                <Files files={post.files} />
                {report?.type === "post" && report.id === post.postId && (
                  <ReportBox
                    onClose={() => setReport(null)}
                    onSubmit={async (payload) => {
                      const data = await reportGroupPost(groupId, post.postId, payload);
                      setNote(data.message);
                    }}
                  />
                )}

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  {(post.comments || []).map((comment) => (
                    <div key={comment.commentId}>
                      <CommentRow
                        comment={comment}
                        mine={mineId === String(comment.author?.userId || "")}
                        onReply={() => setReplyTo(comment.commentId)}
                        onReport={() => setReport({ type: "comment", id: comment.commentId })}
                      />
                      {report?.type === "comment" && report.id === comment.commentId && (
                        <ReportBox
                          onClose={() => setReport(null)}
                          onSubmit={async (payload) => {
                            const data = await reportGroupComment(groupId, comment.commentId, payload);
                            setNote(data.message);
                          }}
                        />
                      )}
                      <div className="ml-10 mt-2 space-y-2">
                        {(comment.replies || []).map((reply) => (
                          <div key={reply.commentId}>
                            <CommentRow
                              comment={reply}
                              mine={mineId === String(reply.author?.userId || "")}
                              onReport={() => setReport({ type: "comment", id: reply.commentId })}
                            />
                            {report?.type === "comment" && report.id === reply.commentId && (
                              <ReportBox
                                onClose={() => setReport(null)}
                                onSubmit={async (payload) => {
                                  const data = await reportGroupComment(groupId, reply.commentId, payload);
                                  setNote(data.message);
                                }}
                              />
                            )}
                          </div>
                        ))}
                        {replyTo === comment.commentId && (
                          <Composer
                            placeholder="Trả lời bình luận. Có thể kèm ảnh và tệp."
                            onCancel={() => setReplyTo(null)}
                            onSend={(payload) => publishGroupComment(groupId, post.postId, { ...payload, parentCommentId: comment.commentId }).then(() => {
                              setReplyTo(null);
                              return load();
                            })}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {!(post.comments || []).some((comment) => comment.commentId === replyTo) && (
                    <Composer
                      placeholder="Viết bình luận"
                      onSend={(payload) => publishGroupComment(groupId, post.postId, payload).then(load)}
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500">Bài đăng chỉ hiện với thành viên đã được gia sư duyệt.</p>
        )}
        </div>

        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Thành viên</h2>
              <span className="text-xs text-slate-400">{group.memberCount}</span>
            </div>
            <ul className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {members.length === 0 && <li className="text-sm text-slate-400">Chưa có danh sách thành viên.</li>}
              {members.map((person) => (
                <li key={person.userId} className="flex items-center gap-2">
                  <img src={face(person)} alt="" className="h-8 w-8 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">{person.fullName}</p>
                    <p className="text-[11px] text-slate-400">{person.fullName === group.ownerName ? "Trưởng nhóm" : person.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function CommentRow({ comment, mine, onReply, onReport }) {
  return (
    <div className="flex gap-2">
      <img src={face(comment.author)} alt="" className="h-8 w-8 rounded-full object-cover" />
      <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">
            {comment.author?.fullName} <RoleMark role={comment.author?.role} />
          </p>
          {!mine && onReport && (
            <button type="button" onClick={onReport} className="text-slate-400" title="Báo cáo bình luận">
              <Flag size={13} />
            </button>
          )}
        </div>
        {comment.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>}
        <Files files={comment.files} />
        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
          <span>{when(comment.createdAt)}</span>
          {onReply && (
            <button type="button" onClick={onReply} className="inline-flex items-center gap-1 font-medium text-slate-500">
              <MessageCircle size={12} /> Trả lời
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
