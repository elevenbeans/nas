import { execSync } from "child_process";

export interface SystemStatus {
  storage: { used: string; total: string; percent: number };
  services: { smb: boolean };
  network: { ip: string; hostname: string; interface: string };
}

function smbIsRunning(): boolean {
  try {
    const out = execSync(
      'netstat -anv -p tcp 2>/dev/null | grep "\\.445 " | grep -c LISTEN',
      { encoding: "utf-8" }
    );
    return parseInt(out.trim(), 10) > 0;
  } catch {
    return false;
  }
}

export function getSystemStatus(): SystemStatus {
  const df = execSync("df -H /Volumes/NAS-Data 2>/dev/null || df -H /", {
    encoding: "utf-8",
  });
  const dfParts = df.trim().split("\n")[1]?.split(/\s+/) ?? [];
  const used = dfParts[2] ?? "—";
  const total = dfParts[1] ?? "—";
  const percentStr = dfParts[4] ?? "0%";
  const percent = parseInt(percentStr.replace("%", ""), 10) || 0;

  let ip = "192.168.1.46";
  try {
    const ifconfig = execSync(`ifconfig en0 2>/dev/null | grep "inet " | awk '{print $2}'`, {
      encoding: "utf-8",
    });
    if (ifconfig.trim()) ip = ifconfig.trim();
  } catch {}

  return {
    storage: { used, total, percent },
    services: { smb: smbIsRunning() },
    network: { ip, hostname: "Mac Mini", interface: "en0" },
  };
}
