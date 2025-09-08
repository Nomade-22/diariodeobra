
import { write, LS } from './storage.js';
import { outs, rets, user } from './state.js';

export function bindReturn(context){
  const sel = document.getElementById('retOpen'); if(!sel) return;
  sel.addEventListener('change',(e)=>{
    const id=e.target.value; if(!id) return; const o=outs.find(x=>x.id===id); if(!o) return;
    context.currentReturn = { id:o.id, timeIn:new Date().toISOString(), kmEnd:'', notes:'', signature:null, photos:[], checklist: o.tools.map(i=>({ ...i, status:'voltou', condition:'ok', notes:'' })) };
    document.getElementById('retTime').value=new Date().toISOString().slice(0,16);
    context.renderReturnList();
  });

  const btn = document.getElementById('btnFinishReturn'); if(btn){ btn.addEventListener('click', ()=>{
    if(!context.currentReturn){ alert('Selecione uma saída em aberto'); return }
    if(!user){ alert('Você precisa estar logado.'); return; }
    context.currentReturn.kmEnd = document.getElementById('retKm').value;
    context.currentReturn.timeIn = new Date(document.getElementById('retTime').value).toISOString();
    context.currentReturn.signature = context.retSign?.data?.();
    context.currentReturn.photos = context.retPhotos.slice();
    context.currentReturn.closedBy = { name:user.name, id:user.id, role:user.role };
    rets.unshift(context.currentReturn); write(LS.rets, rets);
    for(let i=0;i<outs.length;i++){ if(outs[i].id===context.currentReturn.id){ outs[i] = {...outs[i], returnedAt:new Date().toISOString(), closedBy: { name:user.name, id:user.id, role:user.role } }; break; } }
    write(LS.outs, outs);
    alert('Retorno registrado!');
    context.currentReturn=null; context.retPhotos.length=0; const pc=document.getElementById('retPhotoCount'); if(pc) pc.textContent='Nenhuma foto'; context.retSign?.clear?.(); document.getElementById('retList').innerHTML=''; const rm=document.getElementById('retMissing'); if(rm) rm.textContent=''; context.refreshOpenOuts();
  }); }
}
