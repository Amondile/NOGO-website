/* NOGO auth service. UI uses ONLY NOGO.auth:
 *   login(email,password) signup(name,email,password) -> User   logout()   getSession() -> User|null
 * MockAuth keeps accounts in localStorage (DEMO ONLY: not secure, passwords are stored in plain text). */
(function () {
  window.NOGO = window.NOGO || {};
  const USERS = 'nogo_users', SESSION = 'nogo_session';
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const pub = (u) => ({ id: u.id, name: u.name, email: u.email });
  const fail = (m) => { throw new Error(m); };

  class MockAuth {
    users() { let u = read(USERS, null); if (!u) { u = [{ id: 'u1', name: 'Demo User', email: 'demo@nogo.app', password: 'demo1234' }]; write(USERS, u); } return u; }
    start(u) { write(SESSION, pub(u)); if (!read(SESSION, null)) fail('Your browser is blocking storage. Allow it and try again.'); return pub(u); }
    async login(email, password) {
      const u = this.users().find((x) => x.email === String(email).trim().toLowerCase() && x.password === password);
      return u ? this.start(u) : fail('Incorrect email or password.');
    }
    async signup(name, email, password) {
      email = String(email).trim().toLowerCase(); name = String(name).trim();
      if (!name) fail('Please enter your name.');
      if (!/^\S+@\S+\.\S+$/.test(email)) fail('Please enter a valid email.');
      if (password.length < 8) fail('Password must be at least 8 characters.');
      const users = this.users(); if (users.some((x) => x.email === email)) fail('An account with that email already exists.');
      const u = { id: 'u_' + Date.now(), name, email, password }; users.push(u); write(USERS, users); return this.start(u);
    }
    async logout() { try { localStorage.removeItem(SESSION); } catch (e) {} }
    async getSession() { return read(SESSION, null); }
  }

  /* Traccar mapping (same interface):
   *  login   : POST /api/session  (form: email, password) -> user object, sets session cookie
   *  signup  : POST /api/users {name,email,password}      (registration must be enabled on the server)
   *  logout  : DELETE /api/session
   *  getSession : GET /api/session -> user, or 401 -> null */
  class TraccarAuth {
    constructor(baseUrl) { this.baseUrl = baseUrl; }
    async login() { fail('Not implemented'); } async signup() { fail('Not implemented'); }
    async logout() { fail('Not implemented'); } async getSession() { fail('Not implemented'); }
  }
  NOGO.MockAuth = MockAuth; NOGO.TraccarAuth = TraccarAuth;
  NOGO.auth = new MockAuth(); // swap: new TraccarAuth('https://your-traccar-host')
})();
