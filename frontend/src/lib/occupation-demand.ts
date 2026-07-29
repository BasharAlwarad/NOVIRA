import { OccupationField } from '@/types/assessment';

/**
 * Internal algorithm metadata only — not part of the questionnaire schema and
 * never shown to the user. Classifies each occupation against Germany's
 * official shortage-occupation signals (Engpassberufe, EU Blue Card shortage
 * list) as researched in Matching-Algorithm-Study.md §2.3.
 *
 * This is a static, manually-curated snapshot for the MVP. It is deliberately
 * kept separate from `types/assessment.ts` so it can be swapped later for the
 * planned Phase 2 system: an AI-assisted pipeline that checks official
 * sources on a rolling basis and regenerates this data, without touching the
 * questionnaire schema at all.
 */
export type OccupationDemandTier = 'high' | 'medium' | 'standard';

const HIGH_DEMAND: ReadonlySet<OccupationField> = new Set([
  // Skilled trades — Engpassberufe
  OccupationField.Electrician,
  OccupationField.ElectronicsTechnician,
  OccupationField.MechatronicsTechnician,
  OccupationField.PlumbingHeating,
  OccupationField.HvacRefrigeration,
  OccupationField.IndustrialMechanic,
  // Healthcare & nursing — most severe official shortage
  OccupationField.Nursing,
  OccupationField.ElderlyCare,
  OccupationField.PediatricNursing,
  OccupationField.Midwifery,
  OccupationField.MedicalTechnician,
  OccupationField.PharmacyTechnician,
  OccupationField.Paramedic,
  // IT — Blue Card shortage list
  OccupationField.SoftwareDevelopment,
  OccupationField.ItSupportNetworking,
  OccupationField.DataCybersecurity,
  OccupationField.DigitalizationManagement,
  // Engineering — Blue Card shortage list
  OccupationField.MechanicalEngineering,
  OccupationField.ElectricalEngineering,
  OccupationField.CivilEngineering,
  OccupationField.IndustrialEngineering,
  // Education — chronic shortfall
  OccupationField.EarlyChildhoodEducation,
  OccupationField.SchoolTeaching,
  OccupationField.SpecialNeedsEducationSupport,
  // Construction trades — Engpassberufe
  OccupationField.ConstructionEquipmentOperation,
  OccupationField.RoadConstruction,
  OccupationField.ConcreteConstruction,
  OccupationField.Stonemasonry,
  OccupationField.Roofing,
  OccupationField.Scaffolding,
  OccupationField.PlasteringDrywall,
  OccupationField.FloorLayingTiling,
  OccupationField.Insulation,
  OccupationField.CarpentryJoinery,
  OccupationField.BricklayingMasonry,
  // Logistics — documented driver shortage
  OccupationField.CommercialDriving,
  OccupationField.WarehouseSupplyChain,
  OccupationField.FreightForwarding,
]);

const MEDIUM_DEMAND: ReadonlySet<OccupationField> = new Set([
  OccupationField.CulinaryArts,
  OccupationField.RestaurantFoodService,
  OccupationField.HotelManagement,
  OccupationField.HotelFrontOffice,
  OccupationField.EventManagement,
  OccupationField.TourismTravel,
  OccupationField.HousekeepingManagement,
  OccupationField.Welding,
  OccupationField.ToolmakingPrecisionMechanic,
  OccupationField.AutomotiveMechatronics,
  OccupationField.VehicleBodyworkPaint,
  OccupationField.AircraftMechanic,
  OccupationField.AgriculturalMachineryMechanic,
  OccupationField.MarineMechanic,
  OccupationField.BicycleMechanic,
  OccupationField.Glazing,
  OccupationField.PaintingDecorating,
  OccupationField.Physiotherapy,
  OccupationField.OccupationalTherapy,
  OccupationField.SpeechTherapy,
  OccupationField.DentalAssistant,
  OccupationField.DentalTechnician,
  OccupationField.OrthopedicTechnician,
  OccupationField.Optometry,
  OccupationField.HearingAidAcoustics,
  OccupationField.VocationalTraining,
  OccupationField.SurveyingGeomatics,
  OccupationField.TechnicalDrafting,
  OccupationField.PipelineWellConstruction,
  OccupationField.RailRoadTransportServices,
  OccupationField.AirTransportServices,
  OccupationField.PostalCourierServices,
  OccupationField.DisabilitySupportCare,
  OccupationField.Hairdressing,
]);

export function getOccupationDemandTier(
  occupationField: OccupationField | null
): OccupationDemandTier {
  if (!occupationField) {
    return 'standard';
  }

  if (HIGH_DEMAND.has(occupationField)) {
    return 'high';
  }

  if (MEDIUM_DEMAND.has(occupationField)) {
    return 'medium';
  }

  return 'standard';
}
