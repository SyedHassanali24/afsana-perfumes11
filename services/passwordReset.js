const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../database/models');
const { ApiError } = require('../middleware/errors');

const hash = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const otp = () => String(crypto.randomInt(100000, 1000000));
const recipient = () => process.env.PASSWORD_RESET_EMAIL || 'eastwala12@gmail.com';

async function sendOtp(email, code) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'AFSANA <onboarding@resend.dev>';
  if (!key) throw new Error('Password reset email service is not configured.');
  const r = await fetch('https://api.resend.com/emails', { method:'POST', headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'}, body:JSON.stringify({from,to:[recipient()],subject:'AFSANA password reset OTP',html:`<div style="font-family:Arial"><h2>AFSANA Password Reset</h2><p>OTP for <b>${email}</b>:</p><h1 style="letter-spacing:8px">${code}</h1><p>This code expires in 10 minutes. If you did not request this, ignore this email.</p></div>`})});
  if (!r.ok) throw new Error('Unable to send password reset email.');
}
async function requestPasswordReset(email) {
  const normalized=String(email).trim().toLowerCase();
  const user=await User.findOne({email:normalized,kind:'staff'}).select('+resetOtpHash');
  if (!user) return { message:'If this staff account exists, an OTP has been sent.' };
  const code=otp();
  user.resetOtpHash=hash(code); user.resetOtpExpires=new Date(Date.now()+10*60*1000); await user.save();
  await sendOtp(normalized,code);
  return { message:'If this staff account exists, an OTP has been sent.' };
}
async function verifyPasswordReset(email, code) {
  const user=await User.findOne({email:String(email).trim().toLowerCase(),kind:'staff'}).select('+resetOtpHash');
  if (!user || !user.resetOtpExpires || user.resetOtpExpires < new Date() || user.resetOtpHash !== hash(code)) throw new ApiError(400,'INVALID_OTP','Invalid or expired OTP.');
  return { verified:true };
}
async function resetPassword(email, code, password) {
  const user=await User.findOne({email:String(email).trim().toLowerCase(),kind:'staff'}).select('+resetOtpHash +passwordHash');
  if (!user || !user.resetOtpExpires || user.resetOtpExpires < new Date() || user.resetOtpHash !== hash(code)) throw new ApiError(400,'INVALID_OTP','Invalid or expired OTP.');
  user.passwordHash=await bcrypt.hash(password,12); user.passwordChangedAt=new Date(); user.mustChangePassword=false; user.resetOtpHash=undefined; user.resetOtpExpires=undefined; user.resetTokenHash=undefined; user.resetTokenExpires=undefined;
  await user.save();
  return { reset:true };
}
module.exports={requestPasswordReset,verifyPasswordReset,resetPassword};
