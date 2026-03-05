import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recipes | meal.photos',
  description: 'Community-requested recipes from top-rated meals on meal.photos',
};

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
