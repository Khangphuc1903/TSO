import { Inbox } from "lucide-react";
import Button from "./Button";

/**
 * Polished empty state with an icon, guidance and an optional next action.
 * Pass either `action={{ label, to }}` or `action={{ label, onClick }}`.
 */
export function EmptyState({ icon = null, title, description, action = null, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-up ${className}`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        {icon || <Inbox size={26} />}
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.to ? (
            <Button to={action.to} variant="primary">
              {action.label}
            </Button>
          ) : (
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
