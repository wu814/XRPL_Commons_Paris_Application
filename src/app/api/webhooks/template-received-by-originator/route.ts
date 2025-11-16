/**
 * Template Received Webhook
 * POST /api/webhooks/template-received-by-originator
 *
 * Receives acknowledgement from originator member that the payment template was received.
 * Flow:
 * 1. Originator member sends template receipt notification with tr_correlation_id.
 * 2. YONA validates payload and updates payment intent status to TEMPLATE_RECEIVED.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentIntent, updatePaymentIntent } from '@/services/paymentService';

interface TemplateReceivedWebhook {
  intent_id: string;
  tr_correlation_id: string;
  status: 'template_received';
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('\n📨 ============ TEMPLATE RECEIVED WEBHOOK ============');

    const body: TemplateReceivedWebhook = await request.json();

    console.log('📋 Webhook payload:', body);

    // === Step 1: Validate payload ===
    if (!body.intent_id || !body.tr_correlation_id || !body.status) {
      console.error('❌ Missing required fields in template received payload');
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: intent_id, tr_correlation_id, or status',
        },
        { status: 400 }
      );
    }

    if (body.status !== 'template_received') {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status received: ${body.status}`,
        },
        { status: 400 }
      );
    }

    // === Step 2: Fetch payment intent ===
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

    // === Step 3: Update payment intent status and tr_correlation_id ===
    const updatedIntent = await updatePaymentIntent(body.intent_id, {
      tr_correlation_id: body.tr_correlation_id,
      status: 'TEMPLATE_RECEIVED',
    });

    if (!updatedIntent) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update payment intent with template receipt information',
        },
        { status: 500 }
      );
    }

    console.log('✅ Payment intent updated with status: TEMPLATE_RECEIVED');
    console.log('🎉 ============ TEMPLATE RECEIPT PROCESSED ============\n');

    return NextResponse.json(
      {
        success: true,
        message: 'Template receipt processed successfully',
        data: {
          intent_id: body.intent_id,
          status: 'TEMPLATE_RECEIVED',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Template received webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}


