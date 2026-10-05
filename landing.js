(function () {
  const A = NOGO.auth, $ = (s) => document.querySelector(s); let mode = 'login';
  A.getSession().then((u) => { if (u) { const b = $('#open-app'); b.textContent = 'Open app'; b.href = 'app.html'; } });
  function setMode(m) {
    mode = m; document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
    $('#name-wrap').hidden = m === 'login'; $('#a-submit').textContent = m === 'login' ? 'Log in' : 'Create account';
    $('#a-pass').autocomplete = m === 'login' ? 'current-password' : 'new-password'; $('#a-err').textContent = '';
  }
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
  async function go(fn) {
    const err = $('#a-err'), btns = document.querySelectorAll('#auth .btn'); err.textContent = ''; btns.forEach((b) => (b.disabled = true));
    try { await fn(); location.href = 'app.html'; } catch (e) { err.textContent = e.message; btns.forEach((b) => (b.disabled = false)); }
  }
  $('#a-submit').onclick = () => go(() => mode === 'login' ? A.login($('#a-email').value, $('#a-pass').value) : A.signup($('#a-name').value, $('#a-email').value, $('#a-pass').value));
  $('#a-demo').onclick = () => go(() => A.login('demo@nogo.app', 'demo1234'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('#auth') && !e.target.closest('button')) $('#a-submit').click(); });
})();
