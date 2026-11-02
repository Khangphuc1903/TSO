export const VN_CITIES = [
  {
    name: "Hà Nội",
    districts: [
      "Ba Đình", "Hoàn Kiếm", "Tây Hồ", "Long Biên", "Cầu Giấy", "Đống Đa", "Hai Bà Trưng",
      "Hoàng Mai", "Thanh Xuân", "Nam Từ Liêm", "Bắc Từ Liêm", "Hà Đông", "Sơn Tây",
      "Ba Vì", "Chương Mỹ", "Đan Phượng", "Đông Anh", "Gia Lâm", "Hoài Đức", "Mê Linh",
      "Mỹ Đức", "Phú Xuyên", "Phúc Thọ", "Quốc Oai", "Sóc Sơn", "Thạch Thất", "Thanh Oai",
      "Thanh Trì", "Thường Tín", "Ứng Hòa",
    ],
  },
  {
    name: "TP. Hồ Chí Minh",
    districts: [
      "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10",
      "Quận 11", "Quận 12", "Bình Tân", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình",
      "Tân Phú", "Thủ Đức", "Bình Chánh", "Cần Giờ", "Củ Chi", "Hóc Môn", "Nhà Bè",
    ],
  },
  {
    name: "Đà Nẵng",
    districts: ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Liên Chiểu", "Cẩm Lệ", "Hòa Vang"],
  },
  {
    name: "Hải Phòng",
    districts: [
      "Hồng Bàng", "Ngô Quyền", "Lê Chân", "Hải An", "Kiến An", "Đồ Sơn", "Dương Kinh",
      "An Dương", "An Lão", "Kiến Thụy", "Tiên Lãng", "Vĩnh Bảo", "Thủy Nguyên", "Cát Hải",
    ],
  },
  {
    name: "Cần Thơ",
    districts: ["Ninh Kiều", "Bình Thủy", "Cái Răng", "Ô Môn", "Thốt Nốt", "Phong Điền", "Cờ Đỏ", "Thới Lai", "Vĩnh Thạnh"],
  },
  {
    name: "Bình Dương",
    districts: ["Thủ Dầu Một", "Dĩ An", "Thuận An", "Tân Uyên", "Bến Cát", "Bàu Bàng", "Dầu Tiếng", "Phú Giáo", "Bắc Tân Uyên"],
  },
  {
    name: "Đồng Nai",
    districts: [
      "Biên Hòa", "Long Khánh", "Long Thành", "Nhơn Trạch", "Trảng Bom", "Thống Nhất",
      "Cẩm Mỹ", "Định Quán", "Tân Phú", "Vĩnh Cửu", "Xuân Lộc",
    ],
  },
  {
    name: "Khánh Hòa",
    districts: ["Nha Trang", "Cam Ranh", "Cam Lâm", "Diên Khánh", "Khánh Vĩnh", "Khánh Sơn", "Ninh Hòa", "Vạn Ninh", "Trường Sa"],
  },
  {
    name: "Thừa Thiên Huế",
    districts: ["Huế", "Hương Thủy", "Hương Trà", "Phong Điền", "Quảng Điền", "Phú Vang", "Phú Lộc", "A Lưới", "Nam Đông"],
  },
  {
    name: "Nghệ An",
    districts: [
      "Vinh", "Cửa Lò", "Hoàng Mai", "Thái Hòa", "Anh Sơn", "Con Cuông", "Diễn Châu", "Đô Lương",
      "Hưng Nguyên", "Kỳ Sơn", "Nam Đàn", "Nghi Lộc", "Nghĩa Đàn", "Quế Phong", "Quỳ Châu",
      "Quỳ Hợp", "Quỳnh Lưu", "Tân Kỳ", "Thanh Chương", "Tương Dương", "Yên Thành",
    ],
  },
];

export function districtsOf(city) {
  return VN_CITIES.find((c) => c.name === city)?.districts || [];
}

export function isValidVnPhone(value) {
  return /^0\d{9}$/.test(String(value || "").replace(/\D/g, ""));
}

export function phoneError(value) {
  if (!isValidVnPhone(value)) return "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0.";
  return "";
}

export function regionError(city, district) {
  if (!city || !district) return "Hãy chọn tỉnh/thành và quận/huyện.";
  if (!districtsOf(city).includes(district)) return "Quận/huyện không thuộc tỉnh/thành đã chọn.";
  return "";
}
