import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import axiosClient from "../api/axiosClient";
import GoogleSignInButton from "../components/GoogleSignInButton";
import LocationFields from "../components/LocationFields";
import { phoneError, regionError } from "../data/locations";
import { redirectAfterAuth } from "../auth";
import Button from "../components/ui/Button";
import Field, { Input, Select } from "../components/ui/Field";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    city: "",
    district: "",
    role: "Student",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const phoneMsg = phoneError(form.phoneNumber);
    if (phoneMsg) {
      setError(phoneMsg);
      return;
    }
    const areaMsg = regionError(form.city, form.district);
    if (areaMsg) {
      setError(areaMsg);
      return;
    }
    setLoading(true);

    try {
      await axiosClient.post("/Auth/register", form);
      navigate("/verify-email", { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md animate-scale-in rounded-3xl bg-white p-8 shadow-pop sm:p-10">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm">
            <GraduationCap size={20} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-brand-900">
            TSG
            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-400">
              Tutor
            </span>
          </span>
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
          Tạo tài khoản
        </h2>
        <p className="text-slate-500 mb-6">
          Tham gia cùng hàng nghìn học viên và gia sư đang học mỗi ngày.
        </p>

        <GoogleSignInButton
          label="Tiếp tục với Google"
          onError={setError}
          onSuccess={(data) => redirectAfterAuth(navigate, data.token, data.needsOnboarding, false, data.refreshToken)}
        />

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs font-medium text-slate-400">hoặc tiếp tục với email</span>
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
          <Field label="Họ và tên" required>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                type="text"
                name="fullName"
                required
                autoComplete="name"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
              />
            )}
          </Field>

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

          <Field label="Số điện thoại" required hint="Gồm đúng 10 chữ số, bắt đầu bằng 0.">
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                type="tel"
                name="phoneNumber"
                required
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })
                }
                placeholder="0912345678"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <LocationFields
              required
              city={form.city}
              district={form.district}
              onChange={({ city, district }) => setForm((p) => ({ ...p, city, district }))}
            />
          </div>

          <Field label="Mật khẩu" required hint="Tối thiểu 6 ký tự.">
            {({ id, invalid }) => (
              <div className="relative">
                <Input
                  id={id}
                  invalid={invalid}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Tối thiểu 6 ký tự"
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

          <Field label="Tôi là..." required>
            {({ id, invalid }) => (
              <Select id={id} invalid={invalid} name="role" value={form.role} onChange={handleChange}>
                <option value="Student">Học viên</option>
                <option value="Parent">Phụ huynh</option>
                <option value="Tutor">Gia sư</option>
              </Select>
            )}
          </Field>

          <Button type="submit" size="lg" loading={loading} className="w-full">
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
