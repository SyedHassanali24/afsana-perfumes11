import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Button from '../../admin/components/Button';
import { Field, Input } from '../../admin/components/FormFields';
import { Eye, EyeOff, MessageCircle } from 'lucide-react';

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/admin';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [reset, setReset] = useState({open:false,step:1,email:'',otp:'',password:'',confirm:'',msg:''});

  if (status === 'authed') return <Navigate to={from} replace />;

  const forgot = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { const r = await fetch('/api/auth/forgot-password/request',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'afsana'},body:JSON.stringify({email:reset.email.trim()})}); const d=await r.json(); if(!r.ok||!d.success) throw new Error(d?.error?.message||'Unable to send OTP.'); setReset(v=>({...v,step:2,msg:'OTP sent to the administrator email.'})); } catch(e){setError(e.message)} finally{setBusy(false)}
  };
  const verifyOtp = async () => { setError(''); setBusy(true); try { const r=await fetch('/api/auth/forgot-password/verify',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'afsana'},body:JSON.stringify({email:reset.email.trim(),otp:reset.otp.trim()})}); const d=await r.json(); if(!r.ok||!d.success) throw new Error(d?.error?.message||'Invalid OTP.'); setReset(v=>({...v,step:3,msg:'OTP verified. You can now set a new password.'})); } catch(e){setError(e.message)} finally{setBusy(false)} };
  const doReset = async (e) => { e.preventDefault(); if(reset.password!==reset.confirm){setError('Passwords do not match.');return} setError('');setBusy(true); try{const r=await fetch('/api/auth/forgot-password/reset',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'afsana'},body:JSON.stringify({email:reset.email.trim(),otp:reset.otp.trim(),password:reset.password})});const d=await r.json();if(!r.ok||!d.success)throw new Error(d?.error?.message||'Unable to reset password.');setReset(v=>({...v,open:false,step:1,password:'',confirm:'',msg:''}));}catch(e){setError(e.message)}finally{setBusy(false)} };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#263e0e] px-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[#b4bf41]/15 blur-3xl" /><div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#748e40]/20 blur-3xl" /><form onSubmit={submit} className="relative w-full max-w-sm bg-[#faf8f4]/95 backdrop-blur border border-[#748e40]/25 rounded-3xl p-8 space-y-5 shadow-2xl">
        <div>
          <h1 className="font-display text-2xl text-[#263e0e]">Afsana</h1>
          <p className="text-sm text-[#5f654f] mt-1">Staff sign in</p>
        </div>
        <Field label="Email">
          <Input type="email" autoComplete="username" required autoFocus value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <div className="relative"><Input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} /><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
        </Field>
        {error && <p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      <div className="flex justify-between text-xs"><button type="button" className="text-[#748e40] underline" onClick={()=>setReset(v=>({...v,open:true,email:form.email}))}>Forgot password?</button><a href="https://wa.me/923132956206" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#263e0e]"><MessageCircle size={15}/> WhatsApp</a></div>
      </form>{reset.open && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={reset.step===1?forgot:doReset} className="w-full max-w-sm bg-[#faf8f4] rounded-2xl p-6 space-y-4"><h2 className="text-xl font-semibold text-[#263e0e]">Reset password</h2>{reset.step===1&&<><Field label="Staff email"><Input type="email" required value={reset.email} onChange={e=>setReset(v=>({...v,email:e.target.value}))}/></Field><Button className="w-full" disabled={busy}>Send OTP</Button></>}{reset.step===2&&<><Field label="6-digit OTP"><Input inputMode="numeric" maxLength={6} required value={reset.otp} onChange={e=>setReset(v=>({...v,otp:e.target.value.replace(/\\D/g,"")}))}/></Field><Button type="button" className="w-full" disabled={busy} onClick={verifyOtp}>Verify OTP</Button></>}{reset.step===3&&<><Field label="New password"><Input type="password" minLength={8} required value={reset.password} onChange={e=>setReset(v=>({...v,password:e.target.value}))}/></Field><Field label="Confirm password"><Input type="password" minLength={8} required value={reset.confirm} onChange={e=>setReset(v=>({...v,confirm:e.target.value}))}/></Field><Button className="w-full" disabled={busy}>Set new password</Button></>} {reset.msg&&<p className="text-xs text-[#748e40]">{reset.msg}</p>} {error&&<p className="text-sm text-[#9b3f3f]">{error}</p>}<button type="button" className="text-xs underline" onClick={()=>setReset(v=>({...v,open:false}))}>Cancel</button></form></div>}</div>
  );
}
