import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Phone, User, ArrowRight } from "lucide-react";
import { getUser, homeForRole, isLoggedIn, saveSession } from "../auth";
import { completeOnboarding, getMyProfile } from "../api/study";
import LocationFields from "../components/LocationFields";
import { phoneError, regionError } from "../data/locations";

export default function Onboarding() {
  const navigate = useNavigate();
  const session = getUser();
  const lockedRole = (session?.role || "").toLowerCase() !== "pending" ? session?.role : "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    role: lockedRole || "Student",
    phoneNumber: "",
    gender: "",
    city: "",
    district: "",
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    getMyProfile()
      .then((p) => {
        if (!p.needsOnboarding && (p.role || "").toLowerCase() !== "pending") {
          navigate(homeForRole(p.role), { replace: true });
          return;
        }
        setForm({
          fullName: p.fullName || "",
          role: (p.role || "").toLowerCase() === "pending" ? "Student" : p.role || "Student",
          phoneNumber: p.phoneNumber || "",
          gender: p.gender || "",
          city: p.city || "",
          district: p.district || "",
        });
      })
      .catch(() => setError("Không tải được hồ sơ. Hãy đăng nhập lại."))
      .finally(() => setLoading(false));
  }, [navigate]);

  const canChooseRole = !lockedRole || lockedRole.toLowerCase() === "pending";

  const submit = async (e) => {
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
    setSaving(true);
    try {
      const res = await completeOnboarding(form);
      if (res.token) saveSession(res.token);
      localStorage.removeItem("needsOnboarding");
      navigate(homeForRole(res.profile?.role || form.role));
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được thông tin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 sm:p-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <GraduationCap size={20} />
          </span>
          <span className="text-lg font-semibold text-slate-900">EduConnect</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Hoàn tất hồ sơ</h1>
        <p className="text-slate-500 text-sm mb-6">
          Chọn vai trò và điền thông tin cơ bản để sử dụng nền tảng.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">Đang tải...</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm text-slate-600">
              Họ tên
              <div className="relative mt-1">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </label>

            <label className="block text-sm text-slate-600">
              Vai trò
              <select
                required
                disabled={!canChooseRole}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50"
              >
                <option value="Student">Học sinh</option>
                <option value="Parent">Phụ huynh</option>
                <option value="Tutor">Gia sư</option>
              </select>
            </label>

            <label className="block text-sm text-slate-600">
              Số điện thoại (10 số)
              <div className="relative mt-1">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  placeholder="0912345678"
                />
              </div>
            </label>

            <label className="block text-sm text-slate-600">
              Giới tính
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="">Chọn giới tính</option>
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
                <option value="Other">Khác</option>
              </select>
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm text-slate-600 sm:col-span-2">Khu vực</label>
              <LocationFields
                required
                city={form.city}
                district={form.district}
                onChange={({ city, district }) => setForm((p) => ({ ...p, city, district }))}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5"
            >
              {saving ? "Đang lưu..." : "Tiếp tục"}
              {!saving && <ArrowRight size={18} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
