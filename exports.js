
export const esc = (v)=>{ if(v==null) return ''; const s=String(v).replaceAll('"','""'); return '"'+s+'"' };
export const toCSV = (rows)=> rows.length? [Object.keys(rows[0]).map(esc).join(',')].concat(rows.map(r=>Object.keys(rows[0]).map(h=>esc(r[h])).join(','))).join('\n'):'';
export const downloadCSV=(name,rows)=>{ const csv=toCSV(rows); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name+'_'+new Date().toISOString().slice(0,19).replaceAll(':','-')+'.csv'; a.click(); };
