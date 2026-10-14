using EduPasskey.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<StoredCredential> StoredCredentials => Set<StoredCredential>();
    public DbSet<SecurityLog> SecurityLogs => Set<SecurityLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Cấu hình quan hệ 1-1 giữa User và StudentProfile
        modelBuilder.Entity<User>()
            .HasOne(u => u.StudentProfile)
            .WithOne(p => p.User)
            .HasForeignKey<StudentProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Cấu hình quan hệ 1-n giữa User và StoredCredential
        modelBuilder.Entity<User>()
            .HasMany(u => u.StoredCredentials)
            .WithOne(c => c.User)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Cấu hình quan hệ 1-n giữa User và SecurityLog (UserId nullable, SetNull khi xóa User)
        modelBuilder.Entity<User>()
            .HasMany(u => u.SecurityLogs)
            .WithOne(l => l.User)
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
