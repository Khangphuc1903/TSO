import axiosClient from "./axiosClient";

export async function createPaymentIntent(bookingId) {
  const res = await axiosClient.post("/payments/create-intent", { bookingId });
  return res.data;
}

export async function getPaymentByBooking(bookingId) {
  const res = await axiosClient.get(`/payments/booking/${bookingId}`);
  return res.data;
}

export async function getRefundPreview(bookingId) {
  const res = await axiosClient.get(`/payments/booking/${bookingId}/refund-preview`);
  return res.data;
}

export async function cancelAndRefundBooking(bookingId, reason) {
  const res = await axiosClient.post(`/payments/booking/${bookingId}/cancel`, { reason });
  return res.data;
}
