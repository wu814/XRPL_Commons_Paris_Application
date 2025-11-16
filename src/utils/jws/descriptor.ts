/**
 * JWS Functions for Descriptor
 * Decodes and verifies compact JWS (JWT) for descriptor payload using Ed25519 verification
 */

import { jwtVerify, createLocalJWKSet, JWK } from 'jose';
import { DescriptorPayload, Asset } from '@/types/paymentTypes';

/**
 * Decode descriptor compact JWS
 * Verifies and decodes JWT using JWKS public key
 * 
 * @param jws - Compact JWS string to decode
 * @param jwksInput - JWKS as JSON string or already parsed object (JSONB from database)
 * @returns Decoded descriptor payload
 */
export async function decodeDescriptorCompactJWS(
  jws: string,
  jwksInput: string | { keys: JWK[] }
): Promise<DescriptorPayload> {
  try {
    // Handle both string (JSON) and object (JSONB from database) formats
    let jwks: { keys: JWK[] };
    
    if (typeof jwksInput === 'string') {
      // Parse if it's a string
      jwks = JSON.parse(jwksInput) as { keys: JWK[] };
    } else if (typeof jwksInput === 'object' && jwksInput !== null) {
      // Already an object (from JSONB column)
      jwks = jwksInput as { keys: JWK[] };
    } else {
      throw new Error('Invalid JWKS format: expected string or object');
    }
    
    if (!jwks.keys || jwks.keys.length === 0) {
      throw new Error('Invalid JWKS: no keys found');
    }

    // Find the Ed25519 key
    const ed25519Key = jwks.keys.find(
      (key) => key.kty === 'OKP' && key.crv === 'Ed25519'
    );

    if (!ed25519Key) {
      throw new Error('Invalid JWKS: no Ed25519 key found');
    }

    // Create local JWKS from the key
    const JWKS = createLocalJWKSet({ keys: [ed25519Key] });

    // Verify and decode the JWT
    const { payload } = await jwtVerify(jws, JWKS, {
      algorithms: ['EdDSA'],
    });

    // Extract and validate payload fields
    if (
      !payload.intent_id ||
      !payload.invoice_id ||
      !payload.beneficiary_account ||
      (payload.destination_tag === null || payload.destination_tag === undefined || (typeof payload.destination_tag !== 'number' && typeof payload.destination_tag !== 'string')) ||
      !payload.descriptor_id ||
      !payload.receive_asset ||
      typeof payload.receive_amount !== 'number'
    ) {
      throw new Error('Invalid JWT payload: missing required fields');
    }

    // Construct descriptor payload
    const descriptorPayload: DescriptorPayload = {
      intent_id: payload.intent_id as string,
      invoice_id: payload.invoice_id as string,
      beneficiary_account: payload.beneficiary_account as string,
      destination_tag: typeof payload.destination_tag === 'string' ? parseInt(payload.destination_tag, 10) : payload.destination_tag,
      descriptor_id: payload.descriptor_id as string,
      receive_asset: payload.receive_asset as Asset,
      receive_amount: payload.receive_amount as number,
    };

    return descriptorPayload;
  } catch (error) {
    console.error('Error decoding descriptor compact JWS:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to decode descriptor compact JWS: ${error.message}`);
    }
    throw new Error('Failed to decode descriptor compact JWS');
  }
}

