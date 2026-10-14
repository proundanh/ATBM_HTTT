using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Entities;

[Table("StoredCredentials")]
[Index(nameof(CredentialId), IsUnique = true)]
[Index(nameof(UserId))]
public class StoredCredential
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [ForeignKey(nameof(User))]
    public Guid UserId { get; set; }

    /// <summary>
    /// Credential ID do WebAuthn Authenticator sinh ra (unique, byte array)
    /// </summary>
    [Required]
    public byte[] CredentialId { get; set; } = null!;

    /// <summary>
    /// Khóa công khai theo chuẩn COSE format
    /// </summary>
    [Required]
    public byte[] PublicKey { get; set; } = null!;

    /// <summary>
    /// Bộ đếm chữ ký dùng kiểm tra phát hiện cloned authenticator
    /// </summary>
    public long SignatureCounter { get; set; }

    /// <summary>
    /// Authenticator Attestation GUID định danh dòng/loại thiết bị
    /// </summary>
    public Guid? AaGuid { get; set; }

    /// <summary>
    /// Danh sách transport hỗ trợ (ví dụ: ["internal", "hybrid"])
    /// </summary>
    [MaxLength(255)]
    public string? Transports { get; set; }

    public bool BackupEligible { get; set; }

    public bool BackupState { get; set; }

    [MaxLength(100)]
    public string? DeviceName { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? LastUsedAt { get; set; }

    /// <summary>
    /// Thời điểm thu hồi thiết bị (soft-delete). Null nếu còn hiệu lực.
    /// </summary>
    public DateTimeOffset? RevokedAt { get; set; }

    /// <summary>
    /// Optimistic concurrency token tự động trong PostgreSQL (ánh xạ hệ thống xmin)
    /// </summary>
    [Timestamp]
    public uint RowVersion { get; set; }

    // Navigation property
    public virtual User User { get; set; } = null!;
}
