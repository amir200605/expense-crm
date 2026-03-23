import { NextResponse } from "next/server";

/**
 * Intentionally disabled for security.
 * We no longer allow creating default admin/demo credentials from the public login flow.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Disabled for security.",
      hint: "Create users through your protected admin/team flows only.",
    },
    { status: 403 }
  );
}
