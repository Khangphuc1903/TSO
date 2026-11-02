namespace TutorPlatform.Services;

public static class ChatAttachmentStore
{
    public const long MaxBytes = 8 * 1024 * 1024;

    private static readonly HashSet<string> ImageExt = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    private static readonly HashSet<string> FileExt = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
        ".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip"
    };

    public static async Task<(string Url, string Type)> SaveAsync(
        IWebHostEnvironment environment,
        IFormFile file,
        string folder,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            throw new InvalidOperationException("Chưa chọn tệp.");
        if (file.Length > MaxBytes)
            throw new InvalidOperationException("Tệp không được vượt quá 8 MB.");

        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(ext) || !FileExt.Contains(ext))
            throw new InvalidOperationException("Định dạng tệp không được hỗ trợ.");

        var directory = Path.Combine(
            environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"),
            "uploads",
            folder);
        Directory.CreateDirectory(directory);
        var safeExt = ext.ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{safeExt}";
        var fullPath = Path.Combine(directory, fileName);
        await using (var stream = File.Create(fullPath))
            await file.CopyToAsync(stream, cancellationToken);

        var type = ImageExt.Contains(safeExt) ? "image" : "file";
        return ($"/uploads/{folder}/{fileName}", type);
    }

    public static string PreviewText(string? content, string? attachmentType)
    {
        if (!string.IsNullOrWhiteSpace(content) &&
            content is not "[Hình ảnh]" and not "[Tệp đính kèm]")
            return content;
        return attachmentType == "image" ? "Đã gửi ảnh" : attachmentType == "file" ? "Đã gửi tệp" : content ?? "";
    }

    public static string FallbackContent(string? content, string? attachmentType)
    {
        if (!string.IsNullOrWhiteSpace(content)) return content.Trim();
        return attachmentType == "image" ? "[Hình ảnh]" : "[Tệp đính kèm]";
    }
}
