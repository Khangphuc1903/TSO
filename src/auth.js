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
    const userId =
      payload.nameid ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      "";
    return { email, role, userId };
  } catch {
    return null;
  }
}

export function saveSession(token) {
  localStorage.setItem("token", token);
  const user = parseUserFromToken(token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export function getUser() {
  try {
    const raw = localStorage.getItem("user");
    if (raw) return JSON.parse(raw);
    const token = localStorage.getItem("token");
    return token ? parseUserFromToken(token) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(localStorage.getItem("token"));
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function avatarUrl(email) {
  const name = encodeURIComponent(email || "User");
  return `https://ui-avatars.com/api/?name=${name}&background=1D3FAE&color=fff&size=128`;
}
