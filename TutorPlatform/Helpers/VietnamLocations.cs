using System.Text.RegularExpressions;

namespace TutorPlatform.Helpers;

public static class VietnamLocations
{
    public static readonly IReadOnlyDictionary<string, string[]> Cities = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
    {
        ["Hà Nội"] =
        [
            "Ba Đình", "Hoàn Kiếm", "Tây Hồ", "Long Biên", "Cầu Giấy", "Đống Đa", "Hai Bà Trưng",
            "Hoàng Mai", "Thanh Xuân", "Nam Từ Liêm", "Bắc Từ Liêm", "Hà Đông", "Sơn Tây",
            "Ba Vì", "Chương Mỹ", "Đan Phượng", "Đông Anh", "Gia Lâm", "Hoài Đức", "Mê Linh",
            "Mỹ Đức", "Phú Xuyên", "Phúc Thọ", "Quốc Oai", "Sóc Sơn", "Thạch Thất", "Thanh Oai",
            "Thanh Trì", "Thường Tín", "Ứng Hòa"
        ],
        ["TP. Hồ Chí Minh"] =
        [
            "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10",
            "Quận 11", "Quận 12", "Bình Tân", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình",
            "Tân Phú", "Thủ Đức", "Bình Chánh", "Cần Giờ", "Củ Chi", "Hóc Môn", "Nhà Bè"
        ],
        ["Đà Nẵng"] =
        [
            "Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Liên Chiểu", "Cẩm Lệ", "Hòa Vang"
        ],
        ["Hải Phòng"] =
        [
            "Hồng Bàng", "Ngô Quyền", "Lê Chân", "Hải An", "Kiến An", "Đồ Sơn", "Dương Kinh",
            "An Dương", "An Lão", "Kiến Thụy", "Tiên Lãng", "Vĩnh Bảo", "Thủy Nguyên", "Cát Hải"
        ],
        ["Cần Thơ"] =
        [
            "Ninh Kiều", "Bình Thủy", "Cái Răng", "Ô Môn", "Thốt Nốt", "Phong Điền", "Cờ Đỏ", "Thới Lai", "Vĩnh Thạnh"
        ],
        ["Bình Dương"] =
        [
            "Thủ Dầu Một", "Dĩ An", "Thuận An", "Tân Uyên", "Bến Cát", "Bàu Bàng", "Dầu Tiếng", "Phú Giáo", "Bắc Tân Uyên"
        ],
        ["Đồng Nai"] =
        [
            "Biên Hòa", "Long Khánh", "Long Thành", "Nhơn Trạch", "Trảng Bom", "Thống Nhất",
            "Cẩm Mỹ", "Định Quán", "Tân Phú", "Vĩnh Cửu", "Xuân Lộc"
        ],
        ["Khánh Hòa"] =
        [
            "Nha Trang", "Cam Ranh", "Cam Lâm", "Diên Khánh", "Khánh Vĩnh", "Khánh Sơn", "Ninh Hòa", "Vạn Ninh", "Trường Sa"
        ],
        ["Thừa Thiên Huế"] =
        [
            "Huế", "Hương Thủy", "Hương Trà", "Phong Điền", "Quảng Điền", "Phú Vang", "Phú Lộc", "A Lưới", "Nam Đông"
        ],
        ["Nghệ An"] =
        [
            "Vinh", "Cửa Lò", "Hoàng Mai", "Thái Hòa", "Anh Sơn", "Con Cuông", "Diễn Châu", "Đô Lương",
            "Hưng Nguyên", "Kỳ Sơn", "Nam Đàn", "Nghi Lộc", "Nghĩa Đàn", "Quế Phong", "Quỳ Châu",
            "Quỳ Hợp", "Quỳnh Lưu", "Tân Kỳ", "Thanh Chương", "Tương Dương", "Yên Thành"
        ]
    };

    private static readonly Regex PhoneRegex = new(@"^0\d{9}$", RegexOptions.Compiled);

    public static bool IsValidPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return false;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        return PhoneRegex.IsMatch(digits);
    }

    public static string NormalizePhone(string phone)
        => new string(phone.Where(char.IsDigit).ToArray());

    public static bool IsValidRegion(string? city, string? district)
    {
        if (string.IsNullOrWhiteSpace(city) || string.IsNullOrWhiteSpace(district))
            return false;
        if (!Cities.TryGetValue(city.Trim(), out var districts))
            return false;
        return districts.Any(d => d.Equals(district.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public static string? ValidateProfileBasics(string? phone, string? city, string? district)
    {
        if (!IsValidPhone(phone))
            return "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0.";
        if (!IsValidRegion(city, district))
            return "Hãy chọn tỉnh/thành và quận/huyện hợp lệ.";
        return null;
    }
}
