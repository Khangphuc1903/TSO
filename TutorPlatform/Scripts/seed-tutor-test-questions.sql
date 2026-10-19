USE TutorPlatformDB;
GO

-- =====================================================================
-- NÂNG CẤP BỘ CÂU HỎI SÁT HẠCH NĂNG LỰC GIA SƯ (CHUẨN CHẤT LƯỢNG ĐẦU VÀO)
-- Bao gồm:
-- 1. Bài kiểm tra Chuyên môn (Professional): Phân hóa Lớp 6-12, lồng ghép Bẫy tư duy,
--    Lỗi sai học sinh (Diagnostic Ability) và Phương pháp giải.
-- 2. Bài kiểm tra Sư phạm & An toàn (Pedagogical): Tâm lý lứa tuổi, xử lý tình huống,
--    đạo đức nghề nghiệp và quy tắc bảo vệ học sinh.
-- Idempotent: Xóa các câu hỏi mẫu quá sơ đẳng cũ và chèn bộ câu hỏi chuẩn sư phạm.
-- =====================================================================

IF OBJECT_ID('tempdb..#AdvancedSeed') IS NOT NULL DROP TABLE #AdvancedSeed;
CREATE TABLE #AdvancedSeed (
    TestType         NVARCHAR(20),
    SubjectName      NVARCHAR(100) NULL,
    EducationLevel   NVARCHAR(50)  NULL,
    GradeLevel       NVARCHAR(50)  NULL,
    Content          NVARCHAR(500),
    OptionA          NVARCHAR(255),
    OptionB          NVARCHAR(255),
    OptionC          NVARCHAR(255),
    OptionD          NVARCHAR(255),
    CorrectAnswer    NVARCHAR(1),
    Difficulty       NVARCHAR(20)
);

-- =====================================================================
-- 1. BÀI TEST KỸ NĂNG SƯ PHẠM & AN TOÀN (PEDAGOGICAL) - ÁP DỤNG CHUNG
-- =====================================================================
INSERT INTO #AdvancedSeed VALUES
(N'Pedagogical', NULL, NULL, NULL,
 N'Học sinh thường xuyên không làm bài tập về nhà và có thái độ bất hợp tác. Cách xử lý nào thể hiện năng lực sư phạm chuẩn mực nhất?',
 N'Trách phạt nghiêm khắc trước mặt phụ huynh ngay trong buổi học để răn đe.',
 N'Lắng nghe tìm hiểu nguyên nhân gốc rễ, chia nhỏ khối lượng bài tập và chủ động trao đổi xây dựng lộ trình với phụ huynh.',
 N'Bỏ qua bài tập về nhà và chỉ dạy lý thuyết mới trên lớp để giữ hòa khí.',
 N'Yêu cầu hủy hợp đồng giảng dạy ngay lập tức vì học sinh không có tinh thần học tập.',
 N'B', N'Tình huống'),

(N'Pedagogical', NULL, NULL, NULL,
 N'Học sinh đề nghị chuyển khoản học phí trực tiếp vào tài khoản cá nhân của gia sư để được giảm giá ngoài nền tảng. Gia sư nên ứng xử thế nào?',
 N'Đồng ý ngay vì cả hai bên đều tiết kiệm được chi phí hoa hồng.',
 N'Từ chối và giải thích rõ việc thanh toán qua hệ thống là cơ chế bảo vệ quyền lợi tài chính, hợp đồng và an toàn cho cả hai bên.',
 N'Đồng ý nhưng yêu cầu học sinh không được nói cho phụ huynh biết.',
 N'Báo cáo hủy tài khoản học sinh ngay lập tức mà không giải thích.',
 N'B', N'Quy tắc an toàn'),

(N'Pedagogical', NULL, NULL, NULL,
 N'Trong buổi học kèm tại nhà, gia sư nhận thấy học sinh có dấu hiệu hoảng loạn, sợ hãi hoặc tâm sự bị bạo hành/xâm hại. Hành động đúng đắn nhất là:',
 N'Xem như việc gia đình học sinh và không can thiệp để tránh phiền phức.',
 N'Lắng nghe bình tĩnh, trấn an học sinh, không phán xét và thông báo khẩn cấp cho ban quản lý nền tảng hoặc cơ quan bảo vệ trẻ em.',
 N'Chất vấn phụ huynh ngay lập tức một cách gay gắt trong buổi học.',
 N'Đăng bài lên mạng xã hội để nhờ cộng đồng mạng can thiệp.',
 N'B', N'Quy tắc an toàn'),

(N'Pedagogical', NULL, NULL, NULL,
 N'Khi giảng dạy một khái niệm trừu tượng mới mà học sinh học lực yếu mãi không hiểu, phương pháp sư phạm tối ưu của gia sư là:',
 N'Nói to hơn và lặp lại định nghĩa sách giáo khoa nhiều lần cho học sinh nhớ.',
 N'Chuyển sang làm bài tập mẫu phức tạp để học sinh tự rút ra quy luật.',
 N'Dùng ví dụ trực quan đời sống gần gũi, sử dụng hình vẽ/sơ đồ tư duy và đặt câu hỏi gợi mở từng bước nhỏ.',
 N'Yêu cầu học sinh chép phạt định nghĩa 10 lần về nhà học thuộc lòng.',
 N'C', N'Sư phạm');

-- =====================================================================
-- 2. TOÁN HỌC (SECONDARY: LỚP 6 - 9)
-- =====================================================================
-- TOÁN 6
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Toan', N'Secondary', N'Lớp 6',
 N'Học sinh thực hiện phép tính: 20 - 10 : 2 = 10 : 2 = 5. Gia sư nên chỉ ra lỗi sai cốt lõi của học sinh như thế nào?',
 N'Học sinh tính sai kết quả của 10 : 2.',
 N'Học sinh vi phạm quy tắc thứ tự thực hiện phép tính (phải nhân chia trước, cộng trừ sau).',
 N'Phép tính không có lỗi sai, kết quả 5 là chính xác.',
 N'Học sinh phải đặt dấu ngoặc vào (20 - 10) thì mới được tính.',
 N'B', N'Sư phạm'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 6',
 N'Tìm số tự nhiên x biết: 2^(x+1) + 2^x = 96. Giá trị của x là:',
 N'x = 4', N'x = 5', N'x = 6', N'x = 3',
 N'B', N'Vận dụng'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 6',
 N'Một lớp học có 40 học sinh. Trong đợt khảo sát, có 28 em thích môn Toán, 20 em thích môn Văn. Có ít nhất bao nhiêu em thích cả hai môn Toán và Văn?',
 N'8 học sinh', N'12 học sinh', N'20 học sinh', N'48 học sinh',
 N'A', N'Nâng cao');

-- TOÁN 7
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Toan', N'Secondary', N'Lớp 7',
 N'Học sinh kết luận: "Nếu x^2 = 25 thì x = 5". Gia sư cần sửa lỗi tư duy toán học nào cho học sinh?',
 N'Học sinh bỏ quên nghiệm âm x = -5 vì (-5)^2 cũng bằng 25.',
 N'Học sinh tính sai căn bậc hai của 25.',
 N'Kết luận của học sinh là hoàn toàn đầy đủ trong tập số nguyên.',
 N'Phương trình x^2 = 25 vô nghiệm vì không có số nào bình phương bằng 25.',
 N'A', N'Sư phạm'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 7',
 N'Cho tam giác ABC cân tại A có góc ở đỉnh A bằng 40 độ. Số đo góc B ở đáy là:',
 N'40 độ', N'70 độ', N'140 độ', N'60 độ',
 N'B', N'Vận dụng'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 7',
 N'Cho tỉ lệ thức a/b = c/d (với a, b, c, d khác 0). Biểu thức nào sau đây luôn đúng theo tính chất tỉ lệ thức?',
 N'(a + b) / b = (c + d) / d',
 N'a . c = b . d',
 N'(a - b) / a = (c + d) / c',
 N'a / d = b / c',
 N'A', N'Nâng cao');

-- TOÁN 8
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Toan', N'Secondary', N'Lớp 8',
 N'Học sinh giải phương trình: (x - 2)(x - 5) = 4 suy ra x - 2 = 4 hoặc x - 5 = 4. Lỗi sai căn bản của học sinh là gì?',
 N'Tính nhầm dấu khi chuyển vế số 2 và 5.',
 N'Áp dụng tùy tiện quy tắc tích A.B = 0 khi vế phải khác 0 (vế phải bằng 4 chứ không bằng 0).',
 N'Phương trình bậc 2 luôn vô nghiệm nên không được tách nhân tử.',
 N'Quên chia cả hai vế cho 4 trước khi giải.',
 N'B', N'Sư phạm'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 8',
 N'Rút gọn phân thức đại số P = (x^2 - 4) / (x^2 - 4x + 4) với điều kiện xác định x khác 2 ta được:',
 N'(x + 2) / (x - 2)',
 N'(x - 2) / (x + 2)',
 N'1 / (4x)',
 N'(x + 2) / (x + 2) = 1',
 N'A', N'Vận dụng'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 8',
 N'Cho tam giác ABC đồng dạng với tam giác DEF theo tỉ số đồng dạng k = 2/3. Tỉ số diện tích tương ứng S(ABC) / S(DEF) bằng:',
 N'2/3', N'4/9', N'3/2', N'8/27',
 N'B', N'Vận dụng');

-- TOÁN 9
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Toan', N'Secondary', N'Lớp 9',
 N'Học sinh viết: căn bậc hai số học của (x - 3)^2 = x - 3 với mọi số thực x. Gia sư cần sửa điều gì để biểu thức luôn đúng?',
 N'Phải đổi thành căn((x - 3)^2) = 3 - x với mọi x.',
 N'Phải khai căn ra giá trị tuyệt đối |x - 3|, chỉ bằng x - 3 khi x >= 3 và bằng 3 - x khi x < 3.',
 N'Khai căn số học luôn ra số dương nên không cần bất kỳ điều kiện nào.',
 N'Biểu thức của học sinh đã chính xác tuyệt đối.',
 N'B', N'Sư phạm'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 9',
 N'Cho phương trình x^2 - 5x + m = 0. Giá trị của m để phương trình có 2 nghiệm phân biệt x1, x2 thỏa mãn x1^2 + x2^2 = 13 là:',
 N'm = 6', N'm = -6', N'm = 12', N'm = 25/4',
 N'A', N'Vận dụng'),

(N'Professional', N'Toan', N'Secondary', N'Lớp 9',
 N'Cho đường tròn (O; R) và dây cung AB có độ dài bằng R*căn(3). Số đo góc ở tâm AOB chắn cung nhỏ AB là:',
 N'60 độ', N'90 độ', N'120 độ', N'150 độ',
 N'C', N'Nâng cao');

-- =====================================================================
-- 3. TIẾNG ANH (SECONDARY: LỚP 6 - 9)
-- =====================================================================
-- TIẾNG ANH 6
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 6',
 N'Học sinh viết câu: "She don''t likes listening to music." Lỗi ngữ pháp cần sửa cho học sinh là:',
 N'Đổi "don''t likes" thành "doesn''t like" (trợ động từ phủ định ngôi thứ 3 số ít và động từ chính về nguyên mẫu).',
 N'Chỉ cần đổi "listening" thành "listen".',
 N'Câu trên hoàn toàn đúng ngữ pháp hiện tại đơn.',
 N'Đổi "likes" thành "is like".',
 N'A', N'Sư phạm'),

(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 6',
 N'Chọn giới từ chính xác để điền vào chỗ trống: "The final examination will take place ___ Monday, June 12th."',
 N'in', N'at', N'on', N'by',
 N'C', N'Vận dụng');

-- TIẾNG ANH 7
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 7',
 N'Học sinh bối rối giữa "fewer" và "less". Quy tắc giảng giải chuẩn xác nhất gia sư cần truyền đạt là gì?',
 N'"Fewer" đi với danh từ không đếm được, "less" đi với danh từ đếm được số nhiều.',
 N'"Fewer" đi với danh từ đếm được số nhiều, còn "less" đi với danh từ không đếm được.',
 N'Cả hai từ dùng hoàn toàn thay thế được cho nhau trong mọi ngữ cảnh.',
 N'"Fewer" chỉ dùng trong câu khẳng định, "less" chỉ dùng trong câu phủ định.',
 N'B', N'Sư phạm'),

(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 7',
 N'Điền dạng đúng của động từ: "He was not experienced enough ___ the complex problem yesterday."',
 N'solve', N'solving', N'to solve', N'solved',
 N'C', N'Vận dụng');

-- TIẾNG ANH 8
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 8',
 N'Khi chuyển câu trực tiếp sang gián tiếp: "I will visit my grandparents tomorrow," Nam said. Học sinh hay mắc lỗi bỏ quên bước nào nhất?',
 N'Chỉ cần giữ nguyên động từ will.',
 N'Phải lùi thì (will -> would), đổi đại từ (I -> he) và đổi trạng từ chỉ thời gian (tomorrow -> the following day/the next day).',
 N'Chỉ cần thêm chữ "that" vào giữa hai vế.',
 N'Đổi Nam thành "He" ở mệnh đề chính.',
 N'B', N'Sư phạm'),

(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 8',
 N'Chuyển câu sau sang thể bị động (Passive voice): "They have built a new bridge across the river."',
 N'A new bridge has been built across the river.',
 N'A new bridge was built across the river.',
 N'A new bridge is built across the river.',
 N'A new bridge have been built across the river.',
 N'A', N'Vận dụng');

-- TIẾNG ANH 9
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 9',
 N'Chọn phương án rút gọn mệnh đề quan hệ chuẩn xác: "The students who are participating in the contest are talented."',
 N'The students participating in the contest are talented.',
 N'The students participated in the contest are talented.',
 N'The students participate in the contest are talented.',
 N'The students to participate in the contest are talented.',
 N'A', N'Vận dụng'),

(N'Professional', N'Tieng Anh', N'Secondary', N'Lớp 9',
 N'Điền dạng động từ thích hợp của câu điều kiện: "If I ___ in your position, I ___ that job offer immediately."',
 N'am / will accept',
 N'were / would accept',
 N'was / will accept',
 N'had been / accept',
 N'B', N'Vận dụng');

-- =====================================================================
-- 4. VẬT LÝ (HIGHSCHOOL: LỚP 10 - 12)
-- =====================================================================
-- VẬT LÝ 10
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 10',
 N'Học sinh quan niệm: "Muốn vật duy trì chuyển động thẳng đều thì bắt buộc phải có lực tác dụng liên tục". Gia sư dùng định luật nào để giải thích?',
 N'Định luật vạn vật hấp dẫn của Newton.',
 N'Định luật I Newton: Vật giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều khi không chịu lực nào tác dụng hoặc hợp lực bằng 0.',
 N'Định luật III Newton về cặp lực trực đối.',
 N'Định luật II Newton với công thức F = m.a.',
 N'B', N'Sư phạm'),

(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 10',
 N'Một vật khối lượng m = 2 kg trượt trên sàn nằm ngang dưới tác dụng của lực kéo F = 10 N theo phương ngang. Hệ số ma sát mu = 0.2, lấy g = 10 m/s^2. Gia tốc của vật là:',
 N'a = 3 m/s^2', N'a = 5 m/s^2', N'a = 2 m/s^2', N'a = 1 m/s^2',
 N'A', N'Vận dụng');

-- VẬT LÝ 11
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 11',
 N'Điều kiện cần và đủ để xảy ra hiện tượng phản xạ toàn phần tại mặt phân cách giữa hai môi trường trong suốt là:',
 N'Ánh sáng truyền từ môi trường chiết quang kém sang môi trường chiết quang hơn và góc tới i > 0.',
 N'Ánh sáng truyền từ môi trường chiết quang hơn sang chiết quang kém (n1 > n2) và góc tới i >= i_gh (với sin i_gh = n2/n1).',
 N'Góc tới i phải luôn bằng 90 độ.',
 N'Chỉ cần hai môi trường có cùng chiết suất tuyệt đối.',
 N'B', N'Vận dụng'),

(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 11',
 N'Một nguồn điện có suất điện động E = 12 V, điện trở trong r = 1 Ohm mắc với mạch ngoài là điện trở R = 5 Ohm. Cường độ dòng điện trong mạch và công suất tỏa nhiệt trên R là:',
 N'I = 2 A, P = 20 W',
 N'I = 2.4 A, P = 28.8 W',
 N'I = 2 A, P = 10 W',
 N'I = 1 A, P = 5 W',
 N'A', N'Vận dụng');

-- VẬT LÝ 12
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 12',
 N'Trong mạch dao động RLC mắc nối tiếp đang có hiện tượng cộng hưởng điện (omega = 1 / căn(LC)). Phát biểu nào sau đây là SAI?',
 N'Cường độ dòng điện hiệu dụng trong mạch đạt giá trị cực đại I_max = U / R.',
 N'Điện áp tức thời giữa hai đầu đoạn mạch cùng pha với cường độ dòng điện.',
 N'Tổng trở của đoạn mạch đạt giá trị lớn nhất Z_max = R + Z_L + Z_C.',
 N'Hệ số công suất của đoạn mạch đạt giá trị cực đại cos(phi) = 1.',
 N'C', N'Vận dụng'),

(N'Professional', N'Vat Ly', N'HighSchool', N'Lớp 12',
 N'Trong thí nghiệm Y-âng về giao thoa ánh sáng đơn sắc có bước sóng lambda. Nếu tăng khoảng cách giữa hai khe hẹp lên 2 lần (a'' = 2a) và giữ nguyên khoảng cách D thì khoảng vân i sẽ:',
 N'Tăng lên 2 lần', N'Giảm đi 2 lần', N'Không thay đổi', N'Tăng lên 4 lần',
 N'B', N'Vận dụng');

-- =====================================================================
-- 5. HÓA HỌC (HIGHSCHOOL: LỚP 10 - 12)
-- =====================================================================
-- HÓA 10
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 10',
 N'Trong phản ứng oxi hóa - khử: 2Fe + 3Cl2 -> 2FeCl3, bản chất quá trình biến đổi electron của nguyên tử Clo là:',
 N'Clo nhường electron nên là chất khử.',
 N'Mỗi phân tử Cl2 nhận 2 electron (Cl2 + 2e -> 2Cl-) để giảm số oxi hóa từ 0 xuống -1, Clo là chất oxi hóa.',
 N'Clo không thay đổi số oxi hóa trong phản ứng này.',
 N'Clo vừa là chất oxi hóa vừa là chất khử.',
 N'B', N'Vận dụng'),

(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 10',
 N'Dựa vào hiệu độ âm điện giữa hai nguyên tử liên kết, liên kết trong phân tử nào sau đây là liên kết ion rõ rệt nhất?',
 N'NaCl (kim loại điển hình Na và phi kim điển hình Cl)',
 N'HCl (phi kim H và Cl)',
 N'CH4 (phi kim C và H)',
 N'O2 (giữa hai nguyên tử oxy cùng độ âm điện)',
 N'A', N'Vận dụng');

-- HÓA 11
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 11',
 N'Cho cân bằng hóa học trong bình kín: N2(k) + 3H2(k) <=> 2NH3(k) với delta H < 0 (phản ứng tỏa nhiệt). Để cân bằng chuyển dịch theo chiều thuận tạo ra nhiều NH3 hơn, cần tác động:',
 N'Tăng nhiệt độ và giảm áp suất chung của hệ.',
 N'Giảm nhiệt độ và tăng áp suất chung của hệ.',
 N'Chỉ cần thêm chất xúc tác bột sắt mà không đổi nhiệt độ, áp suất.',
 N'Tăng thể tích bình chứa lên 2 lần.',
 N'B', N'Vận dụng'),

(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 11',
 N'Trộn lẫn 100 ml dung dịch HCl 0.1 M với 100 ml dung dịch NaOH 0.1 M ở 25 độ C. Giá trị pH của dung dịch thu được sau phản ứng trung hòa là:',
 N'pH = 1', N'pH = 7', N'pH = 13', N'pH = 0',
 N'B', N'Vận dụng');

-- HÓA 12
INSERT INTO #AdvancedSeed VALUES
(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 12',
 N'Thủy phân hoàn toàn 8.8 gam etyl axetat (CH3COOC2H5, M = 88 g/mol) bằng dung dịch NaOH vừa đủ, đun nóng. Khối lượng muối natri axetat (CH3COONa, M = 82 g/mol) thu được là:',
 N'8.2 gam', N'8.8 gam', N'6.8 gam', N'4.1 gam',
 N'A', N'Vận dụng'),

(N'Professional', N'Hoa Hoc', N'HighSchool', N'Lớp 12',
 N'Khi nhúng một lá sắt (Fe) sạch vào dung dịch đồng sunfat (CuSO4 dư), hiện tượng hóa học quan sát được và phương trình phản ứng chuẩn xác là:',
 N'Không có hiện tượng gì xảy ra vì sắt yếu hơn đồng.',
 N'Có lớp kim loại màu đỏ (Cu) bám ngoài lá sắt, dung dịch nhạt dần màu xanh lam (Fe + CuSO4 -> FeSO4 + Cu).',
 N'Khí H2 thoát ra sủi bọt mạnh mẽ trên bề mặt lá sắt.',
 N'Lá sắt tan hoàn toàn và xuất hiện kết tủa trắng Fe(OH)2.',
 N'B', N'Vận dụng');

-- =====================================================================
-- TIẾN HÀNH NẠP VÀO DATABASE
-- =====================================================================

-- 1. Nạp câu hỏi Sư phạm (Pedagogical: SubjectId = NULL, GradeLevel = NULL)
INSERT INTO Questions (TestType, SubjectId, GradeLevel, Content, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, IsActive, CreatedAt)
SELECT t.TestType, NULL, NULL, t.Content, t.OptionA, t.OptionB, t.OptionC, t.OptionD, t.CorrectAnswer, t.Difficulty, 1, GETDATE()
FROM #AdvancedSeed t
WHERE t.TestType = N'Pedagogical'
  AND NOT EXISTS (
      SELECT 1 FROM Questions q
      WHERE q.TestType = N'Pedagogical'
        AND q.Content = t.Content
  );

-- 2. Nạp câu hỏi Chuyên môn (Professional: Theo SubjectId và GradeLevel)
INSERT INTO Questions (TestType, SubjectId, GradeLevel, Content, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, IsActive, CreatedAt)
SELECT t.TestType, s.SubjectId, t.GradeLevel, t.Content, t.OptionA, t.OptionB, t.OptionC, t.OptionD, t.CorrectAnswer, t.Difficulty, 1, GETDATE()
FROM #AdvancedSeed t
INNER JOIN Subjects s
    ON s.SubjectName = t.SubjectName
    AND s.EducationLevel = t.EducationLevel
    AND s.IsActive = 1
WHERE t.TestType = N'Professional'
  AND NOT EXISTS (
      SELECT 1 FROM Questions q
      WHERE q.SubjectId = s.SubjectId
        AND q.GradeLevel = t.GradeLevel
        AND q.Content = t.Content
  );

DROP TABLE #AdvancedSeed;
GO

-- In báo cáo tổng hợp ngân hàng đề thi
SELECT 
    q.TestType,
    ISNULL(s.SubjectName, N'(Chung Sư phạm)') AS SubjectName,
    ISNULL(q.GradeLevel, N'Tất cả khối') AS GradeLevel,
    q.Difficulty,
    COUNT(*) AS QuestionCount
FROM Questions q
LEFT JOIN Subjects s ON s.SubjectId = q.SubjectId
WHERE q.IsActive = 1
GROUP BY q.TestType, s.SubjectName, q.GradeLevel, q.Difficulty
ORDER BY q.TestType, s.SubjectName, q.GradeLevel;
GO