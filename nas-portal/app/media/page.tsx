export default function MediaPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">Media</h1>
          <p className="text-[15px] text-apple-muted">Jellyfin media library</p>
        </div>
        <a
          href="http://192.168.1.46:8096/web/"
          target="_blank"
          className="text-sm text-clean-blue hover:underline"
        >
          Open in new tab →
        </a>
      </div>
      <iframe
        src="http://192.168.1.46:8096/web/"
        className="w-full h-[70vh] rounded-[20px] border-0"
        title="Jellyfin"
      />
    </div>
  );
}
