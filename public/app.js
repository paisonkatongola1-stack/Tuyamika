const store = {
  token: localStorage.getItem('tuyamika.token') || null,
  user: safeJson(localStorage.getItem('tuyamika.user')),
  money: (v) => '$' + (v / 100).toFixed(2),
};

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
      throw err;
    }
    return data;
  },
  get(path) { return api.req('GET', path); },
  post(path, body) { return api.req('POST', path, body); },
  patch(path, body) { return api.req('PATCH', path, body); },
  del(path) { return api.req('DELETE', path); },
};

function setSession(user, token) {
  store.user = user;
  store.token = token;
  if (token) localStorage.setItem('tuyamika.token', token); else localStorage.removeItem('tuyamika.token');
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
};

function renderNav(activeName) {
  const user = store.user || {};
  const showRetailer = user.role === 'admin' || user.role === 'business_owner';
  const links = store.token
    ? [
        ['registries', 'Registries'],
        ['notifications', 'Notifications'],
        ...(showRetailer ? [['retailer', 'Retailer']] : []),
        ...(user.role === 'admin' ? [['admin', 'Admin']] : []),
      ]
    : [['login', 'Sign in'], ['signup', 'Create account']];
  document.getElementById('nav').replaceChildren(...links.map(([name, text]) => {
    const a = el('a', { href: '#/' + name, text });
    if (name === activeName) a.classList.add('active');
    return a;
  }));
}

async function render() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, ...rest] = hash.split('/');
  const locked = ['registries', 'registry', 'retailer', 'admin', 'notifications'];
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
  if (isSignup) {
    const role = el('select', { name: 'role' },
      el('option', { value: 'customer' }, 'Customer'),
      el('option', { value: 'business_owner' }, 'Retailer / business owner'),
      el('option', { value: 'service_provider' }, 'Service provider'));
    form.append(field('Account type', role));
    form.append(field('Country (ISO code)', textInput('country', 'text', { value: 'ZW', maxlength: 2, minlength: 2 })));
  }
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
        });
      } else {
        const loginValue = fv(form, 'email');
        data = await api.post('/auth/login', {
          ...(loginValue.includes('@') ? { email: loginValue } : { phone: loginValue }),
          password: form.elements.password.value,
        });
      }
      setSession(data.user, data.token);
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
  return el('div', { class: 'card' },
    el('h1', null, isSignup ? 'Create your Tuyamika account' : 'Welcome back'),
    err, form,
    el('p', { class: 'muted' },
      isSignup ? 'Already registered? ' : 'New to Tuyamika? ',
      el('a', { href: isSignup ? '#/login' : '#/signup' }, isSignup ? 'Sign in' : 'Create account')));
}

const registriesView = () => {
  const wrap = el('div');
  const err = banner();
  const list = el('div', { class: 'grid' });
  wrap.append(el('h1', null, 'My registries'), err, list);
  wrap.append(el('h2', null, 'New registry'), createRegistryForm(err, () => render()));

  api.get('/registries')
    .then(({ registries }) => {
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
  wrap.append(
    el('p', null, el('a', { href: '#/registries', class: 'muted' }, '← All registries')),
    err, head,
    el('h2', null, 'Gifts'), itemsBox,
    el('h2', null, 'Add gifts'), addItemForm(id, err, () => load())
  );
  wrap.append(el('p', { class: 'muted' }, 'Free tier: up to 3 registries, 12 gifts per registry.'));

  const load = async () => {
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
  wrap.append(el('h1', null, 'Retailer dashboard'), err, body);

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

function adminView() {
  const wrap = el('div');
  const err = banner();
  const tabs = ['users', 'businesses', 'orders', 'logs'];
  let active = 'users';
  const bar = el('div', { class: 'tabs' });
  const body = el('div');
  wrap.append(el('h1', null, 'Admin console'), err, bar, body);

  const draw = async () => {
    bar.replaceChildren(...tabs.map((t) => el('button', {
      type: 'button',
      class: active === t ? 'active' : '',
      onclick: () => { active = t; draw(); },
    }, t)));
    body.replaceChildren(el('p', { class: 'muted' }, 'Loading…'));
    try {
      if (active === 'users') {
        const { users } = await api.get('/admin/users');
        body.replaceChildren(el('table', null,
          el('thead', null, el('tr', null,
            el('th', null, 'Name'), el('th', null, 'Email'), el('th', null, 'Role'), el('th', null, 'Verified'), el('th', null, 'Joined'))),
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
            el('th', null, 'Name'), el('th', null, 'Type'), el('th', null, 'Status'), el('th', null, 'Set status'))),
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
        const { orders } = await api.get('/admin/orders');
        body.replaceChildren(el('table', null,
          el('thead', null, el('tr', null,
            el('th', null, 'Order'), el('th', null, 'Status'), el('th', null, 'Total'), el('th', null, 'Placed'))),
          el('tbody', null, orders.map((o) => el('tr', null,
            el('td', null, o.id),
            el('td', null, statusBadge(o.status)),
            el('td', { class: 'money' }, store.money(o.total_cents) + ' ' + o.currency),
            el('td', null, fmtDate(o.created_at)))))));
      } else {
        const { logs } = await api.get('/admin/logs');
        body.replaceChildren(el('table', null,
          el('thead', null, el('tr', null,
            el('th', null, 'Action'), el('th', null, 'Entity'), el('th', null, 'Details'), el('th', null, 'Time'))),
          el('tbody', null, logs.map((l) => el('tr', null,
            el('td', null, l.action),
            el('td', null, l.entity + ' ' + l.entity_id),
            el('td', null, l.details),
            el('td', null, fmtDate(l.created_at)))))));
      }
    } catch (e) {
      err.err('Could not load ' + active + ': ' + e.message);
      body.replaceChildren();
    }
  };
  draw();
  return wrap;
}

function notificationsView() {
  const wrap = el('div');
  const err = banner();
  const body = el('div');
  wrap.append(el('h1', null, 'Notifications'), err, body);

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

function boot() {
  const session = document.createElement('div');
  session.id = 'session';
  document.getElementById('topbar').append(session);
  const redrawSession = () => {
    session.replaceChildren(...(store.token && store.user
      ? [el('span', null, store.user.full_name),
         el('button', {
           class: 'ghost small', type: 'button',
           onclick: () => { setSession(null, null); location.hash = '#/login'; render(); },
         }, 'Sign out')]
      : []));
  };
  window.addEventListener('hashchange', () => { redrawSession(); render(); });
  redrawSession();
  render();
}

boot();
