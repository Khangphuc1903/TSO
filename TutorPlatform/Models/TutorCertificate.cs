using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class TutorCertificate
{
    public int CertificateId { get; set; }

    public int TutorId { get; set; }

    public string CertificateName { get; set; } = null!;

    public string FileUrl { get; set; } = null!;

    public string? IssuedBy { get; set; }

    public DateOnly? IssuedDate { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual TutorProfile Tutor { get; set; } = null!;
}
