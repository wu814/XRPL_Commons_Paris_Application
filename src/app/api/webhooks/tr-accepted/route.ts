/**
 * TR Accepted Webhook
 * POST /api/webhooks/tr-accepted
 * 
 * Receives TR accepted notification from originator Member.
 * Updates the payment intent status to TR_ACCEPTED.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentIntent, updatePaymentIntent } from '@/services/paymentService';
import { TRAcceptedWebhook } from '@/types/paymentTypes';

export async function POST(request: NextRequest) {
  try {
    console.log('\n📨 ============ TR ACCEPTED WEBHOOK ============');
    
    const body: TRAcceptedWebhook = await request.json();
    
    console.log('📋 Webhook payload:', body);

    // === Step 1: Validate payload ===
    if (!body.intent_id || !body.tr_correlation_id || !body.status) {
      console.error('❌ Missing required fields in TR accepted payload');
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: intent_id, tr_correlation_id, or status',
        },
        { status: 400 }
      );
    }

    if (body.status !== 'accepted') {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status received: ${body.status}`,
        },
        { status: 400 }
      );
    }

    // === Step 2: Load payment intent ===
    const paymentIntent = await getPaymentIntent(body.intent_id);
    
    if (!paymentIntent) {
      return NextResponse.json(
        {
          success: false,
          message: `Payment intent not found: ${body.intent_id}`,
        },
        { status: 404 }
      );
    }

    console.log('✅ Payment intent found');

    if (paymentIntent.tr_correlation_id && paymentIntent.tr_correlation_id !== body.tr_correlation_id) {
      console.warn(
        `⚠️ TR correlation ID mismatch: stored=${paymentIntent.tr_correlation_id}, received=${body.tr_correlation_id}`
      );
    }

    // === Step 3: Update status only ===
    const updatedIntent = await updatePaymentIntent(body.intent_id, {
      tr_correlation_id: body.tr_correlation_id,
      status: 'TR_ACCEPTED',
    });

    if (!updatedIntent) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update payment intent status',
        },
        { status: 500 }
      );
    }

    console.log('✅ Payment intent updated to status: TR_ACCEPTED');
    console.log('🎉 ============ TR ACCEPTED PROCESSED ============\n');

    return NextResponse.json(
      {
        success: true,
        message: 'TR accepted processed successfully',
        data: {
          intent_id: body.intent_id,
          status: 'TR_ACCEPTED',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ TR accepted webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

