import axios from "axios";

// The .NET backend binds to http://localhost:5008 (http profile in launchSettings.json).
// You can override it per-environment via a VITE_API_URL env var (see .env file if needed).
const apiUrl =
  import.meta.env.VITE_API_URL || "http://localhost:5008/api";

const axiosClient = axios.create({
  baseURL: apiUrl,
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT token (if the user is logged in) to every request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosClient;
