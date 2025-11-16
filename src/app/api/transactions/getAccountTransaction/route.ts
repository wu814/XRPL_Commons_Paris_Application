import { NextRequest, NextResponse } from 'next/server';
import { getAccountTransaction } from '@/utils/xrpl/getAccountTransaction';
import { createSupabaseAuthClient } from '@/lib/supabase/server';
import { getUserProfileData } from '@/services/userService';
import { getMemberByMemberId } from '@/services/paymentService';
import { normalizeApiEndpoint } from '@/services/memberService';

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

    // Step 2: Get user's yona_id and member_id
    const userProfile = await getUserProfileData(user.id);
    if (!userProfile) {
      return NextResponse.json(
        { success: false, message: 'User not found or missing member_id' },
        { status: 404 }
      );
    }

    // Step 3: Get member info to fetch user addresses
    const member = await getMemberByMemberId(userProfile.member_id);
    if (!member || !member.api_endpoint) {
      return NextResponse.json(
        { success: false, message: 'Member not found or no API endpoint' },
        { status: 404 }
      );
    }

    // Step 4: Fetch all user addresses from member API
    const normalizedEndpoint = normalizeApiEndpoint(member.api_endpoint);
    const memberApiEndpoint = `${normalizedEndpoint}/api/member/get-user-addresses`;

    const memberApiResponse = await fetch(memberApiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Member-ID': member.member_id,
        'X-Client-ID': 'YONA',
      },
      body: JSON.stringify({ yona_id: userProfile.yona_id }),
    });

    if (!memberApiResponse.ok) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user addresses from member API',
        transactions: [],
        addresses: [],
      }, { status: memberApiResponse.status });
    }

    const addressesResult = await memberApiResponse.json();

    if (!addressesResult.success || !addressesResult.addresses || addressesResult.addresses.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        addresses: [],
      });
    }

    // Ensure addresses is a string array
    const addresses: string[] = Array.isArray(addressesResult.addresses)
      ? addressesResult.addresses.map((addr: any) => 
          typeof addr === 'string' ? addr : addr.classic_address
        ).filter((addr: string) => addr !== null && addr !== undefined)
      : [];

    if (addresses.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        addresses: [],
      });
    }

    // Step 5: Fetch transactions for all addresses
    const allTransactions: any[] = [];
    const errors: string[] = [];

    for (const address of addresses) {
      try {
        const transactions = await getAccountTransaction(address);
        allTransactions.push(...transactions);
      } catch (err) {
        errors.push(`Error fetching transactions for ${address}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      addresses: addresses,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch transactions',
        transactions: []
      },
      { status: 500 }
    );
  }
}

