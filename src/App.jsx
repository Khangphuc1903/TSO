import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import TutorDesk from "./pages/TutorDesk";
import MyBookings from "./pages/MyBookings";
import SosRescue from "./pages/SosRescue";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./components/ui/Toast";
import { getUser, isLoggedIn } from "./auth";
import { loadTutorGate, tutorPathAllowed } from "./tutorGate";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FindTutors from "./pages/FindTutors";
import TutorProfile from "./pages/TutorProfile";
import TutorTests from "./pages/TutorTests";
import TutorIdentity from "./pages/TutorIdentity";
import AdminDashboard from "./pages/AdminDashboard";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Faq from "./pages/Faq";
import Reviews from "./pages/Reviews";
import StudyGroups from "./pages/StudyGroups";
import CreateStudyGroup from "./pages/CreateStudyGroup";
import StudyGroupDetail from "./pages/StudyGroupDetail";
import MyStudyGroups from "./pages/MyStudyGroups";
import Onboarding from "./pages/Onboarding";
import Checkout from "./pages/Checkout";
import PaymentResult from "./pages/PaymentResult";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import PaymentHistory from "./pages/PaymentHistory";
import AiDiagnosis from "./pages/AiDiagnosis";
import SosSession from "./pages/SosSession";

function OnboardingGate({ children }) {
  const loc = useLocation();
  const pending =
    isLoggedIn() &&
    ((getUser()?.role || "").toLowerCase() === "pending" ||
      sessionStorage.getItem("needsOnboarding") === "1" ||
      localStorage.getItem("needsOnboarding") === "1");
  const allowed = ["/onboarding", "/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];
  if (pending && !allowed.includes(loc.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function TutorAreaGate({ children }) {
  const loc = useLocation();
  const isTutor = isLoggedIn() && (getUser()?.role || "").toLowerCase() === "tutor";
  const [gate, setGate] = useState(null);

  useEffect(() => {
    if (!isTutor) {
      setGate(null);
      return;
    }
    let stop = false;
    const pull = () =>
      loadTutorGate(true).then((next) => {
        if (!stop) setGate(next);
      });
    pull();
    window.addEventListener("tutor-gate", pull);
    return () => {
      stop = true;
      window.removeEventListener("tutor-gate", pull);
    };
  }, [isTutor]);

  if (!isTutor) return children;
  if (!gate) {
    return children;
  }
  if (!tutorPathAllowed(loc.pathname, gate.ready)) {
    return <Navigate to="/tutor" replace />;
  }
  return children;
}

function AppShell({ children }) {
  const loc = useLocation();
  const bare = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/onboarding"]
    .includes(loc.pathname);
  return (
    <>
      {!bare && <Navbar />}
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <ToastProvider>
          <OnboardingGate>
            <TutorAreaGate>
            <AppShell>
              <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/tutors" element={<FindTutors />} />
            <Route path="/tutors/:tutorId" element={<TutorProfile />} />
            <Route path="/tutor" element={<TutorDesk />} />
            <Route path="/tutor-tests" element={<TutorTests />} />
            <Route path="/tutor-identity" element={<TutorIdentity />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/help" element={<Faq />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/study-groups" element={<StudyGroups />} />
            <Route path="/study-groups/new" element={<CreateStudyGroup />} />
            <Route path="/study-groups/bids" element={<Navigate to="/study-groups" replace />} />
            <Route path="/study-groups/mine" element={<MyStudyGroups />} />
            <Route path="/study-groups/:groupId" element={<StudyGroupDetail />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/payments" element={<PaymentHistory />} />
            <Route path="/checkout/:bookingId" element={<Checkout />} />
            <Route path="/payment/result" element={<PaymentResult />} />
            <Route path="/sos" element={<SosRescue />} />
            <Route path="/ai-diagnosis" element={<AiDiagnosis />} />
            <Route path="/sos/session/:sessionId" element={<SosSession />} />

            <Route path="/tutor-tests" element={<TutorTests />} />
            <Route path="/tutor-identity" element={<TutorIdentity />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/help" element={<Faq />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/payments" element={<PaymentHistory />} />
              </Routes>
            </AppShell>
            </TutorAreaGate>
          </OnboardingGate>
        </ToastProvider>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
