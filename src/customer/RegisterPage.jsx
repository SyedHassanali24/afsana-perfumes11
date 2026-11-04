import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useCustomer } from "./CustomerAuthContext";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";
import { useCmsPageCopy } from "../shop/cmsCopy";
import useTitle from "../shop/useTitle";

export default function RegisterPage() {
  const copy = useCmsPageCopy("customer_register");
  useTitle(copy.browserTitle);
  const {status,register}=useCustomer(); const navigate=useNavigate(); const [f,setF]=useState({name:"",phone:"",email:"",password:""}); const [errors,setErrors]=useState({}); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  if(status==="authed") return <Navigate to="/account" replace />; const set=k=>e=>setF({...f,[k]:e.target.value});
  const submit=async e=>{e.preventDefault();setError("");setErrors({});const er={};if(f.name.trim().length<2)er.name=copy.nameError;if(f.password.length<8||!/[A-Za-z]/.test(f.password)||!/\d/.test(f.password))er.password=copy.passwordHint;if(Object.keys(er).length)return setErrors(er);setBusy(true);try{await register({name:f.name.trim(),phone:f.phone.trim(),email:f.email.trim(),password:f.password});navigate("/account",{replace:true})}catch(err){const fe={};(err.details||[]).forEach(d=>{fe[d.path]=d.message});setErrors(fe);setError(err.code==="VALIDATION_ERROR"?copy.validationError:err.status===429?copy.rateLimit:err.message)}finally{setBusy(false)}};
  return <AuthCard title={copy.title} subtitle={copy.subtitle} footer={<>{copy.footerPrompt} <Link to="/login" className="text-[#263e0e] underline">{copy.loginLink}</Link></>}>
    <form onSubmit={submit} className="space-y-4">
      <Field label={copy.name} error={errors.name}><Input required autoComplete="name" value={f.name} error={!!errors.name} onChange={set("name")}/></Field>
      <Field label={copy.phone} error={errors.phone} hint={copy.phoneHint}><Input required type="tel" autoComplete="tel" value={f.phone} error={!!errors.phone} onChange={set("phone")} placeholder="0300 1234567"/></Field>
      <Field label={copy.email} error={errors.email} hint={copy.emailHint}><Input type="email" autoComplete="email" value={f.email} error={!!errors.email} onChange={set("email")}/></Field>
      <Field label={copy.password} error={errors.password}><Input type="password" required autoComplete="new-password" value={f.password} error={!!errors.password} onChange={set("password")}/></Field>
      {error&&<p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}
      <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy}>{busy?copy.busy:copy.submit}</Button>
    </form>
  </AuthCard>;
}