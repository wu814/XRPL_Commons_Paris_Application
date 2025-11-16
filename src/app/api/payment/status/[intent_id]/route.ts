/**
 * Payment Status Endpoint
 * GET /api/payment/status/[intent_id]
 * 
 * Returns the current status of a payment intent for frontend polling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentIntent } from '@/services/paymentService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ intent_id: string }> }
) {
  try {
    const { intent_id } = await params;

    if (!intent_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing intent_id parameter',
        },
        { status: 400 }
      );
    }

    // Get payment intent
    const paymentIntent = await getPaymentIntent(intent_id);
    
    if (!paymentIntent) {
      return NextResponse.json(
        {
          success: false,
          message: `Payment intent not found: ${intent_id}`,
        },
        { status: 404 }
      );
    }

    // Return current status
    return NextResponse.json(
      {
        success: true,
        data: {
          intent_id: paymentIntent.intent_id,
          status: paymentIntent.status || 'PAYMENT_INITIATED',
          tx_hash: paymentIntent.tx_hash,
          created_at: paymentIntent.created_at,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Payment status endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

