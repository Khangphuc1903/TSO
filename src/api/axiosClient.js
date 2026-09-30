import axios from "axios";

// Change this to match the port your .NET backend runs on (shown in the
// console window when you press F5 in Visual Studio, e.g. https://localhost:7123/api)
export const API_ORIGIN = "http://localhost:5008";

const axiosClient = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

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
    url.includes("/auth/google?") ||
    url.includes("/auth/google-config?");
  const token = localStorage.getItem("token");
  if (token && !isPublicAuth) config.headers.Authorization = `Bearer ${token}`;

  const isForm = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isForm) {
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
    }
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

export default axiosClient;
