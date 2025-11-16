/**
 * Type definitions for application entities
 */

// User entity
// Contains id, yona_id, username, member_id, optional email, and optional account_type (e.g., "USER", "MERCHANT")
export type User = any;

// Member entity representing a VASP or other business entity
// Contains id, member_id, member_name, optional api_endpoint, optional tr_provider (e.g., "Notabene"), optional tr_endpoint, optional business_type (e.g., "VASP", "KYC_PROVIDER"), optional bps_policy (basis points for fee calculation), optional jwks (JSON string or object), and optional created_at
export type Member = any;
