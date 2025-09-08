
export const LS = {
  tools:'mp_tools_v1', teams:'mp_teams_v1', jobs:'mp_jobs_v1',
  outs:'mp_checkouts_v1', rets:'mp_returns_v1', user:'mp_user_v1'
};
export const read = (k,d)=>{ try{ const v = JSON.parse(localStorage.getItem(k)||'null'); return v ?? d }catch{return d} };
export const write = (k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
export const uid = ()=> Math.random().toString(36).slice(2)+Date.now().toString(36);
