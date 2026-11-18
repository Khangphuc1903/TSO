using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.DTOs;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public class IdentityVerificationService
{
    public const int HoldHours = 24;
    public const int AutoApproveScore = 85;

    private readonly TutorPlatformDbContext _db;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public IdentityVerificationService(
        TutorPlatformDbContext db,
        IConfiguration config,
        IWebHostEnvironment env)
    {
        _db = db;
        _config = config;
        _env = env;
    }

    public object GetEkycConfig()
    {
        var tokenId = _config["VnptEkyc:TokenId"];
        var tokenKey = _config["VnptEkyc:TokenKey"];
        var accessToken = _config["VnptEkyc:AccessToken"];
        var configured = !string.IsNullOrWhiteSpace(tokenId)
            && !string.IsNullOrWhiteSpace(tokenKey)
            && !string.IsNullOrWhiteSpace(accessToken);
        return new
        {
            configured,
            message = configured
                ? "Sẵn sàng mở VNPT eKYC."
                : "Chưa có TokenId, TokenKey và AccessToken của VNPT trong appsettings (mục VnptEkyc).",
            backendUrl = (_config["VnptEkyc:BackendUrl"] ?? "https://api.idg.vnpt.vn").TrimEnd('/'),
            tokenId,
            tokenKey,
            authorization = StripBearer(accessToken),
            challengeCode = string.IsNullOrWhiteSpace(_config["VnptEkyc:ChallengeCode"])
                ? Guid.NewGuid().ToString("N")[..16]
                : _config["VnptEkyc:ChallengeCode"]
        };
    }

    private static string? StripBearer(string? value)
    {
        var text = (value ?? "").Trim();
        if (text.StartsWith("bearer ", StringComparison.OrdinalIgnoreCase))
            text = text[7..].Trim();
        return text;
    }

    public async Task<(bool Success, int Status, string Message, TutorIdentityStatusDto? Data)> ApplyVnptResultAsync(
        int tutorId, JsonElement result, CancellationToken ct)
    {
        var profile = await _db.TutorProfiles.Include(t => t.Tutor)
            .FirstOrDefaultAsync(t => t.TutorId == tutorId, ct);
        if (profile?.Tutor == null)
            return (false, 400, "Hồ sơ gia sư chưa có. Hãy lưu hồ sơ dạy học trước.", null);

        var ocr = Child(Child(result, "ocr"), "object");
        if (ocr.ValueKind != JsonValueKind.Object) ocr = Child(result, "ocr");
        var compare = Child(Child(result, "compare"), "object");
        var name = Text(ocr, "name");
        var idNumber = Digits(Text(ocr, "id"));
        var dob = ParseDob(Text(ocr, "birth_day"));
        var gender = Text(ocr, "gender");
        var address = Text(ocr, "recent_location");
        var msg = (Text(compare, "msg") ?? "").ToUpperInvariant();
        var score = NormalizeScore(Number(compare, "prob"));
        var fake = FakeCard(result, "liveness_card_front") || FakeCard(result, "liveness_card_back");
        var matched = !fake && score >= AutoApproveScore && msg is not ("NOMATCH" or "NOTHING")
            && idNumber.Length is 9 or 12 && !string.IsNullOrWhiteSpace(name);

        var doc = await LatestPendingAsync(tutorId, ct) ?? new IdentityDocument
        {
            TutorId = tutorId,
            IdCardFrontUrl = "",
            IdCardBackUrl = "",
            Status = "Pending",
            SubmittedAt = DateTime.UtcNow
        };
        if (doc.DocumentId == 0) _db.IdentityDocuments.Add(doc);
        doc.Status = "Pending";
        doc.SubmittedAt = DateTime.UtcNow;
        doc.ReviewedAt = null;
        doc.ReviewedBy = null;
        doc.RejectionReason = null;
        doc.IdCardFrontUrl = "";
        doc.IdCardBackUrl = "";
        foreach (var oldFace in doc.FaceVerificationLogs)
            oldFace.SelfieImageUrl = "";
        profile.VerificationStatus = "Pending";
        await _db.SaveChangesAsync(ct);
        DeleteFolder(doc.DocumentId);

        if (!string.IsNullOrWhiteSpace(name) || idNumber.Length > 0)
        {
            _db.OcrExtractionResults.Add(new OcrExtractionResult
            {
                DocumentId = doc.DocumentId,
                FullName = Clean(name, 150),
                IdNumber = idNumber.Length == 0 ? null : idNumber,
                DateOfBirth = dob,
                Address = Clean(address, 255),
                ExtractedAt = DateTime.UtcNow
            });
            ApplyOcrToUser(profile.Tutor, new CccdReadResult
            {
                FullName = name,
                Gender = gender,
                Address = address
            }, dob, idNumber);
        }

        var attempts = await _db.FaceVerificationLogs.CountAsync(f => f.DocumentId == doc.DocumentId, ct);
        _db.FaceVerificationLogs.Add(new FaceVerificationLog
        {
            TutorId = tutorId,
            DocumentId = doc.DocumentId,
            SelfieImageUrl = "",
            MatchConfidenceScore = score,
            IsMatch = matched,
            ApiProvider = "VNPT",
            AttemptNumber = attempts + 1,
            Status = matched ? "Passed" : "EscalatedToAdmin",
            CreatedAt = DateTime.UtcNow
        });

        string message;
        if (matched)
        {
            await ApproveAndPurgeAsync(doc, null, ct);
            message = "VNPT xác nhận khuôn mặt trùng CCCD. Ảnh không lưu trên hệ thống.";
        }
        else
        {
            await HoldVnptImagesAsync(doc, result, ct);
            await _db.SaveChangesAsync(ct);
            message = "VNPT chưa đủ chắc để tự duyệt. Admin đối chiếu trong 24 giờ, sau đó ảnh bị xóa.";
        }

        return (true, 200, message, await BuildStatusAsync(tutorId, message, ct));
    }

    public async Task<(bool Success, int Status, string Message, TutorIdentityStatusDto? Data)> SubmitManualReviewAsync(
        int tutorId,
        IFormFile? front,
        IFormFile? selfie,
        string? fullName,
        string? idNumber,
        string? dateOfBirth,
        string? gender,
        string? address,
        CancellationToken ct)
    {
        var profile = await _db.TutorProfiles.Include(t => t.Tutor)
            .FirstOrDefaultAsync(t => t.TutorId == tutorId, ct);
        if (profile?.Tutor == null)
            return (false, 400, "Hồ sơ gia sư chưa có. Hãy lưu hồ sơ dạy học trước.", null);

        var name = Clean(fullName, 150);
        var id = Digits(idNumber);
        if (string.IsNullOrWhiteSpace(name))
            return (false, 400, "Nhập họ tên trên căn cước.", null);
        if (id.Length is not (9 or 12))
            return (false, 400, "Số CCCD phải có 9 hoặc 12 chữ số.", null);
        if (!DateOnly.TryParseExact(dateOfBirth, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dob))
            return (false, 400, "Chọn ngày sinh.", null);

        byte[] frontBytes;
        string frontMime;
        byte[] faceBytes;
        string faceMime;
        try
        {
            (frontBytes, frontMime) = await ReadImageAsync(front, "mặt trước CCCD", ct);
            (faceBytes, faceMime) = await ReadImageAsync(selfie, "khuôn mặt đối chiếu", ct);
        }
        catch (InvalidOperationException ex)
        {
            return (false, 400, ex.Message, null);
        }

        var doc = await LatestPendingAsync(tutorId, ct) ?? new IdentityDocument
        {
            TutorId = tutorId,
            IdCardFrontUrl = "",
            IdCardBackUrl = "",
            Status = "Pending",
            SubmittedAt = DateTime.UtcNow
        };
        if (doc.DocumentId == 0) _db.IdentityDocuments.Add(doc);
        doc.Status = "Pending";
        doc.SubmittedAt = DateTime.UtcNow;
        doc.ReviewedAt = null;
        doc.ReviewedBy = null;
        doc.RejectionReason = null;
        profile.VerificationStatus = "Pending";
        await _db.SaveChangesAsync(ct);
        DeleteFolder(doc.DocumentId);

        doc.IdCardFrontUrl = await SaveFileAsync(doc.DocumentId, "front", frontBytes, frontMime, ct);
        doc.IdCardBackUrl = "";
        var selfieName = await SaveFileAsync(doc.DocumentId, "selfie", faceBytes, faceMime, ct);

        _db.OcrExtractionResults.Add(new OcrExtractionResult
        {
            DocumentId = doc.DocumentId,
            FullName = name,
            IdNumber = id,
            DateOfBirth = dob,
            Address = Clean(address, 255),
            ExtractedAt = DateTime.UtcNow
        });
        ApplyOcrToUser(profile.Tutor, new CccdReadResult
        {
            FullName = name,
            Gender = gender,
            Address = address
        }, dob, id);

        var attempts = await _db.FaceVerificationLogs.CountAsync(f => f.DocumentId == doc.DocumentId, ct);
        _db.FaceVerificationLogs.Add(new FaceVerificationLog
        {
            TutorId = tutorId,
            DocumentId = doc.DocumentId,
            SelfieImageUrl = selfieName,
            MatchConfidenceScore = 0,
            IsMatch = false,
            ApiProvider = "Manual",
            AttemptNumber = attempts + 1,
            Status = "EscalatedToAdmin",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);

        return (true, 200,
            "Đã gửi ảnh đối chiếu và thông tin. Admin xét trong 24 giờ, sau đó ảnh bị xóa.",
            await BuildStatusAsync(tutorId, "Chờ admin đối chiếu ảnh và thông tin.", ct));
    }

    public async Task<(bool Success, int Status, string Message, TutorIdentityStatusDto? Data)> UploadCardAsync(
        int tutorId, IFormFile? front, IFormFile? back, CancellationToken ct)
    {
        _ = tutorId;
        _ = front;
        _ = back;
        _ = ct;
        return (false, 400, "Quét CCCD dùng VNPT eKYC, không dùng Gemini.", null);
    }

    public async Task<(bool Success, int Status, string Message, TutorIdentityStatusDto? Data)> VerifyFaceAsync(
        int tutorId, IFormFile? selfie, CancellationToken ct)
    {
        _ = tutorId;
        _ = selfie;
        _ = ct;
        return (false, 400, "So khớp khuôn mặt dùng VNPT eKYC, không dùng Gemini.", null);
    }


    public async Task<TutorIdentityStatusDto> GetStatusAsync(int tutorId, CancellationToken ct)
    {
        await PurgeExpiredAsync(ct);
        return await BuildStatusAsync(tutorId, null, ct);
    }

    public async Task<List<AdminIdentityDto>> ListForAdminAsync(string? filter, CancellationToken ct)
    {
        await PurgeExpiredAsync(ct);
        var query = _db.IdentityDocuments
            .Include(d => d.Tutor).ThenInclude(t => t.Tutor)
            .Include(d => d.OcrExtractionResults)
            .Include(d => d.FaceVerificationLogs)
            .AsNoTracking();

        if (string.Equals(filter, "pending", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(filter, "low", StringComparison.OrdinalIgnoreCase))
            query = query.Where(d => d.Status == "Pending");
        else if (string.Equals(filter, "verified", StringComparison.OrdinalIgnoreCase))
            query = query.Where(d => d.Status == "Approved");

        var documents = await query.OrderByDescending(d => d.SubmittedAt).ToListAsync(ct);
        var tutorIds = documents.Select(d => d.TutorId).Distinct().ToList();
        var attempts = await _db.TutorTestAttempts.Include(a => a.Subject).AsNoTracking()
            .Where(a => tutorIds.Contains(a.TutorId))
            .OrderByDescending(a => a.SubmittedAt)
            .ToListAsync(ct);

        var rows = documents.Select(d =>
        {
            var face = d.FaceVerificationLogs.OrderByDescending(f => f.CreatedAt).FirstOrDefault();
            var ocr = d.OcrExtractionResults.OrderByDescending(o => o.ExtractedAt).FirstOrDefault();
            var score = face?.MatchConfidenceScore;
            var low = d.Status == "Pending" && (score == null || score < AutoApproveScore);
            var held = ImagesHeld(d);
            return new AdminIdentityDto
            {
                DocumentId = d.DocumentId,
                TutorId = d.TutorId,
                TutorName = d.Tutor?.Tutor?.FullName ?? $"Gia sư #{d.TutorId}",
                TutorEmail = d.Tutor?.Tutor?.Email,
                Status = d.Status,
                ProfileVerification = d.Tutor?.VerificationStatus,
                ImagesAvailable = held,
                HasFront = held && FileExists(d.DocumentId, d.IdCardFrontUrl),
                HasBack = held && FileExists(d.DocumentId, d.IdCardBackUrl),
                HasSelfie = held && face != null && FileExists(d.DocumentId, face.SelfieImageUrl),
                OcrName = ocr?.FullName,
                OcrIdNumber = ocr?.IdNumber,
                FaceStatus = face?.Status,
                FaceScore = score,
                LowConfidence = low,
                FaceMatch = face?.IsMatch == true,
                HoldExpiresAt = d.Status == "Pending" ? d.SubmittedAt.AddHours(HoldHours) : null,
                SubmittedAt = d.SubmittedAt,
                Tests = attempts.Where(a => a.TutorId == d.TutorId)
                    .GroupBy(a => new { a.SubjectId, a.GradeLevel, a.TestType })
                    .Select(g => g.First())
                    .Select(a => new AdminIdentityTestDto
                    {
                        SubjectName = a.Subject != null ? a.Subject.SubjectName : "Chung",
                        GradeLevel = a.GradeLevel,
                        ScorePercent = a.ScorePercent,
                        IsPassed = a.IsPassed
                    }).ToList()
            };
        });

        if (string.Equals(filter, "low", StringComparison.OrdinalIgnoreCase))
            rows = rows.Where(r => r.LowConfidence);
        return rows.ToList();
    }

    public async Task<(Stream Stream, string ContentType)?> OpenAdminImageAsync(int documentId, string side, CancellationToken ct)
    {
        await PurgeExpiredAsync(ct);
        var doc = await _db.IdentityDocuments
            .Include(d => d.FaceVerificationLogs)
            .FirstOrDefaultAsync(d => d.DocumentId == documentId, ct);
        if (doc == null || !ImagesHeld(doc)) return null;

        var name = side.ToLowerInvariant() switch
        {
            "front" => doc.IdCardFrontUrl,
            "back" => doc.IdCardBackUrl,
            "selfie" => doc.FaceVerificationLogs.OrderByDescending(f => f.CreatedAt).Select(f => f.SelfieImageUrl).FirstOrDefault(),
            _ => null
        };
        if (!IsSafeFileName(name)) return null;
        var path = FilePath(doc.DocumentId, name!);
        if (!File.Exists(path)) return null;
        return (File.OpenRead(path), MimeOf(name!));
    }

    public async Task<(bool Success, string Message)> ReviewAsync(int documentId, int adminId, bool approve, string? reason, CancellationToken ct)
    {
        var doc = await _db.IdentityDocuments.Include(d => d.Tutor).ThenInclude(t => t.Tutor)
            .Include(d => d.FaceVerificationLogs)
            .FirstOrDefaultAsync(d => d.DocumentId == documentId, ct);
        if (doc == null) return (false, "Không tìm thấy hồ sơ CCCD.");
        if (doc.Status != "Pending" || !ImagesHeld(doc))
            return (false, "Hồ sơ này đã xử lý hoặc ảnh CCCD đã bị xóa.");

        if (approve)
            await ApproveAndPurgeAsync(doc, adminId, ct);
        else
        {
            doc.Status = "Rejected";
            doc.RejectionReason = string.IsNullOrWhiteSpace(reason) ? "Admin từ chối sau rà soát" : reason.Trim();
            doc.ReviewedBy = adminId > 0 ? adminId : null;
            doc.ReviewedAt = DateTime.UtcNow;
            if (doc.Tutor != null) doc.Tutor.VerificationStatus = "Rejected";
            PurgeFiles(doc);
            await _db.SaveChangesAsync(ct);
        }

        if (adminId > 0)
        {
            _db.AdminActionLogs.Add(new AdminActionLog
            {
                AdminId = adminId,
                ActionType = approve ? "ApproveIdentity" : "RejectIdentity",
                TargetEntityType = "IdentityDocument",
                TargetEntityId = documentId,
                Description = approve
                    ? $"Duyệt CCCD #{documentId} và đã xóa ảnh."
                    : $"Từ chối CCCD #{documentId} và đã xóa ảnh. {doc.RejectionReason}",
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }

        return (true, approve
            ? "Đã duyệt CCCD. Ảnh đã bị xóa, không còn xem được."
            : "Đã từ chối CCCD và xóa ảnh.");
    }

    public async Task PurgeExpiredAsync(CancellationToken ct)
    {
        var cutoff = DateTime.UtcNow.AddHours(-HoldHours);
        var expired = await _db.IdentityDocuments
            .Include(d => d.FaceVerificationLogs)
            .Where(d => d.Status == "Pending" && d.SubmittedAt <= cutoff)
            .ToListAsync(ct);
        if (expired.Count == 0) return;

        foreach (var doc in expired)
        {
            doc.Status = "Expired";
            doc.RejectionReason = "Quá 24 giờ chưa được duyệt, ảnh CCCD đã bị xóa.";
            doc.ReviewedAt = DateTime.UtcNow;
            PurgeFiles(doc);
        }
        await _db.SaveChangesAsync(ct);
    }

    private async Task ApproveAndPurgeAsync(IdentityDocument doc, int? adminId, CancellationToken ct)
    {
        doc.Status = "Approved";
        doc.RejectionReason = null;
        doc.ReviewedBy = adminId;
        doc.ReviewedAt = DateTime.UtcNow;
        if (doc.Tutor != null) doc.Tutor.VerificationStatus = "Verified";
        PurgeFiles(doc);
        await _db.SaveChangesAsync(ct);
    }

    private void PurgeFiles(IdentityDocument doc)
    {
        DeleteFolder(doc.DocumentId);
        doc.IdCardFrontUrl = "";
        doc.IdCardBackUrl = "";
        foreach (var face in doc.FaceVerificationLogs)
            face.SelfieImageUrl = "";
    }

    private async Task<TutorIdentityStatusDto> BuildStatusAsync(int tutorId, string? ocrMessage, CancellationToken ct)
    {
        var profile = await _db.TutorProfiles.Include(t => t.Tutor).AsNoTracking()
            .FirstOrDefaultAsync(t => t.TutorId == tutorId, ct);
        var doc = await _db.IdentityDocuments.AsNoTracking()
            .Where(d => d.TutorId == tutorId)
            .OrderByDescending(d => d.SubmittedAt)
            .FirstOrDefaultAsync(ct);
        OcrExtractionResult? ocr = null;
        FaceVerificationLog? face = null;
        if (doc != null)
        {
            ocr = await _db.OcrExtractionResults.AsNoTracking()
                .Where(o => o.DocumentId == doc.DocumentId)
                .OrderByDescending(o => o.ExtractedAt)
                .FirstOrDefaultAsync(ct);
            face = await _db.FaceVerificationLogs.AsNoTracking()
                .Where(f => f.DocumentId == doc.DocumentId)
                .OrderByDescending(f => f.CreatedAt)
                .FirstOrDefaultAsync(ct);
        }

        var user = profile?.Tutor;
        var held = doc != null && ImagesHeld(doc);
        return new TutorIdentityStatusDto
        {
            FullName = ocr?.FullName ?? user?.FullName,
            Gender = user?.Gender,
            DateOfBirth = (ocr?.DateOfBirth ?? user?.DateOfBirth)?.ToString("yyyy-MM-dd"),
            IdNumber = ocr?.IdNumber,
            Address = ocr?.Address ?? user?.Address,
            OriginLocation = ocr?.Address ?? user?.Address,
            Status = doc?.Status,
            IdentityCompleted = profile?.VerificationStatus == "Verified" && doc?.Status == "Approved",
            OcrFilled = !string.IsNullOrWhiteSpace(ocr?.IdNumber),
            OcrMessage = ocrMessage,
            FaceMatchPercent = face?.MatchConfidenceScore,
            ImagesHeldForAdmin = held,
            HoldExpiresAt = held ? doc!.SubmittedAt.AddHours(HoldHours) : null
        };
    }

    private async Task<IdentityDocument?> LatestPendingAsync(int tutorId, CancellationToken ct)
    {
        return await _db.IdentityDocuments
            .Include(d => d.FaceVerificationLogs)
            .Include(d => d.Tutor)
            .Where(d => d.TutorId == tutorId && d.Status == "Pending")
            .OrderByDescending(d => d.SubmittedAt)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<bool> OcrLooksValidAsync(int documentId, CancellationToken ct)
    {
        var ocr = await _db.OcrExtractionResults.AsNoTracking()
            .Where(o => o.DocumentId == documentId)
            .OrderByDescending(o => o.ExtractedAt)
            .FirstOrDefaultAsync(ct);
        var id = Digits(ocr?.IdNumber);
        return id.Length is 9 or 12 && !string.IsNullOrWhiteSpace(ocr?.FullName);
    }

    private static void ApplyOcrToUser(User user, CccdReadResult read, DateOnly? dob, string idNumber)
    {
        var name = Clean(read.FullName, 150);
        if (!string.IsNullOrWhiteSpace(name)) user.FullName = name;
        if (dob.HasValue) user.DateOfBirth = dob;
        var address = Clean(read.Address, 255);
        if (!string.IsNullOrWhiteSpace(address)) user.Address = address;
        var gender = (read.Gender ?? "").Trim().ToLowerInvariant();
        if (gender.Contains("nữ") || gender.Contains("nu") || gender == "female") user.Gender = "Female";
        else if (gender.Contains("nam") || gender == "male") user.Gender = "Male";
        _ = idNumber;
    }

    private async Task<(byte[] Bytes, string Mime)> ReadImageAsync(IFormFile? file, string label, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            throw new InvalidOperationException($"Chọn ảnh {label}.");
        if (file.Length > 4 * 1024 * 1024)
            throw new InvalidOperationException($"Ảnh {label} tối đa 4MB.");
        var mime = (file.ContentType ?? "").ToLowerInvariant();
        if (mime == "image/jpg") mime = "image/jpeg";
        if (mime is not ("image/jpeg" or "image/png" or "image/webp"))
        {
            mime = Path.GetExtension(file.FileName).ToLowerInvariant() switch
            {
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".jpg" or ".jpeg" => "image/jpeg",
                _ => ""
            };
        }
        if (mime is not ("image/jpeg" or "image/png" or "image/webp"))
            throw new InvalidOperationException($"Ảnh {label} chỉ nhận JPG, PNG hoặc WEBP.");
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        return (ms.ToArray(), mime);
    }

    private async Task<string> SaveFileAsync(int documentId, string stem, byte[] bytes, string mime, CancellationToken ct)
    {
        var ext = mime switch
        {
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => ".jpg"
        };
        var name = stem + ext;
        var dir = Folder(documentId);
        Directory.CreateDirectory(dir);
        await File.WriteAllBytesAsync(Path.Combine(dir, name), bytes, ct);
        return name;
    }

    private bool ImagesHeld(IdentityDocument doc)
    {
        return doc.Status == "Pending"
            && doc.SubmittedAt.AddHours(HoldHours) > DateTime.UtcNow
            && IsSafeFileName(doc.IdCardFrontUrl);
    }

    private bool FileExists(int documentId, string? name)
    {
        return IsSafeFileName(name) && File.Exists(FilePath(documentId, name!));
    }

    private string Folder(int documentId) =>
        Path.Combine(_env.ContentRootPath, "App_Data", "identity-hold", documentId.ToString());

    private string FilePath(int documentId, string name) => Path.Combine(Folder(documentId), name);

    private void DeleteFolder(int documentId)
    {
        var dir = Folder(documentId);
        if (Directory.Exists(dir)) Directory.Delete(dir, true);
    }

    private static bool IsSafeFileName(string? name)
    {
        return !string.IsNullOrWhiteSpace(name)
            && name.IndexOfAny(new[] { '/', '\\', ':' }) < 0
            && !name.Contains("..");
    }

    private static string MimeOf(string name)
    {
        if (name.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) return "image/png";
        if (name.EndsWith(".webp", StringComparison.OrdinalIgnoreCase)) return "image/webp";
        return "image/jpeg";
    }

    private async Task HoldVnptImagesAsync(IdentityDocument doc, JsonElement result, CancellationToken ct)
    {
        var docs = Child(result, "base64_doc_img");
        var faces = Child(result, "base64_face_img");
        var front = DecodeImage(Text(docs, "img_front"));
        var back = DecodeImage(Text(docs, "img_back"));
        var face = DecodeImage(Text(faces, "img_face_near")) ?? DecodeImage(Text(faces, "img_face_far"));
        if (front != null)
            doc.IdCardFrontUrl = await SaveFileAsync(doc.DocumentId, "front", front.Value.Bytes, front.Value.Mime, ct);
        if (back != null)
            doc.IdCardBackUrl = await SaveFileAsync(doc.DocumentId, "back", back.Value.Bytes, back.Value.Mime, ct);
        if (face != null)
        {
            var name = await SaveFileAsync(doc.DocumentId, "selfie", face.Value.Bytes, face.Value.Mime, ct);
            var log = doc.FaceVerificationLogs.OrderByDescending(f => f.CreatedAt).FirstOrDefault()
                ?? _db.FaceVerificationLogs.Local.LastOrDefault(f => f.DocumentId == doc.DocumentId);
            if (log != null) log.SelfieImageUrl = name;
        }
    }

    private static (byte[] Bytes, string Mime)? DecodeImage(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var text = value.Trim();
        var mime = "image/jpeg";
        var comma = text.IndexOf(',');
        if (text.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma > 0)
        {
            var header = text.Substring(5, comma - 5);
            var semi = header.IndexOf(';');
            mime = semi > 0 ? header.Substring(0, semi) : header;
            text = text[(comma + 1)..];
        }
        try
        {
            var bytes = Convert.FromBase64String(text);
            return bytes.Length == 0 ? null : (bytes, mime);
        }
        catch
        {
            return null;
        }
    }

    private static JsonElement Child(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object) return default;
        foreach (var prop in element.EnumerateObject())
            if (string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                return prop.Value;
        return default;
    }

    private static string? Text(JsonElement element, string name)
    {
        var child = Child(element, name);
        return child.ValueKind == JsonValueKind.String ? child.GetString() : null;
    }

    private static double Number(JsonElement element, string name)
    {
        var child = Child(element, name);
        if (child.ValueKind == JsonValueKind.Number && child.TryGetDouble(out var n)) return n;
        if (child.ValueKind == JsonValueKind.String && double.TryParse(child.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out n))
            return n;
        return 0;
    }

    private static decimal NormalizeScore(double score)
    {
        if (score > 0 && score <= 1) score *= 100;
        return (decimal)Math.Clamp(score, 0, 100);
    }

    private static bool FakeCard(JsonElement result, string name)
    {
        var card = Child(Child(result, name), "object");
        return Bool(card, "fake_liveness") || Bool(card, "fake_print_photo") || Bool(card, "face_swapping");
    }

    private static bool Bool(JsonElement element, string name)
    {
        var child = Child(element, name);
        return child.ValueKind == JsonValueKind.True
            || (child.ValueKind == JsonValueKind.String && string.Equals(child.GetString(), "true", StringComparison.OrdinalIgnoreCase));
    }

    private static string Digits(string? value) =>
        Regex.Replace(value ?? "", @"\D", "");

    private static string? Clean(string? value, int max)
    {
        var text = (value ?? "").Trim();
        if (text.Length == 0) return null;
        return text.Length <= max ? text : text.Substring(0, max);
    }

    private static DateOnly? ParseDob(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var formats = new[] { "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy" };
        if (DateOnly.TryParseExact(value.Trim(), formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return date;
        return null;
    }

}

public class IdentityImagePurgeService : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<IdentityImagePurgeService> _logger;

    public IdentityImagePurgeService(IServiceScopeFactory scopes, ILogger<IdentityImagePurgeService> logger)
    {
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopes.CreateScope();
                var identity = scope.ServiceProvider.GetRequiredService<IdentityVerificationService>();
                await identity.PurgeExpiredAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không xóa được ảnh CCCD hết hạn.");
            }

            await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
        }
    }
}
