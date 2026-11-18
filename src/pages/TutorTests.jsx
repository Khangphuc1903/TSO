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
import TutorSetupSteps from "../components/TutorSetupSteps";
import { getUser, isLoggedIn } from "../auth";
import {
  commitTeachingSubjects,
  getTutorTestCatalog,
  getTutorTestCommon,
  getTutorTestHistory,
  getTutorTestQuestions,
  getTutorWorkspace,
  registerTutorTest,
  submitTutorTest,
} from "../api/study";
import { getSubjects } from "../api/tutorSearch";
import { invalidateTutorGate, loadTutorGate } from "../tutorGate";

const OPTION_LABELS = ["A", "B", "C", "D"];

function levelLabel(value) {
  const map = {
    Primary: "Tiểu học",
    Secondary: "THCS",
    High: "THPT",
    HighSchool: "THPT",
    THCS: "THCS",
    THPT: "THPT",
    "Tiểu học": "Cấp 1",
  };
  return map[value] || value || "Khác";
}

function bandOfLevel(educationLevel) {
  const v = (educationLevel || "").toLowerCase();
  if (v.includes("tieu") || v.includes("tiểu") || v === "primary" || v.includes("cap 1")) return "Tiểu học";
  if (v.includes("thcs") || v === "secondary") return "THCS";
  if (v.includes("thpt") || v.includes("high")) return "THPT";
  return educationLevel || "THCS";
}

function subjectKey(name) {
  const folded = foldVi(name);
  if (folded === "van" || folded === "ngu van") return "ngu van";
  return folded;
}

const SUBJECT_ORDER = ["toan", "tieng viet", "ngu van", "tieng anh", "ielts", "vat ly", "hoa hoc", "sinh hoc"];
const PRIMARY_KEYS = ["toan", "tieng viet"];

function foldVi(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mergeSubjects(list) {
  const map = new Map();
  for (const subj of list || []) {
    const key = subjectKey(subj.subjectName);
    const prev = map.get(key);
    const name = key === "ngu van" ? "Ngữ Văn" : subj.subjectName;
    const row = { ...subj, subjectName: name, grades: [...(subj.grades || [])] };
    if (!prev) {
      map.set(key, row);
      continue;
    }
    const prevIsVan = foldVi(prev.subjectName) === "van";
    const nextIsLiterature = key === "ngu van" && foldVi(subj.subjectName) === "ngu van";
    if (nextIsLiterature || prevIsVan) {
      map.set(key, { ...prev, ...row, grades: [...(prev.grades || []), ...(subj.grades || [])] });
      continue;
    }
    if ((subj.questionCount || 0) > (prev.questionCount || 0)) {
      prev.subjectId = subj.subjectId;
      prev.questionCount = subj.questionCount;
    }
  }
  return [...map.values()].sort((a, b) => {
    const ia = SUBJECT_ORDER.indexOf(subjectKey(a.subjectName));
    const ib = SUBJECT_ORDER.indexOf(subjectKey(b.subjectName));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
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
  const [allSubjects, setAllSubjects] = useState([]);
  const [common, setCommon] = useState([]);
  const [history, setHistory] = useState([]);
  const [passedCount, setPassedCount] = useState(0);
  const [identityCompleted, setIdentityCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [level, setLevel] = useState("");
  const [subjectId, setSubjectId] = useState(null);
  const [subjectsLocked, setSubjectsLocked] = useState(false);
  const [chosenSubjects, setChosenSubjects] = useState([]);
  const [pickedIds, setPickedIds] = useState([]);
  const [committing, setCommitting] = useState(false);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [welcome, setWelcome] = useState(false);
  const submittedRef = useRef(false);
  const readyBeforeRef = useRef(false);

  const load = async () => {
    const [cat, com, hist, ws, subjectRows] = await Promise.all([
      getTutorTestCatalog(),
      getTutorTestCommon().catch(() => []),
      getTutorTestHistory().catch(() => []),
      getTutorWorkspace().catch(() => null),
      getSubjects().catch(() => []),
    ]);
    setCatalog(cat);
    setAllSubjects(subjectRows);
    setCommon(com);
    setHistory(hist);
    setPassedCount(ws?.passedTestCount || hist.filter((h) => h.isPassed && (h.testType === "Professional" || h.subjectId)).length);
    setIdentityCompleted(Boolean(ws?.identityCompleted));
    const locked = Boolean(ws?.subjectsLocked);
    setSubjectsLocked(locked);
    const chosen = [];
    const seen = new Set();
    for (const subject of ws?.subjects || []) {
      if (seen.has(subject.subjectId)) continue;
      seen.add(subject.subjectId);
      chosen.push(subject);
    }
    setChosenSubjects(chosen);
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
    loadTutorGate().then((gate) => {
      readyBeforeRef.current = Boolean(gate?.ready);
    });
  }, [navigate, isTutor]);

  const sharedSubjects = useMemo(() => {
    const fromCatalog = catalog.flatMap((level) => level.subjects || []);
    return mergeSubjects(allSubjects.length ? allSubjects : fromCatalog);
  }, [allSubjects, catalog]);
  const levels = useMemo(
    () => [{ educationLevel: "Tiểu học" }, { educationLevel: "THCS" }, { educationLevel: "THPT" }],
    []
  );
  const levelSubjects = useMemo(() => {
    if (level === "Tiểu học") {
      return sharedSubjects.filter((subject) => PRIMARY_KEYS.includes(subjectKey(subject.subjectName)));
    }
    return sharedSubjects.filter((subject) => subjectKey(subject.subjectName) !== "tieng viet");
  }, [sharedSubjects, level]);
  const agreeSubjects = async () => {
    setError("");
    setCommitting(true);
    try {
      if (!level) {
        setError("Chọn cấp học trước.");
        return;
      }
      await commitTeachingSubjects(pickedIds, level);
      setPickedIds([]);
      await load();
    } catch (err) {
      const status = err.response?.status;
      setError(
        err.response?.data?.message
        || (status === 404
          ? "Backend chưa có bước khóa môn. Dừng debug và bấm F5 lại trong Visual Studio."
          : "Không khóa được môn dạy.")
      );
    } finally {
      setCommitting(false);
    }
  };

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
      const status = err.response?.status;
      setError(
        (testType || "").toLowerCase() === "ielts" && status === 403
          ? "Bài test IELTS cần backend mới. Dừng debug và bấm F5 trong Visual Studio."
          : (err.response?.data?.message || "Không thể bắt đầu bài kiểm tra.")
      );
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
      invalidateTutorGate();
      const gate = await loadTutorGate(true);
      if (data?.isPassed && gate?.ready && !readyBeforeRef.current) {
        setWelcome(true);
      }
      readyBeforeRef.current = Boolean(gate?.ready);
    } catch (err) {
      submittedRef.current = false;
      setError(err.response?.data?.message || "Không thể nộp bài kiểm tra.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
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
            Chọn cấp học trước (cấp 1, THCS hoặc THPT), rồi chọn môn trong cấp đó. Đồng ý xong mới có bài test đúng cấp. Sau khi đồng ý không đổi môn được nữa.
          </p>
          <div className="mt-6">
            <TutorSetupSteps passedTestCount={passedCount} identityCompleted={identityCompleted} current="tests" />
          </div>
        </div>
      </section>

      {welcome && <OfficialWelcome onDone={() => setWelcome(false)} />}

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
            subjectsLocked={subjectsLocked}
            chosenSubjects={chosenSubjects}
            levels={levels}
            level={level}
            setLevel={(value) => {
              setLevel(value);
              setPickedIds([]);
            }}
            levelSubjects={levelSubjects}
            pickedIds={pickedIds}
            setPickedIds={setPickedIds}
            committing={committing}
            onAgree={agreeSubjects}
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

function OfficialWelcome({ onDone }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 9400);
    const done = setTimeout(() => doneRef.current(), 10000);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center px-6 transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-slate-900/40" />
      <div className="relative w-full max-w-md rounded-3xl bg-white px-8 py-10 text-center shadow-pop animate-scale-in">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Xin chào gia sư</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Chúc mừng bạn đã trở thành gia sư chính thức</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Hồ sơ đã đủ điều kiện. Bạn có thể nhận lớp, chào thầu và mở lịch dạy.
        </p>
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

function statusFromHistory(subject, history) {
  const band = subject.gradeLevel || bandOfLevel(subject.educationLevel);
  const rows = (history || []).filter((item) => {
    if (item.subjectId !== subject.subjectId) return false;
    if (!item.gradeLevel) return true;
    return item.gradeLevel === band || bandOfLevel(item.gradeLevel) === band;
  });
  const passed = rows.find((item) => item.isPassed);
  if (passed) {
    return {
      status: "Đạt",
      grade: { latestScorePercent: passed.scorePercent, retryAvailableAt: null },
    };
  }
  const failed = rows.find((item) => item.isPassed === false);
  if (failed) {
    return {
      status: "Không đạt",
      grade: { latestScorePercent: failed.scorePercent, retryAvailableAt: failed.retryAvailableAt },
    };
  }
  return { status: "Chưa làm", grade: null };
}

function WizardView({
  subjectsLocked,
  chosenSubjects,
  levels,
  level,
  setLevel,
  levelSubjects,
  pickedIds,
  setPickedIds,
  committing,
  onAgree,
  submitting,
  startExam,
  common,
  history,
}) {
  const tests = subjectsLocked
    ? chosenSubjects.map((chosen) => ({
        ...chosen,
        educationLevel: chosen.gradeLevel || chosen.educationLevel,
      }))
    : [];

  return (
    <div className="space-y-6">
      {!subjectsLocked ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-1">1. Chọn cấp học</h2>
            <p className="text-xs text-slate-500 mb-3">Chọn cấp 1, THCS hoặc THPT. Cấp 1 chỉ có Toán và Tiếng Việt.</p>
            <div className="flex flex-wrap gap-3">
              {(levels.length ? levels : [{ educationLevel: "Tiểu học" }, { educationLevel: "THCS" }, { educationLevel: "THPT" }]).map((lv) => (
                <button
                  key={lv.educationLevel}
                  type="button"
                  onClick={() => setLevel(lv.educationLevel)}
                  className={`rounded-xl border px-5 py-3 text-sm font-medium ${
                    level === lv.educationLevel
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {levelLabel(lv.educationLevel)}
                </button>
              ))}
            </div>
          </div>
          {level && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-sm font-bold text-slate-800 mb-1">2. Bạn muốn dạy môn gì ở {levelLabel(level)}?</h2>
              <p className="text-xs text-slate-500 mb-3">Cấp 2 và cấp 3 có cùng các môn. Chọn 1 hoặc 2 môn, rồi đồng ý. Bài test sẽ theo đúng cấp vừa chọn.</p>
              {levelSubjects.length === 0 ? (
                <p className="text-sm text-slate-500">Cấp này chưa có môn có đề.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {levelSubjects.map((subject) => {
                    const on = pickedIds.includes(subject.subjectId);
                    return (
                      <button
                        key={subject.subjectId}
                        type="button"
                        onClick={() =>
                          setPickedIds((current) => {
                            if (current.includes(subject.subjectId)) return current.filter((id) => id !== subject.subjectId);
                            if (current.length >= 2) return current;
                            return [...current, subject.subjectId];
                          })
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-medium ${
                          on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {subject.subjectName}
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                disabled={committing || pickedIds.length < 1}
                onClick={onAgree}
                className="mt-4 h-10 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {committing ? "Đang lưu..." : "Đồng ý và làm bài test"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Bài test chuyên môn</h2>
            <p className="text-xs text-slate-500 mt-1">
              Môn đã chọn: {chosenSubjects.map((s) => s.subjectName).join(", ")}. Không đổi môn dạy nữa.
              {tests.length === 2 ? " Bạn có 2 bài test chuyên môn." : " Bạn có 1 bài test chuyên môn."}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {tests.map((subj) => {
              const info = statusFromHistory(subj, history);
              const wait = retryLeft(info.grade?.retryAvailableAt);
              const blocked = info.status === "Không đạt" && wait > 0;
              return (
                <div key={subj.subjectId} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{subj.subjectName}</p>
                    <p className="text-xs text-slate-400">
                      {levelLabel(subj.educationLevel)} · 25 phút
                      {info.grade?.latestScorePercent != null ? ` · lần gần nhất ${info.grade.latestScorePercent}%` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={info.status} />
                    <button
                      type="button"
                      disabled={submitting || blocked || info.status === "Đạt"}
                      onClick={() =>
                        startExam({
                          testType: "Professional",
                          subjectId: subj.subjectId,
                          gradeLevel: subj.gradeLevel || bandOfLevel(subj.educationLevel),
                          educationLevel: subj.educationLevel,
                        })
                      }
                      className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
                    >
                      <Play size={15} />
                      {info.status === "Đạt" ? "Đã đạt" : blocked ? `Thi lại ${formatClock(wait)}` : "Bắt đầu 25 phút"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Bài test IELTS</h2>
          <p className="text-xs text-slate-500">Bài riêng, không phụ thuộc môn đã khóa. 25 phút, đạt từ 70%.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {(common.some((item) => (item.testType || "").toLowerCase() === "ielts")
            ? common.filter((item) => (item.testType || "").toLowerCase() === "ielts")
            : [{ testType: "IELTS", title: "Bài test IELTS", questionCount: 12, status: "Chưa làm" }]
          ).map((item) => {
            const wait = retryLeft(item.retryAvailableAt);
            const blocked = item.status === "Không đạt" && wait > 0;
            return (
              <div key={item.testType} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.title || "Bài test IELTS"}</p>
                  <p className="text-xs text-slate-400">{item.questionCount || 0} câu · 25 phút</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  <button
                    type="button"
                    disabled={submitting || blocked || item.status === "Đạt" || !item.questionCount}
                    onClick={() => startExam({ testType: "IELTS", subjectId: 0, gradeLevel: "IELTS" })}
                    className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2"
                  >
                    <Play size={15} />
                    {item.status === "Đạt" ? "Đã đạt" : blocked ? `Thi lại ${formatClock(wait)}` : "Bắt đầu"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck size={18} className="text-brand-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">3. Bài an toàn và kỹ năng sư phạm</h2>
            <p className="text-xs text-slate-500">Làm sau bài chuyên môn. Mỗi bài 25 phút, trượt thì thi lại sau 30 phút.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {(common.filter((item) => (item.testType || "").toLowerCase() !== "ielts").length
            ? common.filter((item) => (item.testType || "").toLowerCase() !== "ielts")
            : []
          ).map((item) => {
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
                    disabled={submitting || blocked || !item.questionCount}
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
