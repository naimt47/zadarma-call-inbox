'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LOGIN_PATH = '/a7f3b2c9d1e4f5g6h8i0j2k4';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if password exists in localStorage
    const password = localStorage.getItem('authPassword');
    
    if (password) {
      // Password exists, redirect to calls
      router.push('/calls');
    } else {
      // No password, redirect to login
      router.push(LOGIN_PATH);
    }
  }, [router]);
  
  return null;
}
