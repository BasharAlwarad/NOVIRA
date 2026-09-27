namespace Novira.Backend.Services;

// The canonical 110-value OccupationField taxonomy, mirrored from
// frontend/src/types/assessment.ts's OccupationField enum — kept as a
// single shared list (not re-typed per caller) so DocumentVerificationService's
// AI-extraction schema and ApplyVerifiedDataFromDocument's server-side
// validation (added 2026-09-11, for VerifiedOccupationField) can never drift
// against each other. Same "one source of truth for the 110-value list"
// discipline as OccupationFieldMapper.cs already follows for its own mapping
// table — this file exists specifically because that one doesn't expose a
// flat list, only Bundesagentur-keyword -> value pairs.
//
// If the frontend enum ever changes, this must change with it — there is no
// mechanical link between the two, same tradeoff already accepted for
// Opportunity.OccupationField being a plain string rather than a duplicated
// C# enum (see that model's own comment).
public static class OccupationFields
{
    public static readonly string[] All =
    [
        // Skilled Trades (Handwerk)
        "electrician", "electronics-technician", "mechatronics-technician", "plumbing-heating",
        "hvac-refrigeration", "welding", "industrial-mechanic", "toolmaking-precision-mechanic",
        "carpentry-joinery", "bricklaying-masonry", "roofing", "plastering-drywall",
        "painting-decorating", "glazing", "scaffolding", "floor-laying-tiling",
        // Automotive & Vehicle Trades
        "automotive-mechatronics", "vehicle-bodywork-paint", "aircraft-mechanic",
        "agricultural-machinery-mechanic", "marine-mechanic", "bicycle-mechanic",
        // Construction & Civil Engineering
        "construction-equipment-operation", "road-construction", "pipeline-well-construction",
        "concrete-construction", "stonemasonry", "insulation",
        // Hospitality & Tourism
        "hotel-management", "hotel-front-office", "culinary-arts", "restaurant-food-service",
        "event-management", "tourism-travel", "housekeeping-management",
        // Food Production & Craft
        "baking", "confectionery", "butchery", "brewing-malting", "dairy-production", "food-technology",
        // Logistics & Transport
        "warehouse-supply-chain", "freight-forwarding", "commercial-driving",
        "rail-road-transport-services", "air-transport-services", "postal-courier-services",
        // Education & Childcare
        "early-childhood-education", "school-teaching", "vocational-training",
        "special-needs-education-support",
        // Engineering (non-IT)
        "mechanical-engineering", "electrical-engineering", "civil-engineering",
        "industrial-engineering", "surveying-geomatics", "technical-drafting",
        // Healthcare & Nursing
        "nursing", "elderly-care", "pediatric-nursing", "midwifery", "physiotherapy",
        "occupational-therapy", "speech-therapy", "medical-technician", "pharmacy-technician",
        "dental-assistant", "dental-technician", "orthopedic-technician", "paramedic", "optometry",
        "hearing-aid-acoustics",
        // Personal Care & Social Services
        "hairdressing", "beauty-therapy", "massage-therapy", "disability-support-care",
        // Business, Administration & Finance
        "accounting-finance", "office-administration", "human-resources", "industrial-clerk",
        "banking", "insurance-finance", "tax-legal-administration", "real-estate",
        // Sales, Retail & Marketing
        "retail-sales", "wholesale-foreign-trade", "ecommerce", "marketing-digital-communications",
        "automotive-sales",
        // Agriculture, Nature & Environment
        "farming-crop-production", "animal-husbandry", "horticulture-gardening", "forestry",
        "winemaking", "fish-farming", "environmental-recycling-technology", "water-supply-technology",
        // Textile, Fashion & Leather
        "tailoring-fashion-design", "textile-production", "shoemaking", "upholstery",
        // Media, Printing & Design
        "graphic-media-design", "photography", "printing-technology", "film-video-editing",
        // IT & Software
        "software-development", "it-support-networking", "data-cybersecurity",
        "digitalization-management",
        "other",
    ];

    public static readonly HashSet<string> Valid = new(All, StringComparer.OrdinalIgnoreCase);
}
