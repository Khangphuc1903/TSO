import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { MailCheck, ArrowRight } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { saveSession } from "../auth";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromRegister = location.state?.email || "";

  const [email, setEmail] = useState(emailFromRegister);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axiosClient.post("/Auth/confirm-email", { email, code });
      saveSession(res.data.token);
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    try {
      const res = await axiosClient.post("/Auth/resend-code", { email });
      setInfo(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend code.");
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-6">
          <MailCheck size={24} />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Verify your email
        </h2>
        <p className="text-slate-500 mb-6">
          We sent a 6-digit code to your email address. Enter it below to
          activate your account.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 text-sm text-verified-600 bg-verified-50 rounded-lg px-3 py-2">
            {info}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
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
            <label className="block text-sm text-slate-600 mb-1">
              Verification Code
            </label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? "Verifying..." : "Verify Email"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <button
          onClick={handleResend}
          className="w-full text-center text-sm text-brand-600 hover:underline mt-4"
        >
          Didn't get a code? Resend
        </button>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link to="/login" className="hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}