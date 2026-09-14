using System;
using System.Collections.Generic;

namespace TutorPlatform.Model;

public partial class PlatformSetting
{
    public string SettingKey { get; set; } = null!;

    public string SettingValue { get; set; } = null!;

    public string? Description { get; set; }

    public DateTime UpdatedAt { get; set; }
}
