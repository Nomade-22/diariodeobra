
import { outs } from './state.js';
export function refreshOpenOuts(){
  const sel=document.getElementById('retOpen'); if(!sel) return;
  const fmtBR = (d)=> new Date(d).toLocaleString('pt-BR');
  const open=outs.filter(o=>!o.returnedAt);
  sel.innerHTML = open.length? '<option value="">Selecione...</option>'+open.map(o=>`<option value="${o.id}">${o.team} • ${o.job} • ${fmtBR(o.timeOut)}</option>`).join('') : '<option>Não há saídas em aberto</option>';
}
