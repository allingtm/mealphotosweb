export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <h1>Profile: {username}</h1>;
}
