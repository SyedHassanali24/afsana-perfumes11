import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function LuxuryExperienceLayer(){
  const location=useLocation();
  const [pointer,setPointer]=useState({x:'50vw',y:'35vh'});
  const [progress,setProgress]=useState(0);
  const particles=useMemo(()=>Array.from({length:14},(_,i)=>({
    left:`${(i*37)%97}%`,
    top:`${(i*53)%91}%`,
    size:2+(i%4),
    delay:-((i*0.73)%7),
    duration:6+(i%5)*1.4
  })),[]);

  useEffect(()=>{
    const onMove=(e)=>setPointer({x:`${e.clientX}px`,y:`${e.clientY}px`});
    const onScroll=()=>{
      const doc=document.documentElement;
      const max=Math.max(1,doc.scrollHeight-window.innerHeight);
      setProgress(Math.min(100,(window.scrollY/max)*100));
    };
    window.addEventListener('pointermove',onMove,{passive:true});
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
    return()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('scroll',onScroll)};
  },[]);

  useEffect(()=>{
    window.scrollTo({top:0,behavior:'instant'});
    const nodes=[...document.querySelectorAll('main section, main .product-card-stage, main .editorial-card, main .trust-card')];
    const io=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>entry.target.classList.toggle('afsana-inview',entry.isIntersecting));
    },{threshold:.08,rootMargin:'0px 0px -5% 0px'});
    nodes.forEach((node,i)=>{node.classList.add('afsana-observe');node.style.setProperty('--reveal-delay',`${Math.min(i%6,5)*55}ms`);io.observe(node)});
    return()=>io.disconnect();
  },[location.pathname,location.search]);

  return <div className="afsana-experience" aria-hidden="true" style={{'--lux-x':pointer.x,'--lux-y':pointer.y,'--lux-progress':`${progress}%`}}>
    <div className="afsana-experience-progress"/>
    <div className="afsana-experience-aura"/>
    <div className="afsana-experience-noise"/>
    <div className="afsana-experience-particles">
      {particles.map((p,i)=><i key={i} style={{left:p.left,top:p.top,width:p.size,height:p.size,animationDelay:`${p.delay}s`,animationDuration:`${p.duration}s`}}/>)}
    </div>
  </div>;
}
