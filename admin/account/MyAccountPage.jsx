import { useEffect, useRef, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import ChangePasswordForm from "../../src/auth/ChangePasswordForm";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import { authApi, mediaApi } from "../../src/services";
import { Camera, UserRound } from "lucide-react";

const when = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function MyAccountPage() {
  const { user, logout, refresh } = useAuth();
  const { data, loading, error, reload } = useApi(() => authApi.sessions(), []);
  const [profile, setProfile] = useState({});
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const sessions = data?.sessions || [];

  useEffect(() => { setProfile({ name:user?.name||"", phone:user?.phone||"", jobTitle:user?.jobTitle||"", department:user?.department||"", bio:user?.bio||"", address:user?.address||"", city:user?.city||"", country:user?.country||"Pakistan", avatarUrl:user?.avatarUrl||"" }); }, [user]);

  const save = async (e) => { e.preventDefault(); setSaving(true); setMsg(""); try { await authApi.updateProfile(profile); await refresh(); setMsg("Profile updated successfully."); } catch(e){ setMsg(e.message); } finally { setSaving(false); } };
  const upload = async (e) => { const file=e.target.files?.[0]; if(!file) return; if(!/^image\/(jpeg|png|webp)$/.test(file.type)) return setMsg("Use JPG, PNG or WebP."); if(file.size>700000) return setMsg("Profile picture must be under 700KB."); const reader=new FileReader(); reader.onload=async()=>{ try { const r=await mediaApi.uploadProfile({filename:file.name,contentType:file.type,data:String(reader.result).split(",")[1]}); setProfile(p=>({...p,avatarUrl:r.url})); setMsg("Picture uploaded. Save profile to apply it."); } catch(e){setMsg(e.message);} }; reader.readAsDataURL(file); };
  const revoke = async (id) => { try { await authApi.revokeSession(id); reload(); } catch (e) { setMsg(e.message); } };
  const everywhere = async () => { try { await authApi.logoutAll(); } catch {} await logout(); };

  return <div className="space-y-6 max-w-4xl">
    <div><h1 className="font-display text-2xl text-ink">My profile</h1><p className="text-sm text-ink-muted mt-1">Manage your personal staff/admin information, profile picture and security.</p></div>
    <Card>
      <form onSubmit={save} className="space-y-5">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative"><div className="w-24 h-24 rounded-full overflow-hidden border border-border bg-bg flex items-center justify-center">{profile.avatarUrl?<img src={profile.avatarUrl} alt="" className="w-full h-full object-cover"/>:<UserRound className="w-10 h-10 text-ink-muted"/>}</div><button type="button" onClick={()=>fileRef.current?.click()} className="absolute -right-1 -bottom-1 w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg"><Camera size={17}/></button><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/></div>
          <div><p className="font-semibold text-ink">{user?.name}</p><p className="text-sm text-ink-muted">{user?.email} · {user?.role?.name}</p><p className="text-xs text-ink-muted mt-1">JPG, PNG or WebP · max 700KB</p></div>
        </div>
        {msg && <p role="status" className="text-sm px-3 py-2 rounded bg-bg text-ink">{msg}</p>}
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm text-ink">Full name<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2" value={profile.name||""} onChange={e=>setProfile({...profile,name:e.target.value})}/></label>
          <label className="text-sm text-ink">Phone<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2" value={profile.phone||""} onChange={e=>setProfile({...profile,phone:e.target.value})}/></label>
          <label className="text-sm text-ink">Job title<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2" value={profile.jobTitle||""} onChange={e=>setProfile({...profile,jobTitle:e.target.value})}/></label>
          <label className="text-sm text-ink">Department<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2" value={profile.department||""} onChange={e=>setProfile({...profile,department:e.target.value})}/></label>
          <label className="text-sm text-ink md:col-span-2">Address<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2" value={profile.address||""} onChange={e=>setProfile({...profile,address:e.target.value})}/></label>
          <label className="text-sm text-ink">City<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2" value={profile.city||""} onChange={e=>setProfile({...profile,city:e.target.value})}/></label>
          <label className="text-sm text-ink">Country<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2" value={profile.country||""} onChange={e=>setProfile({...profile,country:e.target.value})}/></label>
          <label className="text-sm text-ink md:col-span-2">Bio<textarea className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 min-h-24" value={profile.bio||""} onChange={e=>setProfile({...profile,bio:e.target.value})}/></label>
        </div>
        <Button type="submit" disabled={saving}>{saving?"Saving…":"Save profile"}</Button>
      </form>
    </Card>
    <Card>
      <h2 className="font-display text-lg text-ink mb-4">Change password</h2>
      <div className="max-w-sm"><ChangePasswordForm onSubmit={(c,n)=>authApi.changePassword(c,n)} onDone={()=>{setMsg("Password changed. Your other devices were signed out.");reload();}} /></div>
    </Card>
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><h2 className="font-display text-lg text-ink">Where you're signed in</h2><Button variant="secondary" size="sm" onClick={everywhere}>Sign out everywhere</Button></div>
      {loading?<p className="text-sm text-ink-muted">Loading…</p>:error?<p className="text-sm text-danger">{error.message}</p>:<ul className="divide-y divide-border">{sessions.map(s=><li key={s.id} className="py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm text-ink truncate">{s.device?.userAgent||"Unknown device"}{s.current&&<span className="ml-2 text-xs text-success">This device</span>}</p><p className="text-xs text-ink-muted">{s.device?.ip||"—"} · last active {when(s.lastActiveAt)}</p></div>{!s.current&&<Button variant="ghost" size="sm" onClick={()=>revoke(s.id)}>Sign out</Button>}</li>)}</ul>}
    </Card>
  </div>;
}