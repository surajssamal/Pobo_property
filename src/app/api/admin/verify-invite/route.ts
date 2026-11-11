import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/verify-invite
 * Verifies the admin invite code server-side.
 * The actual code lives in ADMIN_INVITE_CODE (no NEXT_PUBLIC_ prefix)
 * so it is NEVER sent to the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inviteCode } = body as { inviteCode?: string };

    const serverCode = process.env.ADMIN_INVITE_CODE;

    if (!serverCode) {
      // If the env var is missing, block all signups to be safe
      return NextResponse.json(
        { valid: false, error: 'Admin invite system is not configured. Contact your system administrator.' },
        { status: 503 }
      );
    }

    if (!inviteCode || inviteCode.trim() !== serverCode.trim()) {
      // Generic message — don't reveal whether the code exists
      return NextResponse.json(
        { valid: false, error: 'Invalid invite code. Please contact your administrator.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Request could not be processed.' },
      { status: 400 }
    );
  }
}
