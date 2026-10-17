import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  GraduationCap,
  Heart,
  MessageCircle,
  LogOut,
  User,
  ShoppingCart,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import {
  avatarUrl,
  getRefreshToken,
  getUser,
  isLoggedIn,
  logout,
} from "../auth";
import axiosClient, { API_ORIGIN } from "../api/axiosClient";
import { fileHref } from "../utils/format";
import { useCart } from "../context/CartContext";
import { getInboxBadges } from "../api/study";
import { createAppHub } from "../api/hub";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const user = getUser();
  const { cartCount } = useCart();
  const isTutor = (user?.role || "").toLowerCase() === "tutor";
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const isPending =
    (user?.role || "").toLowerCase() === "pending" ||
    sessionStorage.getItem("needsOnboarding") === "1" ||
    localStorage.getItem("needsOnboarding") === "1";
  const [menuOpen, setMenuOpen] = useState(false);

  const [notifUnread, setNotifUnread] = useState(0);
  const [chatUnreadPeople, setChatUnreadPeople] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loggedIn) {
      setNotifUnread(0);
      setChatUnreadPeople(0);
      return;
    }

    let cancelled = false;

    const loadBadges = async () => {
      try {
        const data = await getInboxBadges();
        if (cancelled) return;
        setNotifUnread(data.notifications);
        setChatUnreadPeople(data.conversations);
      } catch {
        /* ignore */
      }
    };

    loadBadges();

    const onInbox = () => loadBadges();
    window.addEventListener("inbox-updated", onInbox);

    const timer = setInterval(loadBadges, 15000);
    const hub = createAppHub();

    hub.on("ReceiveNotification", loadBadges);
    hub.on("ReceiveMessage", loadBadges);
    hub.on("ReceiveGroupMessage", loadBadges);
    hub.start().catch(() => {});

    return () => {
      cancelled = true;
      window.removeEventListener("inbox-updated", onInbox);
      clearInterval(timer);
      hub.off("ReceiveNotification", loadBadges);
      hub.off("ReceiveMessage", loadBadges);
      hub.off("ReceiveGroupMessage", loadBadges);
      hub.stop();
    };
  }, [loggedIn, location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  const navLinks = isPending
    ? [{ label: "Hoàn tất hồ sơ", to: "/onboarding" }]
    : isAdmin
      ? [
          { label: "Bảng điều khiển", to: "/admin" },
          { label: "Trang chủ", to: "/" },
        ]
      : [
          { label: "Trang chủ", to: "/" },
          { label: "Tìm gia sư", to: "/tutors" },
          { label: "Nhóm học", to: "/study-groups" },
          { label: "Hỏi đáp", to: "/faq" },

        { label: isTutor ? "Lịch dạy" : "Lịch học", to: "/bookings" },
        ...(isTutor
          ? [
              { label: "Bảng làm việc", to: "/tutor" },
              { label: "CCCD", to: "/tutor-identity" },
              { label: "Bài test", to: "/tutor-tests" },
            ]
          : []),
      ];

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    try {
      await axiosClient.post("/Auth/logout", { refreshToken });
    } catch {
      /* still clear local session */
    }
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 focus-ring rounded-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm">
            <GraduationCap size={19} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-brand-900">
            TSG
            <span className="ml-1 hidden text-[10px] font-bold uppercase tracking-wider text-brand-400 sm:inline">
              Tutor
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-brand-700 focus-ring"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
        {loggedIn ? (
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Thông báo"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-brand-600 transition-colors"
            >
              <Bell size={20} />
              {notifUnread > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>

            <Link
              to="/messages"

              aria-label="Tin nhắn"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-brand-600 transition-colors"

            >
              <MessageCircle size={20} />
              {chatUnreadPeople > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {chatUnreadPeople > 9 ? "9+" : chatUnreadPeople}
                </span>
              )}
            </Link>

            {!isTutor && !isAdmin && (
              <Link
                to="/wishlist"
                aria-label="Yêu thích"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors"
              >
                <Heart size={20} />
              </Link>
            )}

            {!isTutor && !isAdmin && (
              <Link
                to="/cart"
                aria-label="Giỏ hàng"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-brand-600 transition-colors"
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="ml-1 h-9 w-9 rounded-full overflow-hidden ring-2 ring-slate-100 hover:ring-brand-200 transition focus-ring"
                aria-label="Menu tài khoản"
                aria-expanded={menuOpen}
              >
                <img src={fileHref(user?.avatarUrl, API_ORIGIN) || avatarUrl(user?.email)} alt="Avatar" className="h-full w-full object-cover" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-pop animate-scale-in">
                  <p className="px-3 py-2 text-xs text-slate-500 truncate">{user?.email}</p>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User size={16} />
                    Trang cá nhân
                  </Link>
                  {!isAdmin && (
                    <Link
                      to="/payments"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Wallet size={16} />
                      Lịch sử thanh toán
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Dashboard admin
                    </Link>
                  )}
                  {!isTutor && !isAdmin && (
                    <Link
                      to="/wishlist"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Heart size={16} />
                      Yêu thích
                    </Link>
                  )}
                  {!isTutor && !isAdmin && (
                    <Link
                      to="/cart"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={16} />
                        Giỏ hàng
                      </div>
                      {cartCount > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {isTutor && (
                    <Link
                      to="/tutor"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <GraduationCap size={16} />
                      Bảng làm việc
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/register"
              className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 sm:block focus-ring"
            >
              Đăng ký
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-brand-700 hover:shadow-md focus-ring"
            >
              Đăng nhập
            </Link>
          </div>
        )}
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Menu điều hướng"
            aria-expanded={mobileNavOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50 md:hidden focus-ring"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileNavOpen && (
          <nav className="absolute inset-x-0 top-full z-50 border-b border-slate-200 bg-white px-4 pb-4 pt-2 shadow-pop animate-scale-in md:hidden">
            {navLinks.map((link) => (
              <Link
                key={`m-${link.to}`}
                to={link.to}
                onClick={() => setMobileNavOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  location.pathname === link.to
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-brand-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
