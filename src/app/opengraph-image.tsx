import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'meal.photos — Rate Real Meals';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#121212',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Fork & Knife Icon */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E8A838"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Fork */}
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M3 2h8" />
          <line x1="3" y1="6" x2="11" y2="6" />
          {/* Knife */}
          <path d="M17 2v20" />
          <path d="M21 12c0-5.5-1.8-10-4-10s-4 4.5-4 10h8z" />
        </svg>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 32,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#F5F0E8',
              letterSpacing: '-2px',
            }}
          >
            meal.photos
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#E8A838',
              marginTop: 16,
              fontWeight: 500,
            }}
          >
            A global stage for food culture.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
