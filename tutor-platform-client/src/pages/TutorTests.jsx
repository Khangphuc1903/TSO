import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  GraduationCap,
  BookOpen,
  BookOpenCheck,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
  Play,
} from "lucide-react";
import axiosClient from "../api/axiosClient";

const OPTION_LABELS = ["A", "B", "C", "D"];

function getJwtRole() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      payload.role ||
      payload.roleName ||
      null
    );
  } catch {
    return null;
  }
}

function StatusBadge({ status }) {
  if (status === "Đạt") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verified-50 text-verified-600 px-3 py-1 text-xs font-semibold">
        <CheckCircle2 size={14} /> Đạt
      </span>
    );
  }
  if (status === "Không đạt") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 px-3 py-1 text-xs font-semibold">
        <XCircle size={14} /> Không đạt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-3 py-1 text-xs font-semibold">
      <ClipboardList size={14} /> Chưa làm
    </span>
  );
}
export default function TutorTests() {
  const role = useMemo(() => getJwtRole(), []);

  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Wizard selection
  const [level, setLevel] = useState("");
  const [subjectId, setSubjectId] = useState(null);
  const [grade, setGrade] = useState("");

  // Test taking
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Bài kiểm tra kỹ năng sư phạm (bắt buộc)
  const [pedStatus, setPedStatus] = useState(null);
  const [pedQuestions, setPedQuestions] = useState(null);
  const [pedAnswers, setPedAnswers] = useState({});
  const [pedResult, setPedResult] = useState(null);
  const [pedLoading, setPedLoading] = useState(true);
  const [pedSubmitting, setPedSubmitting] = useState(false);

  const loadCatalog = async () => {
    try {
      const res = await axiosClient.get("/tutor/me/tests/catalog");
      setCatalog(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách bài kiểm tra. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPedStatus = async () => {
    setPedLoading(true);
    try {
      const res = await axiosClient.get("/tutor/me/tests/pedagogical/status");
      setPedStatus(res.data);
    } catch {
      setPedStatus(null);
    } finally {
      setPedLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (role !== "Tutor") {
        setPedLoading(false);
        await loadCatalog();
        return;
      }
      await Promise.all([loadCatalog(), loadPedStatus()]);
    })();
  }, [role]);

  const levels = useMemo(() => catalog ?? [], [catalog]);
  const levelSubjects = useMemo(() => {
    const lv = levels.find((l) => l.educationLevel === level);
    return lv ? lv.subjects : [];
  }, [levels, level]);
  const selectedSubject = useMemo(
    () => levelSubjects.find((s) => s.subjectId === subjectId) || null,
    [levelSubjects, subjectId],
  );
const resetSelection = () => {
    setSubjectId(null);
    setGrade("");
  };

  const startTest = async (gradeLevel) => {
    setError("");
    setSubmitting(true);
    try {
      // Đăng ký tổ hợp (cấp + môn + lớp) trước – backend sẽ reject nếu chưa có bài test.
      await axiosClient.post("/tutor/me/tests/register", {
        subjectId,
        gradeLevel,
      });
      const res = await axiosClient.get("/tutor/me/tests/questions", {
        params: { subjectId, gradeLevel },
      });
      setQuestions(res.data);
      setAnswers({});
      setResult(null);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể bắt đầu bài kiểm tra.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitTest = async () => {
    setError("");
    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([questionId, option]) => ({
        questionId: Number(questionId),
        selectedOption: option,
      }));
      const res = await axiosClient.post("/tutor/me/tests/submit", {
        subjectId,
        gradeLevel: grade,
        startedAt: questions.startedAt,
        answers: answerList,
      });
      setResult(res.data);
      setQuestions(null);
      await loadCatalog();
      if (res.data.gradeLevel) setGrade(res.data.gradeLevel);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể nộp bài kiểm tra.");
    } finally {
      setSubmitting(false);
    }
  };

  const startPedTest = async () => {
    setError("");
    setPedSubmitting(true);
    try {
      const res = await axiosClient.get(
        "/tutor/me/tests/pedagogical/questions",
      );
      setPedQuestions(res.data);
      setPedAnswers({});
      setPedResult(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể bắt đầu bài kiểm tra kỹ năng sư phạm.",
      );
    } finally {
      setPedSubmitting(false);
    }
  };

  const submitPedTest = async () => {
    setError("");
    setPedSubmitting(true);
    try {
      const answerList = Object.entries(pedAnswers).map(
        ([questionId, option]) => ({
          questionId: Number(questionId),
          selectedOption: option,
        }),
      );
      const res = await axiosClient.post("/tutor/me/tests/pedagogical/submit", {
        startedAt: pedQuestions.startedAt,
        answers: answerList,
      });
      setPedResult(res.data);
      setPedQuestions(null);
      await loadPedStatus();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể nộp bài kiểm tra kỹ năng sư phạm.",
      );
    } finally {
      setPedSubmitting(false);
    }
  };

  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <GraduationCap size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bài kiểm tra kiến thức chuyên môn
            </h1>
            <p className="text-sm text-slate-500">
              Chọn cấp học → môn học → lớp, hoàn thành bài kiểm tra bắt buộc
              trước khi được xác nhận đủ điều kiện giảng dạy.
            </p>
          </div>
        </div>

        {role && role !== "Tutor" && (
          <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            Tài khoản hiện tại không có vai trò Gia sư. Vui lòng đăng ký vai
            trò Gia sư để thực hiện bài kiểm tra.
          </div>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Đang tải dữ
            liệu...
          </div>
        ) : (
          <>{renderBody()}</>
        )}
      </div>
    </div>
  );
function renderTaking() {
    return (
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-brand-600" />
            <div>
              <p className="font-semibold text-slate-900">
                {questions.subjectName} – {questions.gradeLevel}
              </p>
              <p className="text-xs text-slate-500">
                {questions.educationLevel} · {questions.questions.length} câu
                hỏi · đạt từ {questions.passThreshold}% trở lên
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuestions(null);
              setResult(null);
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Quay lại danh sách
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {questions.questions.map((q, index) => (
            <div
              key={q.questionId}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-5"
            >
              <p className="text-sm font-medium text-slate-900 mb-4">
                <span className="text-slate-400 mr-2">Câu {index + 1}:</span>
                {q.content}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[q.optionA, q.optionB, q.optionC, q.optionD].map(
                  (option, i) => {
                    const letter = OPTION_LABELS[i];
                    const selected = answers[q.questionId] === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.questionId]: letter,
                          }))
                        }
                        className={`flex items-start gap-3 text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                          selected
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            selected
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="pt-0.5">{option}</span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              Đã trả lời {Object.keys(answers).length}/
              {questions.questions.length} câu
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={submitTest}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg px-6 py-2.5 transition-colors"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
              Nộp bài
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderBody() {
    if (questions) return renderTaking();
    if (result) return renderResult();
    return (
      <>
        {role === "Tutor" && renderPedagogical()}
        {renderWizard()}
      </>
    );
  }

  function renderPedagogical() {
    if (pedQuestions) return renderPedTaking();
    if (pedResult) return renderPedResult();
    if (pedLoading) {
      return (
        <div className="mt-8 flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} />
          Đang tải trạng thái bài kiểm tra kỹ năng sư phạm...
        </div>
      );
    }
    const passed = pedStatus?.latestIsPassed === true;
    return (
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <BookOpenCheck size={22} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">
                Bài kiểm tra kỹ năng sư phạm (bắt buộc)
              </h2>
              <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
                Kiểm tra khả năng xử lý tình huống sư phạm khi giảng dạy. Gia sư
                phải đạt bài kiểm tra này trước khi được công bố hồ sơ dạy học.
              </p>
              {pedStatus?.latestScorePercent != null && (
                <p className="text-xs text-slate-400 mt-1">
                  Điểm gần nhất {pedStatus.latestScorePercent}% · Lần làm{" "}
                  {pedStatus.latestAttemptNumber}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={pedStatus?.status || "Chưa làm"} />
            <button
              type="button"
              disabled={pedSubmitting || passed}
              onClick={startPedTest}
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {passed ? <CheckCircle2 size={15} /> : <Play size={15} />}
              {passed
                ? "Đã hoàn thành"
                : pedStatus?.status === "Không đạt"
                  ? "Làm lại"
                  : "Bắt đầu"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPedTaking() {
    return (
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-brand-600" />
            <div>
              <p className="font-semibold text-slate-900">
                Bài kiểm tra kỹ năng sư phạm
              </p>
              <p className="text-xs text-slate-500">
                {pedQuestions.questions.length} câu hỏi · đạt từ{" "}
                {pedQuestions.passThreshold}% trở lên
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPedQuestions(null);
              setPedResult(null);
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Quay lại danh sách
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {pedQuestions.questions.map((q, index) => (
            <div
              key={q.questionId}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-5"
            >
              <p className="text-sm font-medium text-slate-900 mb-4">
                <span className="text-slate-400 mr-2">Câu {index + 1}:</span>
                {q.content}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[q.optionA, q.optionB, q.optionC, q.optionD].map(
                  (option, i) => {
                    const letter = OPTION_LABELS[i];
                    const selected = pedAnswers[q.questionId] === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() =>
                          setPedAnswers((prev) => ({
                            ...prev,
                            [q.questionId]: letter,
                          }))
                        }
                        className={`flex items-start gap-3 text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                          selected
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            selected
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="pt-0.5">{option}</span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              Đã trả lời {Object.keys(pedAnswers).length}/
              {pedQuestions.questions.length} câu
            </p>
            <button
              type="button"
              disabled={pedSubmitting}
              onClick={submitPedTest}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg px-6 py-2.5 transition-colors"
            >
              {pedSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
              Nộp bài
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPedResult() {
    return (
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-8 text-center">
          {pedResult.isPassed ? (
            <CheckCircle2 size={48} className="mx-auto mb-3 text-verified-600" />
          ) : (
            <XCircle size={48} className="mx-auto mb-3 text-red-500" />
          )}
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Bài kiểm tra kỹ năng sư phạm
          </h2>
          <p
            className={`text-sm font-semibold mb-4 ${
              pedResult.isPassed ? "text-verified-600" : "text-red-500"
            }`}
          >
            {pedResult.isPassed ? "ĐẠT" : "KHÔNG ĐẠT"}
          </p>
          <div className="mx-auto max-w-xs rounded-xl border border-slate-100 bg-slate-50 p-4 mb-6">
            <p className="text-3xl font-bold text-slate-900">
              {pedResult.scorePercent}%
            </p>
            <p className="text-xs text-slate-500">
              Trả lời đúng {pedResult.correctCount}/{pedResult.totalQuestions}
              {" "}câu · Ngưỡng đạt {pedResult.passThreshold}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Lần làm {pedResult.attemptNumber}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPedResult(null);
                setPedQuestions(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
            >
              ← Danh sách bài test
            </button>
            {!pedResult.isPassed && (
              <button
                type="button"
                onClick={() => setPedResult(null)}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
              >
                <RotateCcw size={16} /> Làm lại
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

function renderResult() {
    return (
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-8 text-center">
          {result.isPassed ? (
            <CheckCircle2 size={48} className="mx-auto mb-3 text-verified-600" />
          ) : (
            <XCircle size={48} className="mx-auto mb-3 text-red-500" />
          )}
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            {result.subjectName} – {result.gradeLevel}
          </h2>
          <p
            className={`text-sm font-semibold mb-4 ${
              result.isPassed ? "text-verified-600" : "text-red-500"
            }`}
          >
            {result.isPassed ? "ĐẠT" : "KHÔNG ĐẠT"}
          </p>
          <div className="mx-auto max-w-xs rounded-xl border border-slate-100 bg-slate-50 p-4 mb-6">
            <p className="text-3xl font-bold text-slate-900">
              {result.scorePercent}%
            </p>
            <p className="text-xs text-slate-500">
              Trả lời đúng {result.correctCount}/{result.totalQuestions} câu ·
              Ngưỡng đạt {result.passThreshold}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Lần làm {result.attemptNumber}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setQuestions(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
            >
              ← Danh sách bài test
            </button>
            {!result.isPassed && (
              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
              >
                <RotateCcw size={16} /> Làm lại
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
function renderWizard() {
    return (
      <>
        {/* Step 1: chọn cấp học */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-slate-700 mb-3">
            1. Chọn cấp học
          </h2>
          {levels.length === 0 ? (
            <div className="text-sm text-slate-500 bg-white border border-slate-100 rounded-xl px-5 py-6 text-center">
              Hiện chưa có cấp học/môn học nào có bài kiểm tra chuyên môn.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {levels.map((lv) => (
                <button
                  key={lv.educationLevel}
                  type="button"
                  onClick={() => {
                    setLevel(lv.educationLevel);
                    resetSelection();
                  }}
                  className={`rounded-xl border px-5 py-3 text-sm font-medium transition-colors ${
                    level === lv.educationLevel
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                  }`}
                >
                  {lv.educationLevel}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: chọn môn học */}
        {level && (
          <div className="mt-8">
            <h2 className="text-sm font-bold text-slate-700 mb-3">
              2. Chọn môn học
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {levelSubjects.map((subj) => (
                <button
                  key={subj.subjectId}
                  type="button"
                  onClick={() => {
                    setSubjectId(subj.subjectId);
                    setGrade("");
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    subjectId === subj.subjectId
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                  }`}
                >
                  <p className="font-medium">{subj.subjectName}</p>
                  <p className="text-xs text-slate-400">
                    {subj.grades.length > 0
                      ? `${subj.grades.length} lớp có bài test`
                      : "Chưa có bài test"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: chọn lớp + trạng thái */}
        {selectedSubject && (
          <div className="mt-8">
            <h2 className="text-sm font-bold text-slate-700 mb-3">
              3. Chọn lớp dạy – {selectedSubject.subjectName}
            </h2>
            {selectedSubject.grades.length === 0 ? (
              <div className="text-sm text-slate-500 bg-white border border-slate-100 rounded-xl px-5 py-6 text-center">
                Hiện chưa có bộ câu hỏi cho môn này. Hãy chọn môn khác.
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {selectedSubject.grades.map((g) => (
                    <div
                      key={g.gradeLevel}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {g.gradeLevel}
                        </p>
                        <p className="text-xs text-slate-400">
                          {g.questionCount} câu hỏi
                          {g.latestScorePercent != null &&
                            ` · Điểm gần nhất ${g.latestScorePercent}% (lần ${g.latestAttemptNumber})`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={g.status} />
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            setGrade(g.gradeLevel);
                            startTest(g.gradeLevel);
                          }}
                          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                        >
                          <Play size={15} />
                          {g.status === "Đạt" ? "Làm lại" : "Bắt đầu"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!level && (
          <p className="mt-8 text-sm text-slate-400">
            Chưa chọn gì?{" "}
            <Link
              to="/"
              className="text-brand-600 font-medium hover:underline"
            >
              Quay về trang chủ
            </Link>
          </p>
        )}
      </>
    );
  }
}