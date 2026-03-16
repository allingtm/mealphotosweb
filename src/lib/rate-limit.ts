import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = Redis.fromEnv();

// Rate limit tiers by route type
export const rateLimits = {
  read: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m'), prefix: 'rl:read' }),
  write: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:write' }),
  upload: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:upload' }),
  search: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:search' }),
  auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:auth' }),
};

export async function applyRateLimit(
  identifier: string,
  tier: keyof typeof rateLimits = 'read'
) {
  const { success, limit, remaining, reset } = await rateLimits[tier].limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }
  return null;
}
