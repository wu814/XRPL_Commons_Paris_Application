/**
 * XRPL Type Definitions
 * Centralized type definitions for all XRPL-related functionality
 * Organized by source file for easy reference
 */

// ============================================================================
// pathfinding.ts Types
// ============================================================================

/**
 * Market Analysis Options
 * Configuration options for market analysis
 */
export interface MarketAnalysisOptions {
  includeDEX?: boolean;
  includeMultiHop?: boolean;
  slippageBuffer?: number;
  maxHops?: number;
  purpose?: 'analysis' | 'trading' | 'offer_creation' | 'cross_currency_payment' | 'conversion_estimate';
}

/**
 * Market Analysis Result
 * Comprehensive market analysis for currency conversion
 */
export interface MarketAnalysis {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  fromIssuer: string;
  toIssuer: string;
  purpose: string;
  timestamp: string;
  routes: {
    direct: RouteAnalysis | null;
    multiHop: RouteAnalysis[];
  };
  bestRoute: BestRoute | null;
  success: boolean;
  error?: string;
}

/**
 * Route Analysis Result
 * Analysis result for a specific route type (DEX, multi-hop, etc.)
 */
export interface RouteAnalysis {
  success: boolean;
  type: string;
  bestRate: number;
  bestPath: PathInfo;
  allRoutes: PathInfo[];
  routeCount: number;
  error?: string;
  orderBookDepth?: number;
}

/**
 * Path Information
 * Detailed information about a specific conversion path
 */
export interface PathInfo {
  rate: number;
  amountOut?: number;
  requiredInput?: number;
  path: string;
  hops?: Array<{
    input?: number;
    output?: number;
    rate: number;
    path: string;
  }>;
  intermediateCurrency?: string;
  offersUsed?: number;
  orderBookDepth?: number;
  error?: string;
}

/**
 * Best Route Result
 * The best route found from market analysis
 */
export interface BestRoute {
  type: string;
  rate: number;
  estimatedOutput: string;
  path: PathInfo;
}

/**
 * Order Book Data
 * Order book data fetched from XRPL DEX
 */
export interface OrderBookData {
  direct: any[];
  multiHop: {
    fromToXrp: any[];
    xrpToTo: any[];
    reverse: any[];
    reverseFromToXrp?: any[];
  };
}

// ============================================================================
// getAccountTransaction.ts Types
// ============================================================================

/**
 * XRPL Transaction
 * Standard XRPL transaction structure
 */
export interface XRPLTransaction {
  TransactionType: string;
  Account: string;
  Destination: string;
  DestinationTag?: number;
  Flags?: number;
  Paths?: any[];
  ledger_index: number;
  InvoiceID?: string;
  Amount: string | {
    currency: string;
    issuer: string;
    value: string;
  };
  SendMax?: string | {
    currency: string;
    issuer: string;
    value: string;
  };
}

// ============================================================================
// getAccountTransaction.ts Types
// ============================================================================

/**
 * Transaction Data (Raw)
 * Raw transaction data from XRPL account_tx API
 */
export interface TransactionData {
  tx?: any;
  transaction?: any;
  tx_json?: any;
  meta?: {
    AffectedNodes?: any[];
    TransactionResult?: string;
    delivered_amount?: any;
    Fee?: string;
  };
  date?: number;
  hash?: string;
  ledger_index?: number;
  validated?: boolean;
}

/**
 * Processed Transaction
 * Transaction data processed from XRPL account_tx response
 */
export interface ProcessedTransaction {
  hash: string;
  ledger_index: number | null;
  date: Date | null;
  type: string;
  direction: string;
  counterparty: string | null;
  amount: string | number | null;
  currency: string;
  sendMax?: {
    amount: string | number;
    currency: string;
  } | null;
  fee: string | null;
  validated: boolean;
  result: string;
  account?: string; // The account address this transaction belongs to
  destination?: string; // Destination address for sent transactions
}

// ============================================================================
// simulatePayment.ts Types
// ============================================================================

/**
 * Simulation Result
 * Result from simulating an XRPL transaction
 */
export interface SimulateResult {
  success: boolean;
  message: string;
  data?: {
    preliminaryResult?: string;
    engineResult?: string;
    engineResultMessage?: string;
    fee?: string;
    feeInXRP?: string;
    sequenceUsed?: number;
    accountSequenceBefore?: number;
    accountSequenceAfter?: number;
    ledgerIndexUsed?: number;
    preparedTransaction?: any;
    wouldSucceed: boolean;
    warnings?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}
