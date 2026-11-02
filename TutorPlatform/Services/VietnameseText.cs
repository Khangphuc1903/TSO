using System.Globalization;
using System.Text;

namespace TutorPlatform.Services;

public static class VietnameseText
{
    public static string Fold(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var formD = value.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(formD.Length);
        foreach (var c in formD)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                continue;
            var ch = c is 'đ' or 'Đ' ? 'd' : c;
            sb.Append(char.ToLowerInvariant(ch));
        }
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    public static string PreferDisplayName(IEnumerable<string> names)
    {
        return names
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .OrderByDescending(AccentScore)
            .ThenByDescending(n => n.Length)
            .FirstOrDefault()
            ?? names.FirstOrDefault()
            ?? "";
    }

    public static string CanonicalEducationLevel(string? educationLevel)
    {
        var v = Fold(educationLevel);
        if (v.Contains("thcs") || v is "secondary") return "THCS";
        if (v.Contains("thpt") || v.Contains("high")) return "THPT";
        if (v.Contains("tieu") || v is "primary") return "Primary";
        return string.IsNullOrWhiteSpace(educationLevel) ? "" : educationLevel.Trim();
    }

    private static int AccentScore(string name)
        => name.Count(c => c > 127 || char.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark);
}
