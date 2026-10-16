import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, GraduationCap, Heart, MessageCircle, LogOut, User, ShoppingCart, Wallet } from "lucide-react";
import { avatarUrl, getRefreshToken, getUser, isLoggedIn, logout } from "../auth";
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

  const navLinks = isPending
    ? [{ label: "Hoàn tất hồ sơ", to: "/onboarding" }]
    : isAdmin
      ? [
          { label: "Dashboard", to: "/admin" },
          { label: "Trang chủ", to: "/" },
        ]
      : [
        { label: "Discovery", to: "/" },
        { label: "Find Tutors", to: "/tutors" },
        { label: "Find Study Groups", to: "/study-groups" },
        { label: "FAQ", to: "/faq" },
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
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap size={24} className="text-brand-600" />
          <span className="text-lg font-bold text-slate-900">TSG</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  isActive ? "text-brand-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {loggedIn ? (
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-brand-600 transition-colors"
            >
              <Bell size={20} />
              {notifUnread > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>

            <Link
              to="/messages"
              aria-label="Messages"
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
                className="ml-1 h-9 w-9 rounded-full overflow-hidden ring-2 ring-slate-100 hover:ring-brand-200 transition"
                aria-label="Profile menu"
              >
                <img src={fileHref(user?.avatarUrl, API_ORIGIN) || avatarUrl(user?.email)} alt="Avatar" className="h-full w-full object-cover" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-100 bg-white shadow-lg py-1">
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
          <div className="flex items-center gap-5">
            <Link to="/register" className="hidden sm:block text-sm font-medium text-brand-600 hover:underline">
              Register
            </Link>
            <Link
              to="/login"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
