# HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN TSG TUTOR PLATFORM (NHÁNH `sang`)

Tài liệu hướng dẫn chi tiết dành cho các thành viên trong nhóm khi **clone dự án về máy mới**, đảm bảo toàn bộ hệ thống (Frontend, Backend, Database và Cổng thanh toán VietQR PayOS) hoạt động trơn tru 100%.

---

## 1. THÔNG SỐ CỔNG KẾT NỐI (PORTS & SERVICES)

| Thành phần | Công nghệ | Địa chỉ truy cập / Port mặc định | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | React 19 + Vite + Tailwind | `http://localhost:5173` | Nếu trùng port sẽ nhảy sang 5174, 5175... (Backend đã cấu hình CORS tự động nhận tất cả cổng localhost) |
| **Backend API** | ASP.NET Core 8 Web API | `http://localhost:5008` | Swagger: `http://localhost:5008/swagger` |
| **Cơ sở dữ liệu** | Microsoft SQL Server | `TutorPlatformDB` | Windows Authentication |
| **Cổng thanh toán** | PayOS (VietQR / Napas 247) | API Sandbox / Live | Tự sinh mã QR chuẩn Ngân hàng Việt Nam |

---

## 2. NGUYÊN NHÂN LỖI KHÔNG TẠO ĐƯỢC MÃ QR KHI CLONE MÁY KHÁC & CÁCH ĐÃ FIX

Trước đây, khi bạn chạy trên máy gốc thì tạo được QR, nhưng người khác clone về thì không tạo được mã QR do **5 nguyên nhân kỹ thuật**:

1. **Thiếu Script khởi tạo CSDL trong Git**: File `tutor_platform_database.sql` trước đây nằm ngoài thư mục Git (`D:\Đồ án`), người khác clone về không có cấu trúc 33 bảng CSDL.
   * *Đã khắc phục*: Tạo file tổng hợp duy nhất `TutorPlatform/Scripts/00_Setup_Full_Database_And_Seed.sql` tích hợp sẵn trong Git.
2. **Thiếu Đơn hàng `Pending` và lệch quyền sở hữu Học sinh (`403 Forbidden`)**:
   * API thanh toán (`POST /api/payments/create-intent`) kiểm tra: `if (booking.StudentId != studentId) return 403 Forbidden`.
   * Người mới clone về đăng ký tài khoản mới (ví dụ ID: 10), nhưng lại click vào link checkout cũ của học sinh cũ (ID: 3) -> Bị backend từ chối vì không phải chủ đơn hàng.
   * *Đã khắc phục*: Script CSDL tự nạp sẵn đơn hàng `Pending` cho cả 2 tài khoản học sinh mẫu `student@tutor.com` và `student.demo@tsg.com`.
3. **CORS bị khóa cứng cổng 5173/5174**:
   * Khi máy người khác đang mở ứng dụng khác chiếm port 5173, Vite tự động chuyển sang port 5175 -> Backend từ chối kết nối CORS khiến Frontend không gọi được API PayOS.
   * *Đã khắc phục*: Cập nhật `Program.cs` cho phép linh hoạt mọi cổng `localhost` và `127.0.0.1`.
4. **Lệch cổng Backend khi chạy F5 trong Visual Studio**:
   * Visual Studio khi bấm F5 có thể tự chạy profile `https` (port 7167) hoặc `IIS Express` (port 22932). Trong khi Frontend (`axiosClient.js`) gọi vào port `http://localhost:5008` -> Bị lỗi `ERR_CONNECTION_REFUSED`.
   * *Đã khắc phục*: Đưa profile `http` (port 5008) lên ưu tiên số 1 trong `launchSettings.json`.
5. **Frontend nuốt lỗi âm thầm (`silent catch`)**:
   * `Checkout.jsx` trước đây có khối `catch {}` rỗng, khi API lỗi không hiển thị lý do.
   * *Đã khắc phục*: Bắt và hiển thị rõ thông báo lỗi từ server để người dùng biết ngay nguyên nhân.

---

## 3. CÁC BƯỚC KHỞI CHẠY DỰ ÁN CHO MÁY MỚI (TỪNG BƯỚC)

### BƯỚC 1: Khởi tạo Cơ sở dữ liệu (Chỉ chạy 1 lần đầu)
1. Mở **SQL Server Management Studio (SSMS)**.
2. Mở file: `TutorPlatform/Scripts/00_Setup_Full_Database_And_Seed.sql`.
3. Nhấn **Execute (F5)**.
   * Script sẽ tự động tạo Database `TutorPlatformDB`, 33 bảng, thiết lập đầy đủ khóa ngoại, dữ liệu phân quyền, danh mục môn học, 5 gia sư mẫu và các đơn đặt lịch `Pending` sẵn sàng quét mã VietQR.

> [!NOTE]
> Nếu máy của bạn dùng bản **SQL Server Express**, hãy kiểm tra file `TutorPlatform/appsettings.json`, dòng `ConnectionStrings`:
> * Bản Standard/Developer: `Server=localhost;Database=TutorPlatformDB;Trusted_Connection=True;TrustServerCertificate=True;`
> * Bản Express: `Server=localhost\\SQLEXPRESS;Database=TutorPlatformDB;Trusted_Connection=True;TrustServerCertificate=True;`

---

### BƯỚC 2: Khởi chạy Backend (.NET 8.0)
Bạn có thể chọn 1 trong 2 cách:

* **Cách 1 (Bằng Terminal / Khuyên dùng)**:
  ```powershell
  cd TutorPlatform
  dotnet run --launch-profile http
  ```
  Backend sẽ chạy tại: `http://localhost:5008`. Kiểm tra Swagger tại: `http://localhost:5008/swagger`.

* **Cách 2 (Bằng Visual Studio 2022)**:
  1. Mở file `TutorPlatform.sln`.
  2. Trên thanh công cụ, chọn profile khởi chạy là **`http`** (không chọn IIS Express hay https).
  3. Bấm **F5** hoặc nút **Start Debugging**.

---

### BƯỚC 3: Khởi chạy Frontend (React + Vite)
1. Mở một cửa sổ Terminal mới tại thư mục gốc của dự án (`TSO`):
   ```powershell
   npm install
   npm run dev
   ```
2. Trình duyệt sẽ mở tại `http://localhost:5173`.

---

## 4. DANH SÁCH TÀI KHOẢN MẪU & CÁCH TEST MÃ QR THANH TOÁN

Mật khẩu mặc định cho **TẤT CẢ** các tài khoản dưới đây là: **`Password123!`** (hoặc `123456` với các tài khoản cũ).

| Email | Vai trò | Chức năng kiểm thử |
| :--- | :---: | :--- |
| **`student@tutor.com`** | **Học sinh** | Có sẵn các đơn đặt lịch **Pending** (#3, #4, #5, #6) giá 300.000 ₫ để test quét QR PayOS ngay lập tức. |
| **`student.demo@tsg.com`** | **Học sinh** | Có sẵn đơn đặt lịch **Pending** (#12) giá 250.000 ₫. |
| **`tutor@tutor.com`** | **Gia sư** | Gia sư phụ trách các buổi học mẫu, duyệt lịch, tạo lịch trống. |
| **`admin@tutor.com`** | **Admin** | Quản trị nền tảng, duyệt hồ sơ gia sư, quản lý Payout. |

### Cách kiểm tra tạo mã VietQR tức thì:
1. Truy cập `http://localhost:5173/login`.
2. Đăng nhập bằng:
   * **Email**: `student@tutor.com`
   * **Mật khẩu**: `Password123!`
3. Nhấp vào menu **Giỏ hàng** (`/cart`) hoặc **Lịch học của tôi** (`/bookings`).
4. Nhấn nút **"Thanh toán ngay"** tại buổi học trạng thái *Chờ thanh toán* (hoặc truy cập trực tiếp đường link: `http://localhost:5173/checkout/3`).
5. **Kết quả**:
   * Hệ thống tự động gọi API PayOS, sinh mã VietQR chuẩn Napas247 hiển thị ngay giữa màn hình.
   * Đầy đủ thông tin: Ngân hàng Quân Đội (MB) / Ngân hàng Phương Đông (OCB), Số tài khoản ảo, Số tiền (300.000 ₫), Nội dung chuyển khoản chuẩn.
   * Dùng điện thoại quét mã QR bằng App Ngân hàng bất kỳ để kiểm tra thông tin tự động điền.
