export default function SettingsPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">设置</h1>
      <p className="text-[15px] text-apple-muted mb-8">系统设置</p>
      <div className="bg-white rounded-[20px] p-6">
        <div className="flex items-center justify-between py-3 border-b border-[#f0f0f2]">
          <span className="text-sm font-medium">SMB 文件共享</span>
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">运行中</span>
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-medium">远程访问 (Tailscale)</span>
          <span className="text-xs text-apple-muted bg-[#f5f5f7] px-2 py-0.5 rounded-full">未配置</span>
        </div>
      </div>
    </div>
  );
}
