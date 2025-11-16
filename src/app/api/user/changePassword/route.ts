import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { changePassword } from "@/services/userService";
import { APIResponse } from "@/types/apitypes";

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<APIResponse<never>>> {
  try {
    // Get authenticated user from session
    const supabase = await createSupabaseAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword }: ChangePasswordRequest = await req.json();

    // Use service to change password
    const error = await changePassword(user.id, currentPassword, newPassword);

    if (error) {
      // Determine status code based on error type
      const statusCode = error.includes('required') || error.includes('must be') || error.includes('incorrect')
        ? 400
        : error.includes('not found')
        ? 404
        : 500;

      return NextResponse.json(
        { success: false, message: error },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { success: true, message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in changePassword:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}


