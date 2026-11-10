const REMEMBER_KEY = 'tuyamika.remember';
const CONSENT_KEY = 'tuyamika.cookieconsent';

// Private session token: default placement is sessionStorage (cleared when the
// tab closes). "Keep me signed in" flips to persistent localStorage — and only
// applies when cookie/storage consent was granted.
function tokenStore() {
  if (localStorage.getItem(CONSENT_KEY) === 'accepted' && localStorage.getItem(REMEMBER_KEY) === '1') return localStorage;
  return sessionStorage;
}

const store = {
  token: tokenStore().getItem('tuyamika.token') || null,
  user: safeJson(localStorage.getItem('tuyamika.user')),
  money: (v) => '$' + (v / 100).toFixed(2),
};

// Decode the JWT payload (no verify needed client-side — verify is server work)
// to surface expiry in the UI before the server rejects the request.
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch { return null; }
}

function sessionRemaining() {
  const exp = store.token && tokenExpiry(store.token);
  if (!exp) return null;
  return exp - Date.now() / 1000;
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

const api = {
  async req(method, path, body) {
    const res = await fetch('/api' + path, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(store.token ? { authorization: `Bearer ${store.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText);
      err.status = res.status;
      err.details = data.details;
      if (res.status === 401 && store.token && !path.startsWith('/auth/')) {
        handleExpiredSession();
      }
      throw err;
    }
    return data;
  },
  get(path) { return api.req('GET', path); },
  post(path, body) { return api.req('POST', path, body); },
  patch(path, body) { return api.req('PATCH', path, body); },
  del(path) { return api.req('DELETE', path); },
};

function handleExpiredSession() {
  const hadToken = !!store.token;
  setSession(null, null);
  if (!hadToken) return;
  toast('Your session expired — please sign in again.', 'error');
  location.hash = '#/login';
}

function setSession(user, token, remember) {
  store.user = user;
  store.token = token;
  if (remember !== undefined) localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  for (const s of [localStorage, sessionStorage]) s.removeItem('tuyamika.token');
  if (token) tokenStore().setItem('tuyamika.token', token);
  if (user) localStorage.setItem('tuyamika.user', JSON.stringify(user)); else localStorage.removeItem('tuyamika.user');
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(9)) {
    if (c === null || c === undefined || c === false || c === '') continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function banner() {
  const node = el('div', { class: 'banner error', hidden: true });
  node.show = (t) => { node.hidden = false; node.textContent = t; };
  node.info = (t) => { node.hidden = false; node.className = 'banner info'; node.textContent = t; };
  node.err = (t) => { node.hidden = false; node.className = 'banner error'; node.textContent = t; };
  return node;
}

function toast(text, kind = 'info', ms = 4200) {
  const host = document.getElementById('toasts') || document.body;
  const t = el('div', { class: 'toast ' + kind, role: 'status' }, icon(kind === 'error' ? 'alert' : 'check'), el('span', null, text));
  host.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 350);
  }, ms);
}

function icon(name, size = 16) {
  const paths = {
    gift: 'M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.21 10.25 1.77 9.25 1.77c-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
    alert: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    store: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
    shield: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
    bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
    bug: 'M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17a6.002 6.002 0 0 0-2.83 0L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z',
  };
  const d = paths[name] || paths.gift;
  return el('span', {
    class: 'icon',
    style: 'width:' + size + 'px;height:' + size + 'px',
    'aria-hidden': 'true',
  }, el('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'currentColor' }, el('path', { d })));
}

function field(labelText, input) {
  return el('label', null, el('span', null, labelText), input);
}

function textInput(name, type = 'text', extra = {}) {
  return el('input', { type, name, required: true, ...extra });
}

function formSubmit(form, handler) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Working…';
    try { await handler(e); } finally { btn.disabled = false; btn.textContent = prev; }
  });
}

function fv(form, name) {
  return form.elements[name] ? form.elements[name].value.trim() : '';
}

const statusBadge = (s) =>
  el('span', {
    class: 'badge' + (['approved', 'published', 'paid', 'verified', 'available'].includes(s) ? ' ok'
      : ['rejected', 'suspended', 'failed', 'closed'].includes(s) ? ' bad' : ' warn'),
  }, s);

const fmtDate = (ts) => new Date(ts).toLocaleString();

const viewEl = () => document.getElementById('view');

const routes = {
  login: () => authView(false),
  signup: () => authView(true),
  registries: registriesView,
  registry: registryDetailView,
  retailer: retailerView,
  admin: adminView,
  notifications: notificationsView,
  account: accountView,
};

function renderNav(activeName) {
  const user = store.user || {};
  const showRetailer = user.role === 'admin' || user.role === 'business_owner';
  const links = store.token
    ? [
        ['registries', 'Registries', 'gift'],
        ['notifications', 'Notifications', 'bell'],
        ...(showRetailer ? [['retailer', 'Retailer', 'store']] : []),
        ...(user.role === 'admin' ? [['admin', 'Admin', 'shield']] : []),
        ['account', 'Account', 'users'],
      ]
    : [['login', 'Sign in', 'users'], ['signup', 'Create account', 'users']];
  document.getElementById('nav').replaceChildren(...links.map(([name, text, ic]) => {
    const a = el('a', { href: '#/' + name }, el('span', { class: 'navicon' }, icon(ic, 15)), text);
    if (name === activeName) a.classList.add('active');
    return a;
  }));
}

async function render() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, ...rest] = hash.split('/');
  const locked = ['registries', 'registry', 'retailer', 'admin', 'notifications', 'account'];
  if (locked.includes(name) && !store.token) { location.hash = '#/login'; return; }
  if (!name) {
    location.hash = store.token
      ? (store.user && store.user.role === 'admin' ? '#/admin' : '#/registries')
      : '#/login';
    return;
  }
  renderNav(name);
  let node;
  try { node = (routes[name] || notFoundView)(rest); }
  catch (err) { node = el('div', { class: 'banner error' }, 'Load failed: ' + err.message); }
  if (node instanceof Promise) node = await node;
  viewEl().replaceChildren(node);
}

function notFoundView() {
  return el('div', { class: 'card' }, el('h1', null, 'Not found'), el('p', null, 'Unknown screen.'));
}

const firebaseCtl = {
  config: null,
  async read() {
    if (!this.config) {
      try {
        const res = await fetch('/api/auth/firebase-config');
        this.config = await res.json();
      } catch { this.config = { enabled: false }; }
    }
    return this.config;
  },
  async load() {
    if (!window.firebase) {
      await Promise.all(['vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js'].map((src) =>
        new Promise((ok, bad) => {
          const s = document.createElement('script');
          s.src = '/' + src;
          s.onload = ok;
          s.onerror = () => bad(new Error('Failed to load /' + src));
          document.head.append(s);
        })));
    }
    if (!this.config) this.config = await this.read();
    if (!firebaseCtl.app) firebaseCtl.app = firebase.initializeApp(this.config);
  },
};

async function signInWithGoogle() {
  await firebaseCtl.load();
  const provider = new firebase.auth.GoogleAuthProvider();
  const result = await firebase.auth().signInWithPopup(provider);
  const idToken = await result.user.getIdToken();
  const data = await api.post('/auth/firebase', { id_token: idToken });
  setSession(data.user, data.token, true);
  location.hash = data.user.role === 'admin' ? '#/admin' : '#/registries';
}

function reportClientError(err, extra) {
  try {
    const message = err && (err.message || String(err)) || 'unknown client error';
    const payload = {
      message: String(message).slice(0, 1000),
      stack: err && err.stack ? String(err.stack).slice(0, 4000) : undefined,
      page: location.pathname + location.hash,
      extra,
    };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/client-errors', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/client-errors', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* reporting must never break the page */ }
}

function loadingView(label = 'Loading…') {
  return el('div', { class: 'loadbox' }, el('span', { class: 'spinner', 'aria-hidden': 'true' }), el('span', { class: 'muted' }, label));
}

const authFormFields = (form) => {
  form.append(el('label', null,
    el('input', { type: 'checkbox', name: 'remember', style: 'width:auto' }),
    el('span', null, 'Keep me signed in (private session otherwise)')));
};

function authView(isSignup) {
  const err = banner();
  const form = el('form', { class: 'stack' });
  if (isSignup) {
    form.append(field('Full name', textInput('full_name', 'text', { autofocus: true })));
    form.append(field('Email', textInput('email', 'email', { autocomplete: 'username' })));
    form.append(field('Phone (optional)', textInput('phone', 'text', { required: false })));
  } else {
    form.append(field('Email or phone', textInput('email', 'text', { autocomplete: 'username' })));
  }
  form.append(field('Password', textInput('password', 'password', { minlength: isSignup ? 8 : 1 })));
  authFormFields(form);
  if (isSignup) {
    const role = el('select', { name: 'role' },
      el('option', { value: 'customer' }, 'Customer'),
      el('option', { value: 'business_owner' }, 'Retailer / business owner'),
      el('option', { value: 'service_provider' }, 'Service provider'));
    form.append(field('Account type', role));
    form.append(field('Country (ISO code)', textInput('country', 'text', { value: 'ZW', maxlength: 2, minlength: 2 })));
    // honeypot: visually empty; bots auto-fill every field and get 400
    form.append(el('input', { type: 'text', name: 'hp', autocomplete: 'off', tabindex: '-1', 'aria-hidden': 'true', style: 'position:absolute;left:-9999px;height:0;width:0;' }));
  }
  const consentWrap = isSignup
    ? el('label', { class: 'consentline' },
        el('input', { type: 'checkbox', name: 'consent', required: true }),
        el('span', null, 'I have read and agree to the ',
          el('a', { href: '/legal/privacy', target: '_blank', rel: 'noopener' }, 'Privacy Policy'),
          ' and ',
          el('a', { href: '/legal/terms', target: '_blank', rel: 'noopener' }, 'Terms of Service'),
          '.'))
    : null;
  if (consentWrap) form.append(consentWrap);
  form.append(el('button', { type: 'submit' }, isSignup ? 'Create account' : 'Sign in'));
  formSubmit(form, async () => {
    err.hidden = true;
    try {
      let data;
      if (isSignup) {
        data = await api.post('/auth/signup', {
          email: fv(form, 'email'),
          password: form.elements.password.value,
          full_name: fv(form, 'full_name'),
          phone: fv(form, 'phone') || undefined,
          country: fv(form, 'country').toUpperCase() || 'ZW',
          role: form.elements.role.value,
          consent: form.elements.consent.checked === true,
        });
      } else {
        const loginValue = fv(form, 'email');
        data = await api.post('/auth/login', {
          ...(loginValue.includes('@') ? { email: loginValue } : { phone: loginValue }),
          password: form.elements.password.value,
        });
      }
      setSession(data.user, data.token, form.elements.remember.checked);
      if (isSignup && data.stubs && data.stubs.verification) {
        const token = data.stubs.verification.replace(/^GET \/api\/auth\/verify\//, '').replace(/\s*\(.*/, '');
        renderNav('');
        viewEl().replaceChildren(el('div', { class: 'card' },
          el('h1', null, 'Welcome ' + data.user.full_name + ' — account created'),
          el('p', { class: 'notice' },
            'Email delivery is stubbed for the MVP. Verify your account now: ',
            el('a', { href: '/api/auth/verify/' + token }, '/api/auth/verify/' + token.slice(0, 10) + '…')),
          el('button', { type: 'button', onclick: () => { location.hash = '#/registries'; } }, 'Continue')));
      } else {
        location.hash = data.user.role === 'admin' ? '#/admin' : '#/registries';
      }
    } catch (e) {
      err.err(e.status === 401 ? 'Sign in failed — check your details and password.' : e.message);
    }
  });
  const card = el('div', { class: 'card' },
    el('h1', null, isSignup ? 'Create your Tuyamika account' : 'Welcome back'),
    err, form,
    el('p', { class: 'muted' },
      isSignup ? 'Already registered? ' : 'New to Tuyamika? ',
      el('a', { href: isSignup ? '#/login' : '#/signup' }, isSignup ? 'Sign in' : 'Create account')));
  firebaseCtl.read().then((cfg) => {
    if (!cfg.enabled) return;
    const fbErr = banner();
    const fbBtn = el('button', { type: 'button', class: 'firebase' }, 'Continue with Google');
    fbBtn.addEventListener('click', async () => {
      fbErr.hidden = true;
      fbBtn.disabled = true;
      fbBtn.textContent = 'Opening Google…';
      try { await signInWithGoogle(); } catch (e) {
        fbErr.err((e && e.message) ? e.message : 'Google sign in failed');
      } finally {
        fbBtn.disabled = false;
        fbBtn.textContent = 'Continue with Google';
      }
    });
    card.append(el('p', { class: 'muted' }, 'Firebase sign in is available.'), fbBtn, fbErr);
  });
  return card;
}

const registriesView = () => {
  const wrap = el('div');
  const err = banner();
  const list = el('div', { class: 'grid' });
  const loading = loadingView();
  wrap.append(el('h1', { class: 'pagehead' }, icon('gift', 20), ' My registries'), err, loading, list);
  const form = el('div', { hidden: true }, el('h2', null, 'New registry'), createRegistryForm(err, () => render()));
  wrap.append(form);

  api.get('/registries')
    .then(({ registries }) => {
      loading.remove();
      form.hidden = false;
      if (!registries.length) list.append(el('p', { class: 'muted' }, 'No registries yet — create one below.'));
      for (const r of registries) {
        const shareUrl = location.origin + '/r/' + r.share_token;
        list.append(el('div', { class: 'card' },
          el('h2', null, r.name),
          el('p', null,
            el('span', { class: 'badge' }, r.occasion), ' ',
            statusBadge(r.status), ' ',
            el('span', { class: 'badge' }, r.item_count + ' items'), ' ',
            r.surprise ? el('span', { class: 'badge' }, 'surprise') : null),
          r.event_date ? el('p', { class: 'muted' }, 'Event date: ' + r.event_date) : null,
          el('p', null,
            el('a', { class: 'btn', href: '#/registry/' + r.id }, 'Open'),
            ' ',
            el('button', {
              class: 'ghost small',
              type: 'button',
              onclick: () => navigator.clipboard.writeText(shareUrl),
            }, 'Copy share link')),
          el('p', { class: 'muted' }, 'Published registries are viewable by guests: ' + shareUrl)));
      }
    })
    .catch((e) => err.err('Could not load registries: ' + e.message));
  return wrap;
};

const createRegistryForm = (err, done) => {
  const form = el('form', { class: 'stack' });
  form.append(
    field('Name', textInput('name', 'text', { placeholder: 'Mai Tino’s Birthday' })),
    field('Occasion', textInput('occasion', 'text', { placeholder: 'birthday' })),
    field('Event date', textInput('event_date', 'date', { required: false })),
    field('Message to guests', el('textarea', { name: 'message', rows: 2 })),
    field('Visibility', el('select', { name: 'visibility' },
      el('option', { value: 'unlisted', selected: true }, 'Unlisted — share by link'),
      el('option', { value: 'public' }, 'Public'),
      el('option', { value: 'private' }, 'Private'))),
    el('label', null,
      el('input', { type: 'checkbox', name: 'surprise', checked: true }),
      el('span', null, 'Surprise — hide purchases from me until the event')),
    el('button', { type: 'submit' }, 'Create registry')
  );
  formSubmit(form, async () => {
    err.hidden = true;
    try {
      await api.post('/registries', {
        name: fv(form, 'name'),
        occasion: fv(form, 'occasion'),
        event_date: fv(form, 'event_date') || undefined,
        message: fv(form, 'message') || undefined,
        visibility: form.elements.visibility.value,
        surprise: form.elements.surprise.checked,
      });
      done();
    } catch (e) {
      err.err(describeError(e));
    }
  });
  return form;
};

function describeError(e) {
  if (e.details && e.details.field_errors) {
    return e.message + ' — check: ' + Object.keys(e.details.field_errors).join(', ');
  }
  return e.message;
}

function registryDetailView(params) {
  const id = params[0];
  const wrap = el('div');
  const err = banner();
  const head = el('div');
  const itemsBox = el('div');
  const regLoading = loadingView('Loading registry…');
  wrap.append(
    el('p', null, el('a', { href: '#/registries', class: 'muted' }, '← All registries')),
    err, head,
    regLoading,
    el('h2', null, 'Gifts'), itemsBox,
    el('h2', null, 'Add gifts'), addItemForm(id, err, () => load())
  );
  wrap.append(el('p', { class: 'muted' }, 'Free tier: up to 3 registries, 12 gifts per registry.'));

  const load = async () => {
    regLoading.remove();
    const data = await api.get('/registries/' + id);
    const reg = data.registry;
    head._reg = reg;
    const shareUrl = location.origin + '/r/' + reg.share_token;
    head.replaceChildren(el('div', { class: 'card' },
      el('h1', null, reg.name),
      el('p', null,
        el('span', { class: 'badge' }, reg.occasion), ' ',
        statusBadge(reg.status), ' ',
        el('span', { class: 'badge' }, 'visibility: ' + reg.visibility), ' ',
        reg.surprise ? el('span', { class: 'badge' }, 'surprise mode') : null, ' ',
        el('span', { class: 'badge' }, data.items.length + ' items')),
      reg.message ? el('p', null, reg.message) : null,
      reg.event_date ? el('p', { class: 'muted' }, 'Event date: ' + reg.event_date) : null,
      el('p', null,
        el('span', { class: 'sharelink' }, shareUrl), ' ',
        el('button', { class: 'ghost small', type: 'button', onclick: () => navigator.clipboard.writeText(shareUrl) }, 'Copy link')),
      el('p', null,
        reg.status === 'draft'
          ? el('button', { type: 'button', onclick: () => api.patch('/registries/' + id, { status: 'published' }).then(load).catch((e) => err.err(e.message)) }, 'Publish for guests')
          : null,
        ' ',
        reg.status === 'published'
          ? el('button', { class: 'danger small', type: 'button', onclick: () => api.patch('/registries/' + id, { status: 'closed' }).then(load).catch((e) => err.err(e.message)) }, 'Close registry')
          : null,
        ' ',
        el('button', { class: 'ghost small', type: 'button', onclick: openEditor }, 'Edit details'))));
    renderItems(data.items);
  };

  const renderItems = (items) => {
    if (!items.length) {
      itemsBox.replaceChildren(el('p', { class: 'muted' }, 'No gifts yet — add from the catalog below.'));
      return;
    }
    itemsBox.replaceChildren(el('div', { class: 'card' },
      el('table', null,
        el('thead', null, el('tr', null,
          el('th', null, 'Gift'), el('th', null, 'Category'), el('th', null, 'Price'), el('th', null, 'Qty'),
          el('th', null, 'Variant'), el('th', null, 'Status'), el('th', null, ''))),
        el('tbody', null, items.map((it) => el('tr', null,
          el('td', null, it.title),
          it.notes ? el('div', { class: 'muted' }, 'Note: ' + it.notes) : null,
          el('td', null, it.category),
          el('td', { class: 'money' }, store.money(it.price_cents)),
          el('td', null, String(it.quantity)),
          el('td', null, variantText(it.variant)),
          el('td', null, statusBadge(it.status)),
          el('td', null,
            it.status === 'available'
              ? el('button', {
                  class: 'ghost small', type: 'button',
                  onclick: () => api.del(`/registries/${id}/items/${it.id}`).then(load).catch((e) => err.err(e.message)),
                }, 'Remove')
              : null)))))));
  };

  const variantText = (v) => {
    if (!v) return '—';
    const parts = [];
    if (v.size) parts.push('size ' + v.size);
    if (v.color) parts.push('color ' + v.color);
    return parts.length ? parts.join(' / ') : '—';
  };

  const openEditor = () => {
    if (!head._reg) return;
    const reg = head._reg;
    const form = el('form', { class: 'stack' });
    form.append(
      field('Name', textInput('name', 'text', { value: reg.name })),
      field('Occasion', textInput('occasion', 'text', { value: reg.occasion })),
      field('Event date', textInput('event_date', 'date', { value: reg.event_date || '', required: false })),
      field('Message to guests', el('textarea', { name: 'message', rows: 2 }, reg.message || '')),
      field('Visibility', el('select', { name: 'visibility' },
        ...['private', 'unlisted', 'public'].map((v) => el('option', { value: v, selected: v === reg.visibility }, v)))),
      el('label', null,
        el('input', { type: 'checkbox', name: 'surprise', checked: reg.surprise }),
        el('span', null, 'Surprise mode')),
      el('div', null,
        el('button', { type: 'submit' }, 'Save changes'),
        el('button', { class: 'ghost', type: 'button', onclick: () => form.remove() }, 'Cancel'))
    );
    formSubmit(form, async () => {
      err.hidden = true;
      try {
        await api.patch('/registries/' + id, {
          name: fv(form, 'name'),
          occasion: fv(form, 'occasion'),
          event_date: fv(form, 'event_date') || null,
          message: fv(form, 'message') || null,
          visibility: form.elements.visibility.value,
          surprise: form.elements.surprise.checked,
        });
        await load();
      } catch (e) { err.err(describeError(e)); }
    });
    head.querySelector('.card').append(form);
  };

  api.get('/registries/' + id)
    .then((data) => { head._reg = data.registry; })
    .catch((e) => err.err('Could not load registry: ' + e.message));
  load().catch((e) => {
    regLoading.remove();
    if (e.status === 401) { setSession(null, null); location.hash = '#/login'; }
    else err.err('Load failed: ' + e.message);
  });
  return wrap;
}

function addItemForm(registryId, err, refresh) {
  const box = el('div', { class: 'card' });
  const search = textInput('search', 'search', { required: false, placeholder: 'Type to filter catalog…' });
  const category = el('select', { name: 'category' }, el('option', { value: '' }, 'All categories'));
  const product = el('select', { name: 'product' }, el('option', { value: '' }, 'Catalog loading…'));
  const qty = el('input', { type: 'number', name: 'qty', min: 1, value: 1, required: true });
  const notes = el('textarea', { name: 'notes', rows: 2 });

  let catalog = [];

  const rebuild = () => {
    const q = search.value.toLowerCase();
    const cat = category.value;
    const options = catalog
      .filter((p) => (!cat || p.category === cat) && (!q || (p.title + ' ' + (p.description || '')).toLowerCase().includes(q)))
      .slice(0, 60)
      .map((p) => el('option', { value: p.id },
        p.title + ' — ' + store.money(p.price_cents) + ' — ' + p.business));
    product.replaceChildren(options.length
      ? options
      : [el('option', { value: '' }, catalog.length ? 'No match' : 'No products available yet')]);
  };
  search.addEventListener('input', rebuild);
  category.addEventListener('change', rebuild);

  const form = el('form', { class: 'stack' });
  form.append(
    field('Search', search),
    field('Category', category),
    field('Product', product),
    field('Quantity', qty),
    field('Note for this gift', notes),
    el('button', { type: 'submit' }, 'Add to registry'));
  formSubmit(form, async () => {
    err.hidden = true;
    if (!product.value) { err.err('No product selected.'); return; }
    try {
      await api.post(`/registries/${registryId}/items`, {
        product_id: product.value,
        quantity: Number(qty.value),
        variant: {},
        notes: fv(form, 'notes') || undefined,
      });
      notes.value = '';
      await refresh();
    } catch (e) { err.err(describeError(e)); }
  });

  api.get('/products')
    .then(({ products, categories }) => {
      catalog = products;
      category.replaceChildren(el('option', { value: '' }, 'All categories'),
        ...categories.map((c) => el('option', { value: c }, c)));
      rebuild();
    })
    .catch((e) => err.err('Catalog could not load: ' + e.message));
  box.append(form);
  return box;
}

function card(...children) {
  return el('div', { class: 'card' }, ...children);
}

function retailerView() {
  const wrap = el('div');
  const err = banner();
  const body = el('div');
  wrap.append(el('h1', { class: 'pagehead' }, icon('store', 20), ' Retailer dashboard'), err, body);
  body.replaceChildren(loadingView('Loading businesses…'));

  const openBusiness = async (biz) => {
    err.hidden = true;
    try {
      const products = (await api.get(`/retailer/businesses/${biz.id}/products`)).products;
      let orders = [];
      try { orders = (await api.get(`/retailer/orders?business_id=${biz.id}`)).orders; }
      catch { orders = []; }

      const productForm = el('form', { class: 'stack' });
      productForm.append(
        field('Title', textInput('title')),
        field('Category', textInput('category', 'text', { placeholder: 'Handmade' })),
        field('Price in cents (e.g. 8500 = $85.00)', el('input', { type: 'number', name: 'price_cents', min: 1, required: true })),
        field('Stock', el('input', { type: 'number', name: 'stock', min: 0, value: 1 })),
        field('Description', el('textarea', { name: 'description', rows: 2 })),
        el('button', { type: 'submit' }, 'Add product'));
      formSubmit(productForm, async () => {
        err.hidden = true;
        try {
          await api.post(`/retailer/businesses/${biz.id}/products`, {
            title: fv(productForm, 'title'),
            description: fv(productForm, 'description') || undefined,
            price_cents: Math.round(Number(fv(productForm, 'price_cents'))),
            category: fv(productForm, 'category'),
            stock: Math.round(Number(fv(productForm, 'stock'))),
            variants: [],
          });
          openBusiness(biz);
        } catch (e) { err.err(describeError(e)); }
      });

      const ordersTable = orders.length
        ? el('table', null,
            el('thead', null, el('tr', null,
              el('th', null, 'Order'), el('th', null, 'Status'), el('th', null, 'Total'), el('th', null, 'Items'), el('th', null, 'Placed'))),
            el('tbody', null, orders.map((o) => el('tr', null,
              el('td', null, o.id),
              el('td', null, statusBadge(o.status)),
              el('td', { class: 'money' }, store.money(o.total_cents) + ' ' + o.currency),
              el('td', null, o.items.map((i) => i.title + ' ×' + i.quantity).join(', ')),
              el('td', null, fmtDate(o.created_at))))))
        : el('p', { class: 'muted' }, 'No orders for this business yet.');

      body.replaceChildren(
        card(
          el('h2', null, biz.name),
          el('p', null, statusBadge(biz.status), ' ', el('span', { class: 'badge' }, biz.type),
            ' ', el('span', { class: 'badge' }, biz.description || '')),
          el('a', { class: 'muted', href: '#/' }, '← Businesses')),
        card(
          el('h2', null, 'Products'),
          products.length
            ? el('table', null,
                el('thead', null, el('tr', null,
                  el('th', null, 'Title'), el('th', null, 'Category'), el('th', null, 'Price'), el('th', null, 'Stock'))),
                el('tbody', null, products.map((p) => el('tr', null,
                  el('td', null, p.title),
                  el('td', null, p.category),
                  el('td', { class: 'money' }, store.money(p.price_cents)),
                  el('td', null, String(p.stock))))))
            : el('p', { class: 'muted' }, (biz.status === 'approved' ? 'No products yet.' : 'Admin approval required before adding products.'))),
        ...(biz.status === 'approved' ? [card(el('h2', null, 'Add a product'), productForm)] : []),
        card(el('h2', null, 'Orders'), ordersTable));
    } catch (e) { err.err('Could not open business: ' + e.message); }
  };

  api.get('/retailer/businesses')
    .then(({ businesses }) => {
      const list = el('div', { class: 'grid' });
      body.append(list);
      if (!businesses.length) body.append(el('p', { class: 'muted' }, 'No businesses yet — register one below to sell on Tuyamika.'));
      for (const biz of businesses) {
        list.append(card(
          el('h2', null, biz.name),
          el('p', null, statusBadge(biz.status), ' ', el('span', { class: 'badge' }, biz.type),
            ' ', el('span', { class: 'badge' }, biz.product_count + ' products')),
          biz.description ? el('p', { class: 'muted' }, biz.description) : null,
          el('button', { type: 'button', onclick: () => openBusiness(biz) }, 'Manage')));
      }
      body.append(el('h2', null, 'Register a business'), createBusinessForm(err));
      if (businesses.length === 1) openBusiness(businesses[0]);
    })
    .catch((e) => err.err('Could not load businesses: ' + e.message));
  return wrap;
}

const createBusinessForm = (err) => {
  const form = el('form', { class: 'stack' });
  form.append(
    field('Type', el('select', { name: 'type' },
      el('option', { value: 'retailer' }, 'Retailer'),
      el('option', { value: 'service_provider' }, 'Service provider'))),
    field('Business name', textInput('name')),
    field('Description', el('textarea', { name: 'description', rows: 2 })),
    el('button', { type: 'submit' }, 'Register business'));
  formSubmit(form, async () => {
    err.hidden = true;
    try {
      await api.post('/retailer/businesses', {
        type: form.elements.type.value,
        name: fv(form, 'name'),
        description: fv(form, 'description') || undefined,
      });
      render();
    } catch (e) { err.err(describeError(e)); }
  });
  return form;
};

const FF_FORWARD = {
  paid: ['processing'],
  processing: ['dispatched'],
  dispatched: ['delivered', 'collected'],
  delivered: [],
  collected: [],
};

function adminView() {
  const wrap = el('div');
  const err = banner();
  const tabs = [['users', 'Users', 'users'], ['businesses', 'Businesses', 'store'], ['orders', 'Orders', 'gift'], ['logs', 'Audit log', 'list'], ['errors', 'Error reports', 'bug']];
  let active = 'users';
  const bar = el('div', { class: 'tabs' });
  const body = el('div');
  wrap.append(el('h1', null, 'Admin console'), err, bar, body);

  const draw = async () => {
    bar.replaceChildren(...tabs.map(([t, label, ic]) => el('button', {
      type: 'button',
      class: `${active === t ? 'active' : ''} iconnable`,
      onclick: () => { active = t; draw(); },
    }, icon(ic, 13), ' ', label)));
    body.replaceChildren(loadingView());
    try {
      if (active === 'users') {
        const { users } = await api.get('/admin/users');
        body.replaceChildren(el('table', null,
          el('thead', null, el('tr', null,
            el('th', null, icon('users', 13), ' Name'), el('th', null, 'Email'), el('th', null, 'Role'), el('th', null, 'Verified'), el('th', null, 'Joined'))),
          el('tbody', null, users.map((u) => el('tr', null,
            el('td', null, u.full_name),
            el('td', null, u.email),
            el('td', null, u.role),
            el('td', null, statusBadge(u.verified ? 'verified' : 'pending')),
            el('td', null, fmtDate(u.created_at)))))));
      } else if (active === 'businesses') {
        const { businesses } = await api.get('/admin/businesses');
        body.replaceChildren(el('table', null,
          el('thead', null, el('tr', null,
            el('th', null, icon('store', 13), ' Name'), el('th', null, 'Type'), el('th', null, 'Status'), el('th', null, 'Set status'))),
          el('tbody', null, businesses.map((biz) => el('tr', null,
            el('td', null, biz.name),
            el('td', null, biz.type),
            el('td', null, statusBadge(biz.status)),
            el('td', null,
              ...['approved', 'rejected', 'suspended']
                .filter((s) => s !== biz.status)
                .map((s) => el('button', {
                  class: 'small' + (s === 'approved' ? '' : ' ghost'),
                  type: 'button',
                  onclick: () => api.post(`/admin/businesses/${biz.id}/status`, { status: s }).then(draw).catch((e) => err.err(e.message)),
                }, s))))))));
      } else if (active === 'orders') {
        const [{ orders }, { orders: ffRows }] = await Promise.all([api.get('/admin/orders'), api.get('/fulfilment')]);
        const ffByOrder = Object.fromEntries(ffRows.map((r) => [r.id, r.fulfilment]));
        body.replaceChildren(el('table', null,
          el('thead', null, el('tr', null,
            el('th', null, icon('gift', 13), ' Order'), el('th', null, 'Status'), el('th', null, 'Total'), el('th', null, 'Placed'), el('th', null, 'Fulfilment'))),
          el('tbody', null, orders.map((o) => {
            const ff = ffByOrder[o.id];
            const next = FF_FORWARD[o.status] || [];
            return el('tr', null,
              el('td', { class: 'mono' }, o.id.slice(0, 8) + '…'),
              el('td', null, statusBadge(o.status)),
              el('td', { class: 'money' }, store.money(o.total_cents) + ' ' + o.currency),
              el('td', null, fmtDate(o.created_at)),
              el('td', null, !next.length
                ? el('span', { class: 'muted' }, ff ? 'done' : '—')
                : next.map((s) => el('button', {
                    class: 'ghost small', type: 'button',
                    onclick: () => api.patch(`/fulfilment/${ff.id}`, { order_status: s }).then(draw).catch((e) => err.err(describeError(e))),
                  }, s))));
          }))));
      } else if (active === 'logs') {
        const { logs } = await api.get('/admin/logs');
        body.replaceChildren(el('table', null,
          el('thead', null, el('tr', null,
            el('th', null, icon('list', 13), ' Action'), el('th', null, 'Entity'), el('th', null, 'Details'), el('th', null, 'Time'))),
          el('tbody', null, logs.map((l) => el('tr', null,
            el('td', null, l.action),
            el('td', null, l.entity + ' ' + (l.entity_id || '').slice(0, 8) + '…'),
            el('td', { class: 'mono wrap' }, l.details),
            el('td', null, fmtDate(l.created_at)))))));
      } else {
        const { errors, counts } = await api.get('/admin/errors');
        const clear = el('button', { class: 'danger small', type: 'button', onclick: () => api.del('/admin/errors').then(draw).catch((e) => err.err(e.message)) }, 'Clear all');
        body.replaceChildren(el('div', { class: 'flexrow' },
          el('span', { class: 'badge ok' }, `server ${counts.server || 0}`),
          el('span', { class: 'badge' }, `client ${counts.client || 0}`), clear),
        errors.length
          ? el('table', null,
              el('thead', null, el('tr', null,
                el('th', null, icon('bug', 13), ' Time'), el('th', null, 'Source'), el('th', null, 'Message'), el('th', null, 'Where'), el('th', null, ''))),
              el('tbody', null, errors.map((e) => el('tr', null,
                el('td', { class: 'nowrap muted' }, fmtDate(e.created_at)),
                el('td', null, statusBadge(e.source === 'server' ? 'pending' : 'published'), ' ', el('span', { class: 'muted' }, e.level)),
                el('td', { class: 'wrap' }, e.message),
                el('td', { class: 'mono wrap' }, e.page || (e.context && e.context.path) || '—'),
                el('td', null, el('button', {
                  class: 'ghost small', type: 'button', 'aria-label': 'dismiss',
                  onclick: () => api.del(`/admin/errors/${e.id}`).then(draw).catch((x) => err.err(x.message)),
                }, '×'))))))
          : el('p', { class: 'muted' }, 'No errors logged — clean run.'));
      }
    } catch (e) {
      err.err('Could not load ' + active + ': ' + e.message);
      body.replaceChildren();
      reportClientError(e, { scope: 'admin.' + active });
    }
  };
  draw();
  return wrap;
}

function notificationsView() {
  const wrap = el('div');
  const err = banner();
  const body = el('div');
  wrap.append(el('h1', { class: 'pagehead' }, icon('bell', 20), ' Notifications'), err, body);
  body.replaceChildren(loadingView());

  const load = () => api.get('/notifications').then(({ notifications, unread }) => {
    if (!notifications.length) {
      body.replaceChildren(el('p', { class: 'muted' }, 'Nothing yet.'));
      return;
    }
    body.replaceChildren(
      el('p', { class: 'muted' }, unread + ' unread'),
      el('table', null,
        el('thead', null, el('tr', null,
          el('th', null, 'Message'), el('th', null, 'Read'), el('th', null, 'When'), el('th', null, ''))),
        el('tbody', null, notifications.map((n) => el('tr', null,
          el('td', null, n.message, n.link ? ' ' : null, n.link ? el('a', { href: n.link }, 'Open') : null),
          el('td', null, statusBadge(n.read ? 'published' : 'pending')),
          el('td', null, fmtDate(n.created_at)),
          el('td', null, !n.read
            ? el('button', {
                class: 'ghost small', type: 'button',
                onclick: () => api.post(`/notifications/${n.id}/read`).then(load).catch((e) => err.err(e.message)),
              }, 'Mark read')
            : null))))));
  });
  load().catch((e) => err.err('Could not load notifications: ' + e.message));
  return wrap;
}

// Account screen: transparency about stored data + self-service deletion
// (privacy right documented in /legal/privacy).
function accountView() {
  const wrap = el('div');
  const err = banner();
  const u = store.user || {};
  wrap.append(el('h1', { class: 'pagehead' }, icon('users', 20), ' Account'), err,
    el('div', { class: 'card' },
      el('dl', { class: 'kv' },
        el('dt', null, 'Name'), el('dd', null, u.full_name || '—'),
        el('dt', null, 'Email'), el('dd', null, u.email || '—'),
        el('dt', null, 'Phone'), el('dd', null, u.phone || '—'),
        el('dt', null, 'Country'), el('dd', null, u.country || '—'),
        el('dt', null, 'Role'), el('dd', null, u.role || '—'),
        el('dt', null, 'Verified'), el('dd', null, u.verified ? 'yes' : 'no'))),
    el('div', { class: 'card' },
      el('h2', null, 'Data & privacy'),
      el('p', null, el('a', { href: '/legal/privacy', target: '_blank', rel: 'noopener' }, 'Privacy Policy'),
        ' · ', el('a', { href: '/legal/cookies', target: '_blank', rel: 'noopener' }, 'Cookie Policy')),
      el('details', null,
        el('summary', { class: 'danger-summary' }, 'Delete my account and personal data'),
        el('p', null, 'Deletes your name, phone, password hash and sign-in link; removes registries and events you own; leaves anonymized order records for accounting. This cannot be undone.'),
        el('button', {
          class: 'danger', type: 'button',
          onclick: deleteAccountFlow,
        }, 'Delete account permanently'))));
  return wrap;
}

async function deleteAccountFlow() {
  if (!confirm('Delete your account? This permanently erases your personal data and your registries/events.')) return;
  if (!confirm('Second check: type nothing but choose OK to continue. This cannot be undone.')) return;
  try {
    const res = await api.del('/auth/account');
    setSession(null, null);
    location.hash = '#/login';
    render();
    toast('Account deleted. ' + (res.kept || ''), 'info', 7000);
  } catch (e) {
    toast('Deletion failed: ' + e.message, 'error');
  }
}

function showCookieBanner() {
  document.getElementById('cookiebanner')?.remove();
  const bannerNode = el('div', { id: 'cookiebanner', role: 'region', 'aria-label': 'Cookie settings' },
    icon('shield', 18),
    el('p', null,
      'This site stores only your sign-in token, your "Keep me signed in" choice (optional), and this banner answer. No trackers, no ad networks — details in the ',
      el('a', { href: '/legal/cookies', target: '_blank', rel: 'noopener' }, 'Cookie Policy')),
    el('div', { class: 'btnrow' },
      el('button', {
        type: 'button',
        onclick: () => { localStorage.setItem(CONSENT_KEY, 'accepted'); bannerNode.remove(); toast('Cookies accepted — optional "Keep me signed in" is enabled.', 'info'); },
      }, 'Accept'),
      el('button', {
        class: 'ghost', type: 'button',
        onclick: () => { localStorage.setItem(CONSENT_KEY, 'declined'); localStorage.removeItem(REMEMBER_KEY); bannerNode.remove(); toast('Only strictly necessary sign-in storage will be used.', 'info'); },
      }, 'Decline')));
  document.body.append(bannerNode);
  const first = bannerNode.querySelector('button');
  first?.focus();
}

function boot() {
  const toasts = el('div', { id: 'toasts', 'aria-live': 'polite' });
  document.body.append(toasts);

  window.addEventListener('error', (e) => reportClientError(e.error || new Error(String(e.message))));
  window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason || new Error('unhandled promise rejection')));

  // Cookie- / storage-consent banner. Honors Do-Not-Track + Global Privacy
  // Control as an automatic decline; never re-shows without clearing storage.
  const consent = localStorage.getItem(CONSENT_KEY);
  if (!consent && !navigator.doNotTrack && navigator.globalPrivacyControl !== true) showCookieBanner();
  document.getElementById('cookieSettings')?.addEventListener('click', showCookieBanner);

  // "Keep me signed in" is optional convenience storage — off until consent.
  if (consent !== 'accepted') {
    const rem = document.querySelector('input[name="remember"]');
    if (rem) { rem.checked = false; rem.disabled = true; rem.closest('label')?.classList.add('consent-locked'); }
  }

  const session = document.createElement('div');
  session.id = 'session';
  document.getElementById('topbar').append(session);
  const redrawSession = () => {
    const left = sessionRemaining();
    const expiryTitle = left == null
      ? null
      : left <= 0
        ? 'Session expired — sign in again'
        : `Session valid for ${Math.round(left / 60)} more minutes`;
    session.replaceChildren(...(store.token && store.user
      ? [
          ...(expiryTitle ? [el('span', { class: 'session-expiry', title: expiryTitle }, icon(left <= 0 ? 'alert' : 'clock', 13))] : []),
          el('span', { class: 'nowrap' }, store.user.full_name),
          el('button', {
            class: 'ghost small', type: 'button',
            onclick: () => { setSession(null, null); location.hash = '#/login'; render(); toast('Signed out — session cleared.', 'info'); },
          }, 'Sign out'),
        ]
      : []));
  };
  window.addEventListener('hashchange', () => { redrawSession(); render(); });
  redrawSession();
  render();
}

boot();
