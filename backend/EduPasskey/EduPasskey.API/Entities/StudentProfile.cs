using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EduPasskey.API.Entities;

[Table("StudentProfiles")]
public class StudentProfile
{
    [Key]
    [ForeignKey(nameof(User))]
    public Guid UserId { get; set; }

    [MaxLength(50)]
    public string? Class { get; set; }

    [MaxLength(100)]
    public string? Major { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    /// <summary>
    /// Số tài khoản học bổng dùng demo xác thực bước bổ sung (Step-up authentication)
    /// </summary>
    [MaxLength(50)]
    public string? ScholarshipAccount { get; set; }

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation property (1-1 với Users)
    public virtual User User { get; set; } = null!;
}
