export function QRCode({ url }: { url: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(url)}`;
  return <div className="rounded-2xl bg-white p-3"><img src={src} alt="Scan to join quiz" width={240} height={240} className="block" /></div>;
}
