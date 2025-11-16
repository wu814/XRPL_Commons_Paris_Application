import { createSupabaseAuthClient } from '@/lib/supabase/server';
import { createUserFromOAuth } from '@/lib/auth/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseAuthClient();
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Check if user exists in our users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      // If user doesn't exist, create them
      if (!existingUser) {
        const { error: createError } = await createUserFromOAuth(data.user);
       
        if (createError) {
          console.error('❌ Error creating user:', createError);
          return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }
      }

      // Redirect to home page, middleware will handle registration check
      console.log('🏠 Redirecting to home...');
      return NextResponse.redirect(`${origin}/home`);
    }
  }

  // Return the user to an error page with instructions
  console.log('❌ Redirecting to error page - no code or auth failed');
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
