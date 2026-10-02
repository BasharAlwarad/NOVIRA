using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Novira.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageAttachment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttachmentBlobName",
                table: "Messages",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentContentType",
                table: "Messages",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentFileName",
                table: "Messages",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachmentBlobName",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "AttachmentContentType",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "AttachmentFileName",
                table: "Messages");
        }
    }
}
