
import { downloadCSV } from './exports.js';
import { outs, rets } from './state.js';

function rowsOut(){ return outs.map(c=>({ tipo:'saida', id:c.id, equipe:c.team, motorista:c.driver, obra:c.job, veiculo:c.vehicle, km_saida:c.kmStart, horario_saida:c.timeOut, obs_saida:c.obs, ferramentas:c.tools.map(t=>`${t.name}(${t.code||'-'})x${t.qty}`).join('; '), criado_por:c.createdBy? (c.createdBy.name + ' ('+(c.createdBy.id||c.createdBy.role||'')+')') : '' })) }
function rowsRet(){ return rets.flatMap(r=>{ const head=[{ tipo:'retorno', id:r.id, horario_retorno:r.timeIn, km_retorno:r.kmEnd, obs_retorno:r.notes, checklist_total:r.checklist.length, pendencias:r.checklist.filter(i=>i.status!=='voltou').length, fechado_por:r.closedBy? (r.closedBy.name + ' ('+(r.closedBy.id||r.closedBy.role||'')+')') : '' }]; const details=r.checklist.map(i=>({ tipo:'retorno_item', id:r.id, ferramenta:i.name, codigo:i.code, qty:i.qty, status:i.status, condicao:i.condition, obs_item:i.notes||'' })); return head.concat(details); }) }

export function bindExports(){
  const a=document.getElementById('btnExportAll'); if(a){ a.addEventListener('click', ()=> downloadCSV('multprest_tudo', rowsOut().concat(rowsRet())) ); }
  const o=document.getElementById('btnExportOut'); if(o){ o.addEventListener('click', ()=> downloadCSV('multprest_saidas', rowsOut()) ); }
  const r=document.getElementById('btnExportRet'); if(r){ r.addEventListener('click', ()=> downloadCSV('multprest_retorno', rowsRet()) ); }
  const r2=document.getElementById('btnExportReturn'); if(r2){ r2.addEventListener('click', ()=> downloadCSV('multprest_retorno', rowsRet()) ); }
}
