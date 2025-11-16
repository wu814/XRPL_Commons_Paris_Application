/**
 * Member Service
 * Handles API calls from YONA to Member endpoints
 */

import {
  FundingDecisionRequest,
  FundingDecisionResponse,
  DescriptorRequest,
  PaymentTemplatePayload,
} from '@/types/paymentTypes';
import { Member } from '@/types/appTypes';

const YONA_WEBHOOK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL;

/**
 * Normalize API endpoint URL to ensure it has a protocol
 * FLOW: Check if endpoint has http:// or https://, if not add appropriate protocol
 */
export function normalizeApiEndpoint(endpoint: string | null | undefined): string {
  // PSEUDO CODE:
  // 1. IF endpoint is missing THEN throw error
  // 2. IF endpoint starts with 'http://' OR 'https://' THEN return as is
  // 3. IF endpoint contains 'localhost' OR '127.0.0.1' THEN return 'http://' + endpoint
  // 4. ELSE return 'https://' + endpoint
  return ''; // Placeholder
}

/**
 * Request funding decision from originator member
 * FLOW: POST to member's /api/member/funding-decision endpoint with funding request, return response
 */
export async function requestFundingDecision(
  member: Member,
  request: FundingDecisionRequest
): Promise<FundingDecisionResponse> {
  // PSEUDO CODE:
  // 1. IF member.api_endpoint is missing THEN throw error
  // 2. NORMALIZE API endpoint URL
  // 3. BUILD endpoint URL: {normalized_endpoint}/api/member/funding-decision
  // 4. POST request TO endpoint WITH:
  //    - Headers: Content-Type: application/json, X-Member-ID: member.member_id, X-Client-ID: 'YONA'
  //    - Body: JSON.stringify(request)
  // 5. IF response not ok THEN throw error with status code
  // 6. PARSE response JSON
  // 7. RETURN response data
  // 8. IF error occurs THEN return { success: false, send_asset: { code: '', issuer: '' }, send_account: '', message: error }
  return { success: false, send_asset: { code: '', issuer: '' }, send_account: '', message: '' }; // Placeholder
}

/**
 * Request descriptor from beneficiary member
 * FLOW: POST to member's /api/member/request-descriptor endpoint with descriptor request, return response
 */
export async function requestDescriptor(
  member: Member,
  request: DescriptorRequest
): Promise<{ success: boolean; message?: string }> {
  // PSEUDO CODE:
  // 1. IF member.api_endpoint is missing THEN throw error
  // 2. NORMALIZE API endpoint URL
  // 3. BUILD endpoint URL: {normalized_endpoint}/api/member/request-descriptor
  // 4. POST request TO endpoint WITH:
  //    - Headers: Content-Type: application/json, X-Member-ID: member.member_id, X-Client-ID: 'YONA'
  //    - Body: JSON.stringify(request)
  // 5. IF response not ok THEN throw error with status code
  // 6. PARSE response JSON
  // 7. RETURN response data
  // 8. IF error occurs THEN return { success: false, message: error }
  return { success: false }; // Placeholder
}

/**
 * Send payment template to originator member
 * FLOW: POST to member's /api/member/receive-template endpoint with payment template, return response
 */
export async function sendPaymentTemplateToOriginator(
  member: Member,
  request: PaymentTemplatePayload
): Promise<{ success: boolean; message?: string; data?: { intent_id: string; tr_correlation_id?: string } }> {
  // PSEUDO CODE:
  // 1. IF member.api_endpoint is missing THEN throw error
  // 2. NORMALIZE API endpoint URL
  // 3. BUILD endpoint URL: {normalized_endpoint}/api/member/receive-template
  // 4. POST request TO endpoint WITH:
  //    - Headers: Content-Type: application/json, X-Member-ID: member.member_id, X-Client-ID: 'YONA'
  //    - Body: JSON.stringify(request)
  // 5. IF response not ok THEN throw error with status code
  // 6. PARSE response JSON
  // 7. RETURN response data
  // 8. IF error occurs THEN return { success: false, message: error }
  return { success: false }; // Placeholder
}

/**
 * Build YONA callback URL for Member webhooks
 * FLOW: Combine YONA_WEBHOOK_BASE_URL with endpoint path
 */
export function buildYONACallbackURL(endpoint: string): string {
  // PSEUDO CODE:
  // 1. RETURN {YONA_WEBHOOK_BASE_URL}/api/webhooks/{endpoint}
  return ''; // Placeholder
}

/**
 * Check if both Members are available
 * FLOW: Check if members have endpoints configured (simplified check)
 */
export async function checkMembersAvailability(originatorMember: Member, beneficiaryMember: Member): Promise<boolean> {
  // PSEUDO CODE:
  // 1. CHECK if both members have api_endpoint configured
  // 2. RETURN true (for demo, assume always available)
  return true; // Placeholder
}

/**
 * Get user addresses from member
 * FLOW: POST to YONA's proxy API route which calls member's API to get user addresses
 */
export async function getUserAddressesFromMember(
  member: Member,
  yonaId: string
): Promise<{
  success: boolean;
  addresses: string[];
  message?: string;
}> {
  // PSEUDO CODE:
  // 1. IF member.member_id is missing THEN throw error
  // 2. POST request TO '/api/member/get-user-addresses' WITH:
  //    - Headers: Content-Type: application/json
  //    - Body: JSON.stringify({ member_id: member.member_id, yona_id: yonaId })
  // 3. IF response not ok THEN throw error
  // 4. PARSE response JSON
  // 5. RETURN response data
  // 6. IF error occurs THEN return { success: false, addresses: [], message: error }
  return { success: false, addresses: [] }; // Placeholder
}
