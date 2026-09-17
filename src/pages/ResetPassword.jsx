import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, ArrowRight } from "lucide-react";
import axiosClient from "../api/axiosClient";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromForgot = location.state?.email || "";

  const [email, setEmail] = useState(emailFromForgot);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axiosClient.post("/Auth/reset-password", { email, code, newPassword });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-6">
          <KeyRound size={24} />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Reset password
        </h2>
        <p className="text-slate-500 mb-6">
          Enter the code sent to your email and choose a new password.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Reset code</label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">New password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? "Saving..." : "Reset password"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link to="/login" className="hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
