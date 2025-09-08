
import { LS, write, uid } from './storage.js';
import { tools, teams, jobs } from './state.js';

export function fillSelect(sel, arr){ if(!sel) return; sel.innerHTML='<option value="">Selecione...</option>'+arr.map(v=>`<option>${v}</option>`).join(''); }

export function renderTools(onChange){
  const host=document.getElementById('toolsList'); if(!host) return; host.innerHTML='';
  tools.forEach((t,idx)=>{ if(!t.id) t.id=uid(); const row=document.createElement('div'); row.className='gridrow'; row.style.gridTemplateColumns='1fr 160px 100px 1fr'; row.innerHTML=`
    <input value="${t.name||''}" placeholder="Ferramenta" />
    <input value="${t.code||''}" placeholder="Código/ID" />
    <input type="number" min="1" value="${t.qty||1}" placeholder="Qtd" />
    <input value="${t.obs||''}" placeholder="Obs" />`;
    const [iName,iCode,iQty,iObs]=row.querySelectorAll('input');
    iName.addEventListener('input',()=>{ tools[idx].name=iName.value; write(LS.tools,tools); onChange?.(); });
    iCode.addEventListener('input',()=>{ tools[idx].code=iCode.value; write(LS.tools,tools); onChange?.(); });
    iQty.addEventListener('input', ()=>{ tools[idx].qty = parseInt(iQty.value||'1'); write(LS.tools,tools); onChange?.(); });
    iObs.addEventListener('input', ()=>{ tools[idx].obs = iObs.value; write(LS.tools,tools); });
    host.appendChild(row);
  });
  const tcount=document.getElementById('toolsCount'); if(tcount) tcount.textContent=`${tools.length} itens`;
}

export function renderTeams(refreshAll){
  const ul=document.getElementById('teamsList'); if(!ul) return; ul.innerHTML='';
  teams.forEach((t,i)=>{ const li=document.createElement('li'); li.innerHTML=`<div class='gridrow' style='grid-template-columns:1fr 120px'><input value="${t}"><button class='btn'>Excluir</button></div>`; const inp=li.querySelector('input'); const btn=li.querySelector('button'); inp.addEventListener('input',()=>{ teams[i]=inp.value; write(LS.teams,teams); refreshAll?.(); }); btn.addEventListener('click',()=>{ teams.splice(i,1); write(LS.teams,teams); refreshAll?.(); }); ul.appendChild(li); });
}

export function renderJobs(refreshAll){
  const ul=document.getElementById('jobsList'); if(!ul) return; ul.innerHTML='';
  jobs.forEach((j,i)=>{ const li=document.createElement('li'); li.innerHTML=`<div class='gridrow' style='grid-template-columns:1fr 120px'><input value="${j}"><button class='btn'>Excluir</button></div>`; const inp=li.querySelector('input'); const btn=li.querySelector('button'); inp.addEventListener('input',()=>{ jobs[i]=inp.value; write(LS.jobs,jobs); refreshAll?.(); }); btn.addEventListener('click',()=>{ jobs.splice(i,1); write(LS.jobs,jobs); refreshAll?.(); }); ul.appendChild(li); });
}

export function renderPicker(pickStateRef){
  const pickHost=document.getElementById('pickList'); if(!pickHost) return; pickHost.innerHTML='';
  tools.forEach(t=>{ if(!t.id) t.id=uid(); const st=pickStateRef[t.id]||{checked:false, take: Math.min(1, t.qty||1)}; pickStateRef[t.id]=st; const row=document.createElement('div'); row.className='gridrow'; row.innerHTML=`
      <input type='checkbox' ${st.checked?'checked':''} />
      <div>${t.name||''}</div>
      <div class='small'>${t.code||''}</div>
      <div>${t.qty||1}</div>
      <input type='number' min='1' value='${st.take}' ${st.checked?'':'disabled'} />`;
    const [chk, , , , qtyInput] = [row.children[0], row.children[1], row.children[2], row.children[3], row.children[4]];
    chk.addEventListener('change',()=>{ st.checked=chk.checked; qtyInput.disabled=!st.checked; updateSelCount(pickStateRef); });
    qtyInput.addEventListener('input',()=>{ st.take = Math.max(1, parseInt(qtyInput.value||'1')); });
    pickHost.appendChild(row);
  });
  updateSelCount(pickStateRef);
}

export function updateSelCount(pickStateRef){
  const c = Object.values(pickStateRef).filter(v=>v.checked).length; const el=document.getElementById('selCount'); if(el) el.textContent = c+' selecionadas';
}
