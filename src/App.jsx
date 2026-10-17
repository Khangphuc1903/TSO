import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import { Spinner } from "./components/ui/Spinner";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./components/ui/Toast";
import { getUser, isLoggedIn } from "./auth";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./components/ui/Toast";
import { getUser, isLoggedIn } from "./auth";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));
const FindTutors = lazy(() => import("./pages/FindTutors"));
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const TutorDesk = lazy(() => import("./pages/TutorDesk"));
const TutorTests = lazy(() => import("./pages/TutorTests"));
const TutorIdentity = lazy(() => import("./pages/TutorIdentity"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Faq = lazy(() => import("./pages/Faq"));
const Reviews = lazy(() => import("./pages/Reviews"));
const StudyGroups = lazy(() => import("./pages/StudyGroups"));
const CreateStudyGroup = lazy(() => import("./pages/CreateStudyGroup"));
const StudyGroupDetail = lazy(() => import("./pages/StudyGroupDetail"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentResult = lazy(() => import("./pages/PaymentResult"));
const Cart = lazy(() => import("./pages/Cart"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));

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

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <ToastProvider>
          <OnboardingGate>
            <Suspense
              fallback={
                <div className="flex min-h-[70vh] items-center justify-center bg-surface">
                  <Spinner size="lg" className="text-brand-500" />
                </div>
              }
            >
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
            <Route path="/study-groups/:groupId" element={<StudyGroupDetail />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/payments" element={<PaymentHistory />} />
            <Route path="/checkout/:bookingId" element={<Checkout />} />
            <Route path="/payment/result" element={<PaymentResult />} />

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
            </Suspense>
          </OnboardingGate>
        </ToastProvider>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
