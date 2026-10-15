import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import Button from "./Button";
import { mediaApi } from "../../src/services";
import shrinkImage from "../../src/lib/shrinkImage";

// "Upload" next to a picture-address box: shrinks the picture in the browser, uploads it, then calls onUploaded("/api/media/<id>").
export default function ImageUploadButton({ onUploaded, label = "Upload picture" }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true); setError("");
    try { const out = await mediaApi.upload(await shrinkImage(f)); onUploaded(out.url); }
    catch (err) { setError(err.message || "Upload failed. Please try again."); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
      <Button type="button" variant="secondary" size="sm" icon={Upload} disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Uploading…" : label}</Button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  );
}
