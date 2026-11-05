import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCustomer } from "./CustomerAuthContext";
import TurnstileWidget from "../components/TurnstileWidget";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";

export default function CustomerLoginPage() {
  const { status, login } = useCustomer();
  const navigate = useNavigate(); const from = useLocation().state?.from || "/account";
  const [f,setF]=useState({identifier:"",password:""}); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [turnstileToken,setTurnstileToken]=useState(""); const [turnstileResetKey,setTurnstileResetKey]=useState(0);
  if(status==="authed") return <Navigate to={from} replace />;
  const submit=async(e)=>{e.preventDefault();setError("");setBusy(true);try{await login(f.identifier.trim(),f.password,turnstileToken);navigate(from,{replace:true});}catch(err){setError(err.status===429?"Too many attempts. Please wait a few minutes and try again.":err.message)}finally{setBusy(false);setTurnstileToken("");setTurnstileResetKey(v=>v+1)}};
  return <AuthCard title="Welcome back" subtitle="Sign in to track orders and check out faster." footer={<>New here? <Link to="/register" className="text-[#263e0e] underline">Create an account</Link></>}>
    <form onSubmit={submit} className="space-y-5">
      <Field label="Email or phone number"><Input required autoFocus autoComplete="username" value={f.identifier} onChange={e=>setF({...f,identifier:e.target.value})} placeholder="0300 1234567"/></Field>
      <Field label="Password"><Input type="password" required autoComplete="current-password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></Field>
      <TurnstileWidget action="customer_login" onToken={setTurnstileToken} resetKey={turnstileResetKey}/>{error&&<p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}
      <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy||!turnstileToken}>{busy?"Signing in…":"Sign in"}</Button>
      <p className="text-sm text-center"><Link to="/forgot-password" className="text-[#5f654f] underline">Forgot your password?</Link></p>
    </form>
  </AuthCard>;
}