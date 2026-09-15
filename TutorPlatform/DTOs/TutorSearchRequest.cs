namespace TutorPlatform.DTOs
{
    public class TutorSearchRequest
    {
        public string? Keyword { get; set; }
        public int? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? MinExperience { get; set; }
        public int? MaxExperience { get; set; }
        public string? TeachingMode { get; set; }
        public string? VerificationStatus { get; set; }
        public bool IsPublishedOnly { get; set; } = true;
    }
}
