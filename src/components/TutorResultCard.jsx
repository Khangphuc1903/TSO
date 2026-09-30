import { Link } from "react-router-dom";
import { Star, BadgeCheck, Bookmark } from "lucide-react";
import { formatVnd } from "../utils/format";

const TIER_STYLES = {
  "Top 1%": "bg-brand-50 text-brand-700",
  "Super Tutor": "bg-verified-50 text-verified-600",
  Fellow: "bg-slate-100 text-slate-600",
  Verified: "bg-verified-50 text-verified-600",
};

export default function TutorResultCard({ tutor }) {
  const {
    name,
    university,
    degree,
    tier,
    rating = 0,
    reviews = 0,
    bio,
    tags = [],
    price = 0,
    photoUrl,
  } = tutor;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <img
          src={photoUrl}
          alt={name}
          className="h-14 w-14 rounded-full object-cover flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{name}</h3>
            {tier && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${TIER_STYLES[tier] || "bg-slate-100 text-slate-600"}`}
              >
                {tier}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {university} • {degree}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <BadgeCheck size={13} className="text-verified-600" />
            <Star size={13} className="fill-star text-star" />
            <span className="text-xs font-medium text-slate-700">
              {rating.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">
              • {reviews} reviews
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 leading-relaxed mb-3 line-clamp-2">
        {bio}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-900">{formatVnd(price)}</span>
          <span className="text-xs text-slate-400"> /giờ</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Save tutor"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-colors"
          >
            <Bookmark size={16} />
          </button>
          <Link
            to={`/tutors/${tutor.id}`}
            state={{ tutor }}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}