/**
 * Descriptor Response Webhook
 * POST /api/webhooks/descriptor-response
 * 
 * Receives descriptor response from beneficiary Member
 * Flow:
 * 1. Beneficiary Member sends descriptor response with coordinates and asset info
 * 2. YONA validates the response matches the original payment intent
 * 3. YONA updates payment_intent with beneficiary_account, destination_tag, receive_asset, receive_amount
 * 4. YONA updates status to DESCRIPTOR_RECEIVED
 * 5. YONA creates descriptor entry
 * 6. YONA generates payment template via XRPL simulation
 * 7. YONA sends payment template to originator member
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentIntent,
  updatePaymentIntent,
  getMemberByMemberId,
  generateTemplateId,
  createPaymentTemplate,
} from '@/services/paymentService';
import {
  sendPaymentTemplateToOriginator,
  buildYONACallbackURL,
} from '@/services/memberService';
import { simulateOnXRPL } from '@/utils/xrpl/simulate';
import { DescriptorResponse } from '@/types/paymentTypes';
import { decodeDescriptorCompactJWS } from '@/utils/jws/descriptor';

export async function POST(request: NextRequest) {
  try {
    const payload: DescriptorResponse = await request.json();

    // === Step 1: Validate required fields ===
    const {
      intent_id,
      descriptor_compact_jws,
      originator_member_name,
    } = payload;

    if (
      !intent_id ||
      !descriptor_compact_jws ||
      !originator_member_name
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields in descriptor response',
        },
        { status: 400 }
      );
    }

    // === Step 2: Get original payment intent ===
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

    // === Step 3: Validate originator member name matches ===
    if (originator_member_name && paymentIntent.originator_member_id) {
      const originatorMember = await getMemberByMemberId(paymentIntent.originator_member_id);
      if (originatorMember && originator_member_name !== originatorMember.member_name) {
        return NextResponse.json(
          {
            success: false,
            message: 'Originator member name mismatch',
          },
          { status: 400 }
        );
      }
    }

    const beneficiaryMember = await getMemberByMemberId(paymentIntent.beneficiary_member_id);
    if (!beneficiaryMember || !beneficiaryMember.jwks) {
      return NextResponse.json(
        {
          success: false,
          message: 'Beneficiary member not found or JWKS not configured',
        },
        { status: 404 }
      );
    }

    // === Step 4: Decode descriptor_compact_jws ===
    let decodedDescriptor;
    try {
      decodedDescriptor = await decodeDescriptorCompactJWS(
        descriptor_compact_jws,
        beneficiaryMember.jwks
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to decode descriptor JWS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 400 }
      );
    }

    // Validate decoded descriptor matches intent_id
    if (decodedDescriptor.intent_id !== intent_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Decoded descriptor intent_id does not match payload',
        },
        { status: 400 }
      );
    }

    // Extract values from decoded descriptor
    const descriptor_id = decodedDescriptor.descriptor_id;
    const invoice_id = decodedDescriptor.invoice_id;

    // === Step 5: Update payment intent with descriptor info and new status ===
    // Note: invoice_id from decodedDescriptor is already hashed by beneficiary
    // Store it directly (it's already in XRPL format: 64-character hex string)
    const updatedIntent = await updatePaymentIntent(intent_id, {
      descriptor_id,
      descriptor_compact_jws,
      invoice_id: decodedDescriptor.invoice_id, // Store hashed invoice_id from beneficiary
      status: 'DESCRIPTOR_RECEIVED',
    });

    if (!updatedIntent) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update payment intent',
        },
        { status: 500 }
      );
    }

    // === Step 6: Get originator member info (including bps_policy) ===
    const originatorMember = await getMemberByMemberId(paymentIntent.originator_member_id);
    if (!originatorMember) {
      return NextResponse.json(
        {
          success: false,
          message: 'Originator Member not found',
        },
        { status: 404 }
      );
    }

    if (!originatorMember.bps_policy) {
      return NextResponse.json(
        {
          success: false,
          message: 'Originator member bps_policy not configured',
        },
        { status: 400 }
      );
    }

    // === Step 7: Simulate XRPL pathfinding and create payment template ===
    if (!paymentIntent.send_asset || !paymentIntent.send_amount || !paymentIntent.originator_account) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing originator asset, amount, or account information for XRPL simulation',
        },
        { status: 400 }
      );
    }

    const simulationResult = await simulateOnXRPL(
      paymentIntent.send_asset!,
      decodedDescriptor.receive_asset,
      paymentIntent.send_amount!,
      decodedDescriptor.receive_amount,
      originatorMember.bps_policy,
      paymentIntent.originator_account!,
      decodedDescriptor.beneficiary_account,
      decodedDescriptor.destination_tag || null,
      decodedDescriptor.invoice_id
    );

    if (!simulationResult.success || !simulationResult.tx_template || simulationResult.ledger_index === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: 'XRPL simulation failed',
        },
        { status: 500 }
      );
    }

    // === Step 8: Create payment template ===
    // Note: invoice_id from decodedDescriptor is already hashed by beneficiary
    // Store it directly (it's already in XRPL format: 64-character hex string)
    const templateId = generateTemplateId();
    const lastLedgerSequence = simulationResult.ledger_index + 10;
    const paymentTemplate = await createPaymentTemplate({
      template_id: templateId,
      ledger_index: simulationResult.ledger_index,
      transaction_type: simulationResult.tx_template.TransactionType,
      account: simulationResult.tx_template.Account,
      destination: simulationResult.tx_template.Destination,
      destination_tag: simulationResult.tx_template.DestinationTag,
      amount: simulationResult.tx_template.Amount,
      send_max: simulationResult.tx_template.SendMax,
      paths: simulationResult.tx_template.Paths,
      flags: simulationResult.tx_template.Flags !== undefined ? simulationResult.tx_template.Flags : 0,
      invoice_id: decodedDescriptor.invoice_id, // Already hashed by beneficiary, store as-is
    });

    if (!paymentTemplate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create payment template',
        },
        { status: 500 }
      );
    }

    // === Step 9: Update payment intent with template_id ===
    const finalIntent = await updatePaymentIntent(intent_id, {
      template_id: templateId,
    });

    // === Step 10: Send TR request to originator member ===
    if (!beneficiaryMember.jwks) {
      return NextResponse.json(
        {
          success: false,
          message: 'Beneficiary member jwks not configured',
        },
        { status: 400 }
      );
    }

    // Convert JWKS to object format (JSONB) - handle both string and object from database
    let beneficiaryJWKS: { keys: Array<{ kty: string; crv: string; x: string; kid?: string; use?: string; alg?: string }> };
    if (typeof beneficiaryMember.jwks === 'string') {
      beneficiaryJWKS = JSON.parse(beneficiaryMember.jwks) as { keys: Array<{ kty: string; crv: string; x: string; kid?: string; use?: string; alg?: string }> };
    } else if (typeof beneficiaryMember.jwks === 'object' && beneficiaryMember.jwks !== null) {
      beneficiaryJWKS = beneficiaryMember.jwks as { keys: Array<{ kty: string; crv: string; x: string; kid?: string; use?: string; alg?: string }> };
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JWKS format in beneficiary member record',
        },
        { status: 400 }
      );
    }

    const trResult = await sendPaymentTemplateToOriginator(originatorMember, {
      intent_id,
      transaction_type: paymentIntent.transaction_type || 'P2P_INTERVASP',
      beneficiary_member_name: beneficiaryMember.member_name,
      originator_yona_id: paymentIntent.originator_yona_id,
      descriptor_compact_jws,
      beneficiary_jwks: beneficiaryJWKS,
      xrpl_payment_template: {
        TransactionType: simulationResult.tx_template.TransactionType,
        Account: simulationResult.tx_template.Account,
        Destination: simulationResult.tx_template.Destination,
        DestinationTag: simulationResult.tx_template.DestinationTag,
        Amount: simulationResult.tx_template.Amount,
        SendMax: simulationResult.tx_template.SendMax,
        Paths: simulationResult.tx_template.Paths,
        Flags: simulationResult.tx_template.Flags,
        InvoiceID: simulationResult.tx_template.InvoiceID,
        LastLedgerSequence: lastLedgerSequence,
        Sequence: 0,
      },
      callback_url: buildYONACallbackURL('template-received-by-originator'),
    });

    if (!trResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: trResult.message || 'Failed to send TR request to originator member',
        },
        { status: 500 }
      );
    }

    // === Step 11: Return success response ===
    return NextResponse.json(
      {
        success: true,
        message: 'Descriptor received and TR request sent to originator member',
        data: {
          intent_id,
          status: 'DESCRIPTOR_RECEIVED',
        },
      },
      { status: 200 }
    );

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

