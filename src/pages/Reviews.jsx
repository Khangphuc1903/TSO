import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import StarRating from "../components/StarRating";
import { getDefaultTutors } from "../api/tutorSearch";

export default function Reviews() {
  const [tutors, setTutors] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getDefaultTutors()
      .then(setTutors)
      .catch(() => setError("Không tải được danh sách đánh giá."));
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reviews & Ratings</h1>
        <p className="text-slate-500 mb-6">Xem điểm trung bình và đánh giá của gia sư đã xác thực.</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {tutors.map((tutor) => (
            <Link
              key={tutor.id}
              to={`/tutors/${tutor.id}`}
              state={{ tutor }}
              className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-4 hover:border-brand-200"
            >
              <img src={tutor.photoUrl} alt={tutor.name} className="h-14 w-14 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{tutor.name}</p>
                <p className="text-sm text-slate-500 truncate">{tutor.subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating value={tutor.rating} readOnly size={16} />
                  <span className="text-sm text-slate-600">{Number(tutor.rating).toFixed(2)}</span>
                  <span className="text-xs text-slate-400">{tutor.reviews} reviews</span>
                </div>
              </div>
            </Link>
          ))}
          {!error && tutors.length === 0 && (
            <p className="text-slate-500">Chưa có gia sư để hiển thị đánh giá.</p>
          )}
        </div>
      </main>
    </div>
  );
}
