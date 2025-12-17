import { redirect } from 'next/navigation';
import { getSessionFromRequest, validateSession } from '@/lib/auth';

export default async function Home() {
  // Check if user is logged in
  const sessionToken = await getSessionFromRequest();
  const isValid = await validateSession(sessionToken);
  
  if (isValid) {
    // User is logged in, redirect to calls
    redirect('/calls');
  } else {
    // User is not logged in, redirect to login
    redirect('/login');
  }
}
