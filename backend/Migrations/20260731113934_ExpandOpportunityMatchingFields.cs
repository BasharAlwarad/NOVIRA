using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class ExpandOpportunityMatchingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "ApplicationDeadline",
                table: "Opportunities",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinEducationLevel",
                table: "Opportunities",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MonthlyCompensationEur",
                table: "Opportunities",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OccupationField",
                table: "Opportunities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RequiredEnglishLevel",
                table: "Opportunities",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RequiredGermanLevel",
                table: "Opportunities",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresCertifiedLanguageProof",
                table: "Opportunities",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "Opportunities",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SourceRef",
                table: "Opportunities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "StartDate",
                table: "Opportunities",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TuitionFeeEur",
                table: "Opportunities",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApplicationDeadline",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "MinEducationLevel",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "MonthlyCompensationEur",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "OccupationField",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "RequiredEnglishLevel",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "RequiredGermanLevel",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "RequiresCertifiedLanguageProof",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "SourceRef",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "TuitionFeeEur",
                table: "Opportunities");
        }
    }
}
