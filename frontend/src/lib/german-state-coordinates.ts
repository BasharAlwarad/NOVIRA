// Approximate center coordinates for each of the 16 German federal states
// — each state's capital-city coordinates, used as a stand-in for "center
// of the state." This is a marker-position lookup for an overview map, not
// an attempt at accurate state-boundary geometry — precise border polygons
// would be much higher-risk to source/verify correctly than one
// well-documented point per state. Verified against each capital's
// Wikipedia infobox coordinates (2026-09-29), not guessed from memory.
// Keys must match backend/Services/GermanStateMapper.cs's state name
// strings exactly (and therefore StateCount.state from /matches).
export const GERMAN_STATE_COORDINATES: Record<string, [number, number]> = {
  'Baden-Württemberg': [48.7775, 9.18],
  Bavaria: [48.1375, 11.575],
  Berlin: [52.52, 13.405],
  Brandenburg: [52.4006, 13.0592],
  Bremen: [53.0758, 8.8072],
  Hamburg: [53.55, 10.0],
  Hesse: [50.0825, 8.24],
  'Lower Saxony': [52.367, 9.717],
  'Mecklenburg-Vorpommern': [53.633, 11.417],
  'North Rhine-Westphalia': [51.2256, 6.7767],
  'Rhineland-Palatinate': [49.9994, 8.2736],
  Saarland: [49.233, 7.0],
  Saxony: [51.05, 13.74],
  'Saxony-Anhalt': [52.1317, 11.6392],
  'Schleswig-Holstein': [54.3233, 10.1394],
  Thuringia: [50.9781, 11.0289],
};
