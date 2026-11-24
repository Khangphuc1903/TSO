SET NOCOUNT ON;
DECLARE @Ielts INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'IELTS' AND IsActive = 1 ORDER BY SubjectId);

DECLARE @Seed TABLE (
    Content NVARCHAR(MAX) NOT NULL,
    OptionA NVARCHAR(MAX) NOT NULL,
    OptionB NVARCHAR(MAX) NOT NULL,
    OptionC NVARCHAR(MAX) NOT NULL,
    OptionD NVARCHAR(MAX) NOT NULL,
    CorrectAnswer NVARCHAR(5) NOT NULL
);

INSERT INTO @Seed VALUES
(N'IELTS Listening có bao nhiêu section?', N'2', N'3', N'4', N'5', N'C'),
(N'Phần Reading Academic có bao nhiêu câu hỏi?', N'20', N'30', N'40', N'50', N'C'),
(N'Writing Task 2 yêu cầu tối thiểu khoảng bao nhiêu từ?', N'150', N'200', N'250', N'300', N'C'),
(N'Speaking Part 2 cho thí sinh khoảng bao lâu để chuẩn bị?', N'30 giây', N'1 phút', N'3 phút', N'5 phút', N'B'),
(N'Điểm tổng IELTS được tính bằng cách nào?', N'Lấy kỹ năng cao nhất', N'Trung bình 4 kỹ năng, làm tròn 0.5', N'Cộng cả 4 kỹ năng', N'Chỉ tính Writing và Speaking', N'B'),
(N'Academic và General Training khác nhau rõ nhất ở đâu?', N'Listening', N'Speaking', N'Writing Task 1 và một số bài Reading', N'Không khác gì', N'C'),
(N'Thời gian Reading IELTS là bao lâu?', N'30 phút', N'40 phút', N'60 phút', N'90 phút', N'C'),
(N'Khi dạy Writing, gia sư nên ưu tiên điều gì?', N'Học thuộc một bài mẫu rồi chép', N'Luận điểm rõ, đoạn mạch lạc và ví dụ đúng đề', N'Chỉ viết câu rất ngắn', N'Không cần kết bài', N'B'),
(N'Speaking IELTS gồm mấy phần?', N'1', N'2', N'3', N'4', N'C'),
(N'Trước khi nghe Listening, thí sinh nên làm gì?', N'Bỏ qua đề', N'Đọc câu hỏi và gạch từ khóa', N'Viết Task 2', N'Chỉ nghe nhạc', N'B'),
(N'Một bài Speaking bị trừ điểm nặng khi thí sinh:', N'Nói chậm nhưng rõ', N'Dùng ví dụ đơn giản', N'Học thuộc và không trả lời đúng câu hỏi', N'Nhờ giám khảo nhắc lại câu hỏi', N'C'),
(N'Band 6.0 Writing thường còn thiếu điều gì so với band 7?', N'Mọi câu đều sai ngữ pháp', N'Không viết được chữ', N'Ý chưa phát triển đủ và còn lỗi từ vựng, ngữ pháp', N'Bài quá ngắn dưới 50 từ là bắt buộc', N'C');

INSERT INTO Questions (TestType, SubjectId, GradeLevel, Content, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, IsActive, CreatedAt)
SELECT N'IELTS', @Ielts, NULL, s.Content, s.OptionA, s.OptionB, s.OptionC, s.OptionD, s.CorrectAnswer, N'Vận dụng', 1, GETDATE()
FROM @Seed s
WHERE NOT EXISTS (
    SELECT 1 FROM Questions q WHERE q.TestType = N'IELTS' AND q.Content = s.Content
);

SELECT COUNT(*) AS IeltsQuestions FROM Questions WHERE TestType = N'IELTS' AND IsActive = 1;
