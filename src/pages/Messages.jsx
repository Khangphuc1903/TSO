import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircle, Search, Send, Sparkles, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import GroupChatPane from "../components/GroupChatPane";
import { avatarUrl, getUser, isLoggedIn } from "../auth";
import { createAppHub } from "../api/hub";
import { getConversations, getMessages, sendMessage } from "../api/study";
import { getMyStudyGroupChats } from "../api/studyGroups";

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "groups" ? "groups" : "direct";
  const activeId = Number(searchParams.get("c") || 0);
  const groupId = Number(searchParams.get("g") || 0);
  const me = getUser();
  const myId = Number(me?.userId || 0);

  const [convos, setConvos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [hubReady, setHubReady] = useState(false);
  const bottomRef = useRef(null);
  const hubRef = useRef(null);

  const loadConvos = async () => {
    const data = await getConversations();
    setConvos(data || []);
  };

  const loadGroups = async () => {
    const data = await getMyStudyGroupChats();
    setGroups(Array.isArray(data) ? data : data.items || []);
  };

  const loadMessages = async (id) => {
    const data = await getMessages(id);
    setMessages(data || []);
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      setError("Đăng nhập để nhắn tin với gia sư hoặc nhóm học.");
      return;
    }
    loadConvos().catch(() => setError("Không tải được tin nhắn."));
    loadGroups().catch(() => {});

    const hub = createAppHub();
    hubRef.current = hub;
    hub.on("ReceiveMessage", (msg) => {
      if (Number(msg.conversationId) === Number(new URLSearchParams(window.location.search).get("c"))) {
        setMessages((prev) => [...prev, msg]);
      }
      loadConvos();
    });
    hub.start()
      .then(() => setHubReady(true))
      .catch(() => {});
    return () => {
      hub.stop();
    };
  }, []);

  useEffect(() => {
    if (tab !== "direct" || !activeId) return;
    loadMessages(activeId).catch(() => setSendError("Không tải được tin nhắn cuộc trò chuyện này."));
  }, [activeId, tab]);

  useEffect(() => {
    if (!hubReady || tab !== "direct" || !activeId) return;
    hubRef.current?.invoke("JoinConversation", activeId).catch(() => {});
  }, [hubReady, activeId, tab]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    setSendError("");
    try {
      const msg = await sendMessage(activeId, text.trim());
      setMessages((prev) => (prev.some((m) => m.messageId === msg.messageId) ? prev : [...prev, msg]));
      setText("");
      loadConvos();
    } catch (err) {
      setSendError(err.response?.data?.message || "Không gửi được tin nhắn. Thử đăng xuất rồi đăng nhập lại.");
    }
  };

  const active = convos.find((c) => c.conversationId === activeId);
  const activeGroup = groups.find((g) => g.groupId === groupId);
  const filteredConvos = convos.filter((c) =>
    (c.otherUserName || "").toLowerCase().includes(query.trim().toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    (g.title || "").toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <section className="relative overflow-hidden pt-8 pb-4 px-6">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)",
          }}
        />
        <div className="max-w-6xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-3">
            <Sparkles size={14} />
            Chat 1-1 và chat nhóm realtime
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Tin nhắn</h1>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 pb-8">
        {error ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
            <MessageCircle className="mx-auto text-brand-600 mb-3" />
            <p className="text-slate-500">
              {error}{" "}
              <Link to="/login" className="text-brand-600 font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-12rem)]">
            <aside className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100">
                <div className="flex mb-3">
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      tab === "direct"
                        ? "border-brand-600 text-brand-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <MessageCircle size={14} /> Cá nhân
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ tab: "groups" })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      tab === "groups"
                        ? "border-brand-600 text-brand-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Users size={14} /> Nhóm học
                  </button>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={tab === "groups" ? "Tìm nhóm..." : "Tìm theo tên..."}
                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {tab === "direct" && (
                  <>
                    {filteredConvos.length === 0 && (
                      <p className="p-4 text-sm text-slate-500">
                        Chưa có cuộc trò chuyện. Vào hồ sơ gia sư hoặc thành viên nhóm rồi bấm Nhắn tin.
                      </p>
                    )}
                    {filteredConvos.map((c) => (
                      <button
                        key={c.conversationId}
                        type="button"
                        onClick={() => setSearchParams({ c: String(c.conversationId) })}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          c.conversationId === activeId ? "bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <img
                          src={c.otherAvatarUrl || avatarUrl(c.otherUserName)}
                          alt=""
                          className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">{c.otherUserName}</p>
                            {c.unreadCount > 0 && (
                              <span className="text-[10px] font-semibold bg-brand-600 text-white rounded-full min-w-5 h-5 px-1.5 grid place-items-center">
                                {c.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {c.lastMessage || "Chưa có tin nhắn"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {tab === "groups" && (
                  <>
                    {filteredGroups.length === 0 && (
                      <p className="p-4 text-sm text-slate-500">
                        Chưa có nhóm.{" "}
                        <Link to="/study-groups" className="text-brand-600 hover:underline">
                          Tìm nhóm học
                        </Link>
                      </p>
                    )}
                    {filteredGroups.map((g) => (
                      <button
                        key={g.groupId}
                        type="button"
                        onClick={() => setSearchParams({ tab: "groups", g: String(g.groupId) })}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          g.groupId === groupId ? "bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="h-11 w-11 rounded-full bg-brand-50 text-brand-600 grid place-items-center flex-shrink-0">
                          <Users size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{g.title}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {g.lastMessage || `${g.subjectName} • ${g.memberCount} thành viên`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </aside>

            {tab === "groups" ? (
              groupId ? (
                <GroupChatPane
                  groupId={groupId}
                  title={activeGroup?.title}
                  members={[]}
                  className="h-full min-h-0"
                />
              ) : (
                <section className="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col overflow-hidden">
                  <div className="flex-1 grid place-items-center text-center px-6">
                    <div>
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-3">
                        <Users size={26} />
                      </span>
                      <p className="font-medium text-slate-900">Chọn một nhóm học</p>
                      <p className="text-sm text-slate-500 mt-1">Chat realtime với các bạn đã tham gia cùng nhóm.</p>
                    </div>
                  </div>
                </section>
              )
            ) : (
              <section className="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col overflow-hidden">
                {!activeId ? (
                  <div className="flex-1 grid place-items-center text-center px-6">
                    <div>
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-3">
                        <MessageCircle size={26} />
                      </span>
                      <p className="font-medium text-slate-900">Chọn một cuộc trò chuyện</p>
                      <p className="text-sm text-slate-500 mt-1">Nhắn tin với gia sư hoặc học viên đã kết nối với bạn.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                      <img
                        src={active?.otherAvatarUrl || avatarUrl(active?.otherUserName)}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-50"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{active?.otherUserName || "Chat"}</p>
                        <p className="text-xs text-verified-600">Đã kết nối qua TSG</p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-surface/60">
                      {messages.map((m) => {
                        const mine = m.senderId === myId;
                        return (
                          <div key={m.messageId} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                                mine
                                  ? "bg-brand-600 text-white rounded-br-md"
                                  : "bg-white text-slate-800 border border-slate-100 rounded-bl-md"
                              }`}
                            >
                              <p>{m.content}</p>
                              {m.sentAt && (
                                <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-400"}`}>
                                  {new Date(m.sentAt).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>
                    <form onSubmit={handleSend} className="p-3 border-t border-slate-100 space-y-2">
                      {sendError && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          {sendError}
                        </div>
                      )}
                      <div className="flex gap-2">
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Nhắn tin..."
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg px-4 text-sm transition-colors"
                      >
                        Gửi
                        <Send size={15} />
                      </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
