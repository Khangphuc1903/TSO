import { Star, BadgeCheck, ChevronRight } from "lucide-react";

export default function TutorCard({ tutor }) {
  const { name, subject, tags, rating, price, photoUrl } = tutor;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative h-40">
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
        <span className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
          <Star size={12} className="fill-star text-star" />
          {rating.toFixed(1)}
        </span>
        <span className="absolute bottom-3 left-3 flex items-center gap-1 bg-verified-50 text-verified-600 text-xs font-medium px-2 py-1 rounded-full">
          <BadgeCheck size={12} />
          Verified
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-slate-900">{name}</h3>
        <p className="text-sm text-slate-500 mb-3">{subject}</p>

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
            <span className="font-bold text-slate-900">${price}</span>
            <span className="text-xs text-slate-400"> /hr</span>
          </div>
          <button className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-brand-50 hover:text-brand-600 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
