import { getUser, isLoggedIn } from "./auth";
import { getTutorIdentity, getTutorTestCommon, getTutorTestHistory } from "./api/study";

let cache = null;
let inflight = null;

export function invalidateTutorGate() {
  cache = null;
  inflight = null;
  window.dispatchEvent(new Event("tutor-gate"));
}

export function loadTutorGate(force = false) {
  const role = (getUser()?.role || "").toLowerCase();
  if (!isLoggedIn() || role !== "tutor") return Promise.resolve(null);
  if (cache && !force) return Promise.resolve(cache);
  if (inflight && !force) return inflight;

  inflight = Promise.all([
    getTutorIdentity().catch(() => null),
    getTutorTestCommon().catch(() => []),
    getTutorTestHistory().catch(() => []),
  ])
    .then(([identity, common, history]) => {
      const identityCompleted = Boolean(identity?.identityCompleted);
      const pedagogyPassed = (common || []).some((item) => item.status === "Đạt");
      const professionalPassed = (history || []).some(
        (item) => item.isPassed && (item.testType === "Professional" || item.subjectId)
      );
      cache = {
        ready: identityCompleted && pedagogyPassed && professionalPassed,
        identityCompleted,
        pedagogyPassed,
        professionalPassed,
      };
      inflight = null;
      return cache;
    })
    .catch(() => {
      inflight = null;
      cache = {
        ready: false,
        identityCompleted: false,
        pedagogyPassed: false,
        professionalPassed: false,
      };
      return cache;
    });

  return inflight;
}

const BASIC_PATHS = ["/profile", "/tutor", "/tutor-identity", "/tutor-tests", "/notifications", "/messages"];

export function tutorPathAllowed(pathname, ready) {
  const path = (pathname || "/").split("?")[0];
  if (BASIC_PATHS.includes(path)) return true;
  if (!ready) return false;
  if (["/bookings", "/study-groups/bids", "/sos", "/payments", "/faq", "/about", "/contact", "/help"].includes(path)) {
    return true;
  }
  const ownId = String(getUser()?.userId || "");
  if (ownId && path === `/tutors/${ownId}`) return true;
  return path.startsWith("/sos/");
}
