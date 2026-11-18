import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCustomer } from "./CustomerAuthContext";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";
import SocialSignInButtons from "./SocialSignInButtons";

export default function RegisterPage() {
  const {status,register}=useCustomer(); const navigate=useNavigate(); const location=useLocation(); const [f,setF]=useState({name:"",phone:"",email:"",password:""}); const [errors,setErrors]=useState({}); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  if(status==="loading") return <AuthCard title="Checking your account" subtitle="Please wait while we securely check your sign-in status." />;
  if(status==="authed") return <Navigate to="/account" replace />; const set=k=>e=>setF({...f,[k]:e.target.value});
  const submit=async e=>{e.preventDefault();setError("");setErrors({});const er={};if(f.name.trim().length<2)er.name="Please enter your name.";if(f.password.length<8||!/[A-Za-z]/.test(f.password)||!/\d/.test(f.password))er.password="At least 8 characters, with letters and numbers.";if(Object.keys(er).length)return setErrors(er);setBusy(true);try{await register({name:f.name.trim(),phone:f.phone.trim(),email:f.email.trim(),password:f.password});navigate("/account",{replace:true})}catch(err){const fe={};(err.details||[]).forEach(d=>{fe[d.path]=d.message});setErrors(fe);setError(err.code==="VALIDATION_ERROR"?"Please fix the highlighted fields.":err.status===429?"Too many attempts. Please try again later.":err.message)}finally{setBusy(false)}};
  return <AuthCard title="Create your account" subtitle="Save your details for faster checkout." footer={<>Already have an account? <Link to="/login" className="text-[#263e0e] underline">Sign in</Link></>}>
    <SocialSignInButtons returnTo="/account" />
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name" error={errors.name}><Input required autoComplete="name" value={f.name} error={!!errors.name} onChange={set("name")}/></Field>
      <Field label="Phone number" error={errors.phone} hint="Used for delivery and order updates"><Input required type="tel" autoComplete="tel" value={f.phone} error={!!errors.phone} onChange={set("phone")} placeholder="0300 1234567"/></Field>
      <Field label="Email" error={errors.email} hint="Required for password recovery and account security."><Input type="email" required autoComplete="email" value={f.email} error={!!errors.email} onChange={set("email")}/></Field>
      <Field label="Password" error={errors.password}><Input type="password" required autoComplete="new-password" value={f.password} error={!!errors.password} onChange={set("password")}/></Field>
      {error&&<p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}
      <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy}>{busy?"Creating…":"Create account"}</Button>
    </form>
  </AuthCard>;
}