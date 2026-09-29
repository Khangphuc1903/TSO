import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import FindTutors from "./pages/FindTutors";
import TutorProfile from "./pages/TutorProfile";
import TutorDesk from "./pages/TutorDesk";
import Reviews from "./pages/Reviews";
import StudyGroups from "./pages/StudyGroups";
import CreateStudyGroup from "./pages/CreateStudyGroup";
import StudyGroupDetail from "./pages/StudyGroupDetail";
import MyBookings from "./pages/MyBookings";
import Onboarding from "./pages/Onboarding";
import Checkout from "./pages/Checkout";
import PaymentResult from "./pages/PaymentResult";
import Cart from "./pages/Cart";
import { CartProvider } from "./context/CartContext";
import { getUser, isLoggedIn } from "./auth";

function OnboardingGate({ children }) {
  const loc = useLocation();
  const pending =
    isLoggedIn() &&
    ((getUser()?.role || "").toLowerCase() === "pending" || localStorage.getItem("needsOnboarding") === "1");
  const allowed = ["/onboarding", "/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];
  if (pending && !allowed.includes(loc.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <OnboardingGate>
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
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/study-groups" element={<StudyGroups />} />
            <Route path="/study-groups/new" element={<CreateStudyGroup />} />
            <Route path="/study-groups/:groupId" element={<StudyGroupDetail />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout/:bookingId" element={<Checkout />} />
            <Route path="/payment/result" element={<PaymentResult />} />
          </Routes>
        </OnboardingGate>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
