using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Age",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DesiredPath",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EnglishLevel",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FinancialSituation",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GermanLevel",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int[]>(
                name: "GermanyConnection",
                table: "Users",
                type: "integer[]",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HighestEducation",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LanguageCertificate",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OccupationField",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PassportStatus",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProfileUpdatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RegionFlexibility",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StartTimeline",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WorkExperience",
                table: "Users",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Age",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DesiredPath",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "EnglishLevel",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FinancialSituation",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "GermanLevel",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "GermanyConnection",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "HighestEducation",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LanguageCertificate",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OccupationField",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PassportStatus",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfileUpdatedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RegionFlexibility",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "StartTimeline",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WorkExperience",
                table: "Users");
        }
    }
}
