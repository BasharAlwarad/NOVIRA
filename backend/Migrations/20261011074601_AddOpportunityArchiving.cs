using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddOpportunityArchiving : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ArchiveReason",
                table: "Opportunities",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAt",
                table: "Opportunities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StaleCheckMissCount",
                table: "Opportunities",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "OpportunityPath",
                table: "MatchActivities",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "OpportunityProvider",
                table: "MatchActivities",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OpportunityTitle",
                table: "MatchActivities",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Backfill real existing rows from their still-accurate current
            // Opportunity data — found before this ever reached the real
            // database: EF's own generated defaults above would otherwise
            // silently leave every already-existing MatchActivity row (real
            // "applied to this" records from live testing) with an empty
            // title/provider and OpportunityPath defaulted to 0
            // (University), corrupting real data rather than genuinely
            // backfilling it. Safe to run here specifically because nothing
            // has been archived yet at migration time — Opportunities still
            // holds the real title/provider/path for everything referenced.
            migrationBuilder.Sql(
                """
                UPDATE "MatchActivities" ma
                SET "OpportunityTitle" = o."Title",
                    "OpportunityProvider" = o."Provider",
                    "OpportunityPath" = o."Path"
                FROM "Opportunities" o
                WHERE ma."OpportunityId" = o."Id";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArchiveReason",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "StaleCheckMissCount",
                table: "Opportunities");

            migrationBuilder.DropColumn(
                name: "OpportunityPath",
                table: "MatchActivities");

            migrationBuilder.DropColumn(
                name: "OpportunityProvider",
                table: "MatchActivities");

            migrationBuilder.DropColumn(
                name: "OpportunityTitle",
                table: "MatchActivities");
        }
    }
}
