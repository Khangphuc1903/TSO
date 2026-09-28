USE TutorPlatformDB;
GO

-- =====================================================================
-- Seed bộ câu hỏi bài kiểm tra chuyên môn Gia sư
-- Phân loại theo: Cấp học (Subject.EducationLevel) + Môn + Lớp (GradeLevel)
-- Idempotent: chỉ chèn câu hỏi chưa tồn tại (so theo SubjectId + GradeLevel + Content).
-- Không sửa/xóa dữ liệu cũ, không ảnh hưởng các bảng khác.
-- =====================================================================

IF OBJECT_ID('tempdb..#TutorTestSeed') IS NOT NULL DROP TABLE #TutorTestSeed;
CREATE TABLE #TutorTestSeed (
    SubjectName      NVARCHAR(100),
    EducationLevel   NVARCHAR(50),
    GradeLevel       NVARCHAR(50),
    Content          NVARCHAR(500),
    OptionA          NVARCHAR(255),
    OptionB          NVARCHAR(255),
    OptionC          NVARCHAR(255),
    OptionD          NVARCHAR(255),
    CorrectAnswer    NVARCHAR(1),
    Difficulty       NVARCHAR(20)
);

-- ============================ TOAN (THCS: Lop 6-9) ============================
INSERT INTO #TutorTestSeed VALUES
(N'Toan', N'Secondary', N'Lớp 6', N'Tập hợp các số tự nhiên gồm:', N'{0;1;2;3;...}', N'{...;-2;-1;0;1;2;...}', N'Chỉ các số 0;1;2', N'Các số nguyên âm', N'A', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 6', N'Kết quả của phép tính 3 + 4 x 2 là:', N'14', N'11', N'10', N'12', N'B', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 6', N'UCLN của 12 và 18 là:', N'6', N'3', N'36', N'2', N'A', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 6', N'Số vừa chia hết cho 2 vừa chia hết cho 5 là:', N'35', N'40', N'43', N'51', N'B', N'Cơ bản'),

(N'Toan', N'Secondary', N'Lớp 7', N'Kết quả của (-5) + (-7) là:', N'-12', N'12', N'-2', N'2', N'A', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 7', N'Hai góc kề bù có tổng số đo bằng:', N'90 độ', N'180 độ', N'360 độ', N'60 độ', N'B', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 7', N'Tỉ lệ thức nào sau đây đúng:', N'2/3 = 4/6', N'2/3 = 3/2', N'2/4 = 3/2', N'1/2 = 2/3', N'A', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 7', N'Đơn thức thu gọn của 2x . 3x^2 là:', N'6x^3', N'5x^3', N'6x^2', N'5x^2', N'A', N'Cơ bản'),

(N'Toan', N'Secondary', N'Lớp 8', N'Khai triển (x + 1)^2 bằng:', N'x^2 + x + 1', N'x^2 + 2x + 1', N'x^2 - 2x + 1', N'x^2 + 1', N'B', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 8', N'Giá trị của x thỏa mãn 2x - 4 = 0 là:', N'-2', N'2', N'4', N'0', N'B', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 8', N'Tam giác có ba cạnh 3, 4, 5 là tam giác:', N'Vuông', N'Đều', N'Cân', N'Tù', N'A', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 8', N'Rút gọn phân thức 6x / 3x^2 (x khác 0) được:', N'2/x', N'2x', N'3/x', N'x/2', N'A', N'Cơ bản'),

(N'Toan', N'Secondary', N'Lớp 9', N'Nghiệm của phương trình x^2 - 4 = 0 là:', N'x = 4', N'x = 2 hoặc x = -2', N'x = 2', N'x = 0', N'B', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 9', N'Giá trị của sin 30 độ bằng:', N'1/2', N'Căn 3 chia 2', N'1', N'0', N'A', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 9', N'Đồ thị của hàm số y = 2x + 1 là một:', N'Đường tròn', N'Đường thẳng', N'Parabol', N'Hyperbol', N'B', N'Cơ bản'),
(N'Toan', N'Secondary', N'Lớp 9', N'Điều kiện xác định của căn bậc hai của (x - 1) là:', N'x >= 1', N'x > 1', N'x <= 1', N'x < 1', N'A', N'Cơ bản');
-- ============================ VAN (THCS: Lop 6-9) ============================
INSERT INTO #TutorTestSeed VALUES
(N'Van', N'Secondary', N'Lớp 6', N'Truyện "Thạch Sanh" thuộc thể loại:', N'Cổ tích', N'Truyện ngắn', N'Thơ', N'Kịch', N'A', N'Cơ bản'),
(N'Van', N'Secondary', N'Lớp 6', N'Từ "chiếc lá" gồm:', N'2 tiếng', N'1 tiếng', N'3 tiếng', N'4 tiếng', N'A', N'Cơ bản'),
(N'Van', N'Secondary', N'Lớp 6', N'Dấu chấm thường đặt cuối câu:', N'Trần thuật', N'Nghi vấn', N'Cảm thán', N'Cầu khiến', N'A', N'Cơ bản'),

(N'Van', N'Secondary', N'Lớp 7', N'Tác giả của "Cuộc chia tay của những con búp bê" là:', N'Khánh Hoài', N'Tô Hoài', N'Nguyễn Du', N'Xuân Quỳnh', N'A', N'Cơ bản'),
(N'Van', N'Secondary', N'Lớp 7', N'Trong từ ghép "bút chì", tiếng chính là:', N'Bút', N'Chì', N'Cả hai tiếng', N'Không có tiếng chính', N'A', N'Cơ bản'),
(N'Van', N'Secondary', N'Lớp 7', N'Luận điểm trong bài văn nghị luận là:', N'Ý kiến được nêu ra', N'Dẫn chứng', N'Luận cứ', N'Kết bài', N'A', N'Cơ bản'),

(N'Van', N'Secondary', N'Lớp 8', N'Tác phẩm "Lão Hạc" của nhà văn:', N'Nam Cao', N'Ngô Tất Tố', N'Thạch Lam', N'Vũ Trọng Phụng', N'A', N'Cơ bản'),
(N'Van', N'Secondary', N'Lớp 8', N'Câu "Ôi! đẹp quá" có thán từ là:', N'Ôi', N'Đẹp', N'Quá', N'Không có', N'A', N'Cơ bản'),
(N'Van', N'Secondary', N'Lớp 8', N'Câu nghi vấn thường kết thúc bằng:', N'Dấu chấm hỏi', N'Dấu chấm', N'Dấu chấm than', N'Dấu phẩy', N'A', N'Cơ bản'),

(N'Van', N'Secondary', N'Lớp 9', N'Truyện "Chiếc lược ngà" của nhà văn:', N'Nguyễn Quang Sáng', N'Kim Lân', N'Nguyễn Minh Châu', N'Thạch Lam', N'A', N'Cơ bản'),
(N'Van', N'Secondary', N'Lớp 9', N'Biện pháp tu từ nói quá còn gọi là:', N'Phóng đại', N'So sánh', N'Ẩn dụ', N'Nhân hóa', N'A', N'Cơ bản'),
(N'Van', N'Secondary', N'Lớp 9', N'Thành phần biệt lập cảm thán thể hiện:', N'Cảm xúc của người nói', N'Cách nói', N'Đối tượng nói tới', N'Thời gian', N'A', N'Cơ bản'),

-- ============================ TIENG ANH (THCS: Lop 6-9) ============================
INSERT INTO #TutorTestSeed VALUES
(N'Tieng Anh', N'Secondary', N'Lớp 6', N'Từ "Hello" có nghĩa là:', N'Xin chào', N'Tạm biệt', N'Cảm ơn', N'Xin lỗi', N'A', N'Cơ bản'),
(N'Tieng Anh', N'Secondary', N'Lớp 6', N'Chọn đáp án đúng: I ___ a student.', N'am', N'is', N'are', N'be', N'A', N'Cơ bản'),
(N'Tieng Anh', N'Secondary', N'Lớp 6', N'Dãy số ... one, two, ___, four. Số còn thiếu:', N'three', N'five', N'six', N'ten', N'A', N'Cơ bản'),

(N'Tieng Anh', N'Secondary', N'Lớp 7', N'She ___ to school every day.', N'goes', N'go', N'going', N'gone', N'A', N'Cơ bản'),
(N'Tieng Anh', N'Secondary', N'Lớp 7', N'Tính từ sở hữu tương ứng với "I" là:', N'my', N'your', N'her', N'their', N'A', N'Cơ bản'),
(N'Tieng Anh', N'Secondary', N'Lớp 7', N'"How often" được dùng để hỏi về:', N'Mức độ thường xuyên', N'Nơi chốn', N'Thời gian chính xác', N'Lý do', N'A', N'Cơ bản'),

(N'Tieng Anh', N'Secondary', N'Lớp 8', N'If it rains, I ___ at home.', N'will stay', N'stay', N'stayed', N'have stayed', N'A', N'Cơ bản'),
(N'Tieng Anh', N'Secondary', N'Lớp 8', N'Câu bị động thì hiện tại đơn có dạng:', N'am/is/are + V3/ed', N'have/has + V3/ed', N'will + V', N'was/were + V-ing', N'A', N'Cơ bản'),
(N'Tieng Anh', N'Secondary', N'Lớp 8', N'"Used to" diễn tả:', N'Thói quen trong quá khứ', N'Hành động tương lai', N'Hiện tại tiếp diễn', N'Phép so sánh', N'A', N'Cơ bản'),

(N'Tieng Anh', N'Secondary', N'Lớp 9', N'I wish I ___ taller.', N'were', N'am', N'was', N'be', N'A', N'Cơ bản'),
(N'Tieng Anh', N'Secondary', N'Lớp 9', N'Mạo từ "an" đứng trước từ bắt đầu bằng:', N'Nguyên âm', N'Phụ âm', N'Số đếm', N'Tính từ sở hữu', N'A', N'Cơ bản'),
(N'Tieng Anh', N'Secondary', N'Lớp 9', N'Mệnh đề quan hệ thường bắt đầu bằng:', N'who / which / that', N'am / is / are', N'in / on / at', N'a / an / the', N'A', N'Cơ bản');
-- ============================ VAT LY (THPT: Lop 10-12) ============================
INSERT INTO #TutorTestSeed VALUES
(N'Vat Ly', N'HighSchool', N'Lớp 10', N'Đơn vị của lực trong hệ SI là:', N'N (Newton)', N'kg', N'm/s', N'J (Joule)', N'A', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 10', N'Định luật II Newton được phát biểu:', N'F = m.a', N'F = m.v', N'a = F.m', N'F = m.g.t', N'A', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 10', N'Lấy g = 10 m/s^2, quãng đường vật rơi tự do không vận tốc đầu sau 2 giây là:', N'10 m', N'20 m', N'40 m', N'5 m', N'B', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 10', N'Vận tốc là một đại lượng:', N'Vô hướng', N'Vectơ', N'Hằng số', N'Không xác định', N'B', N'Cơ bản'),

(N'Vat Ly', N'HighSchool', N'Lớp 11', N'Định luật Cu-lông mô tả lực tương tác giữa:', N'Hai điện tích điểm', N'Hai nam châm', N'Hai dòng điện', N'Vật nặng', N'A', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 11', N'Điện trở của dây dẫn tỉ lệ thuận với:', N'Tiết diện dây', N'Chiều dài dây', N'Hiệu điện thế', N'Cường độ dòng điện', N'B', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 11', N'Công suất tiêu thụ của điện trở R có dòng I chạy qua là:', N'P = I^2.R', N'P = I.R', N'P = U/R', N'P = R/I', N'A', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 11', N'Trong từ trường đều, các đường sức từ là các đường:', N'Song song cách đều', N'Cắt nhau', N'Cong tùy ý', N'Hội tụ', N'A', N'Cơ bản'),

(N'Vat Ly', N'HighSchool', N'Lớp 12', N'Bước sóng λ liên hệ với tốc độ truyền sóng v và tần số f theo:', N'λ = v/f', N'λ = f/v', N'λ = v.f', N'λ = 1/f', N'A', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 12', N'Cảm kháng của cuộn cảm thuần L trong mạch xoay chiều là:', N'Z(L) = 2.π.f.L', N'Z(L) = L/f', N'Z(L) = 1/(2.π.f.L)', N'Z(L) = f/L', N'A', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 12', N'Hiện tượng quang điện chứng tỏ ánh sáng có tính chất:', N'Sóng', N'Hạt', N'Điện', N'Từ', N'B', N'Cơ bản'),
(N'Vat Ly', N'HighSchool', N'Lớp 12', N'Đơn vị của tần số là:', N'Hz', N'N', N'J', N'W', N'A', N'Cơ bản');
-- ============================ HOA HOC (THPT: Lop 10-12) ============================
INSERT INTO #TutorTestSeed VALUES
(N'Hoa Hoc', N'HighSchool', N'Lớp 10', N'Kí hiệu hóa học của nguyên tố Natri là:', N'Na', N'N', N'Na2', N'N2O', N'A', N'Cơ bản'),
(N'Hoa Hoc', N'HighSchool', N'Lớp 10', N'Nguyên tử được cấu tạo bởi các hạt:', N'Proton, neutron, electron', N'Chỉ electron', N'Ion dương', N'Phân tử', N'A', N'Cơ bản'),
(N'Hoa Hoc', N'HighSchool', N'Lớp 10', N'Liên kết ion thường hình thành giữa:', N'Kim loại điển hình và phi kim điển hình', N'Hai phi kim', N'Hai kim loại', N'Hai khí hiếm', N'A', N'Cơ bản'),

(N'Hoa Hoc', N'HighSchool', N'Lớp 11', N'HNO3 là:', N'Axit mạnh', N'Bazơ', N'Muối trung hòa', N'Chất khí trơ', N'A', N'Cơ bản'),
(N'Hoa Hoc', N'HighSchool', N'Lớp 11', N'Nhiệt phân muối amoni thường giải phóng khí:', N'NH3', N'N2O', N'NO2', N'Kim loại', N'A', N'Cơ bản'),
(N'Hoa Hoc', N'HighSchool', N'Lớp 11', N'Kim cương có cấu trúc:', N'Mạng tinh thể', N'Phân tử đơn lẻ', N'Chuỗi', N'Không có liên kết', N'A', N'Cơ bản'),

(N'Hoa Hoc', N'HighSchool', N'Lớp 12', N'Polietylen (PE) thuộc loại polime:', N'Tổng hợp', N'Thiên nhiên', N'Tái sinh', N'Bán tổng hợp', N'A', N'Cơ bản'),
(N'Hoa Hoc', N'HighSchool', N'Lớp 12', N'Chất béo được cấu tạo từ:', N'Glixerol và các axit béo', N'Amino axit', N'Glucozơ', N'Axit vô cơ', N'A', N'Cơ bản'),
(N'Hoa Hoc', N'HighSchool', N'Lớp 12', N'Điện phân dung dịch NaCl có màng ngăn thu được:', N'H2, Cl2 và NaOH', N'Na kim loại', N'Chỉ O2', N'Chỉ HCl', N'A', N'Cơ bản'),

-- ============================ SINH HOC (THPT: Lop 10-12) ============================
INSERT INTO #TutorTestSeed VALUES
(N'Sinh Hoc', N'HighSchool', N'Lớp 10', N'Đơn vị cấu tạo cơ bản của mọi cơ thể sống là:', N'Tế bào', N'Nguyên tử', N'Phân tử', N'Mô', N'A', N'Cơ bản'),
(N'Sinh Hoc', N'HighSchool', N'Lớp 10', N'Bào quan thực hiện quang hợp ở thực vật là:', N'Lục lạp', N'Ti thể', N'Riboxom', N'Nhân', N'A', N'Cơ bản'),
(N'Sinh Hoc', N'HighSchool', N'Lớp 10', N'Vận chuyển thụ động qua màng:', N'Không tiêu tốn năng lượng', N'Luôn cần ATP', N'Chỉ xảy ra ở động vật', N'Ngược gradient nồng độ', N'A', N'Cơ bản'),

(N'Sinh Hoc', N'HighSchool', N'Lớp 11', N'Hoocmôn điều hòa đường huyết là:', N'Insulin', N'Testosteron', N'Auxin', N'Histamin', N'A', N'Cơ bản'),
(N'Sinh Hoc', N'HighSchool', N'Lớp 11', N'Hệ tuần hoàn của người gồm:', N'Tim và hệ mạch', N'Phổi', N'Thận', N'Gan', N'A', N'Cơ bản'),
(N'Sinh Hoc', N'HighSchool', N'Lớp 11', N'Đơn vị chức năng của thận là:', N'Nephron', N'Tế bào gan', N'Phế nang', N'Nơron', N'A', N'Cơ bản'),

(N'Sinh Hoc', N'HighSchool', N'Lớp 12', N'Quy luật phân li của Menđen nêu ra:', N'Mỗi tính trạng do một cặp alen quy định', N'Di truyền liên kết gen', N'Hoán vị gen', N'Tương tác cộng gộp', N'A', N'Cơ bản'),
(N'Sinh Hoc', N'HighSchool', N'Lớp 12', N'Đột biến gen là những biến đổi trong:', N'Cấu trúc của gen', N'Số lượng NST', N'Kiểu hình đồng loạt', N'Môi trường sống', N'A', N'Cơ bản'),
(N'Sinh Hoc', N'HighSchool', N'Lớp 12', N'Thể dị bội là sự thay đổi về:', N'Số lượng NST', N'Cấu trúc NST', N'Trình tự gen ngoài nhân', N'Mật độ quần thể', N'A', N'Cơ bản');

-- Chèn câu hỏi chưa tồn tại (idempotent)
INSERT INTO Questions (TestType, SubjectId, GradeLevel, Content, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, IsActive, CreatedAt)
SELECT N'Professional', s.SubjectId, t.GradeLevel, t.Content, t.OptionA, t.OptionB, t.OptionC, t.OptionD, t.CorrectAnswer, t.Difficulty, 1, GETDATE()
FROM #TutorTestSeed t
INNER JOIN Subjects s
    ON s.SubjectName = t.SubjectName
    AND s.EducationLevel = t.EducationLevel
    AND s.IsActive = 1
WHERE NOT EXISTS (
    SELECT 1 FROM Questions q
    WHERE q.SubjectId = s.SubjectId
      AND q.GradeLevel = t.GradeLevel
      AND q.Content = t.Content
);

DROP TABLE #TutorTestSeed;
GO

-- Báo cáo số lượng câu hỏi theo tổ hợp (Cấp học + Môn + Lớp)
SELECT s.EducationLevel, s.SubjectName, q.GradeLevel, COUNT(*) AS QuestionCount
FROM Questions q
JOIN Subjects s ON s.SubjectId = q.SubjectId
WHERE q.IsActive = 1 AND q.SubjectId IS NOT NULL AND q.GradeLevel IS NOT NULL
GROUP BY s.EducationLevel, s.SubjectName, q.GradeLevel
ORDER BY s.EducationLevel, s.SubjectName, q.GradeLevel;
GO