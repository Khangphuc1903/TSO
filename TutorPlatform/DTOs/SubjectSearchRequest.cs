namespace TutorPlatform.DTOs
{
    public class SubjectSearchRequest
    {
        public string? Keyword { get; set; }
        public string? EducationLevel { get; set; }
        public bool OnlyActive { get; set; } = true;
    }
}
