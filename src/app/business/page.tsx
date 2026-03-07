import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function BusinessPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.venue) {
    const qs = new URLSearchParams();
    qs.set('venue', params.venue);
    if (params.name) qs.set('name', params.name);
    redirect(`/business/onboard?${qs.toString()}`);
  }

  redirect('/pricing');
}
