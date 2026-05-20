export type SystemStatus = {
  storage: { used: string; total: string; percent: number };
  services: { smb: boolean; jellyfin: boolean };
  network: { ip: string; hostname: string; interface: string };
};

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await fetch("/api/system/status");
  if (!res.ok) throw new Error("Failed to fetch system status");
  return res.json();
}
