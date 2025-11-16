"use client";

import React, { useEffect, useState, useRef } from "react";
import { ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Button from "@/components/app/Button";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import type { ProcessedTransaction as BaseProcessedTransaction } from "@/types/XRPLTypes";

// Extended ProcessedTransaction for TransactionHistory component
// Adds counterparty_username and match_template from payment intents
interface ProcessedTransaction extends Omit<BaseProcessedTransaction, 'date' | 'counterparty'> {
  date: Date | string | null; // Allow string for API responses
  counterparty_username: string | null; // Username instead of address
  match_template?: boolean | null; // Template matching result
  template_mismatch_reasons?: string[] | null; // Error messages when match_template is false
}

interface TransactionHistoryProps {}

export default function TransactionHistory({}: TransactionHistoryProps) {
  const { user, status } = useSupabaseSession();
  const [transactions, setTransactions] = useState<ProcessedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTxHash, setHoveredTxHash] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number; arrowTop: number } | null>(null);
  const checkmarkRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const fetchTransactions = async () => {
    if (status !== "authenticated" || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Fetch payment intents to get relevant transaction hashes and counterparty info
      const paymentIntentsResponse = await fetch(`/api/transactions/getUserPaymentIntents`);
      if (!paymentIntentsResponse.ok) {
        if (paymentIntentsResponse.status === 401) {
          throw new Error('Unauthorized - please log in again');
        }
        throw new Error('Failed to fetch payment intents');
      }
      const paymentIntentsData = await paymentIntentsResponse.json();
      const paymentIntents = paymentIntentsData.paymentIntents || [];

      // Create a map of tx_hash to counterparty info and match_template
      const txHashMap = new Map<string, { counterparty_username: string; direction: string; match_template: boolean | null; template_mismatch_reasons?: string[] | null }>();
      paymentIntents.forEach((pi: { tx_hash: string; counterparty_username: string; direction: string; match_template: boolean | null; template_mismatch_reasons?: string[] | null }) => {
        txHashMap.set(pi.tx_hash, {
          counterparty_username: pi.counterparty_username,
          direction: pi.direction,
          match_template: pi.match_template ?? null,
          template_mismatch_reasons: pi.template_mismatch_reasons || undefined,
        });
      });

      // Step 2: Fetch transactions for all user addresses (API handles address fetching internally)
      const transactionsResponse = await fetch(`/api/transactions/getAccountTransaction`);
      if (!transactionsResponse.ok) {
        if (transactionsResponse.status === 401) {
          throw new Error('Unauthorized - please log in again');
        }
        throw new Error('Failed to fetch transactions');
      }
      const transactionsData = await transactionsResponse.json();
      
      if (!transactionsData.success) {
        throw new Error(transactionsData.message || 'Failed to fetch transactions');
      }

      const allTransactions = transactionsData.transactions || [];
      const userAddresses = transactionsData.addresses || [];

      // Step 3: Filter transactions to only include those matching payment_intent hashes
      const filteredTransactions = allTransactions
        .filter((tx: ProcessedTransaction) => {
          // Only include transactions that have a hash matching payment_intents
          return txHashMap.has(tx.hash);
        })
        .map((tx: ProcessedTransaction) => {
          const paymentIntentInfo = txHashMap.get(tx.hash);
          
          // Determine direction: if user's address is in Account field = sent, if in Destination field = received
          let direction = 'unknown';
          if (tx.account && userAddresses.includes(tx.account)) {
            direction = 'sent';
          } else if (tx.destination && userAddresses.includes(tx.destination)) {
            direction = 'received';
          } else {
            // Fallback to payment intent direction
            direction = paymentIntentInfo?.direction || 'unknown';
          }

          return {
            ...tx,
            direction,
            counterparty_username: paymentIntentInfo?.counterparty_username || null,
            match_template: paymentIntentInfo?.match_template ?? null,
            template_mismatch_reasons: paymentIntentInfo?.template_mismatch_reasons || undefined,
            sendMax: tx.sendMax || undefined, // Explicitly preserve sendMax field
          };
        });

      // Step 4: Sort by date (newest first)
      filteredTransactions.sort((a: ProcessedTransaction, b: ProcessedTransaction) => {
        const dateA = a.date ? (typeof a.date === 'string' ? new Date(a.date).getTime() : a.date.getTime()) : 0;
        const dateB = b.date ? (typeof b.date === 'string' ? new Date(b.date).getTime() : b.date.getTime()) : 0;
        return dateB - dateA;
      });

      setTransactions(filteredTransactions);
      
      if (transactionsData.errors && transactionsData.errors.length > 0) {
        console.warn('Some addresses failed to fetch:', transactionsData.errors);
        // Show partial results with errors - set a warning but don't fail entirely
        if (filteredTransactions.length === 0) {
          setError(`Failed to fetch transactions: ${transactionsData.errors.join('; ')}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && user) {
      fetchTransactions();
    }
  }, [status, user]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Unknown date';
    
    // Convert string to Date if needed (JSON serialization converts Date to string)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'Unknown date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  const getTransactionIcon = (direction: string): React.ReactNode => {
    switch (direction) {
      case 'sent':
        return <ArrowUpRight className="w-4 h-4 text-green-400" />;
      case 'received':
        return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionColor = (direction: string): string => {
    switch (direction) {
      case 'sent':
        return 'text-green-400';
      case 'received':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTransactionType = (type: string, direction: string): string => {
    if (type === 'Payment') {
      if (direction === 'sent') return 'Sent';
      if (direction === 'received') return 'Received';
      return 'Payment';
    }
    return type || 'Unknown';
  };


  // Format number to show only significant digits (remove trailing zeros, keep at least 2 decimal places)
  const formatSignificantDigits = (num: number): string => {
    if (isNaN(num)) return String(num);
    
    // Convert to string with enough precision
    const str = num.toFixed(10);
    
    // Remove trailing zeros, but keep at least 2 decimal places
    // First, ensure we have at least 2 decimal places
    const parts = str.split('.');
    if (parts.length === 1) {
      // No decimal point, add .00
      return `${parts[0]}.00`;
    }
    
    // Remove trailing zeros from decimal part
    let decimalPart = parts[1].replace(/0+$/, '');
    
    // Ensure at least 2 decimal places
    if (decimalPart.length < 2) {
      decimalPart = decimalPart.padEnd(2, '0');
    }
    
    return `${parts[0]}.${decimalPart}`;
  };

  const formatAmount = (
    amount: string | number | null, 
    currency: string, 
    sendMax?: { amount: string | number; currency: string } | null
  ): string => {
    if (!amount || amount === 'N/A') return 'N/A';
    
    // If SendMax exists and currency differs, show send → receive format
    if (sendMax && sendMax.currency && sendMax.currency !== currency) {
      const sendAmountNum = typeof sendMax.amount === 'string' ? parseFloat(sendMax.amount) : sendMax.amount;
      const receiveAmountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      if (!isNaN(sendAmountNum) && !isNaN(receiveAmountNum) && sendAmountNum > 0) {
        const sendCurrency = sendMax.currency === 'XRP' ? 'XRP' : sendMax.currency;
        const receiveCurrency = currency === 'XRP' ? 'XRP' : currency;
        
        const sendFormatted = formatSignificantDigits(sendAmountNum);
        const receiveFormatted = formatSignificantDigits(receiveAmountNum);
        
        return `${sendFormatted} ${sendCurrency} → ${receiveFormatted} ${receiveCurrency}`;
      }
    }
    
    // Default formatting for single currency
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(amountNum)) return String(amount);
    
    const formatted = formatSignificantDigits(amountNum);
    
    if (currency === 'XRP') {
      return `${formatted} XRP`;
    }
    
    return `${formatted} ${currency}`;
  };

  const getExplorerUrl = (hash: string) => {
    return `https://testnet.xrpl.org/transactions/${hash}`;
  };

  return (
    <div className="bg-color2 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Transaction History</h2>
          </div>
          
          <Button onClick={() => fetchTransactions()} className="flex items-center space-x-2">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-md">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto scrollbar-hide">
        {loading && transactions.length === 0 ? (
          <div className="p-6 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-400">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-400">Error: {error}</p>
            <button
              onClick={() => fetchTransactions()}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
            <p className="text-gray-400">No transactions found</p>
            <p className="text-sm text-gray-500 mt-2">Your transaction history will appear here</p>
          </div>
        ) : (
          <>
            {/* Transaction List */}
            <div className="divide-y divide-gray-700">
              {transactions.map((tx, index) => (
                <div key={`${tx.hash}-${index}`} className="p-6 hover:bg-color3 transition-colors">
                  <div className="flex items-center justify-between">
                    {/* Left Section - Icon, Type, and Details */}
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        {getTransactionIcon(tx.direction)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${getTransactionColor(tx.direction)}`}>
                            {formatTransactionType(tx.type, tx.direction)}
                          </span>
                          {tx.result === 'tesSUCCESS' ? (
                            <div 
                              ref={(el) => {
                                if (el && tx.match_template === false && tx.template_mismatch_reasons && tx.template_mismatch_reasons.length > 0) {
                                  checkmarkRefs.current.set(tx.hash, el);
                                } else {
                                  checkmarkRefs.current.delete(tx.hash);
                                }
                              }}
                              className="relative inline-flex items-center"
                              onMouseEnter={(e) => {
                                if (tx.match_template === false && tx.template_mismatch_reasons && tx.template_mismatch_reasons.length > 0) {
                                  const checkmarkEl = e.currentTarget;
                                  const rect = checkmarkEl.getBoundingClientRect();
                                  const modalWidth = 320; // w-80 = 320px
                                  const gap = 8; // ml-2 = 8px
                                  const padding = 16; // Viewport padding
                                  
                                  // Position to the right of checkmark
                                  let left = rect.right + gap;
                                  
                                  // Calculate modal height estimate (header + content + padding)
                                  const estimatedModalHeight = Math.min(400, tx.template_mismatch_reasons.length * 24 + 100);
                                  
                                  // Start with top aligned to checkmark center
                                  let top = rect.top + (rect.height / 2) - (estimatedModalHeight / 2);
                                  
                                  // Check if modal goes above viewport
                                  if (top < padding) {
                                    top = padding;
                                  }
                                  
                                  // Check if modal goes below viewport
                                  const viewportHeight = window.innerHeight;
                                  if (top + estimatedModalHeight > viewportHeight - padding) {
                                    top = viewportHeight - estimatedModalHeight - padding;
                                    // Ensure it doesn't go above viewport
                                    if (top < padding) {
                                      top = padding;
                                      // If still too tall, limit height and let it scroll
                                    }
                                  }
                                  
                                  // Check if modal goes beyond right edge of viewport
                                  const viewportWidth = window.innerWidth;
                                  if (left + modalWidth > viewportWidth - padding) {
                                    // Position to the left of checkmark instead
                                    left = rect.left - modalWidth - gap;
                                    // If still doesn't fit, align to right edge
                                    if (left < padding) {
                                      left = viewportWidth - modalWidth - padding;
                                    }
                                  }
                                  
                                  // Calculate arrow position relative to checkmark
                                  const arrowTop = rect.top + (rect.height / 2) - top;
                                  
                                  setModalPosition({ top, left, arrowTop });
                                  setHoveredTxHash(tx.hash);
                                }
                              }}
                              onMouseLeave={() => {
                                // Small delay to allow mouse to move to modal
                                setTimeout(() => {
                                  if (!document.querySelector('[data-modal-hash="' + tx.hash + '"]:hover')) {
                                    setHoveredTxHash(null);
                                    setModalPosition(null);
                                  }
                                }, 100);
                              }}
                            >
                              <CheckCircle className={`w-3 h-3 ${
                                tx.match_template === true 
                                  ? 'text-green-400' 
                                  : 'text-orange-400 cursor-pointer'
                              }`} />
                            </div>
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400" />
                          )}
                          {!tx.validated && (
                            <span className="text-xs text-yellow-400">Pending</span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-400 mt-1">
                          {tx.counterparty_username && (
                            <span>
                              {tx.direction === 'sent' ? 'To: ' : 'From: '}
                              {tx.counterparty_username}
                            </span>
                          )}
                          {tx.date && (
                            <span className="ml-2">
                              {formatDate(tx.date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Amount and Hash */}
                    <div className="flex items-center space-x-4 text-right">
                      <div>
                        <div className={`font-medium ${getTransactionColor(tx.direction)}`}>
                          {formatAmount(tx.amount, tx.currency, tx.sendMax)}
                        </div>
                        {tx.fee && (
                          <div className="text-xs text-gray-500">
                            Fee: {tx.fee} XRP
                          </div>
                        )}
                      </div>
                      
                      <a
                        href={getExplorerUrl(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="View on XRPL Explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Modal for template mismatch reasons - fixed positioning to avoid clipping */}
      {hoveredTxHash && modalPosition && (() => {
        const tx = transactions.find(t => t.hash === hoveredTxHash);
        if (!tx || tx.match_template !== false || !tx.template_mismatch_reasons || tx.template_mismatch_reasons.length === 0) {
          return null;
        }
        return (
          <div 
            data-modal-hash={hoveredTxHash}
            className="fixed z-[9999] w-80 max-w-[calc(100vw-2rem)] p-4 bg-slate-900 border border-orange-500 rounded-lg shadow-xl"
            style={{
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
              maxHeight: 'calc(100vh - 32px)',
            }}
            onMouseEnter={() => {
              setHoveredTxHash(hoveredTxHash);
            }}
            onMouseLeave={() => {
              setHoveredTxHash(null);
              setModalPosition(null);
            }}
          >
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-semibold text-orange-400">Template Mismatch Detected</div>
            </div>
            <div className="text-xs text-gray-300 space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {tx.template_mismatch_reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-orange-400 flex-shrink-0 mt-0.5">•</span>
                  <span className="flex-1 break-words">{reason}</span>
                </div>
              ))}
            </div>
            {/* Arrow pointing to checkmark */}
            <div 
              className="absolute right-full top-0"
              style={{
                top: `${modalPosition.arrowTop}px`,
                transform: 'translateY(-50%)',
              }}
            >
              <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-orange-500"></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

