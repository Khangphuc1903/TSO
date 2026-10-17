import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "btn-primary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
  white: "btn-white",
};
const SIZES = { sm: "btn-sm", md: "", lg: "btn-lg" };

/**
 * Unified button. Renders as <Link> when `to` is provided, otherwise <button>.
 * `icon` renders before the label; `loading` shows a spinner and disables clicks.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  to,
  loading = false,
  disabled = false,
  icon = null,
  className = "",
  type = "button",
  ...rest
}) {
  const classes = [
    "btn",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? <Loader2 size={16} className="animate-spin shrink-0" /> : icon}
      {children}
    </>
  );

  if (to && !disabled && !loading) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {content}
    </button>
  );
}

export default Button;
