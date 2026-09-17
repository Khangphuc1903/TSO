import Navbar from "../components/Navbar";
import { MessageCircle } from "lucide-react";

export default function Messages() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <MessageCircle size={22} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Tin nhắn</h1>
          <p className="text-slate-500 mt-2">Chưa có cuộc trò chuyện nào.</p>
        </div>
      </main>
    </div>
  );
}
