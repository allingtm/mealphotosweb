import { SearchClient } from '@/components/search/SearchClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Find dishes, cuisines, and businesses near you.',
};

export default function SearchPage() {
  return <SearchClient />;
}
