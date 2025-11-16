import { createSupabaseServiceClient, createSupabaseAuthClient } from '@/lib/supabase/server';
import { User } from '@/types/appTypes';
import { hashPassword, verifyPassword } from '@/utils/app/hashPassword';

/**
 * Get user by auth ID
 */
export async function getUserByAuthId(authId: string): Promise<User | null> {
  const supabase = createSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('id, yona_id, username, member_id, email, account_type')
    .eq('id', authId)
    .single();

  if (error || !data) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data as User;
}

/**
 * Get user profile data (yona_id and member_id)
 */
export async function getUserProfileData(authId: string): Promise<{ yona_id: string; member_id: string } | null> {
  const supabase = createSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('yona_id, member_id')
    .eq('id', authId)
    .single();

  if (error || !data) {
    console.error('Error fetching user profile data:', error);
    return null;
  }

  if (!data.yona_id || !data.member_id) {
    console.error('User missing yona_id or member_id');
    return null;
  }

  return {
    yona_id: data.yona_id,
    member_id: data.member_id,
  };
}

/**
 * Check if username is taken
 */
export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  
  let query = supabase
    .from('users')
    .select('id')
    .eq('username', username);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error checking username:', error);
    return false; // Assume not taken on error to avoid blocking registration
  }

  return data !== null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    username?: string;
    account_type?: string;
    kyc_status?: string;
    wallet_type?: string;
    self_host_address?: string | null;
    member_id?: string | null;
  }
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    return false;
  }

  return true;
}

/**
 * Get password hash for user
 */
export async function getPasswordHash(userId: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('passwords')
    .select('password')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching password:', error);
    return null;
  }

  return data.password;
}

/**
 * Update user password
 */
export async function updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  
  const { error } = await supabase
    .from('passwords')
    .update({ password: hashedPassword })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating password:', error);
    return false;
  }

  return true;
}

/**
 * Create password entry
 */
export async function createPassword(userId: string, hashedPassword: string, username: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  
  const { error } = await supabase
    .from('passwords')
    .insert({ user_id: userId, password: hashedPassword, username });

  if (error) {
    console.error('Error creating password:', error);
    return false;
  }

  return true;
}

/**
 * Verify and update password
 * Returns error message if validation fails, null if successful
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<string | null> {
  // Validate input
  if (!currentPassword || !newPassword) {
    return 'Current password and new password are required';
  }

  if (newPassword.length < 5) {
    return 'New password must be at least 5 characters long';
  }

  if (currentPassword === newPassword) {
    return 'New password must be different from current password';
  }

  // Get current password hash
  const currentPasswordHash = await getPasswordHash(userId);
  if (!currentPasswordHash) {
    return 'No password found for user';
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, currentPasswordHash);
  if (!isCurrentPasswordValid) {
    return 'Current password is incorrect';
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(newPassword);

  // Update password
  const success = await updatePassword(userId, hashedNewPassword);
  if (!success) {
    return 'Failed to update password';
  }

  return null; // Success
}
