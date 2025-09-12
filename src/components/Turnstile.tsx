import { useEffect } from "react";
declare global { interface Window { turnstile:any } }
export function Turnstile({ siteKey, onVerify }:{ siteKey:string; onVerify:(t:string)=>void }) {
  useEffect(()=> {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    document.head.appendChild(s);
    s.onload = () => {
      window.turnstile?.render("#cf-turnstile", {
        sitekey: siteKey,
        callback: (token:string)=>onVerify(token)
      });
    };
    return ()=>{ try{ document.head.removeChild(s) }catch{} };
  },[siteKey, onVerify]);
  return <div id="cf-turnstile" />;
}
