import { useId } from "react";

/** Label + control wrapper with optional hint / error text. */
export function Field({ label, hint, error, required = false, children, className = "" }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {typeof children === "function"
        ? children({ id, invalid: Boolean(error) })
        : children}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ invalid = false, className = "", ...rest }) {
  return (
    <input
      className={`input ${invalid ? "input-error" : ""} ${className}`}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Select({ invalid = false, className = "", children, ...rest }) {
  return (
    <select
      className={`input appearance-none bg-no-repeat pr-9 ${invalid ? "input-error" : ""} ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394A3B8' viewBox='0 0 16 16'%3E%3Cpath d='M4.6 6.3a1 1 0 0 1 1.4 0L8 8.6l2-2.3a1 1 0 1 1 1.5 1.4l-2.7 3.1a1 1 0 0 1-1.5 0L4.6 7.7a1 1 0 0 1 0-1.4z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.7rem center",
        ...rest.style,
      }}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

export default Field;
