import { redirect } from 'next/navigation';
import { getSessionFromRequest, validateSession } from '@/lib/auth';

const LOGIN_PATH = '/a7f3b2c9d1e4f5g6h8i0j2k4';

export default async function Home() {
  const sessionToken = await getSessionFromRequest();
  const isValid = await validateSession(sessionToken);
  
  if (isValid) {
    redirect('/calls');
  } else {
    redirect(LOGIN_PATH);
  }
}
