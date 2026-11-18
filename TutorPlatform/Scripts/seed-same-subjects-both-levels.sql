-- Cùng một bộ môn cho THCS và THPT. Chỉ thêm câu hỏi còn thiếu.
SET NOCOUNT ON;
DECLARE @Toan INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Toán' AND IsActive = 1 ORDER BY SubjectId);
DECLARE @Van  INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Ngữ Văn' AND IsActive = 1 ORDER BY SubjectId);
DECLARE @Anh  INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Tiếng Anh' AND IsActive = 1 ORDER BY SubjectId);
DECLARE @Ly   INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Vật Lý' AND IsActive = 1 ORDER BY SubjectId);
DECLARE @Hoa  INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Hóa Học' AND IsActive = 1 ORDER BY SubjectId);
DECLARE @Sinh INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Sinh Học' AND IsActive = 1 ORDER BY SubjectId);

DECLARE @Seed TABLE (
    SubjectId INT NOT NULL,
    GradeLevel NVARCHAR(50) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    OptionA NVARCHAR(MAX) NOT NULL,
    OptionB NVARCHAR(MAX) NOT NULL,
    OptionC NVARCHAR(MAX) NOT NULL,
    OptionD NVARCHAR(MAX) NOT NULL,
    CorrectAnswer NVARCHAR(5) NOT NULL
);

INSERT INTO @Seed VALUES
(@Toan, N'THPT', N'Đạo hàm của hàm số y = x^2 tại x = 3 bằng bao nhiêu?', N'6', N'9', N'3', N'12', N'A'),
(@Toan, N'THPT', N'Nghiệm của phương trình x^2 - 5x + 6 = 0 là:', N'x = 2 và x = 3', N'x = 1 và x = 6', N'x = -2 và x = -3', N'x = 5 và x = 6', N'A'),
(@Toan, N'THPT', N'log2(8) bằng:', N'2', N'3', N'4', N'8', N'B'),
(@Toan, N'THPT', N'Một nguyên hàm của f(x) = 2x là:', N'x^2 + C', N'2x^2 + C', N'x + C', N'2 + C', N'A'),
(@Anh, N'THPT', N'Chọn câu đúng: "She ____ here since 2019."', N'has lived', N'lived', N'is living', N'lives', N'A'),
(@Anh, N'THPT', N'Câu điều kiện loại 2 đúng là:', N'If I were you, I would apologize.', N'If I was you, I will apologize.', N'If I am you, I would apologize.', N'If I were you, I will apologize.', N'A'),
(@Anh, N'THPT', N'Chọn mệnh đề quan hệ đúng: "The book ____ I bought is new."', N'who', N'which', N'whom', N'whose', N'B'),
(@Anh, N'THPT', N'"Despite" được theo sau bởi:', N'một mệnh đề bắt đầu bằng because', N'một danh từ hoặc cụm danh từ', N'một động từ nguyên mẫu có to', N'một mệnh đề bắt đầu bằng although', N'B'),
(@Van, N'THCS', N'Thể thơ lục bát có số tiếng ở mỗi cặp câu là:', N'6 và 8', N'5 và 7', N'7 và 7', N'8 và 8', N'A'),
(@Van, N'THCS', N'Nhân hóa là biện pháp:', N'gọi hoặc làm cho vật vô tri có hành động, tính cách như người', N'so sánh hai sự vật cùng loại', N'nói quá một đặc điểm', N'lặp lại nguyên một câu', N'A'),
(@Van, N'THCS', N'Truyện Kiều là tác phẩm của:', N'Nguyễn Du', N'Nguyễn Trãi', N'Hồ Xuân Hương', N'Nguyễn Khuyến', N'A'),
(@Van, N'THCS', N'Trong câu "Đôi mắt em như sao", biện pháp tu từ chính là:', N'So sánh', N'Nhân hóa', N'Ẩn dụ', N'Hoán dụ', N'A'),
(@Van, N'THPT', N'Tuyên ngôn Độc lập của Hồ Chí Minh mở đầu bằng cách trích:', N'Tuyên ngôn Độc lập năm 1776 của nước Mỹ và Tuyên ngôn Nhân quyền và Dân quyền của Cách mạng Pháp', N'Truyện Kiều', N'Bình Ngô đại cáo', N'Nam quốc sơn hà', N'A'),
(@Van, N'THPT', N'Truyện ngắn Vợ nhặt là của nhà văn:', N'Kim Lân', N'Nam Cao', N'Nguyễn Tuân', N'Thạch Lam', N'A'),
(@Van, N'THPT', N'Một bài nghị luận xã hội cần có trước hết:', N'Luận điểm rõ ràng', N'Chỉ dẫn chứng, không cần luận điểm', N'Một bài thơ', N'Một bảng số liệu không lời bình', N'A'),
(@Van, N'THPT', N'Thao tác lập luận "bàn bạc" trong nghị luận là:', N'Nêu vấn đề, phân tích và đưa ra ý kiến, giải pháp', N'Chỉ kể một câu chuyện', N'Chỉ tả cảnh', N'Chép lại nguyên văn tác phẩm', N'A'),
(@Ly, N'THCS', N'Công thức tính vận tốc trung bình là:', N'v = s / t', N'v = s × t', N'v = t / s', N'v = s + t', N'A'),
(@Ly, N'THCS', N'Định luật Ôm cho đoạn mạch được viết là:', N'U = I × R', N'I = U × R', N'R = U × I', N'U = I / R', N'A'),
(@Ly, N'THCS', N'Ánh sáng trong môi trường đồng tính truyền theo:', N'Đường thẳng', N'Đường tròn', N'Đường gấp khúc bất kỳ', N'Đường parabol', N'A'),
(@Ly, N'THCS', N'Đơn vị của lực trong hệ SI là:', N'Newton', N'Joule', N'Watt', N'Pascal', N'A'),
(@Hoa, N'THCS', N'Công thức hóa học của nước là:', N'H2O', N'HO', N'H2O2', N'CO2', N'A'),
(@Hoa, N'THCS', N'Dung dịch có pH nhỏ hơn 7 là:', N'Dung dịch axit', N'Dung dịch bazơ', N'Dung dịch trung tính', N'Nước cất', N'A'),
(@Hoa, N'THCS', N'Nguyên tử gồm hạt nhân và:', N'Lớp vỏ electron', N'Chỉ proton', N'Chỉ nơtron', N'Phân tử', N'A'),
(@Hoa, N'THCS', N'Khí oxi có công thức là:', N'O2', N'O', N'O3 bắt buộc', N'H2', N'A'),
(@Sinh, N'THCS', N'Quang hợp ở thực vật chủ yếu diễn ra tại:', N'Lá', N'Rễ', N'Hoa', N'Quả', N'A'),
(@Sinh, N'THCS', N'Tế bào nhân thực có đặc điểm:', N'Có nhân được bao bởi màng nhân', N'Không có màng tế bào', N'Không có tế bào chất', N'Chỉ có ở vi khuẩn', N'A'),
(@Sinh, N'THCS', N'Cơ quan bơm máu trong hệ tuần hoàn người là:', N'Tim', N'Phổi', N'Da dày', N'Thận', N'A'),
(@Sinh, N'THCS', N'Thực vật lấy nước chủ yếu qua:', N'Rễ', N'Hoa', N'Quả', N'Hạt', N'A'),
(@Sinh, N'THPT', N'Phân tử mang thông tin di truyền ở người là:', N'ADN', N'Glucose', N'Nước', N'Lipid', N'A'),
(@Sinh, N'THPT', N'Giảm phân tạo ra tế bào con có bộ nhiễm sắc thể:', N'Đơn bội', N'Gấp đôi tế bào mẹ', N'Không có nhiễm sắc thể', N'Luôn tứ bội', N'A'),
(@Sinh, N'THPT', N'Theo Mendel, phép lai hai cặp tính trạng dị hợp tạo tỉ lệ kiểu hình điển hình:', N'9 : 3 : 3 : 1', N'1 : 1', N'3 : 1', N'1 : 2 : 1', N'A'),
(@Sinh, N'THPT', N'Một hệ sinh thái gồm:', N'Quần xã sinh vật và sinh cảnh', N'Chỉ các loài động vật', N'Chỉ yếu tố vô sinh', N'Chỉ một cá thể', N'A');

INSERT INTO Questions (TestType, SubjectId, GradeLevel, Content, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, IsActive, CreatedAt)
SELECT N'Professional', s.SubjectId, s.GradeLevel, s.Content, s.OptionA, s.OptionB, s.OptionC, s.OptionD, s.CorrectAnswer, N'Vận dụng', 1, GETDATE()
FROM @Seed s
WHERE s.SubjectId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM Questions q
      WHERE q.SubjectId = s.SubjectId AND q.GradeLevel = s.GradeLevel AND q.Content = s.Content
  );

SELECT s.SubjectName, q.GradeLevel, COUNT(*) AS Cnt
FROM Questions q
JOIN Subjects s ON s.SubjectId = q.SubjectId
WHERE q.IsActive = 1 AND q.TestType = N'Professional' AND q.GradeLevel IN (N'THCS', N'THPT')
GROUP BY s.SubjectName, q.GradeLevel
ORDER BY s.SubjectName, q.GradeLevel;
