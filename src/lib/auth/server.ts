import { createSupabaseAuthClient, createSupabaseServiceClient } from '@/lib/supabase/server';

// Server-side get current user from users table
export async function getCurrentUser() {
  const supabase = await createSupabaseAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('id, username, account_type, kyc_status, created_at')
    .eq('id', user?.id)
    .maybeSingle();
  
  if (error || !userData || userDataError) {
    return null;
  }

  return userData;
}

// Server-side get current user from auth table
export async function getCurrentUserFromAuthTable() {
  const supabase = await createSupabaseAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}


// Check if user needs registration (server-side)
export async function checkUserRegistration(userId: string) {
  const supabase = await createSupabaseAuthClient();
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, email, account_type, kyc_status')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) {
    return { needsRegistration: true };
  }

  return {
    needsRegistration: !user.username || !user.kyc_status || !user.account_type,
  };
}

// Create user entry after OAuth (server-side)
export async function createUserFromOAuth(authUser: any) {
  // Use authenticated client with proper RLS policy
  const supabase = createSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: authUser.id, // Supabase will automatically convert string to UUID
      email: authUser.email,
      username: authUser.email, // Temporary username, will be changed during registration
    })
    .select()
    .single();

  return { data, error };
}

