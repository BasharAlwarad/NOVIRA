namespace Novira.Backend.Resources;

// The Tier 3 "full-service" signed agreement — the Vollmacht-equivalent
// document Legal.md §3 identifies as the one thing in this feature that has
// to be genuinely enforceable, not just UX. First drafted 2026-10-23, ran
// through the novira-legal-check skill before being written, grounded
// directly in Legal.md §3/§4 and Monetization-Strategy.md §4.2a rather than
// invented fresh — see Architecture.md's "Tier 3 agreement + payment"
// section for the full reasoning behind every clause.
//
// THIS IS A FIRST-PASS DRAFT, NOT FINAL LEGAL TEXT — it must go to a real
// lawyer before being relied on, same caveat every section of Legal.md
// already carries. Two things it deliberately leaves open rather than
// guessing (marked [OPEN] below): the governing-law/cross-border-consumer-
// protection clause (Legal.md §3 already calls this "genuinely uncertain"),
// and the §296a SGB III Ausbildung-fee question (Legal.md §4, an already
// knowingly accepted risk — this template doesn't try to re-litigate it).
//
// One important distinction from the rest of the app's copy: Legal.md
// §1/§3's wording discipline ("help you apply," never "apply on your
// behalf") governs marketing/UI copy, to stay clear of RDG-restricted
// advice in casual language. This document is different — it IS the
// Vollmacht, so its entire legal function depends on clearly and
// specifically stating what's being authorized (see Section 2). Softening
// this text the same way the UI copy is softened would defeat its purpose.
public static class Tier3AgreementTemplate
{
    private const string Template = """
        Full-Service Agreement

        Between: {FounderName}, operating as {BusinessStatus}, referred to as "the Provider"
        And: {UserFullName}, referred to as "the Client"
        Date: {Date}

        1. What this agreement covers
        The Provider will help the Client prepare, complete, and submit an application for {Path} in Germany{TargetOpportunityClause}. This includes gathering and organizing the Client's documents, preparing application materials, and — under the authorization in Section 2 — communicating and corresponding with the relevant institution or employer on the Client's behalf for this specific application.

        This service is not legal advice. The Provider does not assess, confirm, or advise on the Client's visa or residence-permit eligibility, and will not do so under this agreement. Any question that touches visa or residence-permit status will be referred to a licensed immigration lawyer, not answered by the Provider.

        No outcome is guaranteed. The Provider will make a genuine, good-faith effort, but cannot promise admission, placement, or any specific result — the decision always belongs to the institution or employer, not the Provider.

        2. Authorization (power of attorney)
        By signing below, the Client authorizes the Provider to act on their behalf specifically for the application described in Section 1 — including submitting application materials, and corresponding with the institution or employer about that application's status — for the duration of this agreement. This authorization is limited to this one application process; it does not extend to any other matter, and the Client may withdraw it in writing at any time (see Section 7).

        3. Fees
        - Upfront fee: EUR {UpfrontAmountEur}, due before work begins.{CreditNote}
        - Success fee: EUR 1,000, due only if the application succeeds (see Section 4 for what "success" means for this path).
        - Total possible fees under this agreement: EUR 1,500.

        4. What counts as "success"
        - University applications: success means the Client actually enrolls in the program — not merely receiving an offer or admission letter. The success fee is not due on an offer alone.
        - Ausbildung applications: success means the Client signs a training contract (Ausbildungsvertrag) with the employer.

        5. Refunds
        If the application is not submitted, or is submitted but does not succeed through no fault of the Client, the Client may request a refund of the upfront fee by contacting the Provider directly (through NOVIRA's messaging system) — this is handled as a real conversation, not an automatic or self-service process. [OPEN — governing law / cross-border consumer-protection terms for this section pending real legal review; do not finalize without it.]

        6. Liability
        The Provider's liability under this agreement is limited to the fees actually paid, except where German law does not permit such a limit (for example, death, personal injury, or willful misconduct/gross negligence, which are never limited). This is a narrow, specific limitation — not a blanket "no liability" clause, which would not be enforceable against a consumer under German law (§309 BGB).

        7. Ending this agreement
        Either party may end this agreement in writing at any time. If the Client ends it before the application is submitted, the Provider will refund the unused portion of the upfront fee. If the Client ends it after submission, Section 5's refund terms apply instead.

        8. Data processing and transfer
        The Client's personal data and documents (identity documents, education records, contact information) will be processed by the Provider in Germany to carry out this agreement, which involves this data leaving the Client's home country and being transferred to and processed in Germany. By signing, the Client specifically consents to this transfer, separate from and in addition to any general privacy notice elsewhere on the NOVIRA platform.

        9. Electronic signature
        The Client agrees that typing their full legal name and clicking "I agree" constitutes their legally binding signature on this agreement, with the same effect as a handwritten signature, given both parties' explicit consent to transact electronically.

        10. Governing law
        [OPEN — pending real legal review per Legal.md §3's open note on whether EU/German consumer-protection rules extend to a customer outside the EU. Do not finalize this section without that input.]
        """;

    public static string Render(
        string founderName,
        string businessStatus,
        string userFullName,
        DateTime date,
        string path,
        string? targetOpportunityTitle,
        string? targetOpportunityProvider,
        int upfrontAmountEur,
        int? creditAmountEur,
        string? creditFromTier)
    {
        var targetOpportunityClause = string.IsNullOrWhiteSpace(targetOpportunityTitle)
            ? string.Empty
            : $", specifically: {targetOpportunityTitle}" +
              (string.IsNullOrWhiteSpace(targetOpportunityProvider) ? string.Empty : $" — {targetOpportunityProvider}");

        var creditNote = creditAmountEur is { } credit && credit > 0
            ? $" This reflects a EUR {credit} credit for the Client's prior payment toward {creditFromTier}."
            : string.Empty;

        return Template
            .Replace("{FounderName}", founderName)
            .Replace("{BusinessStatus}", businessStatus)
            .Replace("{UserFullName}", userFullName)
            .Replace("{Date}", date.ToString("yyyy-MM-dd"))
            .Replace("{Path}", path)
            .Replace("{TargetOpportunityClause}", targetOpportunityClause)
            .Replace("{UpfrontAmountEur}", upfrontAmountEur.ToString())
            .Replace("{CreditNote}", creditNote);
    }
}
