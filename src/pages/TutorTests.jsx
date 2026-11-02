import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import TutorSetupSteps from "../components/TutorSetupSteps";
import { getUser, isLoggedIn } from "../auth";
import {
  getTutorTestCatalog,
  getTutorTestCommon,
  getTutorTestHistory,
  getTutorTestQuestions,
  getTutorWorkspace,
  registerTutorTest,
  submitTutorTest,
} from "../api/study";

const OPTION_LABELS = ["A", "B", "C", "D"];

function levelLabel(value) {
  const map = {
    Primary: "Tiểu học",
    Secondary: "THCS",
    High: "THPT",
    HighSchool: "THPT",
    THCS: "THCS",
    THPT: "THPT",
  };
  return map[value] || value || "Khác";
}

function bandOfLevel(educationLevel) {
  const v = (educationLevel || "").toLowerCase();
  if (v.includes("thcs") || v === "secondary") return "THCS";
  if (v.includes("thpt") || v.includes("high")) return "THPT";
  return educationLevel || "THCS";
}

function formatClock(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function retryLeft(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

function StatusBadge({ status }) {
  if (status === "Đạt") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[11px] font-semibold">
        <CheckCircle2 size={13} /> Đạt
      </span>
    );
  }
  if (status === "Không đạt") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 px-2.5 py-1 text-[11px] font-semibold">
        <XCircle size={13} /> Không đạt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2.5 py-1 text-[11px] font-semibold">
      <ClipboardList size={13} /> Chưa làm
    </span>
  );
}

export default function TutorTests() {
  const navigate = useNavigate();
  const user = getUser();
  const isTutor = (user?.role || "").toLowerCase() === "tutor";

  const [catalog, setCatalog] = useState([]);
  const [common, setCommon] = useState([]);
  const [history, setHistory] = useState([]);
  const [passedCount, setPassedCount] = useState(0);
  const [identityCompleted, setIdentityCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [level, setLevel] = useState("");
  const [subjectId, setSubjectId] = useState(null);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const submittedRef = useRef(false);

  const load = async () => {
    const [cat, com, hist, ws] = await Promise.all([
      getTutorTestCatalog(),
      getTutorTestCommon().catch(() => []),
      getTutorTestHistory().catch(() => []),
      getTutorWorkspace().catch(() => null),
    ]);
    setCatalog(cat);
    setCommon(com);
    setHistory(hist);
    setPassedCount(ws?.passedTestCount || hist.filter((h) => h.isPassed && (h.testType === "Professional" || h.subjectId)).length);
    setIdentityCompleted(Boolean(ws?.identityCompleted));
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (!isTutor) {
      navigate("/profile");
      return;
    }
    load()
      .catch(() => setError("Không tải được bài kiểm tra. Kiểm tra backend đang chạy."))
      .finally(() => setLoading(false));
  }, [navigate, isTutor]);

  const levels = useMemo(
    () =>
      catalog.filter((l) => {
        const v = (l.educationLevel || "").toLowerCase();
        return v.includes("secondary") || v.includes("high") || v.includes("thcs") || v.includes("thpt");
      }),
    [catalog]
  );
  const levelSubjects = useMemo(() => {
    const lv = levels.find((l) => l.educationLevel === level);
    return lv ? lv.subjects : [];
  }, [levels, level]);

  const startExam = async ({ testType, subjectId: sid, gradeLevel, educationLevel }) => {
    setError("");
    setSubmitting(true);
    submittedRef.current = false;
    try {
      const band = gradeLevel || bandOfLevel(educationLevel || level);
      if (testType === "Professional" || !testType) {
        await registerTutorTest({ subjectId: sid, gradeLevel: band });
      }
      const data = await getTutorTestQuestions(sid || 0, band, testType || "Professional");
      setSession(data);
      setAnswers({});
      setResult(null);
      setSubjectId(sid || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể bắt đầu bài kiểm tra.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitExam = async ({ auto = false } = {}) => {
    if (!session?.questions?.length || submittedRef.current) return;
    submittedRef.current = true;
    setError("");
    setSubmitting(true);
    try {
      const data = await submitTutorTest({
        testType: session.testType || "Professional",
        subjectId: session.subjectId || subjectId || 0,
        gradeLevel: session.gradeLevel,
        startedAt: session.startedAt,
        answers: Object.entries(answers).map(([questionId, option]) => ({
          questionId: Number(questionId),
          selectedOption: option,
        })),
      });
      setResult({ ...data, autoSubmitted: auto });
      setSession(null);
      await load();
    } catch (err) {
      submittedRef.current = false;
      setError(err.response?.data?.message || "Không thể nộp bài kiểm tra.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <section className="relative overflow-hidden pt-12 pb-8 px-6">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(60% 50% at 50% 0%, rgba(59,91,219,0.12), transparent)",
          }}
        />
        <div className="max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} />
            Điều kiện giảng dạy
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Bài kiểm tra <span className="text-brand-600">gia sư</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Chọn THCS hoặc THPT, xác nhận môn dạy — hệ thống giao đề chuyên môn 25 phút. Đạt rồi làm bài An toàn và Kỹ năng sư phạm.
          </p>
          <div className="mt-6">
            <TutorSetupSteps passedTestCount={passedCount} identityCompleted={identityCompleted} current="tests" />
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
          </div>
        ) : session ? (
          <TakingView
            questions={session}
            answers={answers}
            setAnswers={setAnswers}
            submitting={submitting}
            onSubmit={() => submitExam({ auto: false })}
            onTimeout={() => submitExam({ auto: true })}
          />
        ) : result ? (
          <ResultView
            result={result}
            onList={() => setResult(null)}
            onRetry={() => {
              const wait = retryLeft(result.retryAvailableAt);
              if (wait > 0) {
                setError(`Thi lại sau ${formatClock(wait)}.`);
                return;
              }
              startExam({
                testType: result.testType,
                subjectId: result.subjectId,
                gradeLevel: result.gradeLevel,
                educationLevel: result.educationLevel,
              });
            }}
          />
        ) : (
          <WizardView
            levels={levels}
            level={level}
            setLevel={(v) => {
              setLevel(v);
              setSubjectId(null);
            }}
            levelSubjects={levelSubjects}
            submitting={submitting}
            startExam={startExam}
            common={common}
            history={history}
          />
        )}
      </main>
    </div>
  );
}

function TakingView({ questions, answers, setAnswers, submitting, onSubmit, onTimeout }) {
  const list = questions.questions || [];
  const [left, setLeft] = useState(() => {
    const ends = new Date(questions.endsAt).getTime();
    if (Number.isFinite(ends)) return Math.max(0, Math.floor((ends - Date.now()) / 1000));
    return (questions.durationMinutes || 25) * 60;
  });
  const timedOut = useRef(false);
  const timeoutRef = useRef(onTimeout);
  timeoutRef.current = onTimeout;

  useEffect(() => {
    const ends = new Date(questions.endsAt).getTime();
    const tick = () => {
      const remain = Number.isFinite(ends)
        ? Math.max(0, Math.floor((ends - Date.now()) / 1000))
        : 0;
      setLeft(remain);
      if (remain <= 0 && !timedOut.current) {
        timedOut.current = true;
        timeoutRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [questions.endsAt]);

  const urgent = left <= 60;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <BookOpen size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">
                {questions.title || questions.subjectName}
                {questions.gradeLevel && questions.testType === "Professional" ? ` · ${questions.gradeLevel}` : ""}
              </p>
              <p className="text-xs text-slate-500">
                {list.length} câu · đạt từ {questions.passThreshold}% · nộp sớm vẫn chấm
              </p>
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-lg font-bold tabular-nums ${
              urgent ? "bg-red-50 text-red-600" : "bg-slate-900 text-white"
            }`}
          >
            <Clock size={18} />
            {formatClock(left)}
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div
            className={`h-full ${urgent ? "bg-red-500" : "bg-brand-600"}`}
            style={{
              width: `${Math.min(100, (left / ((questions.durationMinutes || 25) * 60)) * 100)}%`,
            }}
          />
        </div>
      </div>
      <div className="px-6 py-6 space-y-5">
        {list.map((q, index) => (
          <div key={q.questionId} className="rounded-xl border border-slate-100 bg-slate-50/60 p-5">
            <p className="text-sm font-medium text-slate-900 mb-4">
              <span className="text-brand-600 mr-2">Câu {index + 1}.</span>
              {q.content}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[q.optionA, q.optionB, q.optionC, q.optionD].map((option, i) => {
                const letter = OPTION_LABELS[i];
                const selected = answers[q.questionId] === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    disabled={submitting}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.questionId]: letter }))}
                    className={`flex items-start gap-3 text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                      selected
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="pt-0.5">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 pb-4">
          <p className="text-sm text-slate-500">
            Đã trả lời {Object.keys(answers).length}/{list.length} câu
            {Object.keys(answers).length < list.length ? " · câu trống tính sai" : ""}
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg px-6 py-2.5"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultView({ result, onList, onRetry }) {
  const [wait, setWait] = useState(() => retryLeft(result.retryAvailableAt));
  useEffect(() => {
    if (result.isPassed) return undefined;
    const id = setInterval(() => setWait(retryLeft(result.retryAvailableAt)), 500);
    return () => clearInterval(id);
  }, [result]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 px-6 py-10 text-center">
      {result.isPassed ? (
        <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-600" />
      ) : (
        <XCircle size={48} className="mx-auto mb-3 text-red-500" />
      )}
      <h2 className="text-xl font-bold text-slate-900">
        {result.subjectName}
        {result.gradeLevel && result.testType === "Professional" ? ` · ${result.gradeLevel}` : ""}
      </h2>
      <p className={`text-sm font-semibold mt-1 ${result.isPassed ? "text-emerald-600" : "text-red-500"}`}>
        {result.autoSubmitted ? "Hết giờ — đã tự nộp. " : ""}
        {result.isPassed ? "Đạt bài kiểm tra" : "Chưa đạt"}
      </p>
      <div className="mx-auto max-w-xs rounded-xl border border-slate-100 bg-slate-50 p-4 mt-5 mb-6">
        <p className="text-3xl font-bold text-slate-900">{result.scorePercent}%</p>
        <p className="text-xs text-slate-500 mt-1">
          Đúng {result.correctCount}/{result.totalQuestions} câu · ngưỡng {result.passThreshold}%
        </p>
      </div>
      {!result.isPassed && wait > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4 inline-block">
          Thi lại sau 30 phút · còn {formatClock(wait)}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onList} className="text-sm font-medium text-brand-600 hover:underline">
          ← Về danh sách bài
        </button>
        {result.isPassed ? (
          <Link
            to="/tutor"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-5 py-2.5"
          >
            Tiếp tục hồ sơ dạy
          </Link>
        ) : (
          <button
            type="button"
            disabled={wait > 0}
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2.5"
          >
            <RotateCcw size={16} /> {wait > 0 ? `Thi lại (${formatClock(wait)})` : "Thi lại"}
          </button>
        )}
      </div>
    </div>
  );
}

function WizardView({ levels, level, setLevel, levelSubjects, submitting, startExam, common, history }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-1">1. Chọn cấp học</h2>
        <p className="text-xs text-slate-500 mb-3">Chỉ THCS hoặc THPT. Không chọn từng lớp.</p>
        {levels.length === 0 ? (
          <p className="text-sm text-slate-500">
            Chưa có bộ câu hỏi. Chạy script `seed-tutor-test-questions.sql` trên database rồi tải lại trang.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {levels.map((lv) => (
              <button
                key={lv.educationLevel}
                type="button"
                onClick={() => setLevel(lv.educationLevel)}
                className={`rounded-xl border px-5 py-3 text-sm font-medium transition-colors ${
                  level === lv.educationLevel
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                }`}
              >
                {levelLabel(lv.educationLevel)}
              </button>
            ))}
          </div>
        )}
      </div>

      {level && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">2. Xác nhận môn dạy — đề chuyên môn {levelLabel(level)}</h2>
            <p className="text-xs text-slate-500 mt-1">Bấm bắt đầu: 25 phút, hết giờ tự nộp và chấm ngay.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {levelSubjects.map((subj) => {
              const g = (subj.grades || [])[0];
              const wait = retryLeft(g?.retryAvailableAt);
              const blocked = g?.status === "Không đạt" && wait > 0;
              return (
                <div key={subj.subjectId} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{subj.subjectName}</p>
                    <p className="text-xs text-slate-400">
                      {subj.questionCount} câu · {levelLabel(level)}
                      {g?.latestScorePercent != null ? ` · lần gần nhất ${g.latestScorePercent}%` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={g?.status || "Chưa làm"} />
                    <button
                      type="button"
                      disabled={submitting || !subj.questionCount || blocked}
                      onClick={() =>
                        startExam({
                          testType: "Professional",
                          subjectId: subj.subjectId,
                          gradeLevel: bandOfLevel(level),
                          educationLevel: level,
                        })
                      }
                      className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
                    >
                      <Play size={15} />
                      {blocked ? `Thi lại ${formatClock(wait)}` : g?.status === "Đạt" ? "Làm lại" : "Bắt đầu 25 phút"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck size={18} className="text-brand-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">3. Bài an toàn và kỹ năng sư phạm</h2>
            <p className="text-xs text-slate-500">Làm sau bài chuyên môn. Mỗi bài 25 phút, trượt thì thi lại sau 30 phút.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {(common.length ? common : [
            { testType: "Safety", title: "An toàn", questionCount: 0, status: "Chưa làm" },
            { testType: "Pedagogy", title: "Kỹ năng sư phạm", questionCount: 0, status: "Chưa làm" },
          ]).map((item) => {
            const wait = retryLeft(item.retryAvailableAt);
            const blocked = item.status === "Không đạt" && wait > 0;
            return (
              <div key={item.testType} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.questionCount || 0} câu · 25 phút</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  <button
                    type="button"
                    disabled={submitting || blocked}
                    onClick={() => startExam({ testType: item.testType, subjectId: 0, gradeLevel: item.testType })}
                    className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
                  >
                    <Play size={15} />
                    {blocked ? `Thi lại ${formatClock(wait)}` : item.status === "Đạt" ? "Làm lại" : "Bắt đầu"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Lịch sử làm bài</h2>
          <ul className="space-y-2">
            {history.slice(0, 10).map((h) => (
              <li key={h.attemptId} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {h.subjectName}
                  {h.gradeLevel && h.testType !== "Safety" && h.testType !== "Pedagogy" ? ` · ${h.gradeLevel}` : ""}
                </span>
                <span className={h.isPassed ? "text-emerald-600 font-medium" : "text-red-500"}>
                  {h.scorePercent}% {h.isPassed ? "Đạt" : "Không đạt"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
