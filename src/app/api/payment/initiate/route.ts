/**
 * Payment Initiation API Endpoint
 * POST /api/payment/initiate
 * 
 * Flow:
 * 1. User initiates payment from frontend with currency
 * 2. Validate sender and receiver
 * 3. Check if both members support the currency
 * 4. Determine transaction type
 * 5. Request funding decision from originator member
 * 6. Create payment intent with PAYMENT_INITIATED status
 * 7. Request descriptor from beneficiary member
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUsername,
  getMemberByMemberId,
  validatePaymentParties,
  generateIntentId,
  createPaymentIntent,
  determineTransactionType,
  checkSupportedCurrency,
} from '@/services/paymentService';
import {
  requestFundingDecision,
  requestDescriptor,
  buildYONACallbackURL,
  checkMembersAvailability,
} from '@/services/memberService';
import { InitiatePaymentRequest, InitiatePaymentResponse } from '@/types/paymentTypes';

export async function POST(request: NextRequest) {
  try {
    const body: InitiatePaymentRequest = await request.json();
    const { sender_username, recipient_username, currency, amount } = body;

    // === Step 1: Validate inputs ===
    if (!sender_username || !recipient_username || !currency || !amount || amount <= 0) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: 'Missing or invalid required fields',
        },
        { status: 400 }
      );
    }

    // === Step 2: Get sender and receiver info ===
    const sender = await getUserByUsername(sender_username);
    const receiver = await getUserByUsername(recipient_username);

    if (!sender) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: 'Sender not found',
        },
        { status: 404 }
      );
    }

    if (!receiver) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: 'Recipient not found',
        },
        { status: 404 }
      );
    }

    // === Step 3: Validate payment parties ===
    const validation = validatePaymentParties(sender, receiver);
    if (!validation.valid) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: validation.error || 'Invalid payment parties',
        },
        { status: 400 }
      );
    }

    // === Step 4: Get Member information ===
    const originatorMember = await getMemberByMemberId(sender.member_id);
    const beneficiaryMember = await getMemberByMemberId(receiver.member_id);

    if (!originatorMember || !beneficiaryMember) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: 'One or both Members not found',
        },
        { status: 404 }
      );
    }

    // === Step 5: Check if both members support the currency ===
    const currencyCheck = await checkSupportedCurrency(
      sender.member_id,
      receiver.member_id,
      currency
    );
    if (!currencyCheck.valid) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: currencyCheck.error || 'Currency not supported',
        },
        { status: 400 }
      );
    }

    // === Step 6: Check Member availability ===
    const membersAvailable = await checkMembersAvailability(originatorMember, beneficiaryMember);
    if (!membersAvailable) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: 'One or both Members are currently unavailable',
        },
        { status: 503 }
      );
    }

    // === Step 7: Generate intent ID ===
    const intentId = generateIntentId();

    // === Step 8: Determine transaction type ===
    const transactionType = await determineTransactionType(
      sender,
      receiver,
      originatorMember,
      beneficiaryMember
    );

    // === Step 9: Request funding decision from originator member ===
    const fundingDecision = await requestFundingDecision(originatorMember, {
      originator_yona_id: sender.yona_id,
      currency: currency,
      amount: amount,
      chain: 'XRPL',
      transaction_type: transactionType,
    });

    if (!fundingDecision.success || !fundingDecision.send_asset || !fundingDecision.send_account) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: fundingDecision.message || 'Failed to get funding decision from originator member',
        },
        { status: 400 }
      );
    }

    // === Step 10: Create payment intent with PAYMENT_INITIATED status ===
    const paymentIntent = await createPaymentIntent({
      intent_id: intentId,
      send_amount: amount,
      send_asset: fundingDecision.send_asset,
      originator_account: fundingDecision.send_account,
      originator_yona_id: sender.yona_id,
      originator_member_id: sender.member_id,
      beneficiary_member_id: receiver.member_id,
      beneficiary_yona_id: receiver.yona_id,
      chain: 'XRPL',
      transaction_type: transactionType,
      status: 'PAYMENT_INITIATED',
    });

    if (!paymentIntent) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: 'Failed to create payment intent',
        },
        { status: 500 }
      );
    }

    // === Step 11: Request descriptor from beneficiary member ===
    const descriptorResult = await requestDescriptor(beneficiaryMember, {
      intent_id: intentId,
      originator_member_name: originatorMember.member_name,
      beneficiary_yona_id: receiver.yona_id,
      currency: currency,
      amount: amount,
      transaction_type: transactionType,
      chain: 'XRPL',
      callback_url: buildYONACallbackURL('descriptor-response'),
    });

    if (!descriptorResult.success) {
      return NextResponse.json<InitiatePaymentResponse>(
        {
          success: false,
          message: descriptorResult.message || 'Failed to request descriptor from beneficiary member',
        },
        { status: 500 }
      );
    }

    // === Step 12: Return success response ===
    return NextResponse.json<InitiatePaymentResponse>(
      {
        success: true,
        message: 'Payment initiated successfully. Requesting descriptor from beneficiary member.',
        data: {
          intent_id: intentId,
          status: 'PAYMENT_INITIATED',
        },
      },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json<InitiatePaymentResponse>(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

