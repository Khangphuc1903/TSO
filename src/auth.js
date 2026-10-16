const TOKEN = "token";
const REFRESH = "refreshToken";
const USER = "user";

export function parseUserFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const email =
      payload.email ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
      "";
    const role =
      payload.role ||
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      "";
    const candidates = [
      payload.uid,
      payload.nameid,
      payload.sub,
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
    ];
    const userId = candidates.find((v) => v != null && String(v).trim() !== "" && /^\d+$/.test(String(v))) || "";
    return { email, role, userId: String(userId) };
  } catch {
    return null;
  }
}

function authStore() {
  if (sessionStorage.getItem(TOKEN)) return sessionStorage;
  return localStorage;
}

export function getToken() {
  return sessionStorage.getItem(TOKEN) || localStorage.getItem(TOKEN) || "";
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH) || localStorage.getItem(REFRESH) || "";
}

export function saveSession(token, remember = false, refreshToken = "") {
  sessionStorage.removeItem(TOKEN);
  sessionStorage.removeItem(USER);
  sessionStorage.removeItem(REFRESH);
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
  localStorage.removeItem(REFRESH);
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN, token);
  if (refreshToken) store.setItem(REFRESH, refreshToken);
  const user = parseUserFromToken(token);
  if (user) store.setItem(USER, JSON.stringify(user));
  return user;
}

export function getUser() {
  const token = getToken();
  if (!token) return null;
  const parsed = parseUserFromToken(token);
  if (!parsed) return null;
  try {
    const extra = JSON.parse(authStore().getItem(USER) || "{}");
    if (extra.avatarUrl) parsed.avatarUrl = extra.avatarUrl;
  } catch {
    /* ignore */
  }
  return parsed;
}

export function updateStoredUser(patch) {
  const store = authStore();
  let current = {};
  try {
    current = JSON.parse(store.getItem(USER) || "{}");
  } catch {
    current = {};
  }
  store.setItem(USER, JSON.stringify({ ...current, ...patch }));
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function homeForRole(role) {
  const r = (role || "").toLowerCase();
  if (r === "pending") return "/onboarding";
  if (r === "admin") return "/admin";
  return r === "tutor" ? "/tutor" : "/profile";
}

export function redirectAfterAuth(navigate, token, needsOnboarding, remember = false, refreshToken = "") {
  const user = saveSession(token, remember, refreshToken);
  if (needsOnboarding || (user?.role || "").toLowerCase() === "pending") {
    authStore().setItem("needsOnboarding", "1");
    navigate("/onboarding");
    return;
  }
  sessionStorage.removeItem("needsOnboarding");
  localStorage.removeItem("needsOnboarding");
  navigate(homeForRole(user?.role));
}

export function logout() {
  sessionStorage.removeItem(TOKEN);
  sessionStorage.removeItem(USER);
  sessionStorage.removeItem(REFRESH);
  sessionStorage.removeItem("needsOnboarding");
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem("needsOnboarding");
}

export function avatarUrl(email) {
  const name = encodeURIComponent(email || "User");
  return `https://ui-avatars.com/api/?name=${name}&background=1D3FAE&color=fff&size=128`;
}
