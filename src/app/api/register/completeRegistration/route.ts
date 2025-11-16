import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromAuthTable } from '@/lib/auth/server';
import { isUsernameTaken, updateUserProfile, createPassword } from '@/services/userService';
import { hashPassword } from '@/utils/app/hashPassword';
import { APIResponse } from '@/types/apitypes';

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<{ user_id: string; username: string; account_type: string }>>> {
  try {
    const userFromAuthTable = await getCurrentUserFromAuthTable();
    if (!userFromAuthTable) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { username, accountType, password, wallet_type, self_host_address, member_id } = await request.json();
    console.log('Registration data:', { username, accountType, wallet_type, self_host_address, member_id });
    

    if (!username) {
      return NextResponse.json({ success: false, message: 'Username is required' }, { status: 400 });
    }

    if (!wallet_type) {
      return NextResponse.json({ success: false, message: 'Wallet type is required' }, { status: 400 });
    }

    // Validate member_id is provided
    if (!member_id) {
      return NextResponse.json({ success: false, message: 'Member ID is required' }, { status: 400 });
    }

    // Validate self_host_address for SELF_HOST wallet type
    if (wallet_type === 'SELF_HOST' && !self_host_address) {
      return NextResponse.json({ success: false, message: 'Self host address is required for self-host wallet type' }, { status: 400 });
    }

    // Check username uniqueness
    const usernameTaken = await isUsernameTaken(username, userFromAuthTable.id);
    if (usernameTaken) {
      return NextResponse.json({ success: false, message: 'Username is already taken' }, { status: 409 });
    }

    // Update user profile
    const updateSuccess = await updateUserProfile(userFromAuthTable.id, {
      username,
      account_type: accountType === 'BUSINESS' ? 'BUSINESS' : 'USER',
      kyc_status: 'unverified',
      wallet_type: wallet_type,
      self_host_address: wallet_type === 'SELF_HOST' ? self_host_address : null,
      member_id: member_id || null,
    });

    if (!updateSuccess) {
      return NextResponse.json(
        { success: false, message: 'Failed to save user profile' },
        { status: 500 }
      );
    }

    // Optional: store password if provided (hashed)
    if (password) {
      const hash = await hashPassword(password);
      const passwordSuccess = await createPassword(userFromAuthTable.id, hash, username);

      if (!passwordSuccess) {
        return NextResponse.json(
          { success: false, message: 'Failed to save password' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Registration completed successfully',
      data: { user_id: userFromAuthTable.id, username, account_type: accountType }
    });
  } catch (error) {
    console.error('Complete-registration API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}