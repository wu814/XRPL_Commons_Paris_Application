/**
 * XRPL Simulation Utilities
 * Real pathfinding and simulation functions using XRPL.js
 */

import { Asset } from '@/types/paymentTypes';
import { analyzeMarket, pathStringToXRPLPaths } from './pathfinding';
import { convertCurrencyCode } from './currencyUtils';
import { client, connectXRPLClient } from './client';
import { dropsToXrp } from 'xrpl';
import { SimulateResult } from '@/types/XRPLTypes';

// Note: invoice_id is now hashed by the beneficiary before being sent to YONA
// The invoice_id received from the descriptor is already in XRPL format (64-character hex string)

/**
 * Calculate SendMax based on amount and BPS policy
 * 
 * @param amount - Base amount
 * @param bpsPolicy - Basis points policy
 * @returns SendMax value
 */
export function calculateSendMax(amount: number, bpsPolicy: number): number {
  return amount * (1 + bpsPolicy / 10000);
}

/**
 * Real pathfinding and simulation
 * Uses XRPL pathfinding to find best route and simulates the transaction
 * 
 * @param sendAsset - Asset being sent
 * @param receiveAsset - Asset being received
 * @param sendAmount - Amount to send
 * @param receiveAmount - Amount to receive (for validation)
 * @param bpsPolicy - Basis points policy for slippage buffer and SendMax
 * @param originatorAccount - Originator XRPL account address
 * @param beneficiaryAccount - Beneficiary XRPL account address
 * @param destinationTag - Destination tag (optional)
 * @param invoiceId - Invoice ID for the payment
 * @param sendIssuer - Issuer address for send asset (optional, falls back to sendAsset.issuer)
 * @param receiveIssuer - Issuer address for receive asset (optional, falls back to receiveAsset.issuer)
 * @returns Simulation result with tx_template and ledger_index
 */
export async function simulateOnXRPL(
  sendAsset: Asset,
  receiveAsset: Asset,
  sendAmount: number,
  receiveAmount: number,
  bpsPolicy: number,
  originatorAccount: string,
  beneficiaryAccount: string,
  destinationTag: number | null,
  invoiceId: string,
  sendIssuer?: string,
  receiveIssuer?: string
): Promise<{
  success: boolean;
  tx_template?: any;
  ledger_index?: number;
  message?: string;
}> {
  try {
    // Get issuer addresses from parameters or Asset objects
    const sendIssuerAddress = sendIssuer || sendAsset.issuer;
    const receiveIssuerAddress = receiveIssuer || receiveAsset.issuer;

    // Validate issuer addresses for non-XRP assets
    if (!sendIssuerAddress && sendAsset.code !== 'XRP') {
      throw new Error(`Issuer address not found for send asset: ${sendAsset.code}. Ensure the Asset object includes the issuer field.`);
    }
    if (!receiveIssuerAddress && receiveAsset.code !== 'XRP') {
      throw new Error(`Issuer address not found for receive asset: ${receiveAsset.code}. Ensure the Asset object includes the issuer field.`);
    }

    // Step 1: Pathfinding
    const slippageBuffer = bpsPolicy / 10000;
    const pathfindingResult = await analyzeMarket(
      sendAsset.code,
      receiveAsset.code,
      sendAmount.toString(),
      sendIssuerAddress || '', // fromIssuer
      receiveIssuerAddress || '', // toIssuer
      {
        slippageBuffer,
        purpose: 'cross_currency_payment',
      }
    );

    if (!pathfindingResult.success || !pathfindingResult.bestRoute) {
      throw new Error('Pathfinding failed: No viable route found');
    }

    // Step 2: Calculate SendMax using bps_policy
    const sendMax = calculateSendMax(sendAmount, bpsPolicy);

    // Step 3: Convert path string to XRPL Paths array
    const paths = pathStringToXRPLPaths(pathfindingResult.bestRoute.path.path);

    // Step 4: Build transaction template
    const amount = receiveAsset.code === 'XRP'
      ? (parseFloat(receiveAmount.toFixed(6)) * 1_000_000).toString() // Convert to drops
      : {
          currency: convertCurrencyCode(receiveAsset.code),
          issuer: receiveIssuerAddress!,
          value: receiveAmount.toFixed(6),
        };

    const sendMaxAmount = sendAsset.code === 'XRP'
      ? (sendMax * 1_000_000).toString() // Convert to drops
      : {
          currency: convertCurrencyCode(sendAsset.code),
          issuer: sendIssuerAddress!,
          value: sendMax.toFixed(6),
        };

    // Step 5: Simulate the transaction
    const simulationResult = await simulatePayment(
      originatorAccount,
      beneficiaryAccount,
      amount,
      {
        destinationTag: destinationTag || undefined,
        sendMax: sendMaxAmount,
        paths: paths,
        flags: 0, // Use Flags: 0 like console version (let XRPL auto-find paths)
      }
    );

    if (!simulationResult.success || !simulationResult.data) {
      throw new Error(`Simulation failed: ${simulationResult.message}`);
    }

    // Step 6: Build transaction template
    // Use the already-converted currency codes from amount and sendMaxAmount
  const tx_template = {
    TransactionType: 'Payment',
    Account: originatorAccount,
    Destination: beneficiaryAccount,
      ...(destinationTag && { DestinationTag: destinationTag }),
      Amount: typeof amount === 'string' ? amount : {
        currency: amount.currency, // Use already-converted currency from amount
        issuer: receiveIssuerAddress,
      value: receiveAmount.toFixed(6),
    },
      SendMax: typeof sendMaxAmount === 'string' ? sendMaxAmount : {
        currency: sendMaxAmount.currency, // Use already-converted currency from sendMaxAmount
        issuer: sendIssuerAddress,
      value: sendMax.toFixed(6),
      },
        ...(paths.length > 0 && paths.some(p => p.length > 0) && { Paths: paths }),
        Flags: 0,
        InvoiceID: invoiceId,
  };

    // Extract ledger_index from simulation result
    const ledger_index = simulationResult.data.ledgerIndexUsed;

  return {
    success: true,
    tx_template,
      ledger_index,
      message: 'Pathfinding and simulation completed successfully',
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
  };
  }
}

/**
 * Simulate an XRPL transaction without actually submitting it to the ledger
 * This performs a dry run to check if the transaction would succeed
 * Uses normal ledger sequence (no tickets) for simulation
 * 
 * @param accountAddress - XRPL account address (classic address)
 * @param transaction - The transaction object to simulate (without Sequence/Fee)
 * @returns Simulation result with fee estimates and success prediction
 */
export async function simulateTransaction(
  accountAddress: string,
  transaction: any
): Promise<SimulateResult> {
  try {
    await connectXRPLClient();
    
    // Get current account info for sequence
    const accountInfo = await client.request({
      command: "account_info",
      account: accountAddress,
      ledger_index: "validated"
    });
    
    if (!accountInfo.result.account_data) {
      throw new Error("Account not found on XRPL");
    }
    
    const currentSequence = accountInfo.result.account_data.Sequence;
    
    // Remove any Sequence or TicketSequence fields - let autofill handle it
    const txForSimulation = { ...transaction };
    delete txForSimulation.Sequence;
    delete txForSimulation.TicketSequence;
    
    // Autofill the transaction (adds Fee, Sequence, LastLedgerSequence, etc.)
    const prepared = await client.autofill(txForSimulation);
    
    // Call the actual XRPL simulate command
    const simulateResponse = await client.request({
      command: "simulate" as any,
      tx_json: prepared
    }) as any;
    
    // Extract simulation results
    const simResult: any = simulateResponse.result;
    const engineResult = simResult.engine_result || simResult.engine_result_code || 'UNKNOWN';
    const engineResultMessage = simResult.engine_result_message || '';
    const wouldSucceed = engineResult === 'tesSUCCESS';
    
    // Extract fee information
    const estimatedFee = simResult.fee || prepared.Fee || '12';
    const feeInXRP = dropsToXrp(estimatedFee).toFixed(6);
    
    // Extract ledger index
    const ledgerIndexUsed = simResult.ledger_index || prepared.LastLedgerSequence;
    
    // Extract warnings if any
    const warnings: string[] = [];
    if (simResult.warnings && Array.isArray(simResult.warnings)) {
      simResult.warnings.forEach((warning: any) => {
        if (typeof warning === 'string') {
          warnings.push(warning);
        } else if (warning.message) {
          warnings.push(warning.message);
        }
      });
    }
    
    // Add engine result message to warnings if transaction would fail
    if (!wouldSucceed && engineResultMessage) {
      warnings.push(engineResultMessage);
    }
    
    const message = `Transaction simulation completed. Result: ${wouldSucceed ? 'Would succeed' : 'Would fail'}`;
    
    return {
      success: true,
      message: message,
      data: {
        fee: estimatedFee,
        feeInXRP: feeInXRP,
        sequenceUsed: prepared.Sequence,
        accountSequenceBefore: currentSequence,
        accountSequenceAfter: currentSequence + 1,
        ledgerIndexUsed: ledgerIndexUsed,
        preparedTransaction: prepared,
        wouldSucceed: wouldSucceed,
        warnings: warnings.length > 0 ? warnings : undefined,
        engineResult: engineResult,
        engineResultMessage: engineResultMessage || (wouldSucceed ? 'Transaction would succeed' : 'Transaction would fail'),
        preliminaryResult: simResult.preliminary_result,
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      message: `Simulation failed: ${errorMessage}`,
      error: {
        code: "SIMULATION_ERROR",
        message: errorMessage
      }
    };
  }
}

/**
 * Simulate a payment transaction
 * Convenience wrapper for common payment simulations
 */
export async function simulatePayment(
  accountAddress: string,
  destination: string,
  amount: string | { currency: string; issuer: string; value: string },
  options?: {
    destinationTag?: number;
    sendMax?: string | { currency: string; issuer: string; value: string };
    paths?: any[][];
    flags?: number;
  }
): Promise<SimulateResult> {
  // Convert currency codes to hex format if needed
  const convertedAmount = typeof amount === 'string' 
    ? amount 
    : {
        currency: convertCurrencyCode(amount.currency),
        issuer: amount.issuer,
        value: amount.value
      };
  
  const convertedSendMax = options?.sendMax
    ? (typeof options.sendMax === 'string'
        ? options.sendMax
        : {
            currency: convertCurrencyCode(options.sendMax.currency),
            issuer: options.sendMax.issuer,
            value: options.sendMax.value
          })
    : undefined;
  
  const paymentTx: any = {
    TransactionType: "Payment",
    Account: accountAddress,
    Destination: destination,
    Amount: convertedAmount,
  };
  
  if (options?.destinationTag) {
    paymentTx.DestinationTag = options.destinationTag;
  }
  
  if (convertedSendMax) {
    paymentTx.SendMax = convertedSendMax;
  }
  
  // Only include Paths if it exists, is an array, and has valid non-empty paths
  // If Paths is empty or contains only empty arrays, omit it
  if (options?.paths && Array.isArray(options.paths) && options.paths.length > 0) {
    const hasValidPaths = options.paths.some((path: any[]) => Array.isArray(path) && path.length > 0);
    if (hasValidPaths) {
      paymentTx.Paths = options.paths;
    }
  }
  
  if (options?.flags !== undefined) {
    paymentTx.Flags = options.flags;
  }
  
  return simulateTransaction(accountAddress, paymentTx);
}

export default simulateTransaction;
