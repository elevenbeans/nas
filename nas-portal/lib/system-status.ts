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

  const { ip, interface: iface } = detectLanAddress();

  return {
    storage: { used, total, percent },
    services: { smb: smbIsRunning() },
    network: { ip, hostname: "Mac Mini", interface: iface },
  };
}

const PRIVATE_IPV4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

export interface InterfaceAddress {
  name: string;
  ip: string;
}

function isPhysicalInterface(name: string): boolean {
  return /^(en|bridge)\d+$/.test(name);
}

export function selectLanAddress(
  interfaces: InterfaceAddress[],
  defaultInterface?: string
): { ip: string; interface: string } {
  const withPrivateIp = interfaces.filter((i) => PRIVATE_IPV4.test(i.ip));

  // Prefer a physical interface (en*/bridge*) on a private LAN, so a VPN/tunnel
  // holding the default route does not get reported as the NAS address.
  const preferred =
    withPrivateIp.find((i) => i.name === defaultInterface && isPhysicalInterface(i.name)) ??
    withPrivateIp.find((i) => isPhysicalInterface(i.name)) ??
    withPrivateIp.find((i) => i.name === defaultInterface) ??
    withPrivateIp[0];

  if (preferred) return { ip: preferred.ip, interface: preferred.name };

  // No private LAN address: fall back to the default interface's IPv4, if any.
  const fallback = interfaces.find((i) => i.name === defaultInterface && i.ip);
  if (fallback) return { ip: fallback.ip, interface: fallback.name };

  return { ip: "", interface: "" };
}

function commandOutput(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function ipv4ForInterface(name: string): string {
  if (!/^[a-z0-9]+$/i.test(name)) return "";
  const out = commandOutput(
    `ifconfig ${name} 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'`
  );
  return out.split("\n")[0] ?? "";
}

function detectLanAddress(): { ip: string; interface: string } {
  const defaultInterface = commandOutput("route -n get default 2>/dev/null").match(
    /interface:\s*(\S+)/
  )?.[1];

  const interfaces: InterfaceAddress[] = commandOutput("ifconfig -l 2>/dev/null")
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => ({ name, ip: ipv4ForInterface(name) }))
    .filter((i) => i.ip);

  return selectLanAddress(interfaces, defaultInterface);
}
