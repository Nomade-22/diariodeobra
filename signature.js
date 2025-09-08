
export function makeSignature(canvas){
  const c=canvas; const ctx=c.getContext('2d'); ctx.lineWidth=2; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle='#0f172a';
  let drawing=false;
  const pos=e=>{ const r=c.getBoundingClientRect(); const x=(e.touches?.[0]?.clientX??e.clientX)-r.left; const y=(e.touches?.[0]?.clientY??e.clientY)-r.top; return {x,y}};
  const start=e=>{drawing=true; ctx.beginPath(); const p=pos(e); ctx.moveTo(p.x,p.y)};
  const move=e=>{ if(!drawing) return; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); };
  const end =()=>{ drawing=false };
  c.addEventListener('mousedown',start); c.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
  c.addEventListener('touchstart',start,{passive:true}); c.addEventListener('touchmove',move,{passive:true}); c.addEventListener('touchend',end);
  return { clear(){ctx.clearRect(0,0,c.width,c.height)}, data(){return c.toDataURL('image/png')} };
}
