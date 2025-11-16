/**
 * Payment Complete Webhook
 * POST /api/webhooks/payment-complete
 * 
 * Receives payment completion notification from originator VASP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymentCompleteWebhook } from '@/types/paymentTypes';
import { getPaymentIntent, updatePaymentIntent, getPaymentTemplateByIntentId, compareTransactionWithTemplate } from '@/services/paymentService';
import { getXRPLTransactionByHash } from '@/utils/xrpl/getAccountTransaction';

export async function POST(request: NextRequest) {
  try {
    const body: PaymentCompleteWebhook = await request.json();

    if (!body.intent_id || !body.status) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: intent_id or status',
        },
        { status: 400 }
      );
    }

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

    if (body.status === 'completed') {
      // Update payment intent with tx_hash first
      const updatedIntent = await updatePaymentIntent(body.intent_id, {
        status: 'PAYMENT_COMPLETE',
        tx_hash: body.transaction_hash || undefined,
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

      // Verify transaction matches template if tx_hash is provided
      if (body.transaction_hash) {
        try {
          // Query payment template
          const template = await getPaymentTemplateByIntentId(body.intent_id);
          if (template) {
            // Query XRPL transaction
            const xrplTx = await getXRPLTransactionByHash(body.transaction_hash);
            if (xrplTx) {
              // Compare transaction with template
              const comparison = compareTransactionWithTemplate(xrplTx, template);
              
              if (comparison.matches) {
                await updatePaymentIntent(body.intent_id, {
                  match_template: true,
                  template_mismatch_reasons: null,
                });
              } else {
                await updatePaymentIntent(body.intent_id, {
                  match_template: false,
                  template_mismatch_reasons: comparison.errors,
                });
              }
            }
          }
        } catch (error) {
          // Leave match_template as NULL on error
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Payment completed successfully',
          data: {
            intent_id: body.intent_id,
            status: 'PAYMENT_COMPLETE',
          },
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: true,
          message: 'Payment failure notification received',
          data: {
            intent_id: body.intent_id,
            status: 'failed',
            error: body.message,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

