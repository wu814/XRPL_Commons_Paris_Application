'use client';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useRouter } from 'next/navigation';
import RegistrationForm from '@/components/register/RegistrationForm';

export default function RegisterPage() {
  const { status, session } = useSupabaseSession();
  const router = useRouter();

  if (status === 'loading') return null; // or a spinner
  if (status === 'unauthenticated' || !session) {
    router.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen flex justify-center p-4 py-8 overflow-y-auto">
      <RegistrationForm userId={session.id} userEmail={session.email} />
    </div>
  );
}