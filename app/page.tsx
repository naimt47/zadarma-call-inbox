import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to calls page (middleware will handle authentication)
  redirect('/calls');
}
