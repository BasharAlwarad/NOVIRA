'use client';

import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import { GERMAN_STATE_COORDINATES } from '@/lib/german-state-coordinates';
import type { StateCount } from '@/lib/contracts/matches';

const GERMANY_CENTER: [number, number] = [51.1657, 10.4515];

// A ranked-by-size marker map, not a shaded state-border choropleth —
// replaces the earlier flat badge-list design (2026-09-29) after the
// founder asked for a real map. Marker position uses each state's capital-
// city coordinates (see german-state-coordinates.ts) rather than accurate
// border polygons — much lower risk to source correctly, and enough for a
// low-detail "here's roughly where your matches are" hint. OpenStreetMap
// tiles — free, no API key needed, same reasoning that kept this dependency
// list minimal elsewhere in the app.
export function GermanyMatchesMap({ stateBreakdown }: { stateBreakdown: StateCount[] }) {
  if (stateBreakdown.length === 0) {
    return null;
  }

  const maxCount = Math.max(...stateBreakdown.map((entry) => entry.count));

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <MapContainer
        center={GERMANY_CENTER}
        zoom={6}
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
            // rather than guess" rule german-state-coordinates.ts follows).
            return null;
          }

          const radius = 8 + (entry.count / maxCount) * 18;

          return (
            <CircleMarker
              key={entry.state}
              center={coordinates}
              radius={radius}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.5, weight: 1.5 }}
            >
              <Tooltip direction="top">
                {entry.state}: {entry.count} {entry.count === 1 ? 'match' : 'matches'}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
