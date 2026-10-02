using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCvGeneration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConversationJson",
                table: "CvRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoverLetterContentJson",
                table: "CvRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CvContentJson",
                table: "CvRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReferenceExample",
                table: "CvRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastGeneratedAt",
                table: "CvRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RevisionCount",
                table: "CvRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "CvReferenceSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GuideText = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CvReferenceSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CvReferenceSettings");

            migrationBuilder.DropColumn(
                name: "ConversationJson",
                table: "CvRequests");

            migrationBuilder.DropColumn(
                name: "CoverLetterContentJson",
                table: "CvRequests");

            migrationBuilder.DropColumn(
                name: "CvContentJson",
                table: "CvRequests");

            migrationBuilder.DropColumn(
                name: "IsReferenceExample",
                table: "CvRequests");

            migrationBuilder.DropColumn(
                name: "LastGeneratedAt",
                table: "CvRequests");

            migrationBuilder.DropColumn(
                name: "RevisionCount",
                table: "CvRequests");
        }
    }
}
