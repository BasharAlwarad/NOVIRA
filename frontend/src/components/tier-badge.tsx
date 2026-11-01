import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';

// Round 12: a real illustrated medal — a radial-gradient metal circle (the
// highlight sits off-center toward the top-left, which is what makes a
// flat circle read as a lit, rounded object instead of a color swatch) plus
// a two-tailed ribbon peeking out from behind it, replacing the earlier
// "icon on a plain white circle" badge. No external image/licensing
// dependency — pure inline SVG, themeable, crisp at any size.
export type TierVariant = 'free' | 'bronze' | 'silver' | 'gold';

const METAL: Record<Exclude<TierVariant, 'free'>, { highlight: string; mid: string; shadow: string; rim: string; ribbon: string }> = {
  bronze: { highlight: '#f3c28b', mid: '#a0522d', shadow: '#4a2a12', rim: '#4a2a12', ribbon: '#5c3317' },
  silver: { highlight: '#f8fafc', mid: '#94a3b8', shadow: '#334155', rim: '#334155', ribbon: '#334155' },
  gold: { highlight: '#fff6d8', mid: '#e8b923', shadow: '#8a5a00', rim: '#8a6508', ribbon: '#8a6508' },
};

// sm/lg share one viewBox (0 0 100 125) so the ribbon tails/circle stay
// proportioned correctly between them — they're meant to sit just below a
// gradient header band, pulled up via a negative marginTop to visually hang
// the medal off its bottom edge, which is why the circle is placed in the
// upper ~2/3 of that viewBox rather than centered in it. `xs` renders
// differently (see the early return in TierBadge below) — a standalone
// inline badge with no header band to hang a ribbon off of, so it crops to
// just the circle instead of reusing that off-center layout.
const SIZE: Record<'xs' | 'sm' | 'lg', { width: number; height: number; icon: number; marginTop: number }> = {
  xs: { width: 28, height: 28, icon: 14, marginTop: 0 },
  sm: { width: 56, height: 70, icon: 24, marginTop: -28 },
  lg: { width: 80, height: 100, icon: 32, marginTop: -40 },
};

export function TierBadge({
  icon: Icon,
  variant,
  size = 'sm',
}: {
  icon: LucideIcon;
  variant: TierVariant;
  // 'xs' for a small inline pill (account/page.tsx's current-plan badge);
  // 'sm' (default) for the compact cards on /matches, /account, and the
  // homepage; 'lg' for the full-page headers on /plans/tier-X.
  size?: 'xs' | 'sm' | 'lg';
}) {
  const gradientId = useId();
  const { width, height, icon: iconSize, marginTop } = SIZE[size];
  const metal = variant === 'free' ? null : METAL[variant];

  // Standalone inline badge (account/page.tsx's compact current-plan pill)
  // — crops the shared circle art to just its own bounding box (viewBox "9
  // 1 82 82" is exactly the white halo's bounds: cx 50 cy 42 r 41) instead
  // of reusing sm/lg's taller viewBox, which reserves space below the
  // circle for ribbon tails that don't fit at this scale anyway. Found
  // live 2026-11-01: reusing that viewBox left the circle sitting in the
  // upper two-thirds of the pill, reading as off-center.
  if (size === 'xs') {
    return (
      <div className="relative mx-auto" style={{ width, height }}>
        <svg viewBox="9 1 82 82" width={width} height={height} className="absolute inset-0">
          <defs>
            {metal && (
              <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor={metal.highlight} />
                <stop offset="55%" stopColor={metal.mid} />
                <stop offset="100%" stopColor={metal.shadow} />
              </radialGradient>
            )}
          </defs>
          <g className="drop-shadow-md">
            <circle cx="50" cy="42" r="41" fill="white" />
            <circle
              cx="50"
              cy="42"
              r="38"
              fill={metal ? `url(#${gradientId})` : '#e2e8f0'}
              stroke={metal ? metal.rim : '#94a3b8'}
              strokeWidth="3"
            />
          </g>
        </svg>
        <Icon
          className={`absolute drop-shadow-sm ${metal ? 'text-white' : 'text-slate-500'}`}
          style={{
            width: iconSize,
            height: iconSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto" style={{ width, height, marginTop }}>
      <svg viewBox="0 0 100 125" width={width} height={height} className="absolute inset-0">
        {/* Ribbon tails, drawn first so the medal circle overlaps their top
            edge — only the three paid tiers get one; Free stays a plain
            flat circle with no rank implied (same reasoning as round 6's
            neutral current-plan banner). The wrapper/viewBox stay identical
            either way so a Free card's badge takes up the same vertical
            space as a paid one, keeping headings aligned in a shared row
            (e.g. the homepage's 4-card /#services strip). */}
        {metal && (
          <>
            <path d="M32,30 L48,30 L50,118 L38,100 L26,118 Z" fill={metal.ribbon} />
            <path d="M52,30 L68,30 L74,118 L62,100 L50,118 Z" fill={metal.ribbon} />
          </>
        )}
        <defs>
          {metal && (
            <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor={metal.highlight} />
              <stop offset="55%" stopColor={metal.mid} />
              <stop offset="100%" stopColor={metal.shadow} />
            </radialGradient>
          )}
        </defs>
        <g className="drop-shadow-md">
          {/* White halo — same visual job the old ring-4 ring-white did,
              separating the medal from the gradient header behind it. */}
          <circle cx="50" cy="42" r="41" fill="white" />
          <circle
            cx="50"
            cy="42"
            r="38"
            fill={metal ? `url(#${gradientId})` : '#e2e8f0'}
            stroke={metal ? metal.rim : '#94a3b8'}
            strokeWidth="3"
          />
        </g>
      </svg>
      <Icon
        // Free's circle is flat light gray, not a dark/mid metal tone, so a
        // white icon there would have poor contrast — only the three
        // metallic variants get the white emblem-on-metal treatment.
        className={`absolute drop-shadow-sm ${metal ? 'text-white' : 'text-slate-500'}`}
        style={{
          width: iconSize,
          height: iconSize,
          top: '33.6%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}
