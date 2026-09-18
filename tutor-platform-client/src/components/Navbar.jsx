import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, ClipboardList, User, LogOut } from "lucide-react";

const NAV_LINKS = [
  { label: "Discovery", to: "/" },
  { label: "Find Tutors", to: "/tutors" },
  { label: "Find Study Groups", to: "/study-groups" },
  { label: "My Dashboard", to: "/dashboard" },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap size={24} className="text-brand-600" />
          <span className="text-lg font-bold text-slate-900">TSG</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-brand-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {token ? (
            <>
              <Link
                to="/profile"
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  location.pathname === "/profile"
                    ? "bg-brand-50 text-brand-600 border-brand-200"
                    : "text-slate-700 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">
                  <User size={14} />
                </div>
                <span>Hồ sơ</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title="Đăng xuất"
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="hidden sm:block text-sm font-medium text-brand-600 hover:underline"
              >
                Register
              </Link>

              <Link
                to="/login"
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                Sign In
              </Link>
            </>
          )}

          <div className="hidden sm:block h-6 w-px bg-slate-200" />

          <button
            type="button"
            aria-label="My applications"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ClipboardList size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}