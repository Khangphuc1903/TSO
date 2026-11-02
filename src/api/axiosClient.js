import axios from "axios";
import { getRefreshToken, getToken, saveSession } from "../auth";

// Change this to match the port your .NET backend runs on (shown in the
// console window when you press F5 in Visual Studio, e.g. https://localhost:7123/api)
export const API_ORIGIN = "http://localhost:5008";

const axiosClient = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

let refreshPromise = null;

// Attach the JWT token (if the user is logged in) to every request
axiosClient.interceptors.request.use((config) => {
  const url = (config.url || "").toLowerCase();
  const isPublicAuth =
    /\/auth\/(login|register|confirm-email|resend-code|forgot-password|reset-password)(\?|$)/.test(url) ||
    url.endsWith("/auth/login") ||
    url.endsWith("/auth/register") ||
    url.endsWith("/auth/confirm-email") ||
    url.endsWith("/auth/resend-code") ||
    url.endsWith("/auth/forgot-password") ||
    url.endsWith("/auth/google") ||
    url.endsWith("/auth/google-config") ||
    url.endsWith("/auth/refresh") ||
    url.includes("/auth/google?") ||
    url.includes("/auth/google-config?");
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  if (token && !isPublicAuth) config.headers.Authorization = `Bearer ${token}`;

  const isForm = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isForm) {
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    }
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  } else if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

axiosClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = (original.url || "").toLowerCase();
    const skip =
      original._retry ||
      status !== 401 ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/register");
    if (skip) return Promise.reject(error);

    const refreshToken = getRefreshToken();
    if (!refreshToken) return Promise.reject(error);

    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_ORIGIN}/api/Auth/refresh`, { refreshToken })
          .then((res) => {
            const remember = Boolean(localStorage.getItem("token") || localStorage.getItem("refreshToken"));
            saveSession(res.data.token, remember, res.data.refreshToken);
            return res.data.token;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      const token = await refreshPromise;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token || getToken()}`;
      return axiosClient(original);
    } catch {
      return Promise.reject(error);
    }
  }
);

export default axiosClient;
