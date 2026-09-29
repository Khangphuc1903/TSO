import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMyBookings } from "../api/study";
import { cancelAndRefundBooking } from "../api/payment";
import { getUser, isLoggedIn } from "../auth";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn()) {
      setCartItems([]);
      setSelectedIds([]);
      return;
    }

    const user = getUser();
    const isTutor = (user?.role || "").toLowerCase() === "tutor";
    if (isTutor) {
      setCartItems([]);
      return;
    }

    try {
      setLoading(true);
      const bookings = await getMyBookings();
      // Các buổi học chưa thanh toán và đang ở trạng thái Pending hoặc Unpaid
      const unpaid = (bookings || []).filter(
        (b) =>
          b.status === "Pending" &&
          (b.paymentStatus === "Unpaid" || b.paymentStatus === "Pending")
      );
      setCartItems(unpaid);
      setSelectedIds((prev) => {
        // Giữ lại các ID hợp lệ còn trong danh sách
        const validIds = unpaid.map((item) => item.bookingId);
        const filtered = prev.filter((id) => validIds.includes(id));
        return filtered.length > 0 ? filtered : validIds;
      });
    } catch {
      // Bỏ qua lỗi kết nối
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const toggleSelect = (bookingId) => {
    setSelectedIds((prev) =>
      prev.includes(bookingId)
        ? prev.filter((id) => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cartItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((item) => item.bookingId));
    }
  };

  const removeItem = async (bookingId, reason = "Học viên xóa khỏi giỏ hàng") => {
    try {
      await cancelAndRefundBooking(bookingId, reason);
      setCartItems((prev) => prev.filter((item) => item.bookingId !== bookingId));
      setSelectedIds((prev) => prev.filter((id) => id !== bookingId));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Không thể xóa buổi học.",
      };
    }
  };

  const cartCount = cartItems.length;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        loading,
        selectedIds,
        toggleSelect,
        toggleSelectAll,
        removeItem,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
