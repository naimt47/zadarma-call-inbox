import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to 404 - don't expose login URL
  redirect('/404');
}
