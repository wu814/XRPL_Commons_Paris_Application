"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import CurrencyDropdown from "@/components/currency/CurrencyDropdown";
import Button from "../app/Button";
import { Search, Loader2, X, CheckCircle, AlertCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@/types/appTypes";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

interface PaymentStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  intentId?: string;
  txHash?: string;
}

type PaymentProgressStatus =
  | 'PAYMENT_INITIATED'
  | 'DESCRIPTOR_RECEIVED'
  | 'TEMPLATE_RECEIVED'
  | 'TR_ACCEPTED'
  | 'PAYMENT_COMPLETE';

export default function PaymentMdl() {
  const { user: currentUser } = useSupabaseSession();
  const [recipientUsername, setRecipientUsername] = useState("");
  const [searchText, setSearchText] = useState<string>("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [fetched, setFetched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currency, setCurrency] = useState("USD");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ type: 'idle' });
  const [progressStatus, setProgressStatus] = useState<PaymentProgressStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch users only once when input is focused
  const handleFocus = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, username, yona_id, member_id')
        .not('username', 'is', null)
        .order('username');
      
      if (error) throw new Error(`Failed to fetch users: ${error.message}`);
      setAllUsers((data || []) as User[]);
      setFetched(true);
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Filter as user types
  useEffect(() => {
    if (searchText === "" || searchText === recipientUsername) {
      setFilteredUsers([]);
      return;
    }
    const filtered = allUsers.filter((user) =>
      user.username.toLowerCase().includes(searchText.toLowerCase()),
    );
    setFilteredUsers(filtered);
  }, [searchText, allUsers, recipientUsername]);

  const handleSelectUser = (username: string) => {
    setRecipientUsername(username);
    setSearchText(username);
    setFilteredUsers([]);
  };

  // Helper function to stop polling (clears both interval and timeout)
  // Using useCallback to ensure stable reference for cleanup
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setPollingInterval(null);
  }, []);

  // Poll payment status
  const startPollingStatus = (intentId: string) => {
    // Clear any existing polling first
    stopPolling();

    const poll = async () => {
      try {
        const response = await fetch(`/api/payment/status/${intentId}`);
        const data = await response.json();

        if (data.success && data.data) {
          const currentStatus = data.data.status as PaymentProgressStatus;
          setProgressStatus(currentStatus);

          // Stop polling when payment is complete
          if (currentStatus === 'PAYMENT_COMPLETE') {
            stopPolling();
            setPaymentStatus({
              type: 'success',
              message: 'Payment completed successfully!',
              intentId,
              txHash: data.data.tx_hash,
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    };

    // Poll immediately
    poll();

    // Then poll every 1.5 seconds
    const interval = setInterval(poll, 1500);
    pollingIntervalRef.current = interval;
    setPollingInterval(interval);

    // Set timeout to stop polling after 60 seconds
    const timeout = setTimeout(() => {
      console.log('Polling stopped: 60 second timeout reached');
      stopPolling();
      // Update status to show timeout error
      setPaymentStatus((prevStatus) => {
        // Only show timeout error if we're still in loading state
        if (prevStatus.type === 'loading' || prevStatus.intentId === intentId) {
          return {
            type: 'error',
            message: 'Payment status check timed out. Please check the payment status manually.',
            intentId,
          };
        }
        return prevStatus;
      });
    }, 60000); // 60 seconds
    pollingTimeoutRef.current = timeout;
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleSendPayment = async () => {
    // Validate inputs
    if (!currentUser?.username) {
      setPaymentStatus({
        type: 'error',
        message: 'You must be logged in to send payments',
      });
      return;
    }

    if (!recipientUsername.trim()) {
      setPaymentStatus({
        type: 'error',
        message: 'Please select a recipient',
      });
      return;
    }

    if (!receiveAmount || parseFloat(receiveAmount) <= 0) {
      setPaymentStatus({
        type: 'error',
        message: 'Please enter a valid amount',
      });
      return;
    }

    if (currentUser.username === recipientUsername) {
      setPaymentStatus({
        type: 'error',
        message: 'You cannot send payment to yourself',
      });
      return;
    }

    setPaymentStatus({ type: 'loading', message: 'Initiating payment...' });

    try {
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_username: currentUser.username,
          recipient_username: recipientUsername,
          currency: currency,
          amount: parseFloat(receiveAmount),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Payment initiation failed');
      }

      const intentId = data.data?.intent_id;
      
      setPaymentStatus({
        type: 'loading',
        message: 'Processing payment...',
        intentId,
      });

      // Start polling for status updates
      if (intentId) {
        startPollingStatus(intentId);
      }

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Payment failed. Please try again.',
      });
    }
  };

  const dismissStatus = () => {
    // Reset form when dismissing success message
    if (paymentStatus.type === 'success') {
      setRecipientUsername('');
      setSearchText('');
      setReceiveAmount('');
    }
    
    setPaymentStatus({ type: 'idle' });
    setProgressStatus(null);
  };

  // Map internal status to user-facing status
  const getUserFacingStatus = (status: PaymentProgressStatus): 'Payment Initiated' | 'Payment Under Review' | 'Payment Complete' => {
    if (status === 'PAYMENT_INITIATED') {
      return 'Payment Initiated';
    }
    if (status === 'DESCRIPTOR_RECEIVED' || status === 'TEMPLATE_RECEIVED' || status === 'TR_ACCEPTED') {
      return 'Payment Under Review';
    }
    if (status === 'PAYMENT_COMPLETE') {
      return 'Payment Complete';
    }
    // Fallback (should not happen)
    return 'Payment Under Review';
  };

  // Render progress status badge
  const renderProgressBadge = () => {
    if (!progressStatus) return null;

    const userFacingStatus = getUserFacingStatus(progressStatus);

    const statusConfig = {
      'Payment Initiated': {
        color: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
        icon: '🚀',
        text: 'Payment Initiated',
      },
      'Payment Under Review': {
        color: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
        icon: '⏳',
        text: 'Payment Under Review',
      },
      'Payment Complete': {
        color: 'bg-green-500/10 border-green-500/20 text-green-500',
        icon: '✅',
        text: 'Payment Complete',
      },
    };

    const config = statusConfig[userFacingStatus];

    return (
      <div className={`rounded-lg p-3 flex items-center gap-2 border ${config.color}`}>
        <span className="text-lg">{config.icon}</span>
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center bg-color1">
      <div className="w-auto min-w-96 space-y-4 rounded-lg bg-color2 p-6">
        <div className="relative mb-6 flex justify-between">
          <h2 className="text-start text-2xl font-semibold">Transfer / Pay</h2>
        </div>

        {/* Progress Status Badge */}
        {progressStatus && paymentStatus.type === 'loading' && renderProgressBadge()}

        {/* Status Messages */}
        {paymentStatus.type !== 'idle' && paymentStatus.type !== 'loading' && (
          <div className={`rounded-lg p-4 flex items-start gap-3 ${
            paymentStatus.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
            paymentStatus.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
            'bg-blue-500/10 border border-blue-500/20'
          }`}>
            {paymentStatus.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            {paymentStatus.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                paymentStatus.type === 'success' ? 'text-green-500' :
                paymentStatus.type === 'error' ? 'text-red-500' :
                'text-blue-500'
              }`}>
                {paymentStatus.message}
              </p>
              {paymentStatus.type === 'success' && paymentStatus.txHash && (
                <p className="text-xs text-gray1 mt-1">
                  Transaction Hash: {paymentStatus.txHash}
                </p>
              )}
            </div>
            <button
              onClick={dismissStatus}
              className="text-gray1 hover:text-white flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm text-gray1 mb-1">
            Recipient Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray1" />
            </div>
            {loading && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Loader2 className="w-5 h-5 text-gray1 animate-spin" />
              </div>
            )}
            <input
              type="text"
              placeholder="Search users..."
              onFocus={handleFocus}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              disabled={paymentStatus.type === 'loading'}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border border-transparent bg-color3 hover:border-gray2 focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                loading ? "pr-12" : ""
              }`}
            />
            {filteredUsers.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full rounded-lg bg-color3 border border-gray2 shadow-lg">
                {filteredUsers.map((user) => (
                  <li key={user.username}>
                    <button
                      onClick={() => handleSelectUser(user.username)}
                      className="w-full text-left block px-4 py-2 text-sm hover:bg-color4 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {user.username}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <label className="block text-sm text-gray1">Receive Asset</label>
        <CurrencyDropdown
          value={currency}
          onChange={setCurrency}
          disabledOptions={[]}
        />
        <div>
          <label className="block text-sm text-gray1">Receive Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={receiveAmount}
            onChange={(e) => setReceiveAmount(e.target.value)}
            disabled={paymentStatus.type === 'loading'}
            className="mt-1 w-full rounded-lg border border-transparent bg-color3 p-2 hover:border-gray2 focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="0.00"
          />
        </div>

        <Button 
          variant="primary" 
          onClick={handleSendPayment} 
          className="w-full"
          disabled={paymentStatus.type === 'loading'}
        >
          {paymentStatus.type === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : (
            'Send'
          )}
        </Button>
      </div>
    </div>
  );
}
