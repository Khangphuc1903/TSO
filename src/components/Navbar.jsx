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
  Siren,
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
import { getOpenSosRequests } from "../api/sos";
import { createAppHub } from "../api/hub";
import { invalidateTutorGate, loadTutorGate } from "../tutorGate";

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
  const [tutorReady, setTutorReady] = useState(false);
  const [tutorGateLoaded, setTutorGateLoaded] = useState(false);
  const [sosAlerts, setSosAlerts] = useState([]);

  useEffect(() => {
    if (!loggedIn || !isTutor) {
      setTutorReady(false);
      setTutorGateLoaded(false);
      return;
    }
    let cancelled = false;
    const pull = () =>
      loadTutorGate(true).then((gate) => {
        if (!cancelled) {
          setTutorReady(Boolean(gate?.ready));
          setTutorGateLoaded(true);
        }
      });
    pull();
    window.addEventListener("tutor-gate", pull);
    return () => {
      cancelled = true;
      window.removeEventListener("tutor-gate", pull);
    };
  }, [loggedIn, isTutor]);

  useEffect(() => {
    if (!loggedIn || !isTutor) {
      setSosAlerts([]);
      return;
    }
    let cancelled = false;
    const loadSos = async () => {
      try {
        const list = await getOpenSosRequests();
        if (!cancelled) setSosAlerts(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setSosAlerts([]);
      }
    };
    loadSos();
    const timer = setInterval(loadSos, 10000);
    window.addEventListener("sos-updated", loadSos);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("sos-updated", loadSos);
    };
  }, [loggedIn, isTutor]);

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

    const pingSos = () => window.dispatchEvent(new Event("sos-updated"));
    hub.on("ReceiveNotification", loadBadges);
    hub.on("ReceiveMessage", loadBadges);
    hub.on("ReceiveGroupMessage", loadBadges);
    hub.on("SosRequestCreated", pingSos);
    hub.on("SosRequestClaimedByOther", pingSos);
    hub.on("SosRequestExpired", pingSos);
    hub.on("SosSessionEnded", pingSos);
    hub.start().catch(() => {});

    return () => {
      cancelled = true;
      window.removeEventListener("inbox-updated", onInbox);
      clearInterval(timer);
      hub.off("ReceiveNotification", loadBadges);
      hub.off("ReceiveMessage", loadBadges);
      hub.off("ReceiveGroupMessage", loadBadges);
      hub.off("SosRequestCreated", pingSos);
      hub.off("SosRequestClaimedByOther", pingSos);
      hub.off("SosRequestExpired", pingSos);
      hub.off("SosSessionEnded", pingSos);
      hub.stop();
    };
  }, [loggedIn]);

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
      : isTutor
        ? [
            { label: "Hồ sơ", to: "/profile" },
            { label: "Bảng dạy", to: "/tutor" },
            { label: "SOS", to: "/sos" },
            ...(tutorGateLoaded && !tutorReady
              ? [
                  { label: "CCCD", to: "/tutor-identity" },
                  { label: "Bài test", to: "/tutor-tests" },
                ]
              : []),
            { label: "Nhóm", to: "/study-groups" },
            { label: "Nhóm của tôi", to: "/study-groups/mine" },
            ...(tutorReady
              ? [
                  { label: "Lịch dạy", to: "/bookings" },
                ]
              : []),
          ]
        : [
            { label: "Trang chủ", to: "/" },
            { label: "Tìm gia sư", to: "/tutors" },
            { label: "Chẩn đoán", to: "/ai-diagnosis" },
            { label: "Nhóm", to: "/study-groups" },
            ...(loggedIn ? [{ label: "Nhóm của tôi", to: "/study-groups/mine" }] : []),
            { label: "SOS", to: "/sos" },
            { label: "Hỏi đáp", to: "/faq" },
            { label: "Lịch học", to: "/bookings" },
          ];

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    try {
      await axiosClient.post("/Auth/logout", { refreshToken });
    } catch {
      /* still clear local session */
    }
    invalidateTutorGate();
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0F294A]">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-xl focus-ring">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E40AF] to-[#0D9488] text-white shadow-md">
            <GraduationCap size={18} />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold tracking-tight text-white">
              TSG<span className="text-[#5EEAD4]">Tutor</span>
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-white/50 sm:block">
              Học thật • Tiến bộ thật
            </span>
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition ${
                  isActive
                    ? "bg-white/10 text-[#5EEAD4]"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
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
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Bell size={20} />
              {notifUnread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-80" />
                  <span className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#0F294A]">
                    {notifUnread > 9 ? "9+" : notifUnread}
                  </span>
                </span>
              )}
            </Link>

            <Link
              to="/messages"

              aria-label="Tin nhắn"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"

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
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-rose-200"
              >
                <Heart size={20} />
              </Link>
            )}

            {!isTutor && !isAdmin && (
              <Link
                to="/cart"
                aria-label="Giỏ hàng"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
                className="ml-1 h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/30 transition hover:ring-[#5EEAD4] focus-ring"
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
                  {!isAdmin && (!isTutor || tutorReady) && (
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
              to="/login"
              className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:inline-flex focus-ring"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#0F766E] focus-ring"
            >
              Đăng ký
            </Link>
          </div>
        )}
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Menu điều hướng"
            aria-expanded={mobileNavOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10 lg:hidden focus-ring"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileNavOpen && (
          <nav className="absolute inset-x-0 top-full z-50 border-b border-white/10 bg-[#0F294A] px-4 pb-4 pt-2 shadow-pop animate-scale-in lg:hidden">
            {navLinks.map((link) => (
              <Link
                key={`m-${link.to}`}
                to={link.to}
                onClick={() => setMobileNavOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  location.pathname === link.to
                    ? "bg-white/10 text-[#5EEAD4]"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      {sosAlerts.length > 0 && (
        <Link to="/sos" className="sos-alert-bar flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white">
          <Siren size={16} className="shrink-0" />
          <span>
            SOS khẩn cấp · {sosAlerts.length} yêu cầu đang chờ
            {sosAlerts[0]?.subjectName ? ` · ${sosAlerts.map((r) => r.subjectName).filter(Boolean).slice(0, 2).join(", ")}` : ""}
            {" "}· Nhấp để nhận
          </span>
        </Link>
      )}
    </header>
  );
}
