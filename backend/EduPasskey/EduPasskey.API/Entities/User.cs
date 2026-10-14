using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Entities;

public enum UserRole
{
    Student = 0,
    Admin = 1
}

[Table("Users")]
[Index(nameof(WebAuthnUserId), IsUnique = true)]
[Index(nameof(StudentCode), IsUnique = true)]
[Index(nameof(Email), IsUnique = true)]
public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// WebAuthn User Handle ngẫu nhiên (16-64 bytes, không chứa thông tin cá nhân như MSSV/Email)
    /// </summary>
    [Required]
    [MaxLength(64)]
    public byte[] WebAuthnUserId { get; set; } = null!;

    /// <summary>
    /// Mã số sinh viên (chuẩn hóa chữ in hoa, unique)
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string StudentCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Student;

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public virtual StudentProfile? StudentProfile { get; set; }

    public virtual ICollection<StoredCredential> StoredCredentials { get; set; } = new List<StoredCredential>();

    public virtual ICollection<SecurityLog> SecurityLogs { get; set; } = new List<SecurityLog>();
}
