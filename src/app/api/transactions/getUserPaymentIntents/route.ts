import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '@/lib/supabase/server';
import { getUserProfileData } from '@/services/userService';
import { getUserPaymentIntentsWithCounterparties } from '@/services/transactionService';

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get authenticated user from session
    const supabase = await createSupabaseAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 2: Get user's yona_id
    const userProfile = await getUserProfileData(user.id);
    if (!userProfile) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Step 3: Get payment intents with counterparty info
    const paymentIntents = await getUserPaymentIntentsWithCounterparties(userProfile.yona_id);

    return NextResponse.json({
      success: true,
      paymentIntents: paymentIntents,
    });
  } catch (error) {
    console.error('Error in getUserPaymentIntents:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        paymentIntents: [],
      },
      { status: 500 }
    );
  }
}

