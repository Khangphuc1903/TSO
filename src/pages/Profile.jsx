import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { avatarUrl, getUser } from "../auth";

export default function Profile() {
  const user = getUser();

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center gap-5">
            <img
              src={avatarUrl(user?.email)}
              alt="Avatar"
              className="h-20 w-20 rounded-full ring-4 ring-brand-50"
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Trang cá nhân</h1>
              <p className="text-slate-500 mt-1">{user?.email || "Chưa có email"}</p>
              <span className="inline-block mt-2 text-xs font-medium bg-brand-50 text-brand-700 rounded-full px-3 py-1">
                {user?.role || "User"}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-8">
            <Link
              to="/notifications"
              className="rounded-xl border border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700"
            >
              Thông báo
            </Link>
            <Link
              to="/messages"
              className="rounded-xl border border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700"
            >
              Tin nhắn
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
