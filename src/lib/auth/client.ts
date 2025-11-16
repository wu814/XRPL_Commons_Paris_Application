import { createSupabaseBrowserClient } from '../supabase/client';

// Client-side Google OAuth
export async function signInWithGoogle(): Promise<{ data: any; error: any }> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { data, error };
}

// Sign out
export async function signOut(): Promise<{ error: any }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function refreshSessionToHome(): Promise<{ error: any }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.refreshSession();
  return { error };
}


// Check username availability (client-side)
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username:', error);
      return false;
    }

    return !data; // Available if no data found
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
}

