import { useState } from "react";
import { DatabaseBackup } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Field, Input, Check } from "../components/FormFields";
import { backupApi } from "../../src/services";
import { encryptBackupBlob } from "./backupCrypto";

// Route: /admin/backup (permission backup.export: Owner / Super Admin). The browser collects the data page by page and saves ONE file.
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1]);
  r.onerror = () => reject(new Error("A picture could not be read."));
  r.readAsDataURL(blob);
});

export default function BackupPage() {
  const [password, setPassword] = useState("");
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [confirmBackupPassphrase, setConfirmBackupPassphrase] = useState("");
  const [withPictures, setWithPictures] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const run = async (e) => {
    e.preventDefault();
    if (!password) { setError("Enter your account password."); return; }
    if (backupPassphrase.length < 12) { setError("Choose a backup passphrase with at least 12 characters."); return; }
    if (backupPassphrase !== confirmBackupPassphrase) { setError("Backup passphrases do not match."); return; }
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
      const plainBlob = new Blob(parts, { type: "application/json" });
      setProgress("Encrypting backup on this device…");
      const blob = await encryptBackupBlob(plainBlob, backupPassphrase);
      const a = document.createElement("a");
      const name = `afsana-backup-${new Date().toISOString().slice(0, 10)}.afsana`;
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      setDone({ name, records, pics, mb: (blob.size / 1048576).toFixed(1) });
      setPassword(""); setBackupPassphrase(""); setConfirmBackupPassphrase("");
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
          <Field label="Your account password" hint="Confirms that you are authorized to export customer and order data."><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="Backup encryption passphrase" hint="At least 12 characters. You will need this passphrase to restore the file. AFSANA cannot recover it if lost."><Input type="password" autoComplete="new-password" value={backupPassphrase} onChange={(e) => setBackupPassphrase(e.target.value)} /></Field>
          <Field label="Confirm backup passphrase"><Input type="password" autoComplete="new-password" value={confirmBackupPassphrase} onChange={(e) => setConfirmBackupPassphrase(e.target.value)} /></Field>
          <Check label="Include product pictures (bigger file)" checked={withPictures} onChange={setWithPictures} />
          {error && <p role="alert" className="text-sm text-[#9b3f3f] bg-[#f7e7e5] rounded-xl px-3 py-2">{error}</p>}
          {busy && <p role="status" className="text-sm text-[#182308]-muted">{progress || "Working…"} Please keep this page open.</p>}
          {done && <p role="status" className="text-sm text-[#3d6b3d] bg-success-soft rounded-sm px-3 py-2">Saved encrypted file {done.name}: {done.records} records, {done.pics} pictures, {done.mb} MB. Store the file and passphrase separately in safe places.</p>}
          <Button type="submit" icon={DatabaseBackup} disabled={busy}>{busy ? "Preparing…" : "Download backup"}</Button>
        </form>
      </Card>
      <p className="text-xs text-[#182308]-muted">This backup is encrypted locally with AES-256-GCM. Not included: login accounts, password hashes, sessions, and staff accounts. To restore, run npm run db:restore -- path-to-file.afsana and enter the passphrase. After a restore, staff are added again and shoppers use "Forgot password". Keep the passphrase separate from the backup file and make a new backup regularly.</p>
    </div>
  );
}
