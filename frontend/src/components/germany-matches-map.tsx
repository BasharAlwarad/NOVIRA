'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import { CollapsibleSection } from '@/components/collapsible-section';
import { GERMAN_STATE_COORDINATES } from '@/lib/german-state-coordinates';
import type { StateCount } from '@/lib/contracts/matches';

const GERMANY_CENTER: [number, number] = [51.1657, 10.4515];

// Round 19: shows the real match count inside each marker instead of only
// on hover — needs a custom L.divIcon (plain HTML/CSS) rather than the
// earlier CircleMarker (an SVG path with no room for text content). Inline
// styles, not Tailwind classes — this HTML string is handed straight to
// Leaflet and inserted outside Next's own render tree, so there's no
// guarantee the app's compiled stylesheet covers classes referenced only
// here.
function countMarkerIcon(count: number, diameter: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width:${diameter}px;height:${diameter}px;
      display:flex;align-items:center;justify-content:center;
      background:#10b981;color:#ffffff;font-weight:700;
      font-size:${diameter < 32 ? 11 : 13}px;font-family:inherit;
      border-radius:9999px;border:2px solid #ffffff;
      box-shadow:0 2px 8px rgba(15,23,42,0.35);
    ">${count}</div>`,
    className: '',
    iconSize: [diameter, diameter],
    iconAnchor: [diameter / 2, diameter / 2],
  });
}

// A ranked-by-size marker map, not a shaded state-border choropleth —
// replaces the earlier flat badge-list design (2026-09-29) after the
// founder asked for a real map. Marker position uses each state's capital-
// city coordinates (see german-state-coordinates.ts) rather than accurate
// border polygons — much lower risk to source correctly, and enough for a
// low-detail "here's roughly where your matches are" hint. OpenStreetMap
// tiles — free, no API key needed, same reasoning that kept this dependency
// list minimal elsewhere in the app.
//
// Round 20: the hide/show bar is now the shared CollapsibleSection
// (collapsible-section.tsx) instead of a bespoke button — same unmount/
// remount-on-toggle approach round 19 already used (never CSS-resize the
// still-mounted MapContainer; Leaflet's tiles don't redraw correctly on a
// resize without an explicit map.invalidateSize() call), just sharing the
// UI shell with the tier-cards dropdown below it on /matches now.
export function GermanyMatchesMap({ stateBreakdown }: { stateBreakdown: StateCount[] }) {
  if (stateBreakdown.length === 0) {
    return null;
  }

  const maxCount = Math.max(...stateBreakdown.map((entry) => entry.count));

  return (
    // `isolate` creates a new stacking context scoped to this wrapper —
    // found live: Leaflet's own internal panes/controls use z-index values
    // (commonly 400-1000+) that exceed the sticky nav's z-50, so the map
    // painted over it on scroll. Rather than chase whatever number Leaflet
    // happens to pick (version-fragile), isolation contains all of
    // Leaflet's internal stacking inside this div — nothing it does can
    // ever escape to overlap a sibling/ancestor like the nav.
    <div className="isolate">
      <CollapsibleSection
        title="Germany matches map"
        description="Where your matches are — the number in each marker is how many opportunities are in that state."
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <MapContainer
            center={GERMANY_CENTER}
            zoom={5}
            minZoom={5}
            maxZoom={8}
            scrollWheelZoom={false}
            style={{ height: '320px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stateBreakdown.map((entry) => {
              const coordinates = GERMAN_STATE_COORDINATES[entry.state];
              if (!coordinates) {
                // A state name react-leaflet has no marker position for —
                // omit rather than place it somewhere wrong (same "drop
                // rather than guess" rule german-state-coordinates.ts
                // follows).
                return null;
              }

              const diameter = 24 + (entry.count / maxCount) * 28;

              return (
                <Marker
                  key={entry.state}
                  position={coordinates}
                  icon={countMarkerIcon(entry.count, diameter)}
                >
                  <Tooltip direction="top">
                    {entry.state}: {entry.count} {entry.count === 1 ? 'match' : 'matches'}
                  </Tooltip>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </CollapsibleSection>
    </div>
  );
}
