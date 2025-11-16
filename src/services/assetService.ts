/**
 * Asset Service
 * Handles asset-related operations including issuer lookups
 */

import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Simple in-memory cache to avoid repeated database queries
const issuerCache: Record<string, string> = {};

/**
 * Get issuer address for a currency code from supported_assets table
 * Uses caching to avoid repeated database queries
 * 
 * @param currencyCode - Currency code (e.g., "RLUSD", "USDC")
 * @param memberId - Optional member ID to filter by specific member
 * @returns Issuer address or empty string for XRP
 */
export async function getIssuerForCurrency(
  currencyCode: string,
  memberId?: string
): Promise<string> {
  if (currencyCode === 'XRP') {
    return '';
  }

  const upperCode = currencyCode.toUpperCase();
  const cacheKey = memberId ? `${upperCode}_${memberId}` : upperCode;
  
  // Check cache first
  if (issuerCache[cacheKey]) {
    return issuerCache[cacheKey];
  }

  const supabase = createSupabaseServiceClient();
  
  let query = supabase
    .from('supported_assets')
    .select('issuer')
    .eq('asset_code', upperCode)
    .limit(1);

  // If memberId provided, filter by member
  if (memberId) {
    query = query.eq('member_id', memberId);
  }

  const { data, error } = await query.single();

  if (error || !data || !data.issuer) {
    console.warn(`No issuer found for currency: ${currencyCode}${memberId ? ` (member: ${memberId})` : ''}`);
    return '';
  }

  // Cache the result
  issuerCache[cacheKey] = data.issuer;
  return data.issuer;
}

