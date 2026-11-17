import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, Siren } from "lucide-react";
import { ChatComposer, ChatMessageBody } from "../components/ChatMedia";
import { getUser, isLoggedIn } from "../auth";
import { createAppHub } from "../api/hub";
import { getMessages, sendMessage, sendMessageAttachment } from "../api/study";
import { endSosSession, getSosSession, reviewSosSession } from "../api/sos";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref, formatVnd } from "../utils/format";

function parseServerTime(value) {
  if (!value) return null;
  const text = String(value);
  const hasZone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(text);
  const date = new Date(hasZone ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function remainLabel(endsAt) {
  const end = parseServerTime(endsAt);
  const ms = (end?.getTime() || 0) - Date.now();
  if (!end || ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function SosSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const me = getUser();
  const myId = Number(me?.userId || 0);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [callState, setCallState] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [incoming, setIncoming] = useState(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const bottomRef = useRef(null);
  const hubRef = useRef(null);
  const convRef = useRef(0);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const endsAtMs = parseServerTime(session?.endsAt)?.getTime() || 0;
  const ended = Boolean(session?.endedAt) || (endsAtMs > 0 && endsAtMs <= now);
  const conversationId = session?.conversationId;

  const load = async () => {
    const data = await getSosSession(sessionId);
    setSession(data);
    convRef.current = data?.conversationId || 0;
    if (data?.conversationId) {
      try {
        const msgs = await getMessages(data.conversationId);
        setMessages(Array.isArray(msgs) ? msgs : []);
      } catch {
        setError("Không tải được tin nhắn của phiên SOS.");
      }
    }
  };

  const hangup = async (notify = true) => {
    pcRef.current?.getSenders()?.forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setCallState("idle");
    setIncoming(null);
    if (notify) {
      try {
        await hubRef.current?.invoke("SosCallSignal", Number(sessionId), "hangup", "{}");
      } catch {
        /* ignore */
      }
    }
  };

  const ensurePc = async () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        hubRef.current
          ?.invoke("SosCallSignal", Number(sessionId), "ice", JSON.stringify(e.candidate))
          .catch(() => {});
      }
    };
    pc.ontrack = (e) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
    };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pcRef.current = pc;
    return pc;
  };

  const startCall = async () => {
    try {
      const pc = await ensurePc();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await hubRef.current.invoke("SosCallSignal", Number(sessionId), "offer", JSON.stringify(offer));
      setCallState("calling");
    } catch {
      setError("Không mở được micro. Cho phép quyền microphone để gọi SOS.");
    }
  };

  const answerCall = async (offer) => {
    try {
      const pc = await ensurePc();
      await pc.setRemoteDescription(JSON.parse(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await hubRef.current.invoke("SosCallSignal", Number(sessionId), "answer", JSON.stringify(answer));
      setCallState("live");
      setIncoming(null);
    } catch {
      setError("Không trả lời được cuộc gọi.");
    }
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    load().catch(() => setError("Không tải được phiên SOS."));
    const hub = createAppHub();
    hubRef.current = hub;
    hub.on("ReceiveMessage", (msg) => {
      if (Number(msg?.conversationId) !== Number(convRef.current)) return;
      setMessages((prev) =>
        prev.some((m) => Number(m.messageId) === Number(msg.messageId)) ? prev : [...prev, msg]
      );
    });
    hub.on("SosSessionEnded", () => {
      hangup(false);
      load().catch(() => {});
    });
    hub.on("SosCallSignal", async (payload) => {
      if (Number(payload?.sessionId) !== Number(sessionId)) return;
      if (payload.type === "offer") {
        setIncoming(payload.payload);
        setCallState("incoming");
      }
      if (payload.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(JSON.parse(payload.payload));
        setCallState("live");
      }
      if (payload.type === "ice" && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(JSON.parse(payload.payload));
        } catch {
          /* ignore */
        }
      }
      if (payload.type === "hangup") hangup(false);
    });
    hub.start()
      .then(async () => {
        await hub.invoke("JoinSosSession", Number(sessionId));
        const data = await getSosSession(sessionId);
        if (data?.conversationId) await hub.invoke("JoinConversation", data.conversationId);
      })
      .catch(() => {});
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(tick);
      hangup(false);
      hub.stop();
    };
  }, [sessionId]);

  useEffect(() => {
    if (!hubRef.current || !conversationId) return;
    hubRef.current.invoke("JoinConversation", conversationId).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!session?.endsAt || session.endedAt) return;
    const end = parseServerTime(session.endsAt);
    if (end && end.getTime() <= Date.now()) {
      endSosSession(sessionId).then(setSession).catch(() => {});
    }
  }, [now, session?.endsAt, session?.endedAt, sessionId]);

  const onSend = async ({ content, file }) => {
    if (!conversationId || ended) return;
    try {
      const msg = file
        ? await sendMessageAttachment(conversationId, { content, file })
        : await sendMessage(conversationId, content);
      setMessages((prev) =>
        prev.some((m) => Number(m.messageId) === Number(msg.messageId)) ? prev : [...prev, msg]
      );
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được tin.");
    }
  };

  const onReview = async (e) => {
    e.preventDefault();
    setReviewing(true);
    setError("");
    try {
      const data = await reviewSosSession(sessionId, { rating: stars, comment });
      setSession((current) => ({
        ...(current || {}),
        ...data,
        canReview: false,
        myRating: data?.myRating || stars,
        studentName: data?.studentName || current?.studentName,
        tutorName: data?.tutorName || current?.tutorName,
        subjectName: data?.subjectName || current?.subjectName,
        imageUrl: data?.imageUrl || current?.imageUrl,
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được đánh giá.");
    } finally {
      setReviewing(false);
    }
  };

  const onEnd = async () => {
    await hangup(true);
    try {
      const data = await endSosSession(sessionId);
      setSession(data);
    } catch (err) {
      setError(err.response?.data?.message || "Không kết thúc phiên.");
    }
  };

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMuted(next);
  };

  const peerName = myId === session?.studentId ? session?.tutorName : session?.studentName;

  return (
    <div className="min-h-screen bg-surface">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[280px_1fr] gap-4">
        <aside className="bg-white rounded-2xl border border-slate-100 shadow-lg p-4 space-y-3 h-fit">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
            <Siren size={14} /> SOS {session?.durationMinutes || 15} phút
          </p>
          <h1 className="text-lg font-bold text-slate-900">{session?.subjectName || "Phiên cứu viện"}</h1>
          <p className="text-sm text-slate-500">Với {peerName || "đối phương"}</p>
          <p className="text-3xl font-black tabular-nums text-rose-600">
            {session?.endsAt ? remainLabel(session.endsAt) : "--:--"}
          </p>
          <p className="text-xs text-slate-500">Phí {formatVnd(session?.feeAmount)} · {session?.payoutStatus === "Held" ? "tạm giữ, chuyển sau khi hết giờ" : session?.payoutStatus}</p>
          {session?.imageUrl && (
            <a href={fileHref(session.imageUrl, API_ORIGIN)} target="_blank" rel="noreferrer">
              <img src={fileHref(session.imageUrl, API_ORIGIN)} alt="" className="rounded-xl max-h-40 w-full object-cover" />
            </a>
          )}
          {session?.questionNote && <p className="text-sm text-slate-600">{session.questionNote}</p>}
          <audio ref={remoteAudioRef} autoPlay />
          
{ended ? (
  <>
    <p className="text-sm text-verified-700 bg-verified-50 rounded-lg px-3 py-2">
      Phiên đã kết thúc.
    </p>

    {session?.canReview && (
      <form onSubmit={onReview} className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">
          Đánh giá gia sư
        </p>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              className={`text-2xl leading-none ${
                n <= stars ? "text-amber-500" : "text-slate-300"
              }`}
              aria-label={`${n} sao`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Buổi cứu viện này giúp gì cho bạn?"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={reviewing}
          className="w-full h-10 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {reviewing ? "Đang gửi..." : "Gửi đánh giá"}
        </button>
      </form>
    )}

    {session?.myRating && (
      <p className="text-sm text-slate-600">
        Bạn đã đánh giá {session.myRating} sao.
      </p>
    )}
  </>
) : (
  <div className="space-y-2">
    {callState === "incoming" && (
      <button
        type="button"
        onClick={() => answerCall(incoming)}
        className="w-full h-10 rounded-lg bg-verified-600 text-white text-sm font-medium"
      >
        Trả lời gọi audio
      </button>
    )}

    {callState === "idle" && (
      <button
        type="button"
        onClick={startCall}
        className="w-full h-10 rounded-lg bg-brand-600 text-white text-sm font-medium"
      >
        Gọi audio SOS
      </button>
    )}

    {(callState === "live" || callState === "calling") && (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleMute}
          className="flex-1 h-10 rounded-lg border border-slate-200 text-sm inline-flex items-center justify-center gap-1"
        >
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
          {muted ? "Bật mic" : "Tắt mic"}
        </button>

        <button
          type="button"
          onClick={() => hangup(true)}
          className="h-10 px-3 rounded-lg bg-rose-600 text-white"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    )}

    <button
      type="button"
      onClick={onEnd}
      className="w-full h-10 rounded-lg border border-slate-200 text-sm"
    >
      Kết thúc phiên
    </button>
  </div>
)}
          <Link to="/sos" className="block text-center text-sm text-brand-600">
            Về SOS
          </Link>
        </aside>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-lg flex flex-col min-h-[70vh]">
          {error && <div className="mx-4 mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-surface/60">
            {messages.map((m) => {
              const mine = Number(m.senderId) === myId;
              return (
                <div key={m.messageId} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      mine ? "bg-brand-600 text-white rounded-br-md" : "bg-white text-slate-800 border border-slate-100 rounded-bl-md"
                    }`}
                  >
                    {!mine && <p className="text-[11px] font-medium text-brand-600 mb-0.5">{m.senderName}</p>}
                    <ChatMessageBody m={m} mine={mine} />
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
          <ChatComposer
            onSend={onSend}
            disabled={ended}
            placeholder={ended ? "Phiên đã hết" : "Nhắn, gửi ảnh hoặc file hướng dẫn..."}
          />
        </section>
      </main>
    </div>
  );
}
