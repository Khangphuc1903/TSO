import { Star } from "lucide-react";

export default function StarRating({ value = 0, onChange, size = 20, readOnly = false }) {
  const rating = Number(value) || 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(rating);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            className={readOnly ? "cursor-default" : "hover:scale-110 transition-transform"}
            aria-label={`${star} sao`}
          >
            <Star
              size={size}
              className={filled ? "fill-star text-star" : "text-slate-300"}
            />
          </button>
        );
      })}
    </div>
  );
}
