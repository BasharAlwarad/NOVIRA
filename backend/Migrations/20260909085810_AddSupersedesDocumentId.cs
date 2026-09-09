using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSupersedesDocumentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SupersedesDocumentId",
                table: "UserDocuments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserDocuments_SupersedesDocumentId",
                table: "UserDocuments",
                column: "SupersedesDocumentId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserDocuments_UserDocuments_SupersedesDocumentId",
                table: "UserDocuments",
                column: "SupersedesDocumentId",
                principalTable: "UserDocuments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserDocuments_UserDocuments_SupersedesDocumentId",
                table: "UserDocuments");

            migrationBuilder.DropIndex(
                name: "IX_UserDocuments_SupersedesDocumentId",
                table: "UserDocuments");

            migrationBuilder.DropColumn(
                name: "SupersedesDocumentId",
                table: "UserDocuments");
        }
    }
}
