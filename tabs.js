
export function setupTabs() {
  const sections={ saida:document.getElementById('tab-saida'), retorno:document.getElementById('tab-retorno'), cadastros:document.getElementById('tab-cadastros') };
  document.body.addEventListener('click',(ev)=>{
    const tabBtn = ev.target.closest('.tab');
    if(tabBtn){
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      tabBtn.classList.add('active');
      Object.values(sections).forEach(s=> s.classList.add('hidden'));
      sections[tabBtn.dataset.tab]?.classList.remove('hidden');
    }
  });
}
