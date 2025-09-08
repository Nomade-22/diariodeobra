
import { LS, read, write } from './storage.js';
import { user as ustate, setState } from './state.js';

export function currentUser(){ return read(LS.user, null); }

export function showLogin(){
  document.getElementById('view-login').classList.remove('hidden');
  document.getElementById('view-app').classList.add('hidden');
}

export function showApp(user){
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-app').classList.remove('hidden');
  // header
  document.getElementById('userName').textContent = user.name || 'Usuário';
  document.getElementById('userRole').textContent = user.role || 'Operação';
  const av = document.getElementById('avatar'); av.textContent = (user.name||'U').slice(0,1).toUpperCase();
}

export function bindAuth(){
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout= document.getElementById('btnLogout');
  const btnGoogle= document.getElementById('btnLoginGoogle');

  if(btnLogin){
    btnLogin.addEventListener('click', ()=>{
      const name = document.getElementById('loginName').value.trim();
      const id   = document.getElementById('loginId').value.trim();
      const role = document.getElementById('loginRole').value;
      if(!name){ alert('Informe seu nome.'); return; }
      const user = { name, id, role, provider:'local', loggedAt: new Date().toISOString() };
      write(LS.user, user); setState({ user }); showApp(user);
    });
  }

  if(btnLogout){
    btnLogout.addEventListener('click', (e)=>{
      e.preventDefault();
      localStorage.removeItem(LS.user);
      setState({ user: null });
      showLogin();
    });
  }

  if(btnGoogle){
    btnGoogle.addEventListener('click', ()=>{
      alert('Modo demonstração: para login Google real, conectaremos via Google Apps Script Web App que retorna seu e-mail corporativo.');
    });
  }
}
