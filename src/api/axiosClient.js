import axios from "axios";

// Change this to match the port your .NET backend runs on (shown in the
// console window when you press F5 in Visual Studio, e.g. https://localhost:7123/api)
const axiosClient = axios.create({
  baseURL: "http://localhost:5008/api",
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT token (if the user is logged in) to every request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosClient;
