# YONA Payment Flow Documentation

## Overview

This document describes the complete payment flow from initiation to completion, including all API calls, webhooks, and status transitions.

## High-Level Payment Flow

```
┌─────────────┐
│   User      │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. User initiates payment
       │
       ▼
┌─────────────────────────────────────┐
│  Payment Initiation                 │
│  ─────────────────────────────────  │
│  • Validate users & members         │
│  • Check currency support           │
│  • Request funding decision          │
│    (from Originator Member)         │
│  • Create payment intent             │
│  • Request descriptor                │
│    (from Beneficiary Member)         │
└──────┬──────────────────────────────┘
       │
       │ Status: PAYMENT_INITIATED
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend polls status              │
└─────────────────────────────────────┘
       │
       │
       ▼
┌─────────────────────────────────────┐
│  Descriptor Response                │
│  ─────────────────────────────────  │
│  • Receives payment descriptor       │
│  • Decodes and validates             │
│  • Updates payment intent            │
│  • Simulates XRPL transaction       │
│  • Creates payment template          │
│  • Sends template to Originator     │
└──────┬──────────────────────────────┘
       │
       │ Status: DESCRIPTOR_RECEIVED
       │
       ▼
┌─────────────────────────────────────┐
│  Template Acknowledgment            │
│  ─────────────────────────────────  │
│  • Originator acknowledges template  │
│  • Updates status                    │
└──────┬──────────────────────────────┘
       │
       │ Status: TEMPLATE_RECEIVED
       │
       ▼
┌─────────────────────────────────────┐
│  Travel Rule Acceptance              │
│  ─────────────────────────────────  │
│  • Travel Rule compliance check     │
│  • User signs transaction           │
│  • Submits to XRPL                  │
└──────┬──────────────────────────────┘
       │
       │ Status: TR_ACCEPTED
       │
       ▼
┌─────────────────────────────────────┐
│  Payment Completion                  │
│  ─────────────────────────────────  │
│  • Receives transaction hash         │
│  • Updates status                    │
│  • Verifies transaction matches      │
│    template                          │
└─────────────────────────────────────┘
       │
       │ Status: PAYMENT_COMPLETE
```

## Detailed Step-by-Step Flow

### Phase 1: Payment Initiation

**Frontend Action:**
- User fills out payment form
- Enters recipient username, currency, and amount
- Clicks "Send Payment"

**Backend Process:**
1. **Validation**
   - Validates required fields (sender, recipient, currency, amount)
   - Fetches sender and receiver user records
   - Validates payment parties

2. **Member Identification**
   - Retrieves originator member (sender's VASP)
   - Retrieves beneficiary member (receiver's VASP)
   - Checks if both members support the requested currency
   - Verifies member availability

3. **Transaction Type Determination**
   - Determines one of 8 possible transaction types based on account types and member relationships

4. **Funding Decision Request**
   - Requests funding decision from originator member
   - Originator responds with send asset and account information

5. **Payment Intent Creation**
   - Generates unique intent ID
   - Creates payment intent record with status: `PAYMENT_INITIATED`
   - Stores originator and beneficiary information

6. **Descriptor Request**
   - Requests payment descriptor from beneficiary member
   - Beneficiary will respond asynchronously via webhook

**Frontend Action:**
- Receives intent ID
- Starts polling payment status
- Displays "Payment Initiated" status to user

---

### Phase 2: Descriptor Response

**Trigger:** Beneficiary member responds to the descriptor request via webhook.

**Backend Process:**
1. **Validation**
   - Validates webhook payload
   - Retrieves payment intent from database
   - Verifies originator member information

2. **JWS Decoding**
   - Decodes signed descriptor payload using beneficiary member's JWKS
   - Extracts beneficiary account, destination tag, receive asset/amount, and invoice ID

3. **Payment Intent Update**
   - Updates payment intent with descriptor information
   - Sets status: `DESCRIPTOR_RECEIVED`

4. **XRPL Simulation**
   - Simulates XRPL transaction to find optimal payment path
   - Builds transaction template with all required fields
   - Determines current ledger index for transaction timing

5. **Payment Template Creation**
   - Generates unique template ID
   - Creates payment template record in database
   - Stores transaction structure for later verification

6. **Send Template to Originator**
   - Sends payment template to originator member
   - Includes descriptor and verification keys
   - Provides callback URL for acknowledgment

**Frontend Update:**
- Status polling detects `DESCRIPTOR_RECEIVED`
- UI updates to show "Descriptor Received"

---

### Phase 3: Template Acknowledgment

**Trigger:** Originator member acknowledges receipt of the payment template via webhook.

**Backend Process:**
1. **Validation**
   - Validates webhook payload
   - Retrieves payment intent

2. **Update Payment Intent**
   - Stores Travel Rule correlation ID
   - Updates status: `TEMPLATE_RECEIVED`

**Frontend Update:**
- Status polling detects `TEMPLATE_RECEIVED`
- UI updates to show "Template Received"

---

### Phase 4: Travel Rule Acceptance

**Trigger:** Originator member completes Travel Rule compliance checks and notifies YONA via webhook.

**Backend Process:**
1. **Validation**
   - Validates webhook payload
   - Retrieves payment intent

2. **Update Payment Intent**
   - Updates status: `TR_ACCEPTED`

**Frontend Update:**
- Status polling detects `TR_ACCEPTED`
- UI updates to show "TR Accepted"
- Originator member's UI shows "Sign Transaction" button

**Originator Member Action:**
- User clicks "Sign Transaction" button
- Originator member signs the XRPL transaction
- Submits transaction to XRPL network
- Receives transaction hash

---

### Phase 5: Payment Completion

**Trigger:** Originator member notifies YONA after successfully submitting the transaction to XRPL.

**Backend Process:**
1. **Validation**
   - Validates webhook payload
   - Retrieves payment intent

2. **Update Payment Intent**
   - Stores transaction hash
   - Updates status: `PAYMENT_COMPLETE`

3. **Transaction Verification**
   - Fetches actual XRPL transaction from the ledger
   - Retrieves stored payment template
   - Compares transaction with template:
     - Transaction type, accounts, amounts, paths, flags
     - Ledger index must be within acceptable range
   - Updates payment intent with verification result:
     - `match_template`: Boolean indicating if transaction matches template
     - `template_mismatch_reasons`: Array of error messages if mismatch

**Frontend Update:**
- Status polling detects `PAYMENT_COMPLETE`
- UI updates to show "Payment Complete"
- Transaction appears in transaction history
- If template verification fails, shows orange checkmark with hover tooltip showing mismatch reasons

---

## Payment Status Lifecycle

```
PAYMENT_INITIATED
    ↓
DESCRIPTOR_RECEIVED
    ↓
TEMPLATE_RECEIVED
    ↓
TR_ACCEPTED
    ↓
PAYMENT_COMPLETE
```

