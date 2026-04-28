import { ImageResponse } from 'next/og';

/**
 * Auto-generated 1200×630 OG image. Runs on Node (not Edge) because
 * Railway's standalone Next server doesn't support the Edge runtime —
 * declaring `runtime = 'edge'` here previously caused every share
 * link to 502 on social-card scrape. ImageResponse works fine on
 * Node, just slightly slower per request.
 *
 * Ship a real designed image into /public/og.png later — Next will
 * prefer the static file over this route once it exists.
 */
export const runtime = 'nodejs';
export const alt = 'BottomUP — AI-protected copy trading marketplace';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: 80,
          // Satori in @vercel/og 0.6+ rejects the
          // `backgroundColor` + `backgroundImage` split that older
          // versions accepted: it tries to validate the color string
          // as an image URL and fails with
          // `Invalid background image: "#0a0a0c"`. The shorthand
          // `background:` property layers the gradients over the
          // solid color in one go and parses cleanly.
          background:
            'radial-gradient(circle at 20% 20%, rgba(124,92,255,0.35), transparent 55%), radial-gradient(circle at 80% 75%, rgba(255,138,76,0.30), transparent 60%), #0a0a0c',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            opacity: 0.9,
          }}
        >
          <span
            style={{
              background:
                'linear-gradient(90deg, #FF8A4C 0%, #7C5CFF 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            BottomUP
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            marginTop: 28,
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
            maxWidth: 1000,
          }}
        >
          <span>The App Store of&nbsp;</span>
          <span
            style={{
              background:
                'linear-gradient(90deg, #FF8A4C 0%, #7C5CFF 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            smart money.
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 30,
            color: '#c5c5cf',
            maxWidth: 940,
            lineHeight: 1.35,
          }}
        >
          Elite traders, AI agents, and algorithmic bots — one marketplace,
          protected by Foxy AI.
        </div>

        <div
          style={{
            position: 'absolute',
            left: 80,
            bottom: 64,
            display: 'flex',
            gap: 14,
            fontSize: 22,
            color: '#9a9aa6',
            letterSpacing: '0.02em',
          }}
        >
          <span>bupcore.ai</span>
          <span>·</span>
          <span>225 data sources</span>
          <span>·</span>
          <span>$1.59B lifetime volume</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
