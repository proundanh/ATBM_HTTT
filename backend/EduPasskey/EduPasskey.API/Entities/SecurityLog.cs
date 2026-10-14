using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Entities;

public enum SecurityEventType
{
    RegisterSuccess = 1,
    RegisterFailed = 2,
    LoginSuccess = 3,
    LoginFailed = 4,
    Logout = 5,
    StepUpSuccess = 6,
    StepUpFailed = 7,
    CredentialAdded = 8,
    CredentialRenamed = 9,
    CredentialRevoked = 10,
    ProfileUpdated = 11
}

[Table("SecurityLogs")]
[Index(nameof(UserId))]
[Index(nameof(Timestamp))]
[Index(nameof(EventType))]
public class SecurityLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [ForeignKey(nameof(User))]
    public Guid? UserId { get; set; }

    [MaxLength(50)]
    public string? StudentCodeAttempted { get; set; }

    public byte[]? CredentialId { get; set; }

    [MaxLength(100)]
    public string? DeviceName { get; set; }

    public SecurityEventType EventType { get; set; }

    public bool IsSuccess { get; set; }

    [MaxLength(255)]
    public string? FailureReason { get; set; }

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    public long? SignCountUsed { get; set; }

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    // Navigation property
    public virtual User? User { get; set; }
}
