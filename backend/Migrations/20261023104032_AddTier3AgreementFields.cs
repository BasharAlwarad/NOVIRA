using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTier3AgreementFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AgreementSentAt",
                table: "Tier3Cases",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AgreementText",
                table: "Tier3Cases",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SignedAt",
                table: "Tier3Cases",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignedFullName",
                table: "Tier3Cases",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignerIp",
                table: "Tier3Cases",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UpfrontAmountEur",
                table: "Tier3Cases",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AgreementSentAt",
                table: "Tier3Cases");

            migrationBuilder.DropColumn(
                name: "AgreementText",
                table: "Tier3Cases");

            migrationBuilder.DropColumn(
                name: "SignedAt",
                table: "Tier3Cases");

            migrationBuilder.DropColumn(
                name: "SignedFullName",
                table: "Tier3Cases");

            migrationBuilder.DropColumn(
                name: "SignerIp",
                table: "Tier3Cases");

            migrationBuilder.DropColumn(
                name: "UpfrontAmountEur",
                table: "Tier3Cases");
        }
    }
}
