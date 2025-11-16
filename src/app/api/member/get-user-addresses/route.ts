import { NextRequest, NextResponse } from 'next/server';
import { getMemberByMemberId } from '@/services/paymentService';
import { normalizeApiEndpoint } from '@/services/memberService';

interface GetUserAddressesRequest {
  member_id: string;
  yona_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GetUserAddressesRequest = await request.json();
    const { member_id, yona_id } = body;

    if (!member_id || !yona_id) {
      return NextResponse.json(
        { success: false, addresses: [], message: 'Missing required fields: member_id and yona_id' },
        { status: 400 }
      );
    }

    // Get member info to get API endpoint
    const member = await getMemberByMemberId(member_id);
    if (!member || !member.api_endpoint) {
      console.error('❌ Member not found or no API endpoint');
      return NextResponse.json(
        { success: false, addresses: [], message: 'Member not found or no API endpoint' },
        { status: 404 }
      );
    }

    // Normalize endpoint URL using the shared function
    const normalizedEndpoint = normalizeApiEndpoint(member.api_endpoint);
    const endpoint = `${normalizedEndpoint}/api/member/get-user-addresses`;

    console.log(`📞 Proxying request to member API: ${endpoint}`);

    // Proxy the request to member API (server-side, no CORS issues)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Member-ID': member_id,
        'X-Client-ID': 'YONA',
      },
      body: JSON.stringify({ yona_id }),
    });

    if (!response.ok) {
      let errorMessage = `Member API error: ${response.status}`;
      try {
        // Try to parse as JSON first
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          // If not JSON, try text
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
      } catch (e) {
        // If we can't read the error, use the default message
        console.error('Could not parse error response:', e);
      }
      console.error(`❌ Member API error: ${response.status} - ${errorMessage}`);
      return NextResponse.json(
        { success: false, addresses: [], message: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ Successfully proxied user addresses response`);
    
    // Ensure addresses is a string array (member API should return string[])
    if (data.addresses && Array.isArray(data.addresses)) {
      // If addresses are objects, extract classic_address; if already strings, use as-is
      data.addresses = data.addresses.map((addr: any) => 
        typeof addr === 'string' ? addr : addr.classic_address
      ).filter((addr: string) => addr !== null && addr !== undefined);
    }
    
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { success: false, addresses: [], message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

