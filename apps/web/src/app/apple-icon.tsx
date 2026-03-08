import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF7F3',
        }}
      >
        <div style={{ position: 'relative', width: 140, height: 140, display: 'flex' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 97,
              height: 140,
              borderRadius: '50%',
              background: '#4D9956',
              opacity: 0.85,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 43,
              top: 0,
              width: 97,
              height: 140,
              borderRadius: '50%',
              background: '#5B8DEF',
              opacity: 0.85,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
