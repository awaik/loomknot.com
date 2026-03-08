import { ImageResponse } from 'next/og';

export const alt = 'LoomKnot — The Web That Knows You';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF7F3',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Logo ovals */}
        <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', marginBottom: 40 }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 83,
              height: 120,
              borderRadius: '50%',
              background: '#4D9956',
              opacity: 0.85,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 37,
              top: 0,
              width: 83,
              height: 120,
              borderRadius: '50%',
              background: '#5B8DEF',
              opacity: 0.85,
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 400,
            color: '#1C1410',
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}
        >
          LoomKnot
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 400,
            color: '#8A7E74',
            fontFamily: 'sans-serif',
          }}
        >
          The Web That Knows You
        </div>
      </div>
    ),
    { ...size },
  );
}
