using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPasskey.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceNameToSecurityLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeviceName",
                table: "SecurityLogs",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeviceName",
                table: "SecurityLogs");
        }
    }
}
