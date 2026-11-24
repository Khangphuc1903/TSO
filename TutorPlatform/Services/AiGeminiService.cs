using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TutorPlatform.Services;

public class AiGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<AiGeminiService> _logger;

    public AiGeminiService(HttpClient httpClient, IConfiguration config, ILogger<AiGeminiService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    private string ApiKey
    {
        get
        {
            var configured = _config["Gemini:ApiKey"]?.Trim();
            if (!string.IsNullOrWhiteSpace(configured) &&
                !configured.Contains("YOUR_GEMINI_API_KEY", StringComparison.OrdinalIgnoreCase))
            {
                return configured;
            }

            return Environment.GetEnvironmentVariable("GEMINI_API_KEY")?.Trim() ?? "";
        }
    }

    private string ModelName
    {
        get
        {
            var configured = _config["Gemini:Model"]?.Trim();
            return string.IsNullOrWhiteSpace(configured) ? "gemini-2.5-flash" : configured;
        }
    }

    /// <summary>
    /// Chẩn đoán lỗ hổng kiến thức từ ảnh bài tập/đề thi qua Gemini Multimodal Vision
    /// </summary>
    public async Task<GeminiDiagnosisOutput?> DiagnoseHomeworkImageAsync(
        byte[] imageBytes,
        string mimeType,
        string? studentNote,
        CancellationToken ct = default)
    {
        var base64Image = Convert.ToBase64String(imageBytes);

        var promptBuilder = new StringBuilder();
        promptBuilder.AppendLine("=== HUẤN LUYỆN SƯ PHẠM CHUYÊN SÂU (CHƯƠNG TRÌNH GDPT 2018 BỘ GD&ĐT VIỆT NAM) ===");
        promptBuilder.AppendLine("BẠN LÀ CHUYÊN GIA SƯ PHẠM CAO CẤP & CỐ VẤN KHẢO THÍ HÀNG ĐẦU.");
        promptBuilder.AppendLine("NHIỆM VỤ: Phân tích ảnh chụp bài tập/đề thi/bài kiểm tra của học sinh và CHẨN ĐOÁN CHÍNH XÁC LỖ HỔNG KIẾN THỨC CỐT LÕI.");
        if (!string.IsNullOrWhiteSpace(studentNote))
        {
            promptBuilder.AppendLine($"Ghi chú bổ sung của học sinh: \"{studentNote.Trim()}\"");
        }
        promptBuilder.AppendLine(@"
QUY TRÌNH CHẨN ĐOÁN 4 BƯỚC (DIAGNOSTIC PROTOCOL):
1. [OCR & Nhận diện]: Đọc chính xác nội dung đề bài, các công thức toán/lý/hóa/ngoại ngữ và từng bước làm bài viết tay của học sinh.
2. [Phát hiện vị trí sai lệch (Error Localization)]: Xác định chính xác bước/dòng/câu mà học sinh bắt đầu làm sai hoặc ngộ nhận.
3. [Phân loại bản chất sai lầm (Root Cause Analysis)]:
   - Phân biệt rõ giữa:
     + Sơ suất số học / tính toán cẩu thả (Calculation Slip) -> Severity: 'Minor'
     + Nắm công thức nhưng thiếu kỹ năng biến đổi / phương pháp giải (Methodological Gap) -> Severity: 'Moderate'
     + Hổng định nghĩa, ngộ nhận bản chất định lý, mất gốc lý thuyết (Conceptual Misconception) -> Severity: 'Critical'
4. [Định vị Chuyên đề GDPT 2018]: Ánh xạ chính xác vào cây chuyên đề chuẩn (Toán, Vật Lý, Hóa Học, Tiếng Anh, Ngữ Văn, Sinh Học) từ Lớp 6 đến Lớp 12.
5. [Phác đồ can thiệp 3-4 buổi]: Đưa ra kế hoạch gia sư kèm cặp đúng trọng tâm để lấy lại gốc và nâng cao điểm số.

VÍ DỤ HUẤN LUYỆN MẪU (FEW-SHOT DEMONSTRATION):
Ví dụ 1: Bài toán Hình học 11 - Tính khoảng cách từ điểm A đến mặt phẳng (SBC) trong hình chóp S.ABC:
- Học sinh kẻ trực tiếp AH vuông góc với SB rồi kết luận AH là khoảng cách từ A đến (SBC).
- Phân tích sai lầm: Học sinh ngộ nhận quan hệ vuông góc, quên mất điều kiện tiên quyết là mặt phẳng (SAB) phải vuông góc với (SBC) hoặc BC phải vuông góc với (SAB).
- Định vị: Chuyên đề 'Hình học không gian - Khoảng cách', Lớp 11, Severity: 'Critical'.
- Phác đồ: Buổi 1: Ôn lại Định lý 3 đường vuông góc & phương pháp xác định chân đường cao; Buổi 2: Kỹ thuật đổi điểm và tỷ số khoảng cách; Buổi 3: Luyện tập 5 dạng bài khoảng cách trọng tâm trong đề thi tốt nghiệp THPT.

BẮT BUỘC TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ (KHÔNG THÊM BẤT KỲ VĂN BẢN NGOÀI KHỐI JSON):
{
  ""subjectName"": ""Toán"",
  ""gradeLevel"": ""Lớp 11"",
  ""topicName"": ""Hình học không gian - Khoảng cách"",
  ""topicCode"": ""TOAN_11_HHKG_KHOANG_CACH"",
  ""severity"": ""Critical"",
  ""ocrText"": ""Cho hình chóp S.ABC có đáy ABC vuông tại B... Học sinh giải: Kẻ AH vuông góc SB => d(A,(SBC)) = AH"",
  ""studentMistake"": ""Học sinh ngộ nhận đoạn vuông góc kẻ từ điểm A đến đường thẳng SB là khoảng cách tới mặt phẳng (SBC) khi chưa chứng minh mặt phẳng (SAB) vuông góc với (SBC)."",
  ""aiSummary"": ""Mất gốc bản chất dựng khoảng cách từ điểm đến mặt phẳng trong Hình học không gian lớp 11"",
  ""gapDetail"": ""Học sinh chưa nắm vững định lý ba đường vuông góc và phương pháp dựng hình chiếu vuông góc thông qua chân đường cao của hình chóp."",
  ""studyPlan"": ""Lộ trình 3 buổi: Buổi 1: Nắm vững điều kiện đường vuông góc với mặt; Buổi 2: Phương pháp kẻ phụ qua chân đường cao; Buổi 3: Phương pháp đổi điểm tỷ số thể tích."",
  ""recommendedKeywords"": [""Hình học không gian"", ""Khoảng cách"", ""Toán 11""]
}");

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new
                        {
                            inlineData = new
                            {
                                mimeType = NormalizeImageMimeType(mimeType),
                                data = base64Image
                            }
                        },
                        new
                        {
                            text = promptBuilder.ToString()
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.2,
                topP = 0.8,
                maxOutputTokens = 8192,
                responseMimeType = "application/json"
            }
        };

        var responseJson = await CallGeminiApiAsync(payload, ct);
        if (string.IsNullOrWhiteSpace(responseJson))
            throw new InvalidOperationException("Chưa cấu hình Gemini:ApiKey (hãy điền API key vào appsettings.Local.json, appsettings.json hoặc biến môi trường GEMINI_API_KEY).");

        var parsed = CleanAndParseJson<GeminiDiagnosisOutput>(responseJson);
        if (parsed == null)
            throw new InvalidOperationException("Gemini đã trả lời nhưng không đúng dạng chẩn đoán.");
        return parsed;
    }

    /// <summary>
    /// Chẩn đoán bằng hai ảnh riêng biệt: đề bài và bài giải của học viên.
    /// </summary>
    public async Task<GeminiDiagnosisOutput?> DiagnoseHomeworkImagesAsync(
        byte[] problemBytes,
        string problemMime,
        byte[] solutionBytes,
        string solutionMime,
        string? studentNote,
        CancellationToken ct = default)
    {
        var prompt = new StringBuilder();
        prompt.AppendLine("BẠN LÀ CHUYÊN GIA SƯ PHẠM CAO CẤP CHƯƠNG TRÌNH GDPT 2018.");
        prompt.AppendLine("Có hai ảnh riêng biệt theo đúng thứ tự: ảnh 1 là ĐỀ BÀI gốc, ảnh 2 là BÀI GIẢI CỦA HỌC VIÊN.");
        prompt.AppendLine("TUYỆT ĐỐI không nhầm vai trò hoặc tự suy đoán khi không đọc rõ.");
        if (!string.IsNullOrWhiteSpace(studentNote))
            prompt.AppendLine($"Ghi chú bổ sung: \"{studentNote.Trim()}\"");
        prompt.AppendLine(@"
NHIỆM VỤ:
1. OCR ảnh đề bài; OCR riêng bài giải của học viên.
2. Xác định yêu cầu kiến thức/kỹ năng cần giải bài.
3. Đối chiếu từng bước bài giải với đề bài.
4. Nêu bước làm đúng, bước sai hoặc thiếu, nguyên nhân sai theo: chưa hiểu khái niệm, sai công thức, sai phương pháp, nhầm kiến thức hoặc lỗi tính toán.
5. Xác định lỗ hổng kiến thức chính xác; nêu mức độ nghiêm trọng Critical/Moderate/Minor.
6. Đưa ra hướng khắc phục và bài tập đề xuất.

Nếu ảnh mờ, thiếu thông tin hoặc không đọc rõ nội dung, chỉ đặt ""ocrText"" và các trường phân tích thành thông báo yêu cầu chụp lại; không tự suy đoán.

TRẢ VỀ DUY NHẤT JSON hợp lệ:
{
  ""subjectName"": ""Toán"",
  ""gradeLevel"": ""Lớp 11"",
  ""topicName"": ""Tên chuyên đề"",
  ""topicCode"": ""MA_CHUYEN_DE"",
  ""severity"": ""Critical|Moderate|Minor"",
  ""problemText"": ""Nội dung OCR của ảnh đề bài"",
  ""studentSolutionText"": ""Tóm tắt OCR bài giải của học viên"",
  ""ocrText"": ""Đề bài nhận diện"",
  ""correctSteps"": ""Những phần học sinh đã làm đúng"",
  ""incorrectOrIncompleteSteps"": ""Những phần sai hoặc chưa hoàn thành"",
  ""errorCause"": ""Nguyên nhân sai"",
  ""studentMistake"": ""Phân tích chi tiết lỗi sai"",
  ""aiSummary"": ""Tóm tắt kết quả đối chiếu"",
  ""gapDetail"": ""Kiến thức còn thiếu hoặc hiểu sai"",
  ""studyPlan"": ""Phương pháp học và bài tập đề xuất"",
  ""recommendedKeywords"": [""từ khóa""]
}");

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new
                        {
                            text = "ẢNH 1 - ĐỀ BÀI GỐC:"
                        },
                        new
                        {
                            inlineData = new
                            {
                                mimeType = NormalizeImageMimeType(problemMime),
                                data = Convert.ToBase64String(problemBytes)
                            }
                        },
                        new
                        {
                            text = "ẢNH 2 - BÀI GIẢI CỦA HỌC VIÊN:"
                        },
                        new
                        {
                            inlineData = new
                            {
                                mimeType = NormalizeImageMimeType(solutionMime),
                                data = Convert.ToBase64String(solutionBytes)
                            }
                        },
                        new
                        {
                            text = prompt.ToString()
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.2,
                topP = 0.8,
                maxOutputTokens = 8192,
                responseMimeType = "application/json"
            }
        };

        var responseJson = await CallGeminiApiAsync(payload, ct);
        if (string.IsNullOrWhiteSpace(responseJson))
            throw new InvalidOperationException("Chưa cấu hình Gemini:ApiKey hoặc AI không thể đọc hai ảnh.");

        var parsed = CleanAndParseJson<GeminiDiagnosisOutput>(responseJson);
        if (parsed == null)
            throw new InvalidOperationException("Gemini đã trả lời nhưng không đúng dạng chẩn đoán.");
        return parsed;
    }

    public async Task<T?> ReadImagesAsJsonAsync<T>(
        string prompt,
        IReadOnlyList<(byte[] Bytes, string Mime)> images,
        CancellationToken ct = default) where T : class
    {
        var parts = new List<object>();
        foreach (var image in images)
        {
            parts.Add(new
            {
                inlineData = new
                {
                    mimeType = NormalizeImageMimeType(image.Mime),
                    data = Convert.ToBase64String(image.Bytes)
                }
            });
        }
        parts.Add(new { text = prompt });

        var payload = new
        {
            contents = new[]
            {
                new { parts = parts.ToArray() }
            },
            generationConfig = new
            {
                temperature = 0.1,
                maxOutputTokens = 8192,
                responseMimeType = "application/json"
            }
        };

        var responseJson = await CallGeminiApiAsync(payload, ct);
        if (string.IsNullOrWhiteSpace(responseJson)) return null;
        return CleanAndParseJson<T>(responseJson);
    }

    /// <summary>
    /// Chuyển đổi câu tìm kiếm tự nhiên của phụ huynh thành bộ lọc JSON
    /// </summary>
    public async Task<GeminiNaturalSearchOutput?> ParseNaturalSearchQueryAsync(
        string userPrompt,
        CancellationToken ct = default)
    {
        var prompt = $@"BẠN LÀ CHUYÊN GIA TƯ VẤN HỌC TẬP & PHÂN TÍCH NHU CẦU TÌM GIA SƯ TẠI VIỆT NAM.
Nhiệm vụ: Phân tích ngữ nghĩa tự nhiên từ câu yêu cầu của phụ huynh/học sinh và trích xuất BỘ LỌC CẤU TRÚC JSON CHUẨN XÁC để hệ thống đối chiếu với hồ sơ gia sư.

CÂU YÊU CẦU CỦA NGƯỜI DÙNG:
""{userPrompt}""

QUY TẮC BÓC TÁCH THỰC THỂ (ENTITY EXTRACTION):
1. subjectName: Tên môn học chuẩn tiếng Việt có dấu (Toán, Vật Lý, Hóa Học, Tiếng Anh, Ngữ Văn, Sinh Học, Lịch Sử, Địa Lý, Tin Học). Nếu không nhắc đến môn cụ thể thì để null.
2. gradeLevel: Khối lớp tương ứng (VD: 'Lớp 12', 'Lớp 11', 'Lớp 10', 'Lớp 9', 'Lớp 8', 'Lớp 7', 'Lớp 6', 'Lớp 5', 'Đại học').
3. gender: 'Female' nếu yêu cầu nữ/cô giáo/chị gia sư; 'Male' nếu yêu cầu nam/thầy giáo/anh gia sư; null nếu không phân biệt.
4. teachingMode: 'Online' nếu ghi học online/qua mạng/Google Meet; 'Offline' nếu ghi học trực tiếp/tại nhà/offline; null nếu không chỉ định rõ.
5. preferredDays: Mảng các thứ trong tuần được nhắc tới, ví dụ [""2"", ""4"", ""6""] hoặc [""3"", ""5"", ""7""], [""CN""]. Nếu không nói thì để mảng rỗng [].
6. preferredTime: 'Morning' (sáng), 'Afternoon' (chiều), 'Evening' (tối), hoặc null.
7. minPrice / maxPrice: Giá tiền số nguyên (VNĐ). Ví dụ 'khoảng 180k/buổi' -> maxPrice: 180000; 'tầm 150k đến 250k' -> minPrice: 150000, maxPrice: 250000; 'dưới 200 nghìn' -> maxPrice: 200000.
8. keywords: Các từ khóa quan trọng về tính cách, mục tiêu (VD: [""ôn thi ĐH"", ""khối A1"", ""kiên nhẫn"", ""nhiệt tình"", ""lấy lại gốc"", ""IELTS""]).
9. explanation: Tóm tắt 1 câu ngắn gọn tiêu chí tìm kiếm vừa nhận diện.

VÍ DỤ HUẤN LUYỆN (FEW-SHOT EXAMPLES):
- Đầu vào: ""Cần tìm thầy giáo dạy Vật Lý 10 tại nhà khu vực Bình Thạnh tối 3 5 7 khoảng 200k/buổi""
- Trả về JSON:
  {{
    ""subjectName"": ""Vật Lý"",
    ""gradeLevel"": ""Lớp 10"",
    ""gender"": ""Male"",
    ""teachingMode"": ""Offline"",
    ""preferredDays"": [""3"", ""5"", ""7""],
    ""preferredTime"": ""Evening"",
    ""minPrice"": null,
    ""maxPrice"": 200000,
    ""keywords"": [""Vật Lý 10"", ""Bình Thạnh""],
    ""explanation"": ""Tìm gia sư nam dạy kèm Vật Lý lớp 10 tại nhà vào tối thứ 3, 5, 7 với học phí khoảng 200.000 VNĐ/buổi.""
  }}

BẮT BUỘC TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ (KHÔNG THÊM BẤT KỲ VĂN BẢN NGOÀI KHỐI JSON):
{{
  ""subjectName"": ""Toán"",
  ""gradeLevel"": ""Lớp 12"",
  ""gender"": ""Female"",
  ""teachingMode"": ""Online"",
  ""preferredDays"": [""2"", ""4"", ""6""],
  ""preferredTime"": ""Evening"",
  ""minPrice"": null,
  ""maxPrice"": 180000,
  ""keywords"": [""ôn thi ĐH"", ""khối A1"", ""kiên nhẫn""],
  ""explanation"": ""Tìm kiếm gia sư nữ dạy môn Toán lớp 12, hình thức Online vào tối thứ 2, 4, 6 với học phí tối đa 180.000 VNĐ.""
}}";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.1,
                maxOutputTokens = 8192,
                responseMimeType = "application/json"
            }
        };

        var responseJson = await CallGeminiApiAsync(payload, ct);
        if (string.IsNullOrWhiteSpace(responseJson)) return null;

        return CleanAndParseJson<GeminiNaturalSearchOutput>(responseJson);
    }

    private static string NormalizeImageMimeType(string? mimeType)
    {
        if (!string.IsNullOrWhiteSpace(mimeType) &&
            mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return mimeType.Trim();
        }
        return "image/jpeg";
    }

    private IEnumerable<string> ModelCandidates()
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var name in new[] { ModelName, "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-flash-latest" })
        {
            if (!string.IsNullOrWhiteSpace(name) && seen.Add(name))
                yield return name;
        }
    }

    private async Task<string?> CallGeminiApiAsync(object payload, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(ApiKey) || ApiKey.Contains("YOUR_GEMINI_API_KEY", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Chưa cấu hình Gemini:ApiKey.");
            return null;
        }

        var jsonContent = JsonSerializer.Serialize(payload);
        string? lastError = null;
        string? preferredError = null;

        foreach (var model in ModelCandidates())
        {
            for (var attempt = 1; attempt <= 2; attempt++)
            {
                var result = await SendOnceAsync(model, jsonContent, ct);
                if (result.Text != null) return result.Text;

                lastError = result.Error;
                if (result.Status is 429 or 503 or 0 && string.IsNullOrWhiteSpace(preferredError))
                    preferredError = result.Error;

                var retryable = result.Status is 0 or 404 or 429 or 503;
                if (!retryable)
                    throw new InvalidOperationException(result.Error);

                // Với 404 (model ngừng hỗ trợ) hoặc 429 (hết quota model này): chuyển ngay sang model dự phòng khác quota pool
                if (result.Status is 404 or 429)
                {
                    _logger.LogWarning("Gemini model {Model} lỗi {Status}, chuyển model dự phòng: {Error}", model, result.Status, result.Error);
                    break;
                }

                // Với 503 (quá tải tạm thời) hoặc lỗi mạng/timeout: thử lại 1 lần sau 1.5s rồi mới chuyển model
                if (result.Status is 503 or 0 && attempt == 1)
                {
                    await Task.Delay(1500, ct);
                    continue;
                }

                _logger.LogWarning("Gemini model {Model} lỗi {Status}: {Error}", model, result.Status, result.Error);
                break;
            }
        }

        throw new InvalidOperationException(preferredError ?? lastError ?? "Máy chủ Gemini đang bận. Hãy thử lại sau ít giây.");
    }

    private async Task<(string? Text, string Error, int Status)> SendOnceAsync(string model, string jsonContent, CancellationToken ct)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.TryAddWithoutValidation("x-goog-api-key", ApiKey);
        request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(25));
            var response = await _httpClient.SendAsync(request, timeout.Token);
            var body = await response.Content.ReadAsStringAsync(ct);
            var status = (int)response.StatusCode;
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Gemini API Error {StatusCode} model {Model}: {Body}", status, model, body);
                return (null, GeminiErrorMessage(status, body), status);
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            if (root.TryGetProperty("candidates", out var candidates) &&
                candidates.GetArrayLength() > 0 &&
                candidates[0].TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var parts))
            {
                var sb = new StringBuilder();
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var textEl))
                        sb.Append(textEl.GetString());
                }
                if (sb.Length > 0) return (sb.ToString(), "", status);
            }

            return (null, "Gemini không tạo được nội dung cho ảnh này.", status);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Gemini model {Model} quá 25 giây, chuyển model khác.", model);
            return (null, "Gemini phản hồi quá lâu.", 0);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Gemini model {Model} bị đứt kết nối.", model);
            return (null, "Kết nối tới Gemini bị đứt giữa chừng.", 0);
        }
    }

    private static string GeminiErrorMessage(int status, string body)
    {
        var detail = "";
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var message))
            {
                detail = message.GetString() ?? "";
            }
        }
        catch
        {
            detail = "";
        }

        if (detail.Length > 180) detail = detail.Substring(0, 180);
        if (status == 401 || status == 403)
            return string.IsNullOrWhiteSpace(detail)
                ? "Google từ chối API key."
                : $"Google từ chối API key: {detail}";
        if (status == 429)
            return string.IsNullOrWhiteSpace(detail)
                ? "API key Gemini đã chạm giới hạn miễn phí (429). Hãy chờ khoảng 1 phút hoặc kiểm tra hạn mức tại Google AI Studio."
                : $"API key Gemini đã chạm giới hạn miễn phí (429): {detail}";
        if (status == 503)
            return "Máy chủ Gemini đang quá tải tạm thời (503). Hãy bấm thử lại sau vài giây.";
        return string.IsNullOrWhiteSpace(detail)
            ? $"Gemini trả về lỗi {status}."
            : $"Gemini trả về lỗi {status}: {detail}";
    }

    private T? CleanAndParseJson<T>(string? rawText) where T : class
    {
        if (string.IsNullOrWhiteSpace(rawText)) return null;

        try
        {
            var text = rawText.Trim();
            // Xóa markdown code block ```json ... ``` nếu có
            if (text.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            {
                text = text.Substring(7);
            }
            else if (text.StartsWith("```"))
            {
                text = text.Substring(3);
            }

            if (text.EndsWith("```"))
            {
                text = text.Substring(0, text.Length - 3);
            }

            text = text.Trim();

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            // Một số model lite có thể bọc object JSON trong mảng 1 phần tử [ { ... } ]
            if (text.StartsWith("["))
            {
                using var doc = JsonDocument.Parse(text);
                if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                {
                    return JsonSerializer.Deserialize<T>(doc.RootElement[0].GetRawText(), options);
                }
            }

            return JsonSerializer.Deserialize<T>(text, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Không thể parse JSON từ Gemini output: {RawText}", rawText);
            return null;
        }
    }
}

public class GeminiDiagnosisOutput
{
    public string? SubjectName { get; set; }
    public string? GradeLevel { get; set; }
    public string? TopicName { get; set; }
    public string? TopicCode { get; set; }
    public string? Severity { get; set; }
    public string? OcrText { get; set; }
    public string? ProblemText { get; set; }
    public string? StudentSolutionText { get; set; }
    public string? CorrectSteps { get; set; }
    public string? IncorrectOrIncompleteSteps { get; set; }
    public string? ErrorCause { get; set; }
    public string? StudentMistake { get; set; }
    public string? AiSummary { get; set; }
    public string? GapDetail { get; set; }
    public string? StudyPlan { get; set; }
    public List<string>? RecommendedKeywords { get; set; }
}

public class GeminiNaturalSearchOutput
{
    public string? SubjectName { get; set; }
    public string? GradeLevel { get; set; }
    public string? Gender { get; set; }
    public string? TeachingMode { get; set; }
    public List<string>? PreferredDays { get; set; }
    public string? PreferredTime { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public List<string>? Keywords { get; set; }
    public string? Explanation { get; set; }
}
