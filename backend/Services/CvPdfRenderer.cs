using Novira.Backend.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Novira.Backend.Services;

// Deterministic PDF rendering for the AI-drafted CV/cover-letter content
// (Architecture.md's "Tier 2 services" build order, the PDF-rendering piece
// of step 5). Deliberately a pure function over CvDraftContent/
// CoverLetterDraftContent — Claude only ever drafts structured content
// (CvGenerationService); this is the separate, deterministic template that
// turns it into an actual document, so a revision is always a reliable
// content edit, never a layout risk. Reusable outside CvRequest entirely
// (e.g. a future free-tier preview), since it takes no dependency on it.
//
// One shared template, not a picker — researched before building
// (Architecture.md's "Tier 2 services" PDF section has the full findings):
// German employers are calibrated to a standardized, DIN-5008-influenced
// Lebenslauf format (tabular, reverse-chronological, dates in a left
// column), and multiple independent sources describe deviating from it as
// something that can quietly work against a candidate — the opposite of
// what a "creative template picker" would be worth here.
public static class CvPdfRenderer
{
    public static byte[] RenderCv(CvDraftContent cv, byte[]? photoBytes)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Black));

                page.Content().Column(column =>
                {
                    column.Spacing(10);

                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Column(headerColumn =>
                        {
                            headerColumn.Item().Text(cv.FullName).FontSize(18).Bold();

                            var contactParts = new List<string>();
                            if (!string.IsNullOrWhiteSpace(cv.Address)) contactParts.Add(cv.Address!);
                            if (!string.IsNullOrWhiteSpace(cv.Phone)) contactParts.Add(cv.Phone!);
                            if (!string.IsNullOrWhiteSpace(cv.DateOfBirth)) contactParts.Add($"Born {cv.DateOfBirth}");

                            if (contactParts.Count > 0)
                            {
                                headerColumn.Item().Text(string.Join("  ·  ", contactParts))
                                    .FontSize(9).FontColor(Colors.Grey.Darken2);
                            }
                        });

                        // Photo — only when the intake profile actually has
                        // one; never a placeholder box, same "optional,
                        // never required" discipline as everywhere else a
                        // photo is handled in this app.
                        if (photoBytes is not null)
                        {
                            row.ConstantItem(70).Height(90).Image(photoBytes).FitArea();
                        }
                    });

                    if (!string.IsNullOrWhiteSpace(cv.Summary))
                    {
                        column.Item().Text(cv.Summary).FontSize(10).LineHeight(1.3f);
                    }

                    if (cv.Experience.Count > 0)
                    {
                        AddSectionHeading(column, "Berufserfahrung / Experience");

                        foreach (var entry in cv.Experience)
                        {
                            column.Item().Row(row =>
                            {
                                row.ConstantItem(90).Text(entry.DateRange ?? "")
                                    .FontSize(9).FontColor(Colors.Grey.Darken2);

                                row.RelativeItem().Column(entryColumn =>
                                {
                                    entryColumn.Item().Text($"{entry.Title}, {entry.Employer}").Bold().FontSize(10);
                                    foreach (var bullet in entry.Bullets)
                                    {
                                        entryColumn.Item().Text($"•  {bullet}").FontSize(9);
                                    }
                                });
                            });
                        }
                    }

                    if (cv.Education.Count > 0)
                    {
                        AddSectionHeading(column, "Ausbildung / Education");

                        foreach (var entry in cv.Education)
                        {
                            column.Item().Row(row =>
                            {
                                row.ConstantItem(90).Text(entry.DateRange ?? "")
                                    .FontSize(9).FontColor(Colors.Grey.Darken2);
                                row.RelativeItem().Text($"{entry.Qualification}, {entry.Institution}").FontSize(10);
                            });
                        }
                    }

                    var hasSkillsSection = !string.IsNullOrWhiteSpace(cv.Skills)
                        || !string.IsNullOrWhiteSpace(cv.Languages)
                        || !string.IsNullOrWhiteSpace(cv.Certifications);

                    if (hasSkillsSection)
                    {
                        AddSectionHeading(column, "Kenntnisse und Fähigkeiten / Skills");

                        if (!string.IsNullOrWhiteSpace(cv.Languages))
                        {
                            column.Item().Text(t =>
                            {
                                t.Span("Languages: ").Bold().FontSize(9);
                                t.Span(cv.Languages).FontSize(9);
                            });
                        }
                        if (!string.IsNullOrWhiteSpace(cv.Skills))
                        {
                            column.Item().Text(t =>
                            {
                                t.Span("Skills: ").Bold().FontSize(9);
                                t.Span(cv.Skills).FontSize(9);
                            });
                        }
                        if (!string.IsNullOrWhiteSpace(cv.Certifications))
                        {
                            column.Item().Text(t =>
                            {
                                t.Span("Certifications: ").Bold().FontSize(9);
                                t.Span(cv.Certifications).FontSize(9);
                            });
                        }
                    }
                });
            });
        }).GeneratePdf();
    }

    public static byte[] RenderCoverLetter(CoverLetterDraftContent letter)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(11));

                page.Content().Column(column =>
                {
                    column.Spacing(14);

                    column.Item().AlignRight().Text(DateTime.UtcNow.ToString("dd.MM.yyyy")).FontSize(10);
                    column.Item().Text(letter.RecipientLine).Bold();

                    foreach (var paragraph in letter.Paragraphs)
                    {
                        column.Item().Text(paragraph).LineHeight(1.35f);
                    }

                    column.Item().PaddingTop(8).Text(letter.ClosingLine);
                });
            });
        }).GeneratePdf();
    }

    private static void AddSectionHeading(ColumnDescriptor column, string text)
    {
        column.Item().PaddingTop(4).Text(text).Bold().FontSize(11);
        column.Item().PaddingBottom(2).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
    }
}
