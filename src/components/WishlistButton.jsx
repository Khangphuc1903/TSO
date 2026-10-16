import { Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isLoggedIn } from "../auth";
import { wishlistApi } from "../api/wishlist";

export default function WishlistButton({ tutorId, saved, onChange, className = "" }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const click = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (!tutorId || busy) return;
    setBusy(true);
    try {
      const res = await wishlistApi.toggle(tutorId);
      onChange?.(Boolean(res.saved));
    } catch {
      onChange?.(saved);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      aria-label={saved ? "Bỏ yêu thích" : "Lưu yêu thích"}
      title={saved ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
      className={`h-9 w-9 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-60 ${
        saved
          ? "border-rose-200 bg-rose-50 text-rose-600"
          : "border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200"
      } ${className}`}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} className={saved ? "fill-rose-600" : ""} />}
    </button>
  );
}
