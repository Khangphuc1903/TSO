SET NOCOUNT ON;
IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectName = N'Tiếng Việt')
    INSERT INTO Subjects (SubjectName, EducationLevel, IsActive) VALUES (N'Tiếng Việt', N'Primary', 1);

DECLARE @Toan INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Toán' AND IsActive = 1 ORDER BY SubjectId);
DECLARE @Viet INT = (SELECT TOP 1 SubjectId FROM Subjects WHERE SubjectName = N'Tiếng Việt' AND IsActive = 1 ORDER BY SubjectId);

DECLARE @Seed TABLE (
    SubjectId INT NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    OptionA NVARCHAR(MAX) NOT NULL,
    OptionB NVARCHAR(MAX) NOT NULL,
    OptionC NVARCHAR(MAX) NOT NULL,
    OptionD NVARCHAR(MAX) NOT NULL,
    CorrectAnswer NVARCHAR(5) NOT NULL
);

INSERT INTO @Seed VALUES
(@Toan, N'15 + 27 bằng bao nhiêu?', N'32', N'42', N'41', N'52', N'B'),
(@Toan, N'8 × 6 bằng bao nhiêu?', N'42', N'46', N'48', N'56', N'C'),
(@Toan, N'Hình có 3 cạnh là hình gì?', N'Hình vuông', N'Hình tròn', N'Hình tam giác', N'Hình chữ nhật', N'C'),
(@Toan, N'100 - 37 bằng bao nhiêu?', N'63', N'73', N'67', N'53', N'A'),
(@Viet, N'Từ nào chỉ hoạt động?', N'bàn', N'chạy', N'đỏ', N'nhà', N'B'),
(@Viet, N'Câu hỏi kết thúc bằng dấu nào?', N'Dấu chấm', N'Dấu phẩy', N'Dấu chấm hỏi', N'Dấu chấm than', N'C'),
(@Viet, N'Trong câu "Bạn Lan đọc sách", chủ ngữ là:', N'đọc', N'sách', N'Bạn Lan', N'đọc sách', N'C'),
(@Viet, N'Từ nào viết đúng chính tả?', N'học sịnh', N'học sinh', N'họt sinh', N'học xinh', N'B');

INSERT INTO Questions (TestType, SubjectId, GradeLevel, Content, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, IsActive, CreatedAt)
SELECT N'Professional', s.SubjectId, N'Tiểu học', s.Content, s.OptionA, s.OptionB, s.OptionC, s.OptionD, s.CorrectAnswer, N'Vận dụng', 1, GETDATE()
FROM @Seed s
WHERE s.SubjectId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM Questions q
      WHERE q.SubjectId = s.SubjectId AND q.GradeLevel = N'Tiểu học' AND q.Content = s.Content
  );

SELECT s.SubjectName, q.GradeLevel, COUNT(*) AS Cnt
FROM Questions q
JOIN Subjects s ON s.SubjectId = q.SubjectId
WHERE q.GradeLevel = N'Tiểu học' AND q.IsActive = 1
GROUP BY s.SubjectName, q.GradeLevel;
