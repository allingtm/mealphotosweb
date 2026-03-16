import { redirect } from 'next/navigation';

// v3: /profile/[username] redirects to /business/[username]
// Consumer profiles are at /me, business profiles at /business/[username]
export default async function ProfileUsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/business/${username}`);
}
