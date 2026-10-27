import { useState } from "react";
import { DatabaseBackup } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Field, Input, Check } from "../components/FormFields";
import { backupApi } from "../../src/services";

// Route: /admin/backup (permission backup.export: Owner / Super Admin). The browser collects the data page by page and saves ONE file.
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1]);
  r.onerror = () => reject(new Error("A picture could not be read."));
  r.readAsDataURL(blob);
});

export default function BackupPage() {
  const [password, setPassword] = useState("");
  const [withPictures, setWithPictures] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const run = async (e) => {
    e.preventDefault();
    if (!password) { setError("Enter your password."); return; }
    setBusy(true); setError(""); setDone(null); setProgress("Starting…");
    try {
      const ov = await backupApi.overview(password);               // checks the password and writes the audit-log row
      const parts = [`{"app":"afsana-perfumes","version":1,"createdAt":${JSON.stringify(new Date().toISOString())},"collections":{`];
      let records = 0;
      for (let c = 0; c < ov.collections.length; c += 1) {
        const { name, count } = ov.collections[c];
        parts.push(`${c ? "," : ""}${JSON.stringify(name)}:[`);
        let after; let first = true; let got = 0;
        do {
          const r = await backupApi.data(password, name, after);
          for (const row of r.rows) { parts.push((first ? "" : ",") + JSON.stringify(row)); first = false; }
          got += r.rows.length; records += r.rows.length; after = r.next;
          setProgress(`${name}: ${got} of ${count}`);
        } while (after);
        parts.push("]");
      }
      parts.push("},\"pictures\":[");
      let pics = 0;
      if (withPictures && ov.pictures > 0) {
        let after; let first = true;
        do {
          const r = await backupApi.pictures(password, after);
          for (const p of r.rows) {
            const resp = await fetch(`/api/media/${p._id}`);
            if (!resp.ok) throw new Error("A picture could not be downloaded.");
            const data = await blobToBase64(await resp.blob());
            parts.push((first ? "" : ",") + JSON.stringify({ ...p, data })); first = false; pics += 1;
            setProgress(`Pictures: ${pics} of ${ov.pictures}`);
          }
          after = r.next;
        } while (after);
      }
      parts.push("]}");
      const blob = new Blob(parts, { type: "application/json" });
      const a = document.createElement("a");
      const name = `afsana-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      setDone({ name, records, pics, mb: (blob.size / 1048576).toFixed(1) });
      setPassword("");
    } catch (err) {
      setError(err.code === "REAUTH_FAILED" ? "Incorrect password." : err.message || "Backup failed. Please try again.");
    } finally { setBusy(false); setProgress(""); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl text-[#182308]">Backup</h1>
        <p className="text-sm text-[#182308]-muted mt-1">Save a copy of your shop data (products, stock, orders, customers, coupons, pages) on your phone or computer.</p>
      </div>
      <Card>
        <form onSubmit={run} className="space-y-4">
          <Field label="Your password" hint="Needed every time, because the file contains your customers' details."><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Check label="Include product pictures (bigger file)" checked={withPictures} onChange={setWithPictures} />
          {error && <p role="alert" className="text-sm text-[#9b3f3f] bg-[#f7e7e5] rounded-xl px-3 py-2">{error}</p>}
          {busy && <p role="status" className="text-sm text-[#182308]-muted">{progress || "Working…"} Please keep this page open.</p>}
          {done && <p role="status" className="text-sm text-[#3d6b3d] bg-success-soft rounded-sm px-3 py-2">Saved {done.name}: {done.records} records, {done.pics} pictures, {done.mb} MB. Keep it somewhere safe (Google Drive, phone). It is not encrypted.</p>}
          <Button type="submit" icon={DatabaseBackup} disabled={busy}>{busy ? "Preparing…" : "Download backup"}</Button>
        </form>
      </Card>
      <p className="text-xs text-[#182308]-muted">Not included: login accounts and passwords, and staff accounts. After a restore, staff are added again and shoppers use "Forgot password". Make a backup after every busy week.</p>
    </div>
  );
}
