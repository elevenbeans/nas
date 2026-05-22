import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    // Disk usage
    const df = execSync("df -H /Volumes/NAS-Data 2>/dev/null || df -H /", {
      encoding: "utf-8",
    });
    const dfLines = df.trim().split("\n");
    const dfParts = dfLines[1]?.split(/\s+/) ?? [];
    const used = dfParts[2] ?? "—";
    const total = dfParts[1] ?? "—";
    const percentStr = dfParts[4] ?? "0%";
    const percent = parseInt(percentStr.replace("%", ""), 10) || 0;

    // SMB service check
    let smb = false;
    try {
      const smbOut = execSync("pgrep -x samba-dot-org-smbd", { encoding: "utf-8" });
      smb = smbOut.trim().length > 0;
    } catch {
      smb = false;
    }

    // Network info
    let ip = "192.168.1.46";
    let iface = "en0";
    try {
      const ifconfig = execSync(
        `ifconfig en0 2>/dev/null | grep "inet " | awk '{print $2}'`,
        { encoding: "utf-8" }
      );
      if (ifconfig.trim()) ip = ifconfig.trim();
    } catch {}

    return NextResponse.json({
      storage: { used, total, percent },
      services: { smb },
      network: { ip, hostname: "Mac Mini", interface: iface },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get system status" },
      { status: 500 }
    );
  }
}
