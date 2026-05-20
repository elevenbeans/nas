export default function MediaPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">Media</h1>
      <p className="text-[15px] text-apple-muted mb-8">Jellyfin media library</p>
      <iframe src="http://192.168.1.46:8096/web" className="w-full h-[70vh] rounded-[20px] border-0" />
    </div>
  );
}
