export enum AssessmentType {
  GermanyPathway = 'germany-pathway',
}

export enum AssessmentStepId {
  Country = 'country',
  Age = 'age',
  Education = 'education',
  OccupationField = 'occupation-field',
  WorkExperience = 'work-experience',
  Path = 'path',
  German = 'german',
  English = 'english',
  LanguageCertificate = 'language-certificate',
  Passport = 'passport',
  GermanyConnection = 'germany-connection',
  Budget = 'budget',
  Timeline = 'timeline',
  RegionFlexibility = 'region-flexibility',
}

export enum DesiredPath {
  University = 'university',
  Ausbildung = 'ausbildung',
  Employment = 'employment',
  Unsure = 'unsure',
}

export enum EducationLevel {
  HighSchool = 'high-school',
  TechnicalDiploma = 'technical-diploma',
  Bachelors = 'bachelors',
  Masters = 'masters',
  Doctorate = 'doctorate',
}

export enum OccupationField {
  // Skilled Trades (Handwerk)
  Electrician = 'electrician',
  ElectronicsTechnician = 'electronics-technician',
  MechatronicsTechnician = 'mechatronics-technician',
  PlumbingHeating = 'plumbing-heating',
  HvacRefrigeration = 'hvac-refrigeration',
  Welding = 'welding',
  IndustrialMechanic = 'industrial-mechanic',
  ToolmakingPrecisionMechanic = 'toolmaking-precision-mechanic',
  CarpentryJoinery = 'carpentry-joinery',
  BricklayingMasonry = 'bricklaying-masonry',
  Roofing = 'roofing',
  PlasteringDrywall = 'plastering-drywall',
  PaintingDecorating = 'painting-decorating',
  Glazing = 'glazing',
  Scaffolding = 'scaffolding',
  FloorLayingTiling = 'floor-laying-tiling',
  // Automotive & Vehicle Trades
  AutomotiveMechatronics = 'automotive-mechatronics',
  VehicleBodyworkPaint = 'vehicle-bodywork-paint',
  AircraftMechanic = 'aircraft-mechanic',
  AgriculturalMachineryMechanic = 'agricultural-machinery-mechanic',
  MarineMechanic = 'marine-mechanic',
  BicycleMechanic = 'bicycle-mechanic',
  // Construction & Civil Engineering
  ConstructionEquipmentOperation = 'construction-equipment-operation',
  RoadConstruction = 'road-construction',
  PipelineWellConstruction = 'pipeline-well-construction',
  ConcreteConstruction = 'concrete-construction',
  Stonemasonry = 'stonemasonry',
  Insulation = 'insulation',
  // Hospitality & Tourism
  HotelManagement = 'hotel-management',
  HotelFrontOffice = 'hotel-front-office',
  CulinaryArts = 'culinary-arts',
  RestaurantFoodService = 'restaurant-food-service',
  EventManagement = 'event-management',
  TourismTravel = 'tourism-travel',
  HousekeepingManagement = 'housekeeping-management',
  // Food Production & Craft
  Baking = 'baking',
  Confectionery = 'confectionery',
  Butchery = 'butchery',
  BrewingMalting = 'brewing-malting',
  DairyProduction = 'dairy-production',
  FoodTechnology = 'food-technology',
  // Logistics & Transport
  WarehouseSupplyChain = 'warehouse-supply-chain',
  FreightForwarding = 'freight-forwarding',
  CommercialDriving = 'commercial-driving',
  RailRoadTransportServices = 'rail-road-transport-services',
  AirTransportServices = 'air-transport-services',
  PostalCourierServices = 'postal-courier-services',
  // Education & Childcare
  EarlyChildhoodEducation = 'early-childhood-education',
  SchoolTeaching = 'school-teaching',
  VocationalTraining = 'vocational-training',
  SpecialNeedsEducationSupport = 'special-needs-education-support',
  // Engineering (non-IT)
  MechanicalEngineering = 'mechanical-engineering',
  ElectricalEngineering = 'electrical-engineering',
  CivilEngineering = 'civil-engineering',
  IndustrialEngineering = 'industrial-engineering',
  SurveyingGeomatics = 'surveying-geomatics',
  TechnicalDrafting = 'technical-drafting',
  // Healthcare & Nursing
  Nursing = 'nursing',
  ElderlyCare = 'elderly-care',
  PediatricNursing = 'pediatric-nursing',
  Midwifery = 'midwifery',
  Physiotherapy = 'physiotherapy',
  OccupationalTherapy = 'occupational-therapy',
  SpeechTherapy = 'speech-therapy',
  MedicalTechnician = 'medical-technician',
  PharmacyTechnician = 'pharmacy-technician',
  DentalAssistant = 'dental-assistant',
  DentalTechnician = 'dental-technician',
  OrthopedicTechnician = 'orthopedic-technician',
  Paramedic = 'paramedic',
  Optometry = 'optometry',
  HearingAidAcoustics = 'hearing-aid-acoustics',
  // Personal Care & Social Services
  Hairdressing = 'hairdressing',
  BeautyTherapy = 'beauty-therapy',
  MassageTherapy = 'massage-therapy',
  DisabilitySupportCare = 'disability-support-care',
  // Business, Administration & Finance
  AccountingFinance = 'accounting-finance',
  OfficeAdministration = 'office-administration',
  HumanResources = 'human-resources',
  IndustrialClerk = 'industrial-clerk',
  Banking = 'banking',
  InsuranceFinance = 'insurance-finance',
  TaxLegalAdministration = 'tax-legal-administration',
  RealEstate = 'real-estate',
  // Sales, Retail & Marketing
  RetailSales = 'retail-sales',
  WholesaleForeignTrade = 'wholesale-foreign-trade',
  Ecommerce = 'ecommerce',
  MarketingDigitalCommunications = 'marketing-digital-communications',
  AutomotiveSales = 'automotive-sales',
  // Agriculture, Nature & Environment
  FarmingCropProduction = 'farming-crop-production',
  AnimalHusbandry = 'animal-husbandry',
  HorticultureGardening = 'horticulture-gardening',
  Forestry = 'forestry',
  Winemaking = 'winemaking',
  FishFarming = 'fish-farming',
  EnvironmentalRecyclingTechnology = 'environmental-recycling-technology',
  WaterSupplyTechnology = 'water-supply-technology',
  // Textile, Fashion & Leather
  TailoringFashionDesign = 'tailoring-fashion-design',
  TextileProduction = 'textile-production',
  Shoemaking = 'shoemaking',
  Upholstery = 'upholstery',
  // Media, Printing & Design
  GraphicMediaDesign = 'graphic-media-design',
  Photography = 'photography',
  PrintingTechnology = 'printing-technology',
  FilmVideoEditing = 'film-video-editing',
  // IT & Software
  SoftwareDevelopment = 'software-development',
  ItSupportNetworking = 'it-support-networking',
  DataCybersecurity = 'data-cybersecurity',
  DigitalizationManagement = 'digitalization-management',
  Other = 'other',
}

export enum WorkExperience {
  None = 'none',
  LessThanTwoYears = 'less-than-2-years',
  TwoToFiveYears = '2-to-5-years',
  MoreThanFiveYears = 'more-than-5-years',
}

export enum LanguageLevel {
  None = 'none',
  A1 = 'a1',
  A2 = 'a2',
  B1 = 'b1',
  B2 = 'b2',
  C1 = 'c1',
  C1Plus = 'c1-plus',
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Fluent = 'fluent',
}

export enum LanguageCertificateStatus {
  None = 'none',
  CertifiedGerman = 'certified-german',
  CertifiedEnglish = 'certified-english',
  CertifiedBoth = 'certified-both',
}

export enum PassportStatus {
  Yes = 'yes',
  No = 'no',
  Expired = 'expired',
}

export enum GermanyConnection {
  None = 'none',
  VisitedBefore = 'visited-before',
  LivedStudiedTrainedBefore = 'lived-studied-trained-before',
  FamilyInGermany = 'family-in-germany',
  FriendsInGermany = 'friends-in-germany',
  AttendedGermanSchoolOrInstitute = 'attended-german-school-or-institute',
  PriorApplicationOrContact = 'prior-application-or-contact',
  GermanHeritage = 'german-heritage',
}

export enum FinancialSituation {
  LessThan5000 = 'less-than-5000',
  Between5000And12000 = 'between-5000-and-12000',
  MoreThan12000 = 'more-than-12000',
  Unsure = 'unsure',
}

export enum StartTimeline {
  AsSoonAsPossible = 'asap',
  SixToTwelveMonths = '6-to-12-months',
  MoreThanAYear = 'more-than-a-year',
  StillExploring = 'still-exploring',
}

export enum RegionFlexibility {
  MajorCitiesOnly = 'major-cities-only',
  OpenToAnyRegion = 'open-to-any-region',
  NotSureYet = 'not-sure-yet',
}

export type AssessmentAnswerValue = string | number | boolean | string[] | null;

export type AssessmentQuestionKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multi-select';

export type AssessmentQuestionId =
  | 'country'
  | 'age'
  | 'highestEducation'
  | 'occupationField'
  | 'workExperience'
  | 'desiredPath'
  | 'germanLevel'
  | 'englishLevel'
  | 'languageCertificate'
  | 'passportStatus'
  | 'germanyConnection'
  | 'financialSituation'
  | 'startTimeline'
  | 'regionFlexibility';

export interface AssessmentOption<
  TValue extends AssessmentAnswerValue = AssessmentAnswerValue,
> {
  label: string;
  value: TValue;
  description?: string;
}

export interface AssessmentQuestionValidationRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

export interface AssessmentQuestionDefinition<
  TQuestionId extends string = string,
  TAnswer extends AssessmentAnswerValue = AssessmentAnswerValue,
> {
  id: TQuestionId;
  stepId: AssessmentStepId;
  label: string;
  /** Full question text shown to the user (may differ from the short `label`). */
  prompt: string;
  kind: AssessmentQuestionKind;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  multiSelect?: boolean;
  /**
   * For `multiSelect` questions: the option value that means "none of these
   * apply." Selecting it clears any other selections; selecting any other
   * option clears it. Lets a multi-select question still offer an explicit,
   * affirmative "no" instead of relying on the user to leave everything blank.
   */
  exclusiveOptionValue?: TAnswer;
  /** Renders a searchable combobox instead of an option-card grid — for long option lists. */
  searchable?: boolean;
  textareaRows?: number;
  options?: ReadonlyArray<AssessmentOption<TAnswer>>;
  validation?: AssessmentQuestionValidationRule;
}

export interface AssessmentStepDefinition<TQuestionId extends string = string> {
  id: AssessmentStepId;
  title: string;
  description?: string;
  questionIds: ReadonlyArray<TQuestionId>;
}

export interface AssessmentMetadata {
  lastUpdated: string | null;
}

export interface AssessmentAnswers {
  country: string;
  age: string | null;
  highestEducation: EducationLevel | null;
  occupationField: OccupationField | null;
  workExperience: WorkExperience | null;
  desiredPath: DesiredPath | null;
  germanLevel: LanguageLevel | null;
  englishLevel: LanguageLevel | null;
  languageCertificate: LanguageCertificateStatus | null;
  passportStatus: PassportStatus | null;
  germanyConnection: GermanyConnection[];
  financialSituation: FinancialSituation | null;
  startTimeline: StartTimeline | null;
  regionFlexibility: RegionFlexibility | null;
  [key: string]: AssessmentAnswerValue;
}

export interface AssessmentState {
  assessmentType: AssessmentType;
  currentStepId: AssessmentStepId;
  answers: AssessmentAnswers;
  metadata: AssessmentMetadata;
}

export interface AssessmentSnapshot extends AssessmentState {
  currentStepIndex: number;
}

export const ASSESSMENT_STORAGE_VERSION = 3;

export const ASSESSMENT_STORAGE_KEY = 'novira.assessment';

export const ASSESSMENT_QUESTION_DEFINITIONS = [
  {
    id: 'country',
    stepId: AssessmentStepId.Country,
    label: 'Country',
    prompt: 'Where do you currently live?',
    kind: 'select',
    required: true,
    options: [
      { label: 'Egypt', value: 'egypt' },
      { label: 'Syria', value: 'syria' },
      { label: 'Jordan', value: 'jordan' },
      { label: 'Iraq', value: 'iraq' },
      { label: 'Lebanon', value: 'lebanon' },
      { label: 'Other', value: 'other' },
    ],
  },
  {
    id: 'age',
    stepId: AssessmentStepId.Age,
    label: 'Age',
    prompt: 'How old are you?',
    kind: 'select',
    required: true,
    options: [
      { label: 'Under 18', value: 'under-18' },
      { label: '18–24', value: '18-24' },
      { label: '25–30', value: '25-30' },
      { label: '31–40', value: '31-40' },
      { label: '40+', value: '40-plus' },
    ],
  },
  {
    id: 'highestEducation',
    stepId: AssessmentStepId.Education,
    label: 'Highest Education',
    prompt: 'What is your highest education?',
    kind: 'select',
    required: true,
    options: [
      { label: 'High School', value: EducationLevel.HighSchool },
      { label: 'Technical Diploma', value: EducationLevel.TechnicalDiploma },
      { label: 'Bachelor', value: EducationLevel.Bachelors },
      { label: 'Master', value: EducationLevel.Masters },
      { label: 'PhD', value: EducationLevel.Doctorate },
    ],
  },
  {
    id: 'occupationField',
    stepId: AssessmentStepId.OccupationField,
    label: 'Occupation Field',
    prompt: 'What field is your education or work experience in?',
    helpText:
      'This matters more than your education level alone for finding a real match. Search by typing, or browse the list.',
    placeholder: 'Search fields (e.g. electrician, nursing, hospitality)…',
    kind: 'select',
    required: true,
    searchable: true,
    options: [
      // Skilled Trades (Handwerk)
      { label: 'Electrician', value: OccupationField.Electrician, description: 'Skilled Trades (Handwerk)' },
      { label: 'Electronics Technician', value: OccupationField.ElectronicsTechnician, description: 'Skilled Trades (Handwerk)' },
      { label: 'Mechatronics Technician', value: OccupationField.MechatronicsTechnician, description: 'Skilled Trades (Handwerk)' },
      { label: 'Plumbing & Heating', value: OccupationField.PlumbingHeating, description: 'Skilled Trades (Handwerk)' },
      { label: 'HVAC & Refrigeration', value: OccupationField.HvacRefrigeration, description: 'Skilled Trades (Handwerk)' },
      { label: 'Welding', value: OccupationField.Welding, description: 'Skilled Trades (Handwerk)' },
      { label: 'Industrial Mechanic', value: OccupationField.IndustrialMechanic, description: 'Skilled Trades (Handwerk)' },
      { label: 'Toolmaking & Precision Mechanics', value: OccupationField.ToolmakingPrecisionMechanic, description: 'Skilled Trades (Handwerk)' },
      { label: 'Carpentry & Joinery', value: OccupationField.CarpentryJoinery, description: 'Skilled Trades (Handwerk)' },
      { label: 'Bricklaying & Masonry', value: OccupationField.BricklayingMasonry, description: 'Skilled Trades (Handwerk)' },
      { label: 'Roofing', value: OccupationField.Roofing, description: 'Skilled Trades (Handwerk)' },
      { label: 'Plastering & Drywall', value: OccupationField.PlasteringDrywall, description: 'Skilled Trades (Handwerk)' },
      { label: 'Painting & Decorating', value: OccupationField.PaintingDecorating, description: 'Skilled Trades (Handwerk)' },
      { label: 'Glazing (Glass Fitting)', value: OccupationField.Glazing, description: 'Skilled Trades (Handwerk)' },
      { label: 'Scaffolding', value: OccupationField.Scaffolding, description: 'Skilled Trades (Handwerk)' },
      { label: 'Floor Laying & Tiling', value: OccupationField.FloorLayingTiling, description: 'Skilled Trades (Handwerk)' },
      // Automotive & Vehicle Trades
      { label: 'Automotive Mechatronics', value: OccupationField.AutomotiveMechatronics, description: 'Automotive & Vehicle Trades' },
      { label: 'Vehicle Bodywork & Paint', value: OccupationField.VehicleBodyworkPaint, description: 'Automotive & Vehicle Trades' },
      { label: 'Aircraft Mechanic', value: OccupationField.AircraftMechanic, description: 'Automotive & Vehicle Trades' },
      { label: 'Agricultural Machinery Mechanic', value: OccupationField.AgriculturalMachineryMechanic, description: 'Automotive & Vehicle Trades' },
      { label: 'Marine Mechanic', value: OccupationField.MarineMechanic, description: 'Automotive & Vehicle Trades' },
      { label: 'Bicycle Mechanic', value: OccupationField.BicycleMechanic, description: 'Automotive & Vehicle Trades' },
      // Construction & Civil Engineering
      { label: 'Construction Equipment Operation', value: OccupationField.ConstructionEquipmentOperation, description: 'Construction & Civil Engineering' },
      { label: 'Road Construction', value: OccupationField.RoadConstruction, description: 'Construction & Civil Engineering' },
      { label: 'Pipeline & Well Construction', value: OccupationField.PipelineWellConstruction, description: 'Construction & Civil Engineering' },
      { label: 'Concrete Construction', value: OccupationField.ConcreteConstruction, description: 'Construction & Civil Engineering' },
      { label: 'Stonemasonry', value: OccupationField.Stonemasonry, description: 'Construction & Civil Engineering' },
      { label: 'Insulation', value: OccupationField.Insulation, description: 'Construction & Civil Engineering' },
      // Hospitality & Tourism
      { label: 'Hotel Management', value: OccupationField.HotelManagement, description: 'Hospitality & Tourism' },
      { label: 'Hotel Front Office / Reception', value: OccupationField.HotelFrontOffice, description: 'Hospitality & Tourism' },
      { label: 'Culinary Arts (Chef)', value: OccupationField.CulinaryArts, description: 'Hospitality & Tourism' },
      { label: 'Restaurant & Food Service', value: OccupationField.RestaurantFoodService, description: 'Hospitality & Tourism' },
      { label: 'Event Management', value: OccupationField.EventManagement, description: 'Hospitality & Tourism' },
      { label: 'Tourism & Travel Services', value: OccupationField.TourismTravel, description: 'Hospitality & Tourism' },
      { label: 'Housekeeping Management', value: OccupationField.HousekeepingManagement, description: 'Hospitality & Tourism' },
      // Food Production & Craft
      { label: 'Baking', value: OccupationField.Baking, description: 'Food Production & Craft' },
      { label: 'Confectionery (Pastry)', value: OccupationField.Confectionery, description: 'Food Production & Craft' },
      { label: 'Butchery', value: OccupationField.Butchery, description: 'Food Production & Craft' },
      { label: 'Brewing & Malting', value: OccupationField.BrewingMalting, description: 'Food Production & Craft' },
      { label: 'Dairy Production', value: OccupationField.DairyProduction, description: 'Food Production & Craft' },
      { label: 'Food Technology', value: OccupationField.FoodTechnology, description: 'Food Production & Craft' },
      // Logistics & Transport
      { label: 'Warehouse & Supply Chain', value: OccupationField.WarehouseSupplyChain, description: 'Logistics & Transport' },
      { label: 'Freight Forwarding', value: OccupationField.FreightForwarding, description: 'Logistics & Transport' },
      { label: 'Commercial Driving', value: OccupationField.CommercialDriving, description: 'Logistics & Transport' },
      { label: 'Rail & Road Transport Services', value: OccupationField.RailRoadTransportServices, description: 'Logistics & Transport' },
      { label: 'Air Transport Services', value: OccupationField.AirTransportServices, description: 'Logistics & Transport' },
      { label: 'Postal & Courier Services', value: OccupationField.PostalCourierServices, description: 'Logistics & Transport' },
      // Education & Childcare
      { label: 'Early Childhood Education', value: OccupationField.EarlyChildhoodEducation, description: 'Education & Childcare' },
      { label: 'School Teaching', value: OccupationField.SchoolTeaching, description: 'Education & Childcare' },
      { label: 'Vocational Training / Instruction', value: OccupationField.VocationalTraining, description: 'Education & Childcare' },
      { label: 'Special Needs Education Support', value: OccupationField.SpecialNeedsEducationSupport, description: 'Education & Childcare' },
      // Engineering (non-IT)
      { label: 'Mechanical Engineering', value: OccupationField.MechanicalEngineering, description: 'Engineering (non-IT)' },
      { label: 'Electrical Engineering', value: OccupationField.ElectricalEngineering, description: 'Engineering (non-IT)' },
      { label: 'Civil Engineering', value: OccupationField.CivilEngineering, description: 'Engineering (non-IT)' },
      { label: 'Industrial Engineering', value: OccupationField.IndustrialEngineering, description: 'Engineering (non-IT)' },
      { label: 'Surveying & Geomatics', value: OccupationField.SurveyingGeomatics, description: 'Engineering (non-IT)' },
      { label: 'Technical Drafting', value: OccupationField.TechnicalDrafting, description: 'Engineering (non-IT)' },
      // Healthcare & Nursing
      { label: 'Nursing (General)', value: OccupationField.Nursing, description: 'Healthcare & Nursing' },
      { label: 'Elderly Care (Altenpflege)', value: OccupationField.ElderlyCare, description: 'Healthcare & Nursing' },
      { label: 'Pediatric / Health Care Nursing', value: OccupationField.PediatricNursing, description: 'Healthcare & Nursing' },
      { label: 'Midwifery', value: OccupationField.Midwifery, description: 'Healthcare & Nursing' },
      { label: 'Physiotherapy', value: OccupationField.Physiotherapy, description: 'Healthcare & Nursing' },
      { label: 'Occupational Therapy', value: OccupationField.OccupationalTherapy, description: 'Healthcare & Nursing' },
      { label: 'Speech Therapy', value: OccupationField.SpeechTherapy, description: 'Healthcare & Nursing' },
      { label: 'Medical Technician', value: OccupationField.MedicalTechnician, description: 'Healthcare & Nursing' },
      { label: 'Pharmacy Technician', value: OccupationField.PharmacyTechnician, description: 'Healthcare & Nursing' },
      { label: 'Dental Assistant', value: OccupationField.DentalAssistant, description: 'Healthcare & Nursing' },
      { label: 'Dental Technician', value: OccupationField.DentalTechnician, description: 'Healthcare & Nursing' },
      { label: 'Orthopedic Technician', value: OccupationField.OrthopedicTechnician, description: 'Healthcare & Nursing' },
      { label: 'Paramedic / Emergency Medical Technician', value: OccupationField.Paramedic, description: 'Healthcare & Nursing' },
      { label: 'Optometry', value: OccupationField.Optometry, description: 'Healthcare & Nursing' },
      { label: 'Hearing Aid Acoustics', value: OccupationField.HearingAidAcoustics, description: 'Healthcare & Nursing' },
      // Personal Care & Social Services
      { label: 'Hairdressing', value: OccupationField.Hairdressing, description: 'Personal Care & Social Services' },
      { label: 'Beauty Therapy / Cosmetics', value: OccupationField.BeautyTherapy, description: 'Personal Care & Social Services' },
      { label: 'Massage Therapy', value: OccupationField.MassageTherapy, description: 'Personal Care & Social Services' },
      { label: 'Disability Support Care', value: OccupationField.DisabilitySupportCare, description: 'Personal Care & Social Services' },
      // Business, Administration & Finance
      { label: 'Accounting & Finance', value: OccupationField.AccountingFinance, description: 'Business, Administration & Finance' },
      { label: 'Office Administration', value: OccupationField.OfficeAdministration, description: 'Business, Administration & Finance' },
      { label: 'Human Resources', value: OccupationField.HumanResources, description: 'Business, Administration & Finance' },
      { label: 'Industrial Clerk', value: OccupationField.IndustrialClerk, description: 'Business, Administration & Finance' },
      { label: 'Banking', value: OccupationField.Banking, description: 'Business, Administration & Finance' },
      { label: 'Insurance & Finance', value: OccupationField.InsuranceFinance, description: 'Business, Administration & Finance' },
      { label: 'Tax & Legal Administration Support', value: OccupationField.TaxLegalAdministration, description: 'Business, Administration & Finance' },
      { label: 'Real Estate', value: OccupationField.RealEstate, description: 'Business, Administration & Finance' },
      // Sales, Retail & Marketing
      { label: 'Retail Sales', value: OccupationField.RetailSales, description: 'Sales, Retail & Marketing' },
      { label: 'Wholesale & Foreign Trade', value: OccupationField.WholesaleForeignTrade, description: 'Sales, Retail & Marketing' },
      { label: 'E-Commerce', value: OccupationField.Ecommerce, description: 'Sales, Retail & Marketing' },
      { label: 'Marketing & Digital Communications', value: OccupationField.MarketingDigitalCommunications, description: 'Sales, Retail & Marketing' },
      { label: 'Automotive Sales', value: OccupationField.AutomotiveSales, description: 'Sales, Retail & Marketing' },
      // Agriculture, Nature & Environment
      { label: 'Farming & Crop Production', value: OccupationField.FarmingCropProduction, description: 'Agriculture, Nature & Environment' },
      { label: 'Animal Husbandry', value: OccupationField.AnimalHusbandry, description: 'Agriculture, Nature & Environment' },
      { label: 'Horticulture & Gardening', value: OccupationField.HorticultureGardening, description: 'Agriculture, Nature & Environment' },
      { label: 'Forestry', value: OccupationField.Forestry, description: 'Agriculture, Nature & Environment' },
      { label: 'Winemaking', value: OccupationField.Winemaking, description: 'Agriculture, Nature & Environment' },
      { label: 'Fish Farming (Aquaculture)', value: OccupationField.FishFarming, description: 'Agriculture, Nature & Environment' },
      { label: 'Environmental & Recycling Technology', value: OccupationField.EnvironmentalRecyclingTechnology, description: 'Agriculture, Nature & Environment' },
      { label: 'Water Supply Technology', value: OccupationField.WaterSupplyTechnology, description: 'Agriculture, Nature & Environment' },
      // Textile, Fashion & Leather
      { label: 'Tailoring & Fashion Design', value: OccupationField.TailoringFashionDesign, description: 'Textile, Fashion & Leather' },
      { label: 'Textile Production', value: OccupationField.TextileProduction, description: 'Textile, Fashion & Leather' },
      { label: 'Shoemaking', value: OccupationField.Shoemaking, description: 'Textile, Fashion & Leather' },
      { label: 'Upholstery', value: OccupationField.Upholstery, description: 'Textile, Fashion & Leather' },
      // Media, Printing & Design
      { label: 'Graphic & Media Design', value: OccupationField.GraphicMediaDesign, description: 'Media, Printing & Design' },
      { label: 'Photography', value: OccupationField.Photography, description: 'Media, Printing & Design' },
      { label: 'Printing Technology', value: OccupationField.PrintingTechnology, description: 'Media, Printing & Design' },
      { label: 'Film & Video Editing', value: OccupationField.FilmVideoEditing, description: 'Media, Printing & Design' },
      // IT & Software
      { label: 'Software Development', value: OccupationField.SoftwareDevelopment, description: 'IT & Software' },
      { label: 'IT Support & Networking', value: OccupationField.ItSupportNetworking, description: 'IT & Software' },
      { label: 'Data & Cybersecurity', value: OccupationField.DataCybersecurity, description: 'IT & Software' },
      { label: 'Digitalization Management', value: OccupationField.DigitalizationManagement, description: 'IT & Software' },
      // Other
      { label: 'Other', value: OccupationField.Other },
    ],
  },
  {
    id: 'workExperience',
    stepId: AssessmentStepId.WorkExperience,
    label: 'Experience',
    prompt: 'How many years of relevant work experience do you have?',
    kind: 'select',
    required: true,
    options: [
      { label: 'No formal work experience yet', value: WorkExperience.None },
      { label: 'Less than 2 years', value: WorkExperience.LessThanTwoYears },
      { label: '2–5 years', value: WorkExperience.TwoToFiveYears },
      { label: 'More than 5 years', value: WorkExperience.MoreThanFiveYears },
    ],
  },
  {
    id: 'desiredPath',
    stepId: AssessmentStepId.Path,
    label: 'Desired Path',
    prompt: 'Which pathway interests you most?',
    kind: 'select',
    required: true,
    options: [
      { label: 'University', value: DesiredPath.University },
      { label: 'Ausbildung', value: DesiredPath.Ausbildung },
      { label: 'Employment', value: DesiredPath.Employment },
      { label: 'I’m not sure', value: DesiredPath.Unsure },
    ],
  },
  {
    id: 'germanLevel',
    stepId: AssessmentStepId.German,
    label: 'German Level',
    prompt: 'What is your German language level?',
    kind: 'select',
    required: true,
    options: [
      { label: 'None', value: LanguageLevel.None },
      { label: 'A1', value: LanguageLevel.A1 },
      { label: 'A2', value: LanguageLevel.A2 },
      { label: 'B1', value: LanguageLevel.B1 },
      { label: 'B2', value: LanguageLevel.B2 },
      { label: 'C1', value: LanguageLevel.C1 },
      { label: 'C1+', value: LanguageLevel.C1Plus },
    ],
  },
  {
    id: 'englishLevel',
    stepId: AssessmentStepId.English,
    label: 'English Level',
    prompt: 'What is your English language level?',
    kind: 'select',
    required: true,
    options: [
      { label: 'Beginner', value: LanguageLevel.Beginner },
      { label: 'Intermediate', value: LanguageLevel.Intermediate },
      { label: 'Advanced', value: LanguageLevel.Advanced },
      { label: 'Fluent', value: LanguageLevel.Fluent },
    ],
  },
  {
    id: 'languageCertificate',
    stepId: AssessmentStepId.LanguageCertificate,
    label: 'Language Proof',
    prompt: 'Do you hold a certified language exam result?',
    helpText:
      'Certificates like Goethe-Zertifikat, telc, TestDaF, IELTS or TOEFL carry more weight than a self-rated level.',
    kind: 'select',
    required: true,
    options: [
      { label: 'Not yet', value: LanguageCertificateStatus.None },
      {
        label: 'Yes — certified German exam',
        value: LanguageCertificateStatus.CertifiedGerman,
        description: 'e.g. Goethe-Zertifikat, telc, TestDaF, DSH',
      },
      {
        label: 'Yes — certified English exam',
        value: LanguageCertificateStatus.CertifiedEnglish,
        description: 'e.g. IELTS, TOEFL, Cambridge',
      },
      {
        label: 'Yes — certified exams in both languages',
        value: LanguageCertificateStatus.CertifiedBoth,
      },
    ],
  },
  {
    id: 'passportStatus',
    stepId: AssessmentStepId.Passport,
    label: 'Passport Status',
    prompt: 'Do you currently hold a valid passport?',
    kind: 'select',
    required: true,
    options: [
      { label: 'Yes', value: PassportStatus.Yes },
      { label: 'No', value: PassportStatus.No },
      { label: 'Expired', value: PassportStatus.Expired },
    ],
  },
  {
    id: 'germanyConnection',
    stepId: AssessmentStepId.GermanyConnection,
    label: 'Connection to Germany',
    prompt: 'Do you have any personal connection to Germany?',
    helpText:
      "Select all that apply — this doesn't affect your eligibility, it just helps us understand your situation.",
    kind: 'select',
    required: false,
    multiSelect: true,
    exclusiveOptionValue: GermanyConnection.None,
    options: [
      {
        label: "I don't have any connection to Germany",
        value: GermanyConnection.None,
      },
      {
        label: "I've visited Germany before",
        value: GermanyConnection.VisitedBefore,
        description: 'As a tourist or for a short trip',
      },
      {
        label: "I've lived, studied, or trained in Germany before",
        value: GermanyConnection.LivedStudiedTrainedBefore,
      },
      {
        label: 'I have family living in Germany',
        value: GermanyConnection.FamilyInGermany,
      },
      {
        label: 'I have friends living in Germany',
        value: GermanyConnection.FriendsInGermany,
      },
      {
        label: 'I attended a German school or language institute',
        value: GermanyConnection.AttendedGermanSchoolOrInstitute,
        description: 'e.g. a German-curriculum school, Goethe-Institut',
      },
      {
        label: "I've contacted or applied to a German employer, university, or program before",
        value: GermanyConnection.PriorApplicationOrContact,
      },
      {
        label: 'I have German heritage or ancestry',
        value: GermanyConnection.GermanHeritage,
      },
    ],
  },
  {
    id: 'financialSituation',
    stepId: AssessmentStepId.Budget,
    label: 'Financial Situation',
    prompt: 'What funds do you currently have available for your move?',
    helpText:
      'German study visas currently require proof of about €11,904/year (a blocked account). This just helps us understand where you stand — there is no wrong answer.',
    kind: 'select',
    required: true,
    options: [
      { label: 'Less than €5,000', value: FinancialSituation.LessThan5000 },
      {
        label: '€5,000–€12,000',
        value: FinancialSituation.Between5000And12000,
      },
      {
        label: 'More than €12,000',
        value: FinancialSituation.MoreThan12000,
        description: 'Meets the typical blocked-account requirement',
      },
      { label: 'Not Sure', value: FinancialSituation.Unsure },
    ],
  },
  {
    id: 'startTimeline',
    stepId: AssessmentStepId.Timeline,
    label: 'Timeline',
    prompt: 'When would you like to start your journey to Germany?',
    kind: 'select',
    required: true,
    options: [
      {
        label: 'As soon as possible',
        value: StartTimeline.AsSoonAsPossible,
        description: 'Within 6 months',
      },
      { label: '6–12 months from now', value: StartTimeline.SixToTwelveMonths },
      { label: 'More than a year from now', value: StartTimeline.MoreThanAYear },
      {
        label: 'Still exploring, no fixed timeline',
        value: StartTimeline.StillExploring,
      },
    ],
  },
  {
    id: 'regionFlexibility',
    stepId: AssessmentStepId.RegionFlexibility,
    label: 'Region',
    prompt: 'Are you open to living in any region of Germany?',
    helpText:
      'Opportunities are often easier to find outside major cities like Berlin or Munich.',
    kind: 'select',
    required: true,
    options: [
      {
        label: 'Only major cities',
        value: RegionFlexibility.MajorCitiesOnly,
        description: 'e.g. Berlin, Munich, Frankfurt',
      },
      {
        label: 'Open to any region',
        value: RegionFlexibility.OpenToAnyRegion,
        description: 'Including smaller towns',
      },
      { label: 'Not sure yet', value: RegionFlexibility.NotSureYet },
    ],
  },
] as const satisfies ReadonlyArray<
  AssessmentQuestionDefinition<AssessmentQuestionId>
>;

export const ASSESSMENT_STEP_DEFINITIONS = [
  {
    id: AssessmentStepId.Country,
    title: 'Country',
    description: 'Where you currently live.',
    questionIds: ['country'],
  },
  {
    id: AssessmentStepId.Age,
    title: 'Age',
    description: 'Your age range.',
    questionIds: ['age'],
  },
  {
    id: AssessmentStepId.Education,
    title: 'Education',
    description: 'Your highest education level.',
    questionIds: ['highestEducation'],
  },
  {
    id: AssessmentStepId.OccupationField,
    title: 'Occupation',
    description: 'The field of your education or experience.',
    questionIds: ['occupationField'],
  },
  {
    id: AssessmentStepId.WorkExperience,
    title: 'Experience',
    description: 'Your relevant work experience.',
    questionIds: ['workExperience'],
  },
  {
    id: AssessmentStepId.Path,
    title: 'Pathway',
    description: 'The path that interests you most.',
    questionIds: ['desiredPath'],
  },
  {
    id: AssessmentStepId.German,
    title: 'German',
    description: 'Your German level.',
    questionIds: ['germanLevel'],
  },
  {
    id: AssessmentStepId.English,
    title: 'English',
    description: 'Your English level.',
    questionIds: ['englishLevel'],
  },
  {
    id: AssessmentStepId.LanguageCertificate,
    title: 'Language Proof',
    description: 'Any certified language exam results.',
    questionIds: ['languageCertificate'],
  },
  {
    id: AssessmentStepId.Passport,
    title: 'Passport',
    description: 'Your passport status.',
    questionIds: ['passportStatus'],
  },
  {
    id: AssessmentStepId.GermanyConnection,
    title: 'Connection',
    description: 'Any personal connection to Germany — select all that apply.',
    questionIds: ['germanyConnection'],
  },
  {
    id: AssessmentStepId.Budget,
    title: 'Budget',
    description: 'Your available budget.',
    questionIds: ['financialSituation'],
  },
  {
    id: AssessmentStepId.Timeline,
    title: 'Timeline',
    description: 'When you want to start.',
    questionIds: ['startTimeline'],
  },
  {
    id: AssessmentStepId.RegionFlexibility,
    title: 'Region',
    description: 'Your flexibility on location within Germany.',
    questionIds: ['regionFlexibility'],
  },
] as const satisfies ReadonlyArray<
  AssessmentStepDefinition<AssessmentQuestionId>
>;

export function createDefaultAssessmentAnswers(): AssessmentAnswers {
  return {
    country: '',
    age: null,
    highestEducation: null,
    occupationField: null,
    workExperience: null,
    desiredPath: null,
    germanLevel: null,
    englishLevel: null,
    languageCertificate: null,
    passportStatus: null,
    germanyConnection: [],
    financialSituation: null,
    startTimeline: null,
    regionFlexibility: null,
  };
}

export function createDefaultAssessmentState(): AssessmentState {
  return {
    assessmentType: AssessmentType.GermanyPathway,
    currentStepId: AssessmentStepId.Country,
    answers: createDefaultAssessmentAnswers(),
    metadata: {
      lastUpdated: null,
    },
  };
}

export function getAssessmentQuestionDefinition(questionId: string) {
  return (
    ASSESSMENT_QUESTION_DEFINITIONS.find(
      (question) => question.id === questionId
    ) ?? null
  );
}

export function getAssessmentStepDefinition(stepId: AssessmentStepId) {
  return ASSESSMENT_STEP_DEFINITIONS.find((step) => step.id === stepId) ?? null;
}

export function getAssessmentStepIndex(stepId: AssessmentStepId) {
  return ASSESSMENT_STEP_DEFINITIONS.findIndex((step) => step.id === stepId);
}

export function getAssessmentSnapshot(
  state: AssessmentState
): AssessmentSnapshot {
  return {
    ...state,
    currentStepIndex: Math.max(0, getAssessmentStepIndex(state.currentStepId)),
  };
}
