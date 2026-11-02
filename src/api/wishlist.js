import axiosClient from "./axiosClient";

export const wishlistApi = {
  list: () => axiosClient.get("/wishlist").then((r) => r.data),
  ids: () => axiosClient.get("/wishlist/ids").then((r) => r.data),
  toggle: (tutorId) => axiosClient.post(`/wishlist/${tutorId}`).then((r) => r.data),
};
