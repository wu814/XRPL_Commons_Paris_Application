/**
 * Utility functions for handling XRPL currency codes
 * 
 * XRPL supports two currency code formats:
 * 1. Standard 3-character ASCII codes (e.g., "USD", "EUR")
 * 2. Non-standard 40-character hex-encoded codes (160 bits)
 * 
 * For currency codes with 4-5 characters, we need to convert them to hex format.
 */

/**
 * Convert a currency code to XRPL format
 * - 3 characters: return as-is (standard code)
 * - 4-5 characters: convert to 40-character hex format
 * - Already 40 characters: return as-is (already hex)
 * 
 * @param currency - Currency code (e.g., "USD", "RLUSD")
 * @returns XRPL-compatible currency code
 */
export function convertCurrencyCode(currency: string): string {
  // XRP is special case
  if (currency.toUpperCase() === 'XRP') {
    return 'XRP';
  }
  
  // Standard 3-character code
  if (currency.length === 3) {
    return currency.toUpperCase();
  }
  
  // Already hex-encoded (40 characters)
  if (currency.length === 40) {
    return currency.toUpperCase();
  }
  
  // 4-5 character codes need to be converted to hex
  if (currency.length >= 4 && currency.length <= 5) {
    return encodeNonStandardCurrencyCode(currency);
  }
  
  // If longer than 5 characters, it's likely an error but try to encode it
  if (currency.length > 5) {
    console.warn(`⚠️  Currency code "${currency}" is longer than 5 characters. Encoding to hex format.`);
    return encodeNonStandardCurrencyCode(currency);
  }
  
  throw new Error(`Invalid currency code: ${currency}`);
}

/**
 * Encode a non-standard currency code to 40-character hex format
 * XRPL spec: The code must be exactly 20 bytes (40 hex characters)
 * 
 * Format:
 * - First byte: 0x00 (indicates non-standard code)
 * - Next 12 bytes: ASCII characters right-padded with 0x00
 * - Last 5 bytes: 0x00 (reserved)
 * - Last 3 bytes: must be 0x00
 * 
 * @param currency - Currency code to encode
 * @returns 40-character hex string
 */
function encodeNonStandardCurrencyCode(currency: string): string {
  if (currency.length > 20) {
    throw new Error(`Currency code too long: ${currency} (max 20 characters)`);
  }
  
  // Create a buffer of 20 bytes (40 hex characters)
  const buffer = Buffer.alloc(20, 0);
  
  // Write the currency code starting at byte 0
  // ASCII encoding, right-padded with zeros
  buffer.write(currency.toUpperCase(), 0, 'ascii');
  
  // Convert to hex string (40 characters)
  return buffer.toString('hex').toUpperCase();
}

/**
 * Decode a currency code from XRPL hex format to readable string
 * 
 * @param currencyHex - 40-character hex currency code
 * @returns Decoded currency string
 */
export function decodeCurrencyCode(currencyHex: string): string {
  // Standard 3-character codes don't need decoding
  if (currencyHex.length === 3) {
    return currencyHex;
  }
  
  // XRP is special case
  if (currencyHex.toUpperCase() === 'XRP') {
    return 'XRP';
  }
  
  // Decode hex format (40 characters)
  if (currencyHex.length === 40) {
    try {
      const buffer = Buffer.from(currencyHex, 'hex');
      
      // Find the end of the ASCII string (first null byte)
      let end = 0;
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0) {
          end = i;
          break;
        }
      }
      
      // If no null bytes found, use entire buffer
      if (end === 0) {
        end = buffer.length;
      }
      
      // Convert to ASCII string and trim
      const decoded = buffer.toString('ascii', 0, end).trim();
      
      // Remove any null characters
      return decoded.replace(/\0/g, '');
    } catch (error) {
      console.error('Failed to decode currency code:', error);
      return currencyHex;
    }
  }
  
  return currencyHex;
}

/**
 * Check if a currency code is valid for XRPL
 * 
 * @param currency - Currency code to validate
 * @returns true if valid, false otherwise
 */
export function isValidCurrencyCode(currency: string): boolean {
  // XRP is always valid
  if (currency.toUpperCase() === 'XRP') {
    return true;
  }
  
  // Standard 3-character code (alphanumeric)
  if (currency.length === 3 && /^[A-Z0-9]{3}$/i.test(currency)) {
    return true;
  }
  
  // 40-character hex code
  if (currency.length === 40 && /^[A-F0-9]{40}$/i.test(currency)) {
    return true;
  }
  
  // 4-20 character codes are valid (will be encoded)
  if (currency.length >= 4 && currency.length <= 20) {
    return true;
  }
  
  return false;
}

/**
 * Convert an XRPL Amount object to use hex format for 4-5 character currency codes
 * 
 * @param amount - XRPL Amount (string for XRP, object for IOUs)
 * @returns Converted Amount with hex currency code if applicable
 */
export function convertAmountCurrency(amount: string | { currency: string; issuer: string; value: string }): string | { currency: string; issuer: string; value: string } {
  // XRP amounts are strings (in drops), no conversion needed
  if (typeof amount === 'string') {
    return amount;
  }
  
  // IOU amounts are objects with currency, issuer, and value
  if (typeof amount === 'object' && 'currency' in amount) {
    const convertedCurrency = convertCurrencyCode(amount.currency);
    
    // Log conversion if currency was changed
    if (convertedCurrency !== amount.currency && convertedCurrency !== amount.currency.toUpperCase()) {
      console.log(`ℹ️  Converting currency "${amount.currency}" to XRPL hex format: ${convertedCurrency}`);
    }
    
    return {
      ...amount,
      currency: convertedCurrency,
    };
  }
  
  return amount;
}

