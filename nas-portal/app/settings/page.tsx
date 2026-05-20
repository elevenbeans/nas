export default function SettingsPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">Settings</h1>
      <p className="text-[15px] text-apple-muted mb-8">System settings</p>
      <div className="bg-white rounded-[20px] p-6">
        <div className="flex items-center justify-between py-3 border-b border-[#f0f0f2]">
          <span className="text-sm font-medium">SMB File Sharing</span>
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Running</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-[#f0f0f2]">
          <span className="text-sm font-medium">Jellyfin Media Server</span>
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Running</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-medium">Remote Access (Tailscale)</span>
          <span className="text-xs text-apple-muted bg-[#f5f5f7] px-2 py-0.5 rounded-full">Not configured</span>
        </div>
      </div>
    </div>
  );
}
