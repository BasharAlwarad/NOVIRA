using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddVerifiedProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "VerifiedDataUpdatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedDateOfBirth",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerifiedEnglishLevel",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedFieldOfStudy",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedFullName",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerifiedGermanLevel",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerifiedHighestEducation",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedNationality",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedPassportExpiryDate",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedPassportNumber",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerifiedPassportStatus",
                table: "Users",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VerifiedDataUpdatedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedDateOfBirth",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedEnglishLevel",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedFieldOfStudy",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedFullName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedGermanLevel",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedHighestEducation",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedNationality",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedPassportExpiryDate",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedPassportNumber",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "VerifiedPassportStatus",
                table: "Users");
        }
    }
}
