import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import TutorResultCard from "../components/TutorResultCard";
import { getUser, isLoggedIn } from "../auth";
import { mapTutor } from "../api/tutorSearch";
import { wishlistApi } from "../api/wishlist";

export default function Wishlist() {
  const navigate = useNavigate();
  const user = getUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await wishlistApi.list();
    const list = Array.isArray(data) ? data : [];
    setItems(list.map(mapTutor));
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    load()
      .catch(() => setError("Không tải được danh sách yêu thích."))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={20} className="text-rose-600 fill-rose-600" />
          <h1 className="text-2xl font-bold text-slate-900">Gia sư yêu thích</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          {user?.email ? `Tài khoản ${user.email}. ` : ""}
          Lưu gia sư từ trang tìm kiếm hoặc hồ sơ để đặt lịch sau.
        </p>
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        {loading ? (
          <p className="text-slate-500 inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Đang tải...
          </p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <p className="text-slate-500 mb-4">Chưa có gia sư trong danh sách yêu thích.</p>
            <Link to="/tutors" className="text-sm font-medium text-brand-600 hover:underline">
              Tìm gia sư →
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {items.map((tutor) => (
              <TutorResultCard
                key={tutor.id}
                tutor={tutor}
                saved
                onWishlistChange={(next) => {
                  if (!next) setItems((prev) => prev.filter((t) => t.id !== tutor.id));
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
