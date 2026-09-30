import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Send, Users, X } from "lucide-react";
import { avatarUrl, getUser, isLoggedIn } from "../auth";
import { createAppHub } from "../api/hub";
import { getStudyGroup, getStudyGroupMessages, sendStudyGroupMessage } from "../api/studyGroups";
import { openConversation } from "../api/study";

export default function GroupChatPane({ groupId, title, members: membersProp = [], className = "" }) {
  const navigate = useNavigate();
  const me = getUser();
  const myId = Number(me?.userId || 0);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState(membersProp);
  const [groupTitle, setGroupTitle] = useState(title || "Chat nhóm");
  const [showMembers, setShowMembers] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const hubRef = useRef(null);

  useEffect(() => {
    setMembers(membersProp.filter((m) => m?.userId));
  }, [membersProp]);

  useEffect(() => {
    if (title) setGroupTitle(title);
  }, [title]);

  useEffect(() => {
    if (!groupId) return;
    setError("");
    setShowMembers(false);
    getStudyGroupMessages(groupId)
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setError("Chỉ thành viên nhóm mới chat được."));

    getStudyGroup(groupId)
      .then((g) => {
        if (g?.title) setGroupTitle(g.title);
        if (g?.members) setMembers(g.members);
      })
      .catch(() => {});

    const hub = createAppHub();
    hubRef.current = hub;
    hub.on("ReceiveGroupMessage", (msg) => {
      if (Number(msg.groupId) !== Number(groupId)) return;
      setMessages((prev) => (prev.some((m) => m.messageId === msg.messageId) ? prev : [...prev, msg]));
    });
    hub.start()
      .then(() => hub.invoke("JoinGroupChat", Number(groupId)))
      .catch(() => {});
    return () => {
      hub.stop();
    };
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const msg = await sendStudyGroupMessage(groupId, text.trim());
      setMessages((prev) => (prev.some((m) => m.messageId === msg.messageId) ? prev : [...prev, msg]));
      setText("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được tin nhắn.");
    }
  };

  const dmMember = async (userId) => {
    if (!isLoggedIn()) return navigate("/login");
    if (Number(userId) === myId) return;
    const id = await openConversation(Number(userId));
    navigate(`/messages?c=${id}`);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-slate-100 flex overflow-hidden relative ${className}`}>
      <div className="flex-1 flex flex-col min-w-0">
        <button
          type="button"
          onClick={() => setShowMembers((v) => !v)}
          className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
        >
          <span className="h-10 w-10 rounded-full bg-brand-50 text-brand-600 grid place-items-center">
            <Users size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 truncate">{groupTitle}</p>
            <p className="text-xs text-verified-600">
              {members.length} thành viên • bấm để xem danh sách
            </p>
          </div>
          <ChevronRight size={18} className={`text-slate-400 transition-transform ${showMembers ? "rotate-90" : ""}`} />
        </button>

        {error && (
          <div className="mx-4 mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-surface/60 min-h-[280px]">
          {messages.length === 0 && !error && (
            <p className="text-sm text-slate-500 text-center py-8">Chưa có tin nhắn. Hãy chào các bạn trong nhóm.</p>
          )}
          {messages.map((m) => {
            const mine = Number(m.senderId) === myId;
            return (
              <div key={m.messageId} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <img
                    src={m.senderAvatarUrl || avatarUrl(m.senderName)}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-brand-600 text-white rounded-br-md"
                      : "bg-white text-slate-800 border border-slate-100 rounded-bl-md"
                  }`}
                >
                  {!mine && <p className="text-[11px] font-medium text-brand-600 mb-0.5">{m.senderName}</p>}
                  <p>{m.content}</p>
                  {m.sentAt && (
                    <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-400"}`}>
                      {new Date(m.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhắn với nhóm..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg px-4 text-sm transition-colors"
          >
            Gửi
            <Send size={15} />
          </button>
        </form>
      </div>

      {showMembers && (
        <aside className="w-72 border-l border-slate-100 bg-white flex flex-col absolute md:static inset-y-0 right-0 z-10 shadow-lg md:shadow-none">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold text-slate-900">Thành viên</p>
            <button type="button" onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {members.length === 0 && <li className="text-sm text-slate-500 px-2 py-4">Chưa tải được thành viên.</li>}
            {members.map((m) => (
              <li key={m.userId}>
                <button
                  type="button"
                  onClick={() => dmMember(m.userId)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 text-left"
                >
                  <img src={m.avatarUrl || avatarUrl(m.fullName)} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {m.fullName}
                      {Number(m.userId) === myId ? " (Bạn)" : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      {Number(m.userId) === myId ? "Thành viên" : "Nhắn tin riêng"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
