import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, ShieldCheck, Sparkles, BadgeCheck, Users } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { redirectAfterAuth } from "../auth";
import GoogleSignInButton from "../components/GoogleSignInButton";
import Button from "../components/ui/Button";
import Field, { Input } from "../components/ui/Field";

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
      redirectAfterAuth(navigate, res.data.token, res.data.needsOnboarding, rememberMe, res.data.refreshToken);
    } catch (err) {
      if (!err.response) {
        setError("Không thể kết nối đến máy chủ Backend (Port 5008). Vui lòng thử lại sau.");
      } else {
        setError(err.response?.data?.message || "Email hoặc mật khẩu không chính xác.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-pop grid md:grid-cols-2 animate-scale-in">
        {/* Left panel — brand / value proposition */}
        <div className="relative hidden md:flex flex-col justify-between p-10 text-white overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
          {/* Decorative background: swap this div for a real campus photo (background-image) later */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(100deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 40px)",
            }}
          />

          <div className="relative z-10 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <GraduationCap size={22} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">TSG</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Tutor
            </span>
          </div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles size={13} className="text-amber-300" />
              Gia sư xác thực CCCD · Thanh toán ký quỹ
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight mb-4">
              Học cùng người thầy phù hợp với bạn.
            </h1>
            <p className="text-white/75 leading-relaxed mb-8 max-w-sm">
              Hàng nghìn gia sư đã qua kiểm duyệt, lộ trình minh bạch và an
              toàn — tiền được giữ ký quỹ đến khi buổi học hoàn tất.
            </p>

            <ul className="space-y-3 border-t border-white/15 pt-6 text-sm text-white/85">
              <li className="flex items-center gap-2.5">
                <BadgeCheck size={17} className="shrink-0 text-emerald-300" />
                100% gia sư xác thực CCCD &amp; đạt bài test năng lực
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck size={17} className="shrink-0 text-emerald-300" />
                Hoàn tiền nếu buổi học không đúng như mô tả
              </li>
              <li className="flex items-center gap-2.5">
                <Users size={17} className="shrink-0 text-emerald-300" />
                Hơn 50.000+ buổi học diễn ra mỗi tuần
              </li>
            </ul>
          </div>
        </div>

        {/* Right panel — sign in form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
            Đăng nhập
          </h2>
          <p className="text-slate-500 mb-6">
            Chào mừng bạn trở lại! Vui lòng nhập thông tin bên dưới.
          </p>

          <GoogleSignInButton
            onError={setError}
            onSuccess={(data) => redirectAfterAuth(navigate, data.token, data.needsOnboarding, rememberMe, data.refreshToken)}
          />

          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs font-medium text-slate-400">
              hoặc tiếp tục với email
            </span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 animate-fade-in"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" required>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="ten@truong.edu.vn"
                />
              )}
            </Field>

            <Field label="Mật khẩu" required>
              {({ id, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    invalid={invalid}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg text-slate-400 transition hover:text-slate-600 focus-ring"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              )}
            </Field>

            <div className="flex items-center justify-between pt-1">
              <label className="flex select-none items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
                />
                Ghi nhớ đăng nhập
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-brand-600 transition hover:text-brand-700 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Button type="submit" size="lg" loading={loading} className="w-full">
              {loading ? "Đang đăng nhập..." : "Đăng nhập an toàn"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
            >
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
