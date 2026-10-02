using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddIntakeProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IntakeProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    PhotoBlobName = table.Column<string>(type: "text", nullable: true),
                    PhotoContentType = table.Column<string>(type: "text", nullable: true),
                    DateOfBirth = table.Column<string>(type: "text", nullable: true),
                    Summary = table.Column<string>(type: "text", nullable: true),
                    ExperienceJson = table.Column<string>(type: "text", nullable: false),
                    EducationJson = table.Column<string>(type: "text", nullable: false),
                    TechnicalSkills = table.Column<string>(type: "text", nullable: true),
                    DrivingLicence = table.Column<bool>(type: "boolean", nullable: false),
                    Certifications = table.Column<string>(type: "text", nullable: true),
                    Hobbies = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IntakeProfiles_UserId",
                table: "IntakeProfiles",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IntakeProfiles");
        }
    }
}
