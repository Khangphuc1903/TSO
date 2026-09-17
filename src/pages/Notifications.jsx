import Navbar from "../components/Navbar";
import { Bell } from "lucide-react";

export default function Notifications() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Bell size={22} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Thông báo</h1>
          <p className="text-slate-500 mt-2">Bạn chưa có thông báo mới.</p>
        </div>
      </main>
    </div>
  );
}
