import { redirect } from 'next/navigation';

// v3: /profile redirects to /me
export default function ProfilePage() {
  redirect('/me');
}
