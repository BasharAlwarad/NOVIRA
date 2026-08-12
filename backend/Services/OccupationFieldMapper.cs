namespace Novira.Backend.Services;

/// <summary>
/// Best-effort mapping from the Bundesagentur API's free-text German
/// occupation field (`hauptberuf`, e.g. "Parkettleger/in") to NOVIRA's
/// 110-value OccupationField taxonomy (frontend/src/types/assessment.ts) —
/// there is no direct field for this in the source data. A miss returns
/// null rather than guessing: MatchingService's occupation hard filter only
/// applies when OccupationField is set, so an unmapped entry just needs a
/// human to assign it during admin review, same as it would with no sync at
/// all — never a silently wrong tag, which would be worse for a hard filter.
///
/// Ordering matters: entries are checked in array order and the first
/// substring match wins, so more specific compound titles that CONTAIN a
/// more generic keyword must be listed first (e.g. "Kfz-Mechatroniker"
/// contains "Mechatroniker" — if the generic rule were checked first, every
/// automotive apprenticeship would be mis-tagged as generic mechatronics).
/// </summary>
public static class OccupationFieldMapper
{
    private static readonly (string Keyword, string OccupationField)[] Mappings =
    [
        // --- Skilled Trades ---
        // (Kfz-Mechatroniker / Land- und Baumaschinenmechatroniker both
        // contain "Mechatroniker" — must be checked before the generic rule.)
        ("Kfz-Mechatroniker", "automotive-mechatronics"),
        ("Land- und Baumaschinen", "agricultural-machinery-mechanic"),
        ("Mechatroniker", "mechatronics-technician"),
        // (IT-Systemelektroniker contains "Elektroniker" — same reasoning.)
        ("IT-Systemelektroniker", "it-support-networking"),
        ("Elektroniker", "electronics-technician"),
        ("Elektriker", "electrician"),
        ("Anlagenmechaniker", "plumbing-heating"),
        ("Kälteanlagenbauer", "hvac-refrigeration"),
        ("Schweißer", "welding"),
        ("Schweißfachmann", "welding"),
        ("Industriemechaniker", "industrial-mechanic"),
        ("Feinwerkmechaniker", "toolmaking-precision-mechanic"),
        ("Werkzeugmechaniker", "toolmaking-precision-mechanic"),
        ("Tischler", "carpentry-joinery"),
        ("Schreiner", "carpentry-joinery"),
        ("Maurer", "bricklaying-masonry"),
        ("Dachdecker", "roofing"),
        ("Stuckateur", "plastering-drywall"),
        ("Trockenbauer", "plastering-drywall"),
        // (Fahrzeuglackierer contains "Lackierer" — must come first.)
        ("Fahrzeuglackierer", "vehicle-bodywork-paint"),
        ("Maler", "painting-decorating"),
        ("Lackierer", "painting-decorating"),
        ("Glaser", "glazing"),
        ("Gerüstbauer", "scaffolding"),
        ("Fliesenleger", "floor-laying-tiling"),
        ("Estrichleger", "floor-laying-tiling"),
        // --- Automotive & Vehicle Trades ---
        ("Karosserie", "vehicle-bodywork-paint"),
        ("Fluggerätmechaniker", "aircraft-mechanic"),
        ("Bootsbauer", "marine-mechanic"),
        ("Schiffsmechaniker", "marine-mechanic"),
        ("Zweiradmechaniker", "bicycle-mechanic"),
        // --- Construction & Civil Engineering ---
        ("Baugeräteführer", "construction-equipment-operation"),
        ("Straßenbauer", "road-construction"),
        ("Rohrleitungsbauer", "pipeline-well-construction"),
        ("Brunnenbauer", "pipeline-well-construction"),
        ("Stahlbetonbauer", "concrete-construction"),
        ("Steinmetz", "stonemasonry"),
        ("Isolierer", "insulation"),
        // --- Hospitality & Tourism ---
        ("Hotelfachmann", "hotel-management"),
        ("Hotelfachfrau", "hotel-management"),
        ("Hotelkaufmann", "hotel-management"),
        ("Koch", "culinary-arts"),
        ("Köchin", "culinary-arts"),
        ("Restaurantfachmann", "restaurant-food-service"),
        ("Restaurantfachfrau", "restaurant-food-service"),
        ("Veranstaltungskaufmann", "event-management"),
        ("Tourismuskaufmann", "tourism-travel"),
        ("Hauswirtschaft", "housekeeping-management"),
        // --- Food Production & Craft ---
        ("Bäcker", "baking"),
        ("Konditor", "confectionery"),
        ("Fleischer", "butchery"),
        ("Metzger", "butchery"),
        ("Brauer", "brewing-malting"),
        ("Mälzer", "brewing-malting"),
        ("Milchtechnologe", "dairy-production"),
        ("Lebensmitteltechniker", "food-technology"),
        // --- Logistics & Transport ---
        ("Fachlagerist", "warehouse-supply-chain"),
        ("Lagerlogistik", "warehouse-supply-chain"),
        ("Spedition", "freight-forwarding"),
        ("Berufskraftfahrer", "commercial-driving"),
        ("Eisenbahner", "rail-road-transport-services"),
        ("Luftverkehr", "air-transport-services"),
        ("Postbote", "postal-courier-services"),
        ("Zusteller", "postal-courier-services"),
        // --- Education & Childcare ---
        ("Erzieher", "early-childhood-education"),
        ("Heilerziehungspfleger", "special-needs-education-support"),
        // --- Engineering (non-IT) ---
        ("Maschinenbau", "mechanical-engineering"),
        ("Elektrotechnik", "electrical-engineering"),
        ("Bauingenieur", "civil-engineering"),
        ("Vermessungstechniker", "surveying-geomatics"),
        ("Technischer Zeichner", "technical-drafting"),
        ("Systemplaner", "technical-drafting"),
        // --- Healthcare & Nursing ---
        ("Pflegefachmann", "nursing"),
        ("Pflegefachfrau", "nursing"),
        ("Krankenpflegehelfer", "nursing"), // distinct word from "Krankenpfleger" ("-pflege-helfer" vs "-pfleger") — checked either order is fine, no substring overlap
        ("Krankenpfleger", "nursing"),
        ("Krankenschwester", "nursing"),
        ("Altenpfleger", "elderly-care"),
        ("Kinderkrankenpfleger", "pediatric-nursing"),
        ("Hebamme", "midwifery"),
        ("Physiotherapeut", "physiotherapy"),
        ("Ergotherapeut", "occupational-therapy"),
        ("Logopäde", "speech-therapy"),
        ("Medizinisch-technische", "medical-technician"),
        // API text uses "Medizinische/r Fachangestellte/r" — the "/r"
        // breaks a naive "Medizinische Fachangestellte" substring match,
        // so match on "Medizinische" alone instead.
        ("Medizinische", "medical-technician"),
        ("Pharmazeutisch-kaufmännische", "pharmacy-technician"),
        ("Zahnmedizinische", "dental-assistant"),
        ("Zahntechniker", "dental-technician"),
        ("Orthopädietechniker", "orthopedic-technician"),
        ("Notfallsanitäter", "paramedic"),
        ("Augenoptiker", "optometry"),
        ("Hörakustiker", "hearing-aid-acoustics"),
        // --- Personal Care & Social Services ---
        ("Friseur", "hairdressing"),
        ("Kosmetiker", "beauty-therapy"),
        ("Masseur", "massage-therapy"),
        ("Behindertenbetreuer", "disability-support-care"),
        // --- Business, Administration & Finance ---
        ("Steuerfachangestellte", "tax-legal-administration"),
        ("Rechtsanwaltsfachangestellte", "tax-legal-administration"),
        ("Büromanagement", "office-administration"),
        ("Bürokaufmann", "office-administration"),
        ("Personaldienstleistungskaufmann", "human-resources"),
        ("Industriekaufmann", "industrial-clerk"),
        ("Bankkaufmann", "banking"),
        ("Versicherungskaufmann", "insurance-finance"),
        ("Immobilienkaufmann", "real-estate"),
        ("Buchhalter", "accounting-finance"),
        // --- Sales, Retail & Marketing ---
        ("Automobilkaufmann", "automotive-sales"),
        ("Groß- und Außenhandelskaufmann", "wholesale-foreign-trade"),
        ("E-Commerce", "ecommerce"),
        ("Marketingkommunikation", "marketing-digital-communications"),
        ("Verkäufer", "retail-sales"),
        ("Kaufmann im Einzelhandel", "retail-sales"),
        // --- Agriculture, Nature & Environment ---
        ("Landwirt", "farming-crop-production"),
        ("Tierwirt", "animal-husbandry"),
        ("Gärtner", "horticulture-gardening"),
        ("Forstwirt", "forestry"),
        ("Winzer", "winemaking"),
        ("Fischwirt", "fish-farming"),
        ("Umwelttechnologe", "environmental-recycling-technology"),
        ("Wasserversorgungstechnik", "water-supply-technology"),
        // --- Textile, Fashion & Leather ---
        ("Modeschneider", "tailoring-fashion-design"),
        ("Maßschneider", "tailoring-fashion-design"),
        ("Textiltechnologe", "textile-production"),
        ("Schuhmacher", "shoemaking"),
        ("Raumausstatter", "upholstery"),
        ("Polsterer", "upholstery"),
        // --- Media, Printing & Design ---
        ("Mediengestalter Bild und Ton", "film-video-editing"),
        ("Mediengestalter", "graphic-media-design"),
        ("Fotograf", "photography"),
        ("Drucktechnologe", "printing-technology"),
        // --- IT & Software ---
        // (Two specific Fachinformatiker specializations must be checked
        // before the bare "Fachinformatiker" fallback.)
        ("Fachinformatiker für Anwendungsentwicklung", "software-development"),
        ("Fachinformatiker für Systemintegration", "it-support-networking"),
        ("Softwareentwickler", "software-development"),
        ("Fachinformatiker", "it-support-networking"),
        ("IT-Sicherheit", "data-cybersecurity"),
        ("Digitalisierungsmanagement", "digitalization-management"),
    ];

    public static string? Map(string? germanOccupationText)
    {
        if (string.IsNullOrWhiteSpace(germanOccupationText))
        {
            return null;
        }

        foreach (var (keyword, occupationField) in Mappings)
        {
            if (germanOccupationText.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            {
                return occupationField;
            }
        }

        return null;
    }
}
