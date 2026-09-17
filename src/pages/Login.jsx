import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { saveSession } from "../auth";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axiosClient.post("/Auth/login", form);
      saveSession(res.data.token);
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2">
        {/* Left panel — brand / value proposition */}
        <div className="relative hidden md:flex flex-col justify-between p-10 text-white overflow-hidden bg-brand-700">
          {/* Decorative background: swap this div for a real campus photo (background-image) later */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(160deg, rgba(15,30,77,0.9), rgba(29,63,174,0.6)), repeating-linear-gradient(100deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 40px)",
            }}
          />

          <div className="relative z-10 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <GraduationCap size={20} />
            </span>
            <span className="text-lg font-semibold">EduConnect</span>
          </div>

          <div className="relative z-10">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Join the community of elite educators and students.
            </h1>
            <p className="text-white/80 leading-relaxed mb-8 max-w-sm">
              Access world-class curriculum, connect with verified experts,
              and elevate your learning journey in a secure, structured
              environment.
            </p>

            <div className="border-t border-white/20 pt-6 flex gap-10">
              <div>
                <div className="text-2xl font-bold">50k+</div>
                <div className="text-xs text-white/70">Active Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold">2,500+</div>
                <div className="text-xs text-white/70">Verified Educators</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — sign in form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Sign In</h2>
          <p className="text-slate-500 mb-6">
            Welcome back! Please enter your details.
          </p>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-2.5 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <GoogleIcon />
            Sign In with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400">
              or continue with email
            </span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@university.edu"
                  className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-slate-600">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-brand-600 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
              />
              Remember me for 30 days
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
            >
              {loading ? "Signing In..." : "Sign In Securely"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.4C41.4 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
