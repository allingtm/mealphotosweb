export default async function MealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <h1>Meal: {id}</h1>;
}
