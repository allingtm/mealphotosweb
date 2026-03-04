const CF_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH;

export default function cloudflareLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // If src is already a full URL (e.g. avatar from Google), pass through
  if (src.startsWith('http')) return src;

  const variant = width <= 200 ? 'thumbnail' : width <= 800 ? 'feed' : 'full';
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${src}/${variant}`;
}
