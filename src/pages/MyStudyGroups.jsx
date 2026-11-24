import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Flag, ImagePlus, Search, Send } from "lucide-react";
import { getGroupFeed, getMyStudyDesk, listMyGroupFeed, moderateGroupJoin, publishGroupComment, publishGroupPost, reportGroupComment, reportGroupPost, respondJoinRequest, reviewGroupPost } from "../api/studyGroups";
import { avatarUrl, getUser, isLoggedIn, loginPath } from "../auth";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref } from "../utils/format";
import { levelLabel } from "../data/studyLevels";
import { CommentRow, Composer, face, Files, ReportBox, RoleMark } from "./StudyGroupDetail";

function when(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN") : "";
}

function mark(title) {
  const words = (title || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "NH";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function MyStudyGroups() {
  const navigate = useNavigate();
  const me = getUser();
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [report, setReport] = useState(null);
  const [filter, setFilter] = useState("all");
  const [groupId, setGroupId] = useState("");
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [openApprove, setOpenApprove] = useState("");
  const [params] = useSearchParams();
  const mineId = String(me?.userId || "");

  const load = () => {
    setLoading(true);
    Promise.all([
      listMyGroupFeed().catch((err) => {
        setError(err.response?.data?.message || "Không tải được bảng tin.");
        return { items: [] };
      }),
      getMyStudyDesk().catch(() => ({ items: [] })),
    ]).then(async ([feed, desk]) => {
      setItems(feed.items || []);
      const joined = Array.isArray(desk.items || desk) ? (desk.items || desk) : [];
      const pages = await Promise.all(joined.map((group) => getGroupFeed(group.groupId).catch(() => null)));
      const merged = joined.map((group, index) => {
        const page = pages[index];
        if (!page?.canModerate) return group;
        return {
          ...group,
          isOwner: true,
          joinRequests: page.joinRequests || group.joinRequests || [],
          pendingPosts: (page.posts || []).filter((post) => post.status === "Pending"),
        };
      });
      setGroups(merged);
      setGroupId((current) => current || String(merged[0]?.groupId || ""));
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate(loginPath("/study-groups/mine"));
      return;
    }
    load();
  }, [navigate]);

  useEffect(() => {
    const id = params.get("duyet");
    if (!id) return;
    setOpenApprove(id);
    setGroupId(id);
    setFilter("group");
  }, [params]);

  const tutor = (me?.role || "").toLowerCase() === "tutor";
  const ownedGroups = groups.filter((group) => group.isOwner || Number(group.createdByUserId) === Number(mineId));
  const approveGroups = (openApprove
    ? ownedGroups.filter((group) => String(group.groupId) === openApprove)
    : ownedGroups
  );

  const decide = async (entry, accept) => {
    setError("");
    try {
      try {
        await moderateGroupJoin(entry.groupId, entry.userId, accept);
      } catch (err) {
        if (err.response?.status !== 404) throw err;
        await respondJoinRequest(entry.groupId, entry.userId, accept);
      }
      setNote(accept ? "Đã duyệt học sinh." : "Đã từ chối.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Không duyệt được.");
    }
  };

  const decidePost = async (group, postId, accept) => {
    setError("");
    try {
      const data = await reviewGroupPost(group.groupId, postId, accept);
      setNote(data?.message || (accept ? "Đã duyệt bài." : "Đã từ chối bài."));
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Không duyệt được bài.");
    }
  };

  const visible = useMemo(() => items.filter((item) => {
    const post = item.post || {};
    if (groupId && filter === "group" && String(item.groupId) !== groupId) return false;
    if (filter === "tutor") {
      const comments = post.comments || [];
      const answered = comments.some((comment) => comment.author?.role === "Gia sư" || (comment.replies || []).some((reply) => reply.author?.role === "Gia sư"));
      if (!answered) return false;
    }
    return true;
  }), [items, filter, groupId]);

  const sendPost = async () => {
    if (!groupId) {
      setError("Hãy vào một nhóm trước khi đăng bài.");
      return;
    }
    setPosting(true);
    setError("");
    try {
      const data = await publishGroupPost(Number(groupId), { body: draft, files });
      setDraft("");
      setFiles([]);
      setNote(data?.message || "Đã gửi bài.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Không đăng được bài.");
    } finally {
      setPosting(false);
    }
  };

  const chip = (id, label) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
        filter === id ? "bg-[#0B2241] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-16">
      <section className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link to="/study-groups" className="hover:text-brand-700">Nhóm học tập</Link>
              <span>/</span>
              <span className="font-semibold text-slate-900">Nhóm của tôi</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Nhóm của tôi</h1>
            <p className="mt-0.5 text-sm text-slate-500">Bài đã được gia sư duyệt từ các nhóm bạn tham gia.</p>
          </div>
          <Link to="/study-groups" className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100">
            <Search size={16} />
            Tìm nhóm khác
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl items-start gap-6 px-4 sm:px-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          {(error || note) && (
            <p className={`rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{error || note}</p>
          )}

          {tutor && approveGroups.map((group) => {
            const people = group.joinRequests || [];
            const posts = group.pendingPosts || [];
            return (
              <section key={group.groupId} className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <h2 className="text-sm font-bold text-amber-950">Duyệt học sinh · {group.title}</h2>
                {people.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-900">Chưa có học sinh chờ duyệt.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {people.map((person) => (
                      <li key={`${group.groupId}-${person.userId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{person.fullName}</p>
                          <p className="text-xs text-slate-500">{person.joinMessage || person.message || "Xin vào nhóm"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => decide({ ...person, groupId: group.groupId }, true)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white">Duyệt</button>
                          <button type="button" onClick={() => decide({ ...person, groupId: group.groupId }, false)} className="rounded-lg border px-3 py-1.5 text-xs">Từ chối</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <h3 className="mt-4 text-sm font-bold text-amber-950">Bài chờ duyệt · {posts.length}</h3>
                {posts.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-900">Chưa có bài hỏi chờ duyệt.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {posts.map((post) => (
                      <li key={post.postId} className="rounded-xl bg-white p-3">
                        <p className="text-sm font-semibold text-slate-900">{post.author?.fullName}</p>
                        {post.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{post.body}</p>}
                        <Files files={post.files} />
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => decidePost(group, post.postId, true)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white">Duyệt</button>
                          <button type="button" onClick={() => decidePost(group, post.postId, false)} className="rounded-lg border px-3 py-1.5 text-xs">Từ chối</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3.5">
              <img src={fileHref(me?.avatarUrl, API_ORIGIN) || avatarUrl(me?.fullName || me?.email)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">Đăng bài hỏi. Gia sư duyệt rồi bài mới hiện trên nhóm.</span>
                  <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 outline-none">
                    {groups.length === 0 && <option value="">Chưa có nhóm</option>}
                    {groups.map((group) => (
                      <option key={group.groupId} value={group.groupId}>Nhóm: {group.title}</option>
                    ))}
                  </select>
                </div>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Bạn đang gặp khó khăn ở bài tập nào?" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-brand-500 focus:bg-white" />
                {files.length > 0 && <p className="text-xs text-slate-500">{files.map((file) => file.name).join(", ")}</p>}
                <div className="flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    <ImagePlus size={15} className="text-brand-700" />
                    Ảnh / tệp
                    <input type="file" multiple className="hidden" accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 6))} />
                  </label>
                  <button type="button" disabled={posting} onClick={sendPost} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 sm:text-sm">
                    <Send size={14} /> {posting ? "Đang gửi" : "Đăng bài"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {chip("all", "Tất cả bài viết")}
              {chip("tutor", "Đã có gia sư giải")}
            </div>
            <span className="hidden text-xs text-slate-400 sm:inline">Mới nhất ở trên</span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Đang tải bài viết...</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Chưa có bài đã duyệt. Bài mới sẽ hiện sau khi gia sư chủ nhóm bấm duyệt.
            </div>
          ) : (
            visible.map((item) => {
              const post = item.post || {};
              const answered = (post.comments || []).some((comment) => comment.author?.role === "Gia sư" || (comment.replies || []).some((reply) => reply.author?.role === "Gia sư"));
              return (
                <article key={post.postId} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="inline-flex items-center gap-2">
                      <Link to={`/study-groups/${item.groupId}`} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700"># {item.groupTitle}</Link>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-500">Hỏi bài</span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${answered ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {answered ? "Gia sư đã phản hồi" : "Đang chờ giải đáp"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={face(post.author)} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{post.author?.fullName} <RoleMark role={post.author?.role} /></p>
                        <p className="mt-0.5 text-xs text-slate-400">{when(post.createdAt)}</p>
                      </div>
                    </div>
                    {mineId !== String(post.author?.userId || "") && (
                      <button type="button" onClick={() => setReport({ type: "post", id: post.postId })} className="text-slate-400" title="Báo cáo bài đăng">
                        <Flag size={15} />
                      </button>
                    )}
                  </div>
                  {post.body && <p className="mt-3.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{post.body}</p>}
                  <Files files={post.files} />
                  {report?.type === "post" && report.id === post.postId && (
                    <ReportBox
                      onClose={() => setReport(null)}
                      onSubmit={async (payload) => {
                        const data = await reportGroupPost(item.groupId, post.postId, payload);
                        setNote(data.message);
                        setError("");
                      }}
                    />
                  )}
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">{(post.comments || []).length} bình luận</p>
                  <div className="mt-3 space-y-3">
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
                              const data = await reportGroupComment(item.groupId, comment.commentId, payload);
                              setNote(data.message);
                              setError("");
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
                            </div>
                          ))}
                          {replyTo === comment.commentId && (
                            <Composer
                              placeholder="Trả lời bình luận"
                              onCancel={() => setReplyTo(null)}
                              onSend={(payload) => publishGroupComment(item.groupId, post.postId, { ...payload, parentCommentId: comment.commentId }).then(() => {
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
                        placeholder="Viết bình luận hoặc lời giải của bạn..."
                        onSend={(payload) => publishGroupComment(item.groupId, post.postId, payload).then(() => {
                          setError("");
                          return load();
                        })}
                      />
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-brand-600" />
                Nhóm bạn đã tham gia
              </h2>
              <span className="text-xs font-semibold text-slate-400">{groups.length} nhóm</span>
            </div>
            <div className="space-y-2.5">
              {groups.length === 0 && <p className="text-sm text-slate-400">Bạn chưa ở nhóm nào.</p>}
              {groups.map((group) => (
                <button
                  key={group.groupId}
                  type="button"
                  onClick={() => {
                    setGroupId(String(group.groupId));
                    setFilter("group");
                    setOpenApprove(group.isOwner ? String(group.groupId) : "");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left ${
                    filter === "group" && String(group.groupId) === groupId ? "border-brand-200 bg-brand-50" : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0B2241] text-xs font-bold text-white">{mark(group.title)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{group.title}</span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {group.hasMentor ? "Có gia sư" : "Nhóm học"} • {group.memberCount} thành viên
                        {group.educationLevel ? ` • ${levelLabel(group.educationLevel)}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">→</span>
                </button>
              ))}
            </div>
            <Link to="/study-groups" className="mt-4 block w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-center text-xs font-semibold text-slate-600 hover:border-brand-600 hover:text-brand-700">
              + Khám phá thêm nhóm học mới
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Gia sư chủ nhóm</h2>
            <div className="space-y-3">
              {groups.filter((group) => group.creatorName).slice(0, 4).map((group) => (
                <div key={group.groupId} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{group.creatorName}</p>
                    <p className="text-[11px] text-slate-500">{group.title}{group.subjectName ? ` • ${group.subjectName}` : ""}</p>
                  </div>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Gia sư</span>
                </div>
              ))}
              {groups.length === 0 && <p className="text-xs text-slate-400">Chưa có gia sư để hiện.</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#0B2241] to-[#133159] p-5 text-white shadow-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-300">Mẹo hỏi bài hiệu quả</p>
            <p className="text-xs leading-relaxed text-slate-200">Chụp rõ đề bài và ghi phần bạn đã thử giải để gia sư nhìn ra chỗ vướng nhanh hơn.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
