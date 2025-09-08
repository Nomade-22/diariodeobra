
export function renderReturnList(context){
  const host=document.getElementById('retList'); if(!host) return; host.innerHTML='';
  if(!context.currentReturn){ const rm=document.getElementById('retMissing'); if(rm) rm.textContent=''; return; }
  context.currentReturn.checklist.forEach((it,idx)=>{ const row=document.createElement('div'); row.className='gridrow'; row.style.gridTemplateColumns='1fr 160px 110px 1fr'; row.innerHTML=`
    <div>${it.name} <span class='small'>(${it.code||'s/ código'})</span></div>
    <select>
      <option value='voltou' ${it.status==='voltou'?'selected':''}>Voltou</option>
      <option value='ficou' ${it.status==='ficou'?'selected':''}>Ficou na obra</option>
      <option value='nao_voltou' ${it.status==='nao_voltou'?'selected':''}>Não voltou</option>
    </select>
    <select>
      <option value='ok' ${it.condition==='ok'?'selected':''}>OK</option>
      <option value='avaria' ${it.condition==='avaria'?'selected':''}>Avaria</option>
      <option value='manutencao' ${it.condition==='manutencao'?'selected':''}>Manutenção</option>
    </select>
    <input placeholder='Problema/Observação' value='${it.notes||''}' />`;
    const [selStatus, selCond, inpNote] = [row.children[1], row.children[2], row.children[3]];
    selStatus.addEventListener('change',()=>{ context.currentReturn.checklist[idx].status = selStatus.value; updateMissing(context); });
    selCond.addEventListener('change', ()=>{ context.currentReturn.checklist[idx].condition = selCond.value; });
    inpNote.addEventListener('input', ()=>{ context.currentReturn.checklist[idx].notes = inpNote.value; });
    host.appendChild(row);
  });
  updateMissing(context);
}

export function updateMissing(context){
  const miss=context.currentReturn? context.currentReturn.checklist.filter(i=>i.status!=='voltou').length : 0;
  const rm=document.getElementById('retMissing'); if(rm) rm.textContent = miss + ' pendente(s)';
}
