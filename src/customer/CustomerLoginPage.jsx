import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCustomer } from "./CustomerAuthContext";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";
import { useCmsPageCopy } from "../shop/cmsCopy";

export default function CustomerLoginPage() {
  const copy = useCmsPageCopy("customer_login");
  const { status, login } = useCustomer();
  const navigate = useNavigate(); const from = useLocation().state?.from || "/account";
  const [f,setF]=useState({identifier:"",password:""}); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  if(status==="authed") return <Navigate to={from} replace />;
  const submit=async(e)=>{e.preventDefault();setError("");setBusy(true);try{await login(f.identifier.trim(),f.password);navigate(from,{replace:true});}catch(err){setError(err.status===429?copy.rateLimit:err.message)}finally{setBusy(false)}};
  return <AuthCard title={copy.title} subtitle={copy.subtitle} footer={<>{copy.footerPrompt} <Link to="/register" className="text-[#263e0e] underline">{copy.registerLink}</Link></>}>
    <form onSubmit={submit} className="space-y-5">
      <Field label={copy.identifier}><Input required autoFocus autoComplete="username" value={f.identifier} onChange={e=>setF({...f,identifier:e.target.value})} placeholder={copy.identifierPlaceholder}/></Field>
      <Field label={copy.password}><Input type="password" required autoComplete="current-password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></Field>
      {error&&<p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}
      <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy}>{busy?copy.busy:copy.submit}</Button>
      <p className="text-sm text-center"><Link to="/forgot-password" className="text-[#5f654f] underline">{copy.forgotLink}</Link></p>
    </form>
  </AuthCard>;
}