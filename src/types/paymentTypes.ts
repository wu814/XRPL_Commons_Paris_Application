/**
 * Type definitions for payment intents, IVMS, and webhook payloads
 */

// IVMS (Identity Verification Message Standard) for Travel Rule Compliance
// Contains originator and beneficiary information including names, accounts, addresses, and transaction details
export type IVMSData = any;

// Asset type matching new JSONB format
// Represents a currency/token with code (e.g., "RLUSD", "USD", "XRP") and optional issuer address for tokens
export type Asset = any;

// Transaction types - all 8 possible combinations of P2P/POS and INTERVASP/INTRAVASP/SELF_HOST_TO_VASP/VASP_TO_SELF_HOST
export type TransactionType = any;

// Payment status types representing stages of payment processing
// Values: 'PAYMENT_INITIATED', 'DESCRIPTOR_RECEIVED', 'TEMPLATE_RECEIVED', 'TR_ACCEPTED', 'PAYMENT_COMPLETE'
export type PaymentStatus = any;

// Currency type (e.g., "USD", "EUR")
export type Currency = any;

// Payment Intent stored in YONA database
// Contains all payment-related information including intent_id, amounts, assets, user IDs, member IDs, status, transaction hash, template matching results
export type PaymentIntent = any;

// VASP Database User (for VASP A and B internal tables)
// Contains user ID and YONA ID for VASP internal users
export type VASPUser = any;

// ==================== API Request/Response Types ====================

// Payment initiation request from frontend
// Contains sender username, recipient username, currency, and amount
export type InitiatePaymentRequest = any;

// Payment initiation response to frontend
// Contains success status, message, and optional data with intent_id and status
export type InitiatePaymentResponse = any;

// Funding decision request (YONA -> Originator Member)
// Contains originator YONA ID, currency, amount, chain, and transaction type
export type FundingDecisionRequest = any;

// Funding decision response (Originator Member -> YONA)
// Contains success status, send_asset (code and issuer), send_account (originator's account address), and optional message
export type FundingDecisionResponse = any;

// ==================== Webhook Payload Types ====================

// Descriptor request (YONA -> Beneficiary Member)
// Contains intent_id, originator member name, beneficiary YONA ID, currency, amount, transaction type, chain, and callback URL
export type DescriptorRequest = any;

// Descriptor response (Beneficiary Member -> YONA)
// Contains intent_id, descriptor_compact_jws (JWS with beneficiary payment info), and originator member name
// All beneficiary information is encoded in descriptor_compact_jws and decoded by YONA
export type DescriptorResponse = any;

// Payment Template Payload (YONA -> Originator Member)
// Contains intent_id, transaction type, beneficiary member name, originator YONA ID, descriptor_compact_jws, beneficiary JWKS, XRPL payment template, and callback URL
// Note: descriptor_id is encoded in descriptor_compact_jws and will be decoded by originator VASP
export type PaymentTemplatePayload = any;

// TR accepted webhook (Originator Member -> YONA)
// Contains intent_id, tr_correlation_id, status ('accepted'), optional message, and timestamp
export type TRAcceptedWebhook = any;

// Payment complete webhook (Originator Member -> YONA)
// Contains intent_id, status ('completed' | 'failed'), optional message, timestamp, transaction hash, and optional tx_blob (signed transaction blob)
export type PaymentCompleteWebhook = any;

// PII request (Originator Member -> Beneficiary Member)
// Contains intent_id, beneficiary_yona_id, and requesting_member_id
export type PIIRequest = any;

// PII response (Beneficiary Member -> Originator Member)
// Contains success status, optional PII data (name, account, destination_address, additional_info), and optional message
export type PIIResponse = any;

// IVMS payload (Originator Member -> Beneficiary Member)
// Contains intent_id, ivms_data, and requesting_member_id
export type IVMSApprovalRequest = any;

// IVMS approval response (Beneficiary Member -> Originator Member)
// Contains success status, approved boolean, and optional message
export type IVMSApprovalResponse = any;

// ==================== Member Authentication ====================

// Member authentication header containing x-member-id and content-type
export type MemberAuthHeader = any;

// ==================== Descriptor Type ====================

// Descriptor database record
// Contains id, descriptor_id, intent_id, and created_at timestamp
export type Descriptor = any;

// ==================== Supported Asset Type ====================

// Supported asset database record
// Contains id, member_id, currency, asset_code, and optional issuer address
export type SupportedAsset = any;

// ==================== Payment Template Type ====================

// Payment template database record
// Contains id, template_id, ledger_index, transaction_type, account, destination, destination_tag, amount (JSONB), send_max (JSONB), paths (JSONB), flags, invoice_id, and created_at
export type PaymentTemplate = any;

// ==================== Descriptor Payload (decoded from JWS) ====================

// Descriptor payload decoded from JWS
// Contains intent_id, invoice_id, beneficiary_account, destination_tag, descriptor_id, receive_asset, and receive_amount
export type DescriptorPayload = any;

