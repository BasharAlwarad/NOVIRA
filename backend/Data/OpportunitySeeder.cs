using Microsoft.EntityFrameworkCore;
using Novira.Backend.Models;

namespace Novira.Backend.Data;

// Obviously-fake placeholder data for the admin-review blueprint pass — not
// real opportunities. Replace this seeder with the real Bundesagentur
// sync/university curation once the approve/deny flow itself is validated.
// OccupationField values match frontend/src/types/assessment.ts's
// OccupationField string keys, since that's the shared matching vocabulary.
//
// Dates are computed relative to seed time (MonthsFromNow), not hardcoded
// absolutes — MatchingService hard-excludes opportunities whose
// ApplicationDeadline has already passed, so fixed calendar dates silently
// go stale and every seeded entry stops matching once "now" catches up to
// them (found 2026-08-06, while first testing the matcher against this seeder).
public static class OpportunitySeeder
{
    private static DateOnly MonthsFromNow(int months) =>
        DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(months);

    public static async Task SeedIfEmptyAsync(AppDbContext db)
    {
        if (await db.Opportunities.AnyAsync())
        {
            return;
        }

        var fakeOpportunities = new List<Opportunity>
        {
            new()
            {
                Title = "[FAKE] Ausbildung as Mechatronics Technician",
                Provider = "[FAKE] Musterwerk GmbH",
                Path = OpportunityPath.Ausbildung,
                Location = "Stuttgart",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-1",
                OccupationField = "mechatronics-technician",
                RequiredGermanLevel = LanguageLevel.B1,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.HighSchool,
                MonthlyCompensationEur = 950,
                StartDate = MonthsFromNow(2),
                ApplicationDeadline = MonthsFromNow(1),
            },
            new()
            {
                Title = "[FAKE] Ausbildung as Hotel Specialist",
                Provider = "[FAKE] Beispiel Hotels AG",
                Path = OpportunityPath.Ausbildung,
                Location = "Munich",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-2",
                OccupationField = "hotel-management",
                RequiredGermanLevel = LanguageLevel.B1,
                RequiresCertifiedLanguageProof = false,
                MinEducationLevel = EducationLevel.HighSchool,
                MonthlyCompensationEur = 850,
                StartDate = MonthsFromNow(1),
                ApplicationDeadline = MonthsFromNow(1),
            },
            new()
            {
                Title = "[FAKE] Ausbildung as IT Specialist",
                Provider = "[FAKE] TechMuster GmbH",
                Path = OpportunityPath.Ausbildung,
                Location = "Berlin",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-3",
                OccupationField = "it-support-networking",
                RequiredGermanLevel = LanguageLevel.B1,
                RequiredEnglishLevel = LanguageLevel.B1,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.HighSchool,
                MonthlyCompensationEur = 1050,
                StartDate = MonthsFromNow(2),
                ApplicationDeadline = MonthsFromNow(2),
            },
            new()
            {
                Title = "[FAKE] Ausbildung as Nursing Assistant",
                Provider = "[FAKE] Klinikum Beispielstadt",
                Path = OpportunityPath.Ausbildung,
                Location = "Hamburg",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-4",
                OccupationField = "nursing",
                RequiredGermanLevel = LanguageLevel.B2,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.HighSchool,
                MonthlyCompensationEur = 1100,
                StartDate = MonthsFromNow(3),
                ApplicationDeadline = MonthsFromNow(2),
            },
            new()
            {
                Title = "[FAKE] Ausbildung as Electronics Technician",
                Provider = "[FAKE] Elektro Muster KG",
                Path = OpportunityPath.Ausbildung,
                Location = "Leipzig",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-5",
                OccupationField = "electronics-technician",
                RequiredGermanLevel = LanguageLevel.B1,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.HighSchool,
                MonthlyCompensationEur = 980,
                StartDate = MonthsFromNow(2),
                ApplicationDeadline = MonthsFromNow(1),
            },
            new()
            {
                Title = "[FAKE] B.Sc. Computer Science",
                Provider = "[FAKE] Technische Musteruniversität",
                Path = OpportunityPath.University,
                Location = "Berlin",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-6",
                OccupationField = "software-development",
                RequiredEnglishLevel = LanguageLevel.B2,
                RequiredGermanLevel = LanguageLevel.A2,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.HighSchool,
                TuitionFeeEur = 0,
                StartDate = MonthsFromNow(3),
                ApplicationDeadline = MonthsFromNow(2),
            },
            new()
            {
                Title = "[FAKE] B.Eng. Mechanical Engineering",
                Provider = "[FAKE] Universität Beispielhausen",
                Path = OpportunityPath.University,
                Location = "Aachen",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-7",
                OccupationField = "mechatronics-technician",
                RequiredGermanLevel = LanguageLevel.C1,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.HighSchool,
                TuitionFeeEur = 0,
                StartDate = MonthsFromNow(3),
                ApplicationDeadline = MonthsFromNow(2),
            },
            new()
            {
                Title = "[FAKE] B.A. Business Administration",
                Provider = "[FAKE] Musterhochschule",
                Path = OpportunityPath.University,
                Location = "Frankfurt",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-8",
                OccupationField = "accounting-finance",
                RequiredGermanLevel = LanguageLevel.B2,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.HighSchool,
                TuitionFeeEur = 500,
                StartDate = MonthsFromNow(3),
                ApplicationDeadline = MonthsFromNow(1),
            },
            new()
            {
                Title = "[FAKE] M.Sc. Data Science",
                Provider = "[FAKE] Technische Musteruniversität",
                Path = OpportunityPath.University,
                Location = "Munich",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-9",
                OccupationField = "data-cybersecurity",
                RequiredEnglishLevel = LanguageLevel.C1,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.Bachelors,
                TuitionFeeEur = 0,
                StartDate = MonthsFromNow(3),
                ApplicationDeadline = MonthsFromNow(1),
            },
            new()
            {
                Title = "[FAKE] B.Sc. Nursing Science",
                Provider = "[FAKE] Universität Beispielhausen",
                Path = OpportunityPath.University,
                Location = "Cologne",
                Description = "Placeholder entry for blueprint testing — not a real listing.",
                SourceUrl = "https://example.com/fake-10",
                OccupationField = "nursing",
                RequiredGermanLevel = LanguageLevel.B2,
                RequiresCertifiedLanguageProof = true,
                MinEducationLevel = EducationLevel.HighSchool,
                TuitionFeeEur = 0,
                StartDate = MonthsFromNow(3),
                ApplicationDeadline = MonthsFromNow(2),
            },
        };

        db.Opportunities.AddRange(fakeOpportunities);
        await db.SaveChangesAsync();
    }
}
