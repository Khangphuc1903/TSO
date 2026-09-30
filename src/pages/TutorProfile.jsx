import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  MapPin,
  MessageCircle,
  Phone,
  Wallet,
} from "lucide-react";
import Navbar from "../components/Navbar";
import StarRating from "../components/StarRating";
import { avatarUrl, getUser, isLoggedIn } from "../auth";
import { getTutorDetail } from "../api/tutorSearch";
import { createTutorReview, getEligibleReviewBookings, getTutorReviews } from "../api/reviews";
import { createBooking } from "../api/bookings";
import { openConversation } from "../api/study";
import { API_ORIGIN } from "../api/axiosClient";
import { fileHref, formatVnd, slotHours } from "../utils/format";

const DAY_LABELS = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ nhật",
};

function formatDay(slot) {
  if (slot.specificDate) {
    return new Date(slot.specificDate).toLocaleDateString("vi-VN");
  }
  if (slot.dayOfWeek == null) return "Lịch linh hoạt";
  return `${DAY_LABELS[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`}${slot.isRecurring ? " (hàng tuần)" : ""}`;
}

export default function TutorProfile() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const isStudent = (user?.role || "").toLowerCase() === "student";
  const isParent = (user?.role || "").toLowerCase() === "parent";
  const isOwnProfile = Number(user?.userId) === Number(tutorId);
  const canBook = (isStudent || isParent) && !isOwnProfile;

  const [tutor, setTutor] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ bookingId: "", rating: 5, comment: "" });
  const [eligibleBookings, setEligibleBookings] = useState([]);

  const [bookingError, setBookingError] = useState("");
  const [bookingOk, setBookingOk] = useState("");
  const [bookingSubjectId, setBookingSubjectId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingPrice, setBookingPrice] = useState("");

  const loadAll = async () => {
    const [detail, reviews] = await Promise.all([
      getTutorDetail(tutorId),
      getTutorReviews(tutorId),
    ]);
    setTutor(detail);
    setSummary(reviews);
    if (isLoggedIn() && (getUser()?.role || "").toLowerCase() === "student") {
      try {
        const eligible = await getEligibleReviewBookings(tutorId);
        setEligibleBookings(Array.isArray(eligible) ? eligible : []);
        if (eligible?.length && !form.bookingId) {
          setForm((p) => ({ ...p, bookingId: String(eligible[0].bookingId) }));
        }
      } catch {
        setEligibleBookings([]);
      }
    } else {
      setEligibleBookings([]);
    }
    if (!bookingSubjectId && detail.subjectDetails?.length) {
      setBookingSubjectId(String(detail.subjectDetails[0].subjectId));
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        await loadAll();
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Không tải được hồ sơ gia sư.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [tutorId]);

  useEffect(() => {
    if (!selectedSlot || !tutor) return;
    const hours = slotHours(selectedSlot);
    const minRate = Number(tutor.hourlyRateMin ?? tutor.hourlyRateMax ?? 0);
    setBookingPrice(String(Math.round(hours * minRate)));
  }, [selectedSlot, tutor]);

  const handleReview = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormOk("");
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    setSubmitting(true);
    try {
      const data = await createTutorReview(tutorId, {
        bookingId: form.bookingId ? Number(form.bookingId) : undefined,
        rating: Number(form.rating),
        comment: form.comment.trim() || null,
      });
      setSummary(data);
      setFormOk("Gửi đánh giá thành công.");
      setForm((prev) => ({ ...prev, comment: "" }));
      const eligible = await getEligibleReviewBookings(tutorId).catch(() => []);
      setEligibleBookings(Array.isArray(eligible) ? eligible : []);
      setForm((prev) => ({
        ...prev,
        bookingId: eligible?.[0] ? String(eligible[0].bookingId) : "",
      }));
    } catch (err) {
      setFormError(err.response?.data?.message || "Không gửi được đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingOk("");
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    if (!selectedSlot) {
      setBookingError("Hãy chọn một khung giờ trống.");
      return;
    }
    setBookingLoading(true);
    try {
      const payload = {
        tutorId: Number(tutorId),
        slotId: selectedSlot.slotId,
        subjectId: Number(bookingSubjectId),
        price: bookingPrice === "" ? undefined : Number(bookingPrice),
      };
      if (selectedSlot.isRecurring && !selectedSlot.specificDate) {
        if (!scheduledDate) {
          setBookingError("Khung giờ hàng tuần cần chọn ngày học.");
          setBookingLoading(false);
          return;
        }
        payload.scheduledDate = scheduledDate;
      }
      const res = await createBooking(payload);
      setBookingOk(`${res.message} Mã buổi học: ${res.booking?.bookingId}`);
      setForm((p) => ({ ...p, bookingId: String(res.booking?.bookingId || p.bookingId) }));
      const detail = await getTutorDetail(tutorId);
      setTutor(detail);
      setSelectedSlot(null);
    } catch (err) {
      setBookingError(err.response?.data?.message || "Không đặt được lịch.");
    } finally {
      setBookingLoading(false);
    }
  };

  const average = Number(summary?.averageRating ?? tutor?.rating ?? 0);
  const total = summary?.totalReviews ?? tutor?.reviews ?? 0;
  const reviews = Array.isArray(summary?.reviews) ? summary.reviews : [];
  const slots = Array.isArray(tutor?.availableSlots) ? tutor.availableSlots : [];
  const certificates = Array.isArray(tutor?.certificates) ? tutor.certificates : [];
  const locationText = [tutor?.address, tutor?.district, tutor?.city].filter(Boolean).join(", ");
  const hours = selectedSlot ? slotHours(selectedSlot) : 0;
  const minRate = Number(tutor?.hourlyRateMin ?? tutor?.hourlyRateMax ?? 0);
  const maxRate = Number(tutor?.hourlyRateMax ?? tutor?.hourlyRateMin ?? minRate);
  const sessionMin = Math.round(hours * minRate);
  const sessionMax = Math.round(hours * Math.max(maxRate, minRate));
  const priceText =
    tutor?.hourlyRateMin && tutor?.hourlyRateMax && tutor.hourlyRateMin !== tutor.hourlyRateMax
      ? `${formatVnd(tutor.hourlyRateMin)} – ${formatVnd(tutor.hourlyRateMax)}`
      : formatVnd(tutor?.hourlyRateMin ?? tutor?.hourlyRateMax ?? tutor?.price ?? 0);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Link to="/tutors" className="inline-flex items-center gap-1 text-sm text-brand-600 mb-6">
          <ArrowLeft size={16} />
          Quay lại danh sách gia sư
        </Link>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading || !tutor ? (
          <p className="text-slate-500">Đang tải hồ sơ gia sư...</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <img
                  src={tutor.photoUrl || avatarUrl(tutor.name)}
                  alt={tutor.name}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-50"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900">{tutor.name}</h1>
                    {tutor.tier && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-verified-50 text-verified-600 px-2 py-1 rounded-full">
                        <BadgeCheck size={12} />
                        {tutor.tier}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {[tutor.university, tutor.degree].filter(Boolean).join(" • ") || "Hồ sơ gia sư"}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <StarRating value={average} readOnly />
                    <span className="text-sm font-semibold text-slate-800">{average.toFixed(2)}</span>
                    <span className="text-sm text-slate-400">{total} đánh giá</span>
                    {!isOwnProfile && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!isLoggedIn()) return navigate("/login");
                          const id = await openConversation(Number(tutorId));
                          navigate(`/messages?c=${id}`);
                        }}
                        className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
                      >
                        <MessageCircle size={16} /> Nhắn tin
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {(tutor.tags || []).map((tag) => (
                      <span key={tag} className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                <InfoChip icon={<Award size={16} />} label="Kinh nghiệm" value={`${tutor.yearsOfExperience || 0} năm`} />
                <InfoChip icon={<Wallet size={16} />} label="Học phí" value={`${priceText} / giờ`} />
                <InfoChip icon={<GraduationCap size={16} />} label="Hình thức" value={tutor.teachingMode || "—"} />
                <InfoChip icon={<MapPin size={16} />} label="Khu vực" value={locationText || "—"} />
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-6">
              <div className="space-y-6">
                <section className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h2 className="font-semibold text-slate-900 mb-3">Giới thiệu</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {tutor.bio || "Gia sư chưa cập nhật phần giới thiệu."}
                  </p>
                  {tutor.phoneNumber && (
                    <p className="flex items-center gap-2 text-sm text-slate-500 mt-4">
                      <Phone size={14} /> {tutor.phoneNumber}
                    </p>
                  )}
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarClock size={18} className="text-brand-600" />
                    <h2 className="font-semibold text-slate-900">Lịch trống</h2>
                  </div>

                  {slots.length === 0 ? (
                    <p className="text-sm text-slate-500">Gia sư chưa mở khung giờ trống.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {slots.map((slot) => {
                        const active = selectedSlot?.slotId === slot.slotId;
                        return (
                          <button
                            key={slot.slotId}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                              active
                                ? "border-brand-600 bg-brand-50"
                                : "border-slate-100 hover:border-brand-200"
                            }`}
                          >
                            <p className="text-sm font-medium text-slate-900">{formatDay(slot)}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {slot.startTime} – {slot.endTime}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h2 className="font-semibold text-slate-900 mb-4">Đánh giá từ học viên</h2>
                  {reviews.length === 0 ? (
                    <p className="text-slate-500 text-sm">Chưa có đánh giá nào.</p>
                  ) : (
                    <ul className="space-y-4">
                      {reviews.map((item) => (
                        <li key={item.reviewId} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-slate-900">{item.reviewerName}</p>
                            <span className="text-xs text-slate-400">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : ""}
                            </span>
                          </div>
                          <div className="mt-1">
                            <StarRating value={item.rating} readOnly size={16} />
                          </div>
                          {item.comment && <p className="text-sm text-slate-600 mt-2">{item.comment}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h2 className="font-semibold text-slate-900 mb-1">Đặt lịch học</h2>
                  <p className="text-xs text-slate-500 mb-4">Chọn môn và khung giờ trống của gia sư.</p>

                  {!isLoggedIn() ? (
                    <Link to="/login" className="block text-center bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
                      Đăng nhập để đặt lịch
                    </Link>
                  ) : isOwnProfile ? (
                    <p className="text-sm text-slate-500">Đây là hồ sơ của bạn. Không thể tự đặt lịch.</p>
                  ) : !canBook ? (
                    <p className="text-sm text-slate-500">Chỉ học viên hoặc phụ huynh mới đặt được lịch.</p>
                  ) : (
                    <form onSubmit={handleBook} className="space-y-3">
                      {bookingError && (
                        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{bookingError}</div>
                      )}
                      {bookingOk && (
                        <div className="text-sm text-verified-600 bg-verified-50 rounded-lg px-3 py-2">{bookingOk}</div>
                      )}

                      <label className="block text-sm text-slate-600">
                        Môn học
                        <select
                          required
                          value={bookingSubjectId}
                          onChange={(e) => setBookingSubjectId(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                        >
                          {(tutor.subjectDetails || []).map((s) => (
                            <option key={s.subjectId} value={s.subjectId}>
                              {s.subjectName}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedSlot?.isRecurring && !selectedSlot?.specificDate && (
                        <label className="block text-sm text-slate-600">
                          Ngày học
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                          />
                        </label>
                      )}

                      <p className="text-xs text-slate-500">
                        {selectedSlot
                          ? `Đã chọn: ${formatDay(selectedSlot)} • ${selectedSlot.startTime}–${selectedSlot.endTime} (${hours} giờ)`
                          : "Chưa chọn khung giờ."}
                      </p>

                      {selectedSlot && (
                        <label className="block text-sm text-slate-600">
                          Học phí buổi này
                          <input
                            type="number"
                            min={sessionMin}
                            max={sessionMax}
                            step="1000"
                            value={bookingPrice}
                            onChange={(e) => setBookingPrice(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                          />
                          <span className="text-xs text-slate-400 mt-1 block">
                            {formatVnd(minRate)}/giờ · khung {formatVnd(sessionMin)}
                            {sessionMax !== sessionMin ? ` – ${formatVnd(sessionMax)}` : ""}
                          </span>
                        </label>
                      )}

                      <button
                        type="submit"
                        disabled={bookingLoading || slots.length === 0}
                        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5"
                      >
                        {bookingLoading ? "Đang đặt..." : "Xác nhận đặt lịch"}
                      </button>
                    </form>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h2 className="font-semibold text-slate-900 mb-1">Viết đánh giá</h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Chỉ buổi gia sư đã xác nhận hoặc hoàn thành mới được đánh giá.
                  </p>

                  {!isLoggedIn() ? (
                    <Link to="/login" className="block text-center border border-slate-200 rounded-lg py-2.5 text-sm font-medium">
                      Đăng nhập để đánh giá
                    </Link>
                  ) : !isStudent ? (
                    <p className="text-sm text-slate-500">Chỉ học viên mới gửi được đánh giá.</p>
                  ) : eligibleBookings.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Bạn chưa có buổi học đã xác nhận với gia sư này, hoặc đã đánh giá hết các buổi.
                    </p>
                  ) : (
                    <form onSubmit={handleReview} className="space-y-3">
                      {formError && (
                        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</div>
                      )}
                      {formOk && (
                        <div className="text-sm text-verified-600 bg-verified-50 rounded-lg px-3 py-2">{formOk}</div>
                      )}
                      <label className="block text-sm text-slate-600">
                        Buổi học
                        <select
                          required
                          value={form.bookingId}
                          onChange={(e) => setForm((p) => ({ ...p, bookingId: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                        >
                          {eligibleBookings.map((b) => (
                            <option key={b.bookingId} value={b.bookingId}>
                              {b.subjectName} • {b.scheduledDate} {b.startTime}–{b.endTime}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Số sao</p>
                        <StarRating value={form.rating} onChange={(rating) => setForm((p) => ({ ...p, rating }))} />
                      </div>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={form.comment}
                        onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
                        placeholder="Nhận xét buổi học"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5"
                      >
                        {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                      </button>
                    </form>
                  )}
                </div>
              </aside>
            </div>

            <section className="bg-white rounded-2xl border border-slate-100 p-6 mt-6">
              <h2 className="font-semibold text-slate-900 mb-1">Chứng chỉ gia sư</h2>
              <p className="text-xs text-slate-500 mb-4">
                Học sinh và phụ huynh có thể xem tệp chứng chỉ để đánh giá năng lực trước khi đặt lịch.
              </p>
              {certificates.length === 0 ? (
                <p className="text-sm text-slate-500">Gia sư chưa tải chứng chỉ.</p>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-4">
                  {certificates.map((cert) => {
                    const href = fileHref(cert.fileUrl, API_ORIGIN);
                    const isImage = /\.(png|jpe?g|webp)$/i.test(cert.fileUrl || "");
                    return (
                      <li key={cert.certificateId} className="border border-slate-100 rounded-xl overflow-hidden">
                        {isImage && href && (
                          <a href={href} target="_blank" rel="noreferrer">
                            <img src={href} alt={cert.certificateName} className="h-40 w-full object-cover bg-slate-50" />
                          </a>
                        )}
                        <div className="px-4 py-3">
                          <p className="font-medium text-slate-900">{cert.certificateName}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {[cert.issuedBy, cert.issuedDate].filter(Boolean).join(" • ")}
                          </p>
                          {href && (
                            <a href={href} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline mt-2 inline-block">
                              Xem chứng chỉ
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function InfoChip({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900 mt-1 truncate">{value}</p>
    </div>
  );
}
