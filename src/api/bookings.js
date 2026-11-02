import axiosClient from "./axiosClient";

export async function createBooking(payload) {
  const res = await axiosClient.post("/bookings", payload);
  return res.data;
}
