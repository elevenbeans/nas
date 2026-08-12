import { NextResponse } from "next/server";
import { getSystemStatus } from "@/lib/system-status";

export async function GET() {
  try {
    return NextResponse.json(getSystemStatus());
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get system status" },
      { status: 500 }
    );
  }
}
