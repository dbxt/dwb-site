/* Bug Manager: an interactive, simulated demo of agentic bug management.
   Everything is generated in the browser: fictional repositories, findings, pull requests, and tickets.
   No network calls and no language model. The same seed always produces the same findings. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- fictional repositories ---------- */
  var REPOS = [
    { name: 'gateway-api', kind: 'be', exposure: 0.95, note: 'Backend service' },
    { name: 'orders-api', kind: 'be', exposure: 0.9, note: 'Backend service' },
    { name: 'payments-service', kind: 'be', exposure: 1.0, note: 'Backend service' },
    { name: 'catalog-service', kind: 'be', exposure: 0.8, note: 'Backend service' },
    { name: 'profile-service', kind: 'be', exposure: 0.7, note: 'Backend service' },
    { name: 'search-indexer', kind: 'be', exposure: 0.5, note: 'Backend worker' },
    { name: 'notifications-worker', kind: 'be', exposure: 0.4, note: 'Backend worker' },
    { name: 'shared-schemas', kind: 'be', exposure: 0.6, note: 'Shared library' },
    { name: 'web-client', kind: 'web', exposure: 0.9, note: 'Web front end' },
    { name: 'admin-portal', kind: 'web', exposure: 0.3, note: 'Internal web app' },
    { name: 'ios-app', kind: 'ios', exposure: 0.9, note: 'Mobile client' },
    { name: 'android-app', kind: 'android', exposure: 0.9, note: 'Mobile client' }
  ];
  var ENTITIES = ['order', 'cart', 'payment', 'profile', 'item', 'session', 'notification', 'price', 'address', 'invoice', 'coupon', 'shipment'];
  var CATS = { consistency: 'Data consistency', failure: 'Failure risk', security: 'Security', smell: 'Code smell' };
  var SEVS = ['fatal', 'high', 'medium', 'low', 'trivial'];
  var SEV_LABEL = { fatal: 'Fatal', high: 'High', medium: 'Medium', low: 'Low', trivial: 'Trivial' };
  var SEV_WEIGHT = { fatal: 100, high: 55, medium: 25, low: 8, trivial: 2 };
  var SEV_WITH_VAR = { fatal: 'var(--sev-fatal)', high: 'var(--sev-high)', medium: 'var(--sev-medium)', low: 'var(--sev-low)', trivial: 'var(--sev-trivial)' };

  /* Template shape: category, severity, weight in the draw, title, why it matters, fix, code by platform. */
  var T = [
    ['consistency', 'fatal', 1, 'Partial write leaves the {e} and the ledger out of sync', 'If the process fails between the two writes, the records disagree and the client shows a state that never happened.', 'Wrap both writes in one transaction, or publish the second write through an outbox.', { ts: 'await db.save({e});\nawait ledger.append(entry); // no transaction', human: true }],
    ['consistency', 'high', 3, '{E} totals rounded differently in two services', 'Two services round the same amount in different ways, so a client can see two different totals for one {e}.', 'Move rounding into one shared helper and use a single rule everywhere.', { ts: 'total = Math.round(sum * 100) / 100;  // service A\ntotal = Math.floor(sum * 100) / 100;  // service B', human: true }],
    ['consistency', 'high', 3, 'Cached {e} is not invalidated after an update', 'Clients keep seeing the old {e} until the cache entry expires.', 'Invalidate on write, or use versioned cache keys.', { ts: 'cache.set(key, {e}, TTL);\n// no cache.delete(key) in update{E}()' }],
    ['consistency', 'medium', 4, 'Enum values differ between the API and the client', 'The API sends one spelling and the client expects another, so records with that value are silently dropped.', 'Generate both sides from the shared schema so the values cannot drift.', { ts: '// API:    status: "CANCELLED"\n// client: if (status === "CANCELED") { ... }', ios: '// API sends "CANCELLED"\ncase canceled = "CANCELED" // never matches', android: '// API sends "CANCELLED"\nCANCELED("CANCELED") // never matches' }],
    ['consistency', 'medium', 4, 'Timestamps stored without a time zone', 'Values compare incorrectly for clients in other regions and around daylight saving changes.', 'Store UTC in ISO-8601 and convert only for display.', { ts: '{e}.createdAt = new Date().toString();' }],
    ['consistency', 'medium', 3, 'Duplicate {e} records possible on retry', 'A client retry after a timeout can create a second {e}, because the request has no idempotency key.', 'Require an idempotency key and return the original result on a repeat.', { ts: 'router.post(\'/{e}s\', create{E}); // no idempotency key' }],
    ['consistency', 'medium', 3, 'Money stored as a floating-point number', 'Floating-point values drift, so sums of many {e} amounts stop matching by a few cents.', 'Store amounts as integers in the smallest currency unit.', { ts: '{e}.price = 19.99; // number, not integer cents', human: true }],
    ['consistency', 'high', 2, 'Renamed field is still read under its old name', 'Newer records use the new field, so the old name returns nothing and the client shows a blank value.', 'Read the new name and fall back to the old one until the migration is complete.', { ts: 'const label = {e}.displayName; // schema now sends {e}.title', ios: 'let label = {e}.displayName // schema now sends title', android: 'val label = {e}.displayName // schema now sends title' }],
    ['consistency', 'low', 3, 'Empty list returned as null in some responses', 'Clients that expect an array must handle two shapes for the same field.', 'Always return an empty list, never null.', { ts: 'return { items: found ? found : null };' }],
    ['consistency', 'trivial', 2, 'Mixed date formats in log output', 'Searching logs for one incident is harder when dates use different formats.', 'Log every timestamp in one format.', { ts: 'log(`{e} saved at ${d.toLocaleString()}`);' }],
    ['failure', 'fatal', 1, 'Unhandled exception in the startup path', 'A malformed setting stops the service from starting, and every request fails until it is fixed.', 'Validate the configuration at startup and fall back to safe defaults or a clear error.', { ts: 'const cfg = JSON.parse(process.env.CONFIG);' }],
    ['failure', 'high', 4, 'Possible null dereference on {e}.profile', 'When the profile is missing, this line throws and the request fails for the client.', 'Check for a missing profile and return a sensible default.', { ts: 'const name = {e}.profile.displayName;', ios: 'let name = {e}.profile!.displayName', android: 'val name = {e}.profile!!.displayName' }],
    ['failure', 'high', 3, 'First element read without a length check', 'An empty list makes this line throw, and the client gets an error instead of an empty state.', 'Check the length first, or use a safe accessor.', { ts: 'const firstId = {e}s[0].id;' }],
    ['failure', 'high', 2, 'Retry loop with no limit', 'When a dependency is down, the loop never ends and the caller never gets an answer.', 'Cap the retries and back off between attempts.', { ts: 'while (!ok) { ok = await callDownstream(); }' }],
    ['failure', 'medium', 4, 'Outbound call has no timeout', 'A slow dependency ties up a worker until the whole service slows down.', 'Set a timeout on every outbound call.', { ts: 'const res = await http.get(url); // no timeout' }],
    ['failure', 'medium', 3, 'Division by zero when the quantity is 0', 'The average becomes infinite or NaN and is shown to the client.', 'Guard the divisor and return zero for an empty set.', { ts: 'const avg = total / count;', ios: 'let avg = total / count', android: 'val avg = total / count' }],
    ['failure', 'medium', 3, 'Rejected promise is never handled', 'A failed request leaves the screen stuck on a spinner with no message.', 'Handle the error and show a message with a retry.', { ts: 'fetchPrices().then(render); // no catch', only: ['web'] }],
    ['failure', 'low', 3, 'Empty catch block hides errors', 'Failures disappear silently, so the first sign of trouble is a client complaint.', 'Log the error and decide whether to retry or surface it.', { ts: 'try { sync{E}(); } catch (err) { }', ios: 'do { try sync{E}() } catch { }', android: 'try { sync{E}() } catch (e: Exception) { }' }],
    ['security', 'fatal', 1, 'Secret committed to the repository', 'Anyone with read access to the code can use the credential.', 'Revoke and rotate the secret, and load it from a secret store.', { ts: 'const API_KEY = "EXAMPLE-KEY-NOT-REAL";', only: ['be', 'web'] }],
    ['security', 'high', 2, 'Query built from user input', 'A crafted value can change the query and expose or modify data.', 'Use parameterized queries.', { ts: 'db.query("SELECT * FROM {e}s WHERE id = " + req.params.id);', only: ['be'] }],
    ['security', 'high', 2, 'Missing authorization check on the {e} endpoint', 'Any signed-in user can read another user\'s {e} by changing the id.', 'Check that the caller owns the {e} before returning it.', { ts: "router.get('/{e}s/:id', handler); // no ownership check", only: ['be'], human: true }],
    ['security', 'medium', 3, 'User input rendered without escaping', 'A crafted {e} note can run script in another user\'s browser.', 'Escape output or use the framework\'s safe rendering.', { ts: 'el.innerHTML = {e}.note;', only: ['web'] }],
    ['security', 'medium', 2, 'Error response includes a stack trace', 'The trace reveals internal paths and library versions to anyone who triggers an error.', 'Return a generic message and log the detail privately.', { ts: 'res.status(500).send(err.stack);', only: ['be'] }],
    ['security', 'medium', 2, 'Session token stored in plain local storage', 'Other scripts on the page, or another app on the device, can read the token.', 'Use secure, platform-provided storage for tokens.', { ts: 'localStorage.setItem("token", token);', ios: 'UserDefaults.standard.set(token, forKey: "token")', android: 'prefs.edit().putString("token", token).apply()' }],
    ['security', 'low', 2, 'Dependency with a known advisory', 'A published vulnerability affects a library that this code still uses.', 'Upgrade to the fixed version and rerun the tests.', { ts: '"http-lib": "2.1.0" // advisory fixed in 2.1.9' }],
    ['smell', 'low', 3, 'Function over 300 lines', 'Hard to read, hard to test, and easy to break when the next change lands.', 'Split it into small functions with clear names.', { ts: 'function process{E}(input) { /* 312 lines */ }', ios: 'func process{E}(_ input: Input) { /* 312 lines */ }', android: 'fun process{E}(input: Input) { /* 312 lines */ }' }],
    ['smell', 'low', 3, 'Validation logic duplicated in three places', 'The copies drift apart, so the same {e} is accepted in one place and rejected in another.', 'Extract one validator and reuse it.', { ts: '// same 20-line check in create{E}, update{E}, import{E}' }],
    ['smell', 'low', 2, 'Deeply nested conditions', 'Many levels of nesting make the branches hard to test.', 'Return early and flatten the logic.', { ts: 'if (a) { if (b) { if (c) { if (d) { /* ... */ } } } }' }],
    ['smell', 'trivial', 3, 'Dead code left after a refactor', 'Unused code confuses readers and hides real dependencies.', 'Delete it; version control keeps the history.', { ts: 'function legacy{E}Mapper() { /* no callers */ }', ios: 'func legacy{E}Mapper() { /* no callers */ }', android: 'fun legacy{E}Mapper() { /* no callers */ }' }],
    ['smell', 'trivial', 3, 'Magic numbers in the pricing logic', 'Unexplained constants are easy to change by mistake.', 'Name the constants and document where they come from.', { ts: 'const fee = amount * 0.0295 + 0.3;', ios: 'let fee = amount * 0.0295 + 0.3', android: 'val fee = amount * 0.0295 + 0.3' }],
    ['smell', 'trivial', 2, 'Commented-out block left in place', 'It is unclear whether the code is meant to return.', 'Remove it, or restore it and add a test.', { ts: '// if (legacy{E}Mode) { return old{E}Path(); }' }],
    ['smell', 'trivial', 2, 'Inconsistent naming for the same concept', 'One concept has three names across the code base.', 'Pick one name and rename the rest.', { ts: 'const cust = ..., client = ..., account = ...; // same thing' }]
  ];

  var MULT = { fatal: 0.6, high: 0.45, medium: 1.2, low: 1.35, trivial: 1.1 }; // keeps fatal and high findings the minority
  var TARGET = { consistency: 59, failure: 50, security: 19, smell: 28 }; // 156 findings in total
  var SUFFIX = { be: ['Service', 'Repository', 'Handler', 'Mapper'], web: ['Panel', 'View', 'Form', 'Store'], ios: ['ViewModel', 'Loader', 'Cell'], android: ['Repository', 'ViewModel', 'Adapter'] };

  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fill(s, e) { return s.replace(/\{E\}/g, capital(e)).replace(/\{e\}/g, e); }
  function repoKey(k) { return (k === 'be' || k === 'web') ? 'ts' : k; }
  function eligible(t, repo) {
    var code = t[6];
    if (t[6].only && t[6].only.indexOf(repo.kind) < 0) return false;
    if (repo.kind === 'ios' || repo.kind === 'android') return !!code[repo.kind];
    return !!code.ts;
  }

  function generate() {
    var r = rng(20260919), r2 = rng(4242), out = [];
    Object.keys(TARGET).forEach(function (cat) {
      var pool = T.filter(function (t) { return t[0] === cat; });
      for (var n = 0; n < TARGET[cat]; n++) {
        var repo = REPOS[Math.floor(r() * REPOS.length)];
        var options = pool.filter(function (t) { return eligible(t, repo); });
        if (!options.length) { n--; continue; }
        var wt = function (x) { return x[2] * MULT[x[1]]; };
        var total = options.reduce(function (a, x) { return a + wt(x); }, 0), pick = r() * total, t = options[0];
        for (var i = 0; i < options.length; i++) { pick -= wt(options[i]); if (pick <= 0) { t = options[i]; break; } }
        var e = ENTITIES[Math.floor(r() * ENTITIES.length)];
        var line = 8 + Math.floor(r() * 410), conf = 0.55 + r() * 0.43;
        var sfx = SUFFIX[repo.kind][Math.floor(r() * SUFFIX[repo.kind].length)];
        var path = repo.kind === 'be' ? 'src/' + e + 's/' + capital(e) + sfx + '.ts'
          : repo.kind === 'web' ? 'src/components/' + capital(e) + sfx + '.tsx'
          : repo.kind === 'ios' ? 'Sources/' + capital(e) + sfx + '.swift'
          : 'app/src/main/kotlin/' + capital(e) + sfx + '.kt';
        out.push({
          cat: t[0], sev: t[1], title: fill(t[3], e), why: fill(t[4], e), fix: fill(t[5], e),
          code: fill(t[6][repoKey(repo.kind)], e), repo: repo, file: path + ':' + line, conf: conf,
          score: Math.round(SEV_WEIGHT[t[1]] * (1 + repo.exposure) * (0.6 + 0.4 * conf)), status: 'Open',
          human: !!t[6].human
        });
        var f = out[out.length - 1];
        var files = 1 + Math.floor(r2() * 3), add = 4 + Math.floor(r2() * 38), del = 1 + Math.floor(r2() * 14), num = 2000 + Math.floor(r2() * 900);
        f.pr = (!f.human && conf >= 0.62) ? { num: num, files: files, add: add, del: del } : null;
      }
    });
    out.sort(function (a, b) { return b.score - a.score || (a.title < b.title ? -1 : 1); });
    var used = {};
    out.forEach(function (f, i) { f.rank = i + 1; f.id = 'DEMO-' + (1001 + i); if (f.pr) { while (used[f.pr.num]) f.pr.num++; used[f.pr.num] = 1; } });
    return out;
  }

  /* ---------- state ---------- */
  var STAGES = ['Scan', 'Classify', 'Rank', 'Log to Jira', 'Fix and open PR', 'Review and burn down'];
  var S = { findings: [], ready: false, scanning: false, scanIdx: -1, scanned: {}, done: 0, active: 0,
            sev: {}, cat: '', status: '', repo: '', q: '', shown: 25, tab: 'findings', openId: null,
            cap: 45, day: 0, started: false, playing: false, timer: null, lastFocus: null };

  function baseStatus(f) { return f.pr ? 'PR open' : 'Needs engineer'; }
  function isClosed(f) { return f.status === 'Merged' || f.status === 'Fixed'; }
  function widths(root) { $$('[data-w]', root).forEach(function (e) { e.style.width = e.dataset.w + '%'; }); }
  function pct(n, d) { return d ? (n / d * 100) : 0; }
  function totals() {
    var t = { total: 0, remaining: 0, closed: 0, merged: 0, byEng: 0, prOpen: 0, human: 0 };
    S.findings.forEach(function (f) {
      t.total += f.score;
      if (isClosed(f)) { t.closed++; if (f.status === 'Merged') t.merged++; else t.byEng++; }
      else { t.remaining += f.score; if (f.status === 'PR open') t.prOpen++; else t.human++; }
    });
    return t;
  }
  function sevCounts(list) { var c = {}; SEVS.forEach(function (s) { c[s] = 0; }); list.forEach(function (f) { c[f.sev]++; }); return c; }
  function sevBar(counts, total) { return SEVS.map(function (s) { return '<i class="seg s-' + s + '" data-w="' + pct(counts[s], total).toFixed(2) + '" title="' + SEV_LABEL[s] + ': ' + counts[s] + '"></i>'; }).join(''); }
  function sevTag(sev) { return '<span class="sev s-' + sev + '"><i class="dot s-' + sev + '"></i>' + SEV_LABEL[sev] + '</span>'; }
  function pill(status) { var cls = { 'PR open': 'pill-open', 'Needs engineer': 'pill-human', 'Merged': 'pill-merged', 'Fixed': 'pill-fixed' }[status]; return '<span class="pill ' + cls + '">' + status + '</span>'; }

  /* ---------- rendering ---------- */
  function renderStages() {
    $('#stages').innerHTML = STAGES.map(function (n, i) {
      var k = i + 1, cls = k <= S.done ? 'done' : (k === S.active ? 'active' : '');
      return '<li class="' + cls + '"><span class="n">' + (k <= S.done ? '✓' : k) + '</span>' + esc(n) + '</li>';
    }).join('');
  }

  function renderSummary() {
    var dash = '<div class="big">—</div><p class="sub">Run a scan to begin</p>';
    if (!S.ready) {
      $('#card-findings').innerHTML = '<h2>Findings</h2>' + dash;
      $('#card-prs').innerHTML = '<h2>Pull requests</h2>' + dash;
      $('#card-risk').innerHTML = '<h2>Risk remaining</h2>' + dash;
      return;
    }
    var c = sevCounts(S.findings), n = S.findings.length, t = totals();
    $('#card-findings').innerHTML = '<h2>Findings</h2><div class="big">' + n + '<small>across ' + REPOS.length + ' repositories</small></div>' +
      '<div class="sevbar" role="img" aria-label="Findings by severity">' + sevBar(c, n) + '</div>' +
      '<ul class="legend">' + SEVS.map(function (s) { return '<li><i class="dot s-' + s + '"></i>' + SEV_LABEL[s] + ' ' + c[s] + '</li>'; }).join('') + '</ul>';
    $('#card-prs').innerHTML = '<h2>Pull requests</h2><div class="big">' + t.prOpen + '<small>open for review</small></div>' +
      '<p class="sub"><b>' + t.human + '</b> need an engineer · <b>' + t.merged + '</b> merged</p>' +
      '<p class="sub">The agent opened <b>' + S.findings.filter(function (f) { return f.pr; }).length + '</b> pull requests in total.</p>';
    var rem = pct(t.remaining, t.total);
    $('#card-risk').innerHTML = '<h2>Risk remaining</h2><div class="big">' + Math.round(rem) + '%</div>' +
      '<div class="sevbar" role="img" aria-label="Risk remaining"><i class="seg acc" data-w="' + rem.toFixed(1) + '"></i></div>' +
      '<p class="sub"><b>' + t.closed + '</b> of ' + n + ' findings closed</p>';
    widths($('.summary'));
  }

  function repoStats() {
    var m = {};
    S.findings.forEach(function (f) { var r = f.repo.name; if (!m[r]) m[r] = { n: 0, sev: {} }; m[r].n++; m[r].sev[f.sev] = (m[r].sev[f.sev] || 0) + 1; });
    return m;
  }
  function renderRepos() {
    var m = repoStats(), total = S.findings.length;
    var items = ['<li><button type="button" class="repo" data-repo="" aria-pressed="' + (S.repo === '') + '"><span class="top"><span class="name">All repositories</span><span class="count">' + (S.ready ? total : '—') + '</span></span><span class="kind">' + REPOS.length + ' repositories</span></button></li>'];
    REPOS.forEach(function (r, i) {
      var known = S.ready || S.scanned[r.name], st = m[r.name] || { n: 0, sev: {} };
      var cls = 'repo' + (S.scanning && S.scanIdx === i ? ' scanning' : '') + (S.scanning && !S.scanned[r.name] && S.scanIdx !== i ? ' pending' : '');
      items.push('<li><button type="button" class="' + cls + '" data-repo="' + esc(r.name) + '" aria-pressed="' + (S.repo === r.name) + '"><span class="top"><span class="name">' + esc(r.name) + '</span><span class="count">' + (known ? st.n : (S.scanning && S.scanIdx === i ? '…' : '')) + '</span></span><span class="kind">' + esc(r.note) + '</span>' +
        (known ? '<span class="sevbar">' + sevBar(st.sev, st.n || 1) + '</span>' : '') + '</button></li>');
    });
    $('#repos').innerHTML = items.join(''); widths($('#repos'));
  }

  function filtered() {
    var any = SEVS.some(function (s) { return S.sev[s]; });
    return S.findings.filter(function (f) {
      if (any && !S.sev[f.sev]) return false;
      if (S.cat && f.cat !== S.cat) return false;
      if (S.repo && f.repo.name !== S.repo) return false;
      if (S.status === 'pr' && f.status !== 'PR open') return false;
      if (S.status === 'human' && f.status !== 'Needs engineer') return false;
      if (S.status === 'closed' && !isClosed(f)) return false;
      if (S.q && (f.title + ' ' + f.repo.name + ' ' + f.id).toLowerCase().indexOf(S.q) < 0) return false;
      return true;
    });
  }
  function renderChips() {
    var c = sevCounts(S.findings);
    $('#sev-chips').innerHTML = SEVS.map(function (s) { return '<button type="button" class="chip" data-sev="' + s + '" aria-pressed="' + !!S.sev[s] + '"><i class="dot s-' + s + '"></i>' + SEV_LABEL[s] + (S.ready ? ' ' + c[s] : '') + '</button>'; }).join('');
  }
  function renderTable() {
    var wrap = $('#table-wrap'), more = $('#more');
    more.hidden = true;
    if (S.scanning) { wrap.innerHTML = '<div class="empty"><b>Scanning repositories…</b>Agents are reading the code and classifying what they find.</div>'; $('#count').textContent = ''; return; }
    if (!S.ready) { wrap.innerHTML = '<div class="empty"><b>No scan yet</b>Run a scan to see the ranked findings.</div>'; $('#count').textContent = ''; return; }
    var list = filtered(), part = list.slice(0, S.shown);
    $('#count').textContent = 'Showing ' + part.length + ' of ' + list.length + ' matching findings (' + S.findings.length + ' in total), ranked by risk.';
    if (!list.length) { wrap.innerHTML = '<div class="empty"><b>No findings match</b>Try clearing a filter.</div>'; return; }
    wrap.innerHTML = '<table class="findings"><thead><tr><th scope="col">Rank</th><th scope="col">Severity</th><th scope="col">Finding</th><th scope="col" class="col-cat">Category</th><th scope="col" class="col-status">Status</th></tr></thead><tbody>' +
      part.map(function (f) {
        return '<tr data-id="' + f.id + '" class="' + (isClosed(f) ? 'closed' : '') + '"><td class="rank">#' + f.rank + '</td><td>' + sevTag(f.sev) + '</td>' +
          '<td><button type="button" class="title-btn" data-id="' + f.id + '">' + esc(f.title) + '</button><span class="meta">' + esc(f.repo.name) + ' · ' + f.id + (f.pr ? ' · PR #' + f.pr.num : '') + '</span></td>' +
          '<td class="col-cat">' + CATS[f.cat] + '</td><td class="col-status">' + pill(f.status) + '</td></tr>';
      }).join('') + '</tbody></table>';
    if (list.length > S.shown) { more.hidden = false; more.textContent = 'Show ' + Math.min(25, list.length - S.shown) + ' more'; }
  }

  function ticketText(f) {
    return 'Summary:   [' + SEV_LABEL[f.sev] + '] ' + f.title + '\nProject:   ' + f.repo.name + '\nLabels:    agent-found, ' + f.cat + '\nLocation:  ' + f.file + '\n' +
      'Pull req:  ' + (f.pr ? 'https://git.example.com/' + f.repo.name + '/pull/' + f.pr.num : 'none (needs an engineer)') + '\n\nWhy it matters\n' + f.why + '\n\nSuggested fix\n' + f.fix;
  }
  function renderDrawer() {
    var f = S.findings.filter(function (x) { return x.id === S.openId; })[0], d = $('#drawer');
    if (!f) return;
    var prHtml;
    if (f.pr) {
      prHtml = '<div class="pr-card"><div class="head"><span>PR #' + f.pr.num + '</span><span class="diffstat"><span class="add">+' + f.pr.add + '</span> <span class="del">−' + f.pr.del + '</span> · ' + f.pr.files + (f.pr.files === 1 ? ' file' : ' files') + '</span></div>' +
        '<p>“Fix: ' + esc(f.title) + '”. Opened by the agent with the proposed fix and a link back to this ticket. ' + (f.status === 'Merged' ? '<b>Reviewed and merged.</b>' : 'Waiting for an engineer to review it.') + '</p></div>';
    } else {
      prHtml = '<div class="pr-card"><div class="head"><span>No pull request</span></div><p>' + (f.status === 'Fixed' ? 'An engineer fixed this one during the sprint. ' : '') +
        (f.human ? 'The fix needs a design decision, so the agent flagged it for an engineer.' : 'The agent’s confidence (' + Math.round(f.conf * 100) + '%) was too low to propose a fix, so it flagged the finding for an engineer.') + '</p></div>';
    }
    d.innerHTML = '<header><div>' + sevTag(f.sev) + ' <span class="meta">' + f.id + ' · ' + esc(f.repo.name) + '</span><h2 id="drawer-title">' + esc(f.title) + '</h2></div><button type="button" class="btn btn-sm btn-ghost" id="drawer-close">Close</button></header>' +
      '<div class="body"><h3>Details</h3><dl class="kv"><dt>File</dt><dd><code>' + esc(f.file) + '</code></dd><dt>Category</dt><dd>' + CATS[f.cat] + '</dd><dt>Status</dt><dd>' + pill(f.status) + '</dd><dt>Rank</dt><dd>#' + f.rank + ' of ' + S.findings.length + '</dd></dl>' +
      '<h3>Code</h3><pre><code>' + esc(f.code) + '</code></pre>' +
      '<h3>Why it matters</h3><p>' + esc(f.why) + '</p><h3>Suggested fix</h3><p>' + esc(f.fix) + '</p>' +
      '<h3>Pull request</h3>' + prHtml +
      '<h3>Ticket as logged</h3><pre><code>' + esc(ticketText(f)) + '</code></pre>' +
      '<h3>How it was ranked</h3><p>Risk score <b>' + f.score + '</b> = severity weight ' + SEV_WEIGHT[f.sev] + ' × client exposure (1 + ' + f.repo.exposure.toFixed(2) + ') × the agent’s confidence (' + Math.round(f.conf * 100) + '%).</p></div>';
  }
  function openFinding(id) {
    S.openId = id; S.lastFocus = document.activeElement; renderDrawer();
    $('#backdrop').hidden = false; $('#drawer').hidden = false; $('#drawer').scrollTop = 0; $('#drawer-close').focus();
  }
  function closeDrawer() {
    if ($('#drawer').hidden) return;
    $('#drawer').hidden = true; $('#backdrop').hidden = true; S.openId = null;
    if (S.lastFocus && document.contains(S.lastFocus)) S.lastFocus.focus();
  }

  /* ---------- burn-down ---------- */
  function riskAt(k) {
    var total = 0, removed = 0; S.findings.forEach(function (f, i) { total += f.score; if (i < k) removed += f.score; });
    return { total: total, ranked: total - removed, random: total * (1 - k / S.findings.length) };
  }
  function renderChart() {
    var W = 640, H = 260, L = 46, R = 26, T = 14, B = 34, pw = W - L - R, ph = H - T - B, el = $('#chart');
    if (!S.findings.length) { el.innerHTML = ''; return; }
    var total = riskAt(0).total, x = function (d) { return L + d / 10 * pw; }, y = function (v) { return T + (1 - v / total) * ph; }, g = '', i;
    for (i = 0; i <= 4; i++) { var v = total * i / 4; g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (i * 25) + '%</text>'; }
    for (i = 0; i <= 10; i += 2) g += '<text x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="' + (i === 10 ? 'end' : (i === 0 ? 'start' : 'middle')) + '">Day ' + i + '</text>';
    var rk = [], rd = [];
    if (S.started) for (i = 0; i <= S.day; i++) { var r = riskAt(Math.floor(S.cap * i / 10)); rk.push(x(i) + ',' + y(r.ranked)); rd.push(x(i) + ',' + y(r.random)); }
    el.innerHTML = g + (S.started ? '<polyline class="random" points="' + rd.join(' ') + '"/><polyline class="ranked" points="' + rk.join(' ') + '"/>' : '');
  }
  function renderBurn() {
    renderChart();
    var box = $('#burn-stats');
    if (!S.ready || !S.started) { box.innerHTML = '<div class="empty"><b>The sprint has not started</b>Choose how many findings the team can close, then play the sprint.</div>'; return; }
    var t = totals(), k = t.closed, r = riskAt(k), n = S.findings.length;
    var hard = S.findings.filter(function (f) { return (f.sev === 'fatal' || f.sev === 'high') && !isClosed(f); }).length;
    box.innerHTML = '<div class="stat"><b>' + k + ' of ' + n + '</b><span>findings closed by day ' + S.day + '</span></div>' +
      '<div class="stat"><b>' + t.merged + ' / ' + t.byEng + '</b><span>agent PRs merged / fixed by an engineer</span></div>' +
      '<div class="stat"><b>' + Math.round((1 - r.ranked / r.total) * 100) + '%</b><span>risk removed, versus about ' + Math.round((1 - r.random / r.total) * 100) + '% in no particular order</span></div>' +
      '<div class="stat"><b>' + hard + '</b><span>fatal or high findings still open</span></div>';
  }
  function renderSprintCard() {
    $('#sprint-day').innerHTML = 'Day ' + S.day + '<small>of 10</small>';
    $('#cap-val').textContent = S.cap; $('#cap').value = S.cap; $('#cap').disabled = S.playing || S.scanning;
    $('#play').disabled = !S.ready || S.playing || S.scanning; $('#play').textContent = S.playing ? 'Playing…' : (S.started && S.day >= 10 ? 'Replay sprint' : 'Play sprint');
    $('#reset-sprint').disabled = !S.ready || S.playing || S.scanning || !S.started;
  }
  function setDay(day) {
    var k = Math.floor(S.cap * day / 10); S.day = day;
    S.findings.forEach(function (f, i) { f.status = i < k ? (f.pr ? 'Merged' : 'Fixed') : baseStatus(f); });
    renderAll();
  }
  function stopSprint() { if (S.timer) { clearTimeout(S.timer); S.timer = null; } S.playing = false; }
  function resetSprint() { stopSprint(); S.started = false; S.day = 0; S.findings.forEach(function (f) { f.status = baseStatus(f); }); S.done = 5; S.active = 6; renderAll(); }
  function playSprint() {
    if (!S.ready || S.playing) return;
    stopSprint(); S.started = true; S.playing = true; S.done = 5; S.active = 6; selectTab('burn');
    (function tick(d) {
      setDay(d);
      if (d >= 10) { S.playing = false; S.timer = null; S.done = 6; S.active = 0; renderAll(); return; }
      S.timer = setTimeout(function () { tick(d + 1); }, reduce ? 0 : 420);
    })(0);
  }

  /* ---------- scan ---------- */
  async function runScan() {
    if (S.scanning) return;
    closeDrawer(); stopSprint();
    S.scanning = true; S.ready = false; S.scanIdx = -1; S.scanned = {}; S.findings = generate();
    S.started = false; S.day = 0; S.repo = ''; S.shown = 25; S.done = 0; S.active = 1; selectTab('findings');
    $('#scan').disabled = true; $('#scan-label').textContent = 'Scanning…'; renderAll();
    for (var i = 0; i < REPOS.length; i++) { S.scanIdx = i; renderRepos(); await wait(260); S.scanned[REPOS[i].name] = true; renderRepos(); }
    for (var st = 1; st <= 4; st++) { S.done = st; S.active = st + 1; renderStages(); await wait(340); }
    S.findings.forEach(function (f) { f.status = baseStatus(f); });
    S.done = 5; S.active = 6; S.scanning = false; S.ready = true; S.scanIdx = -1;
    $('#scan').disabled = false; $('#scan-label').textContent = 'Run scan'; renderAll();
  }

  /* ---------- tabs, theme, wiring ---------- */
  function selectTab(name) {
    S.tab = name;
    ['findings', 'burn'].forEach(function (k) {
      var on = k === name; $('#tab-' + k).setAttribute('aria-selected', on); $('#tab-' + k).tabIndex = on ? 0 : -1; $('#pane-' + k).hidden = !on;
    });
    if (name === 'burn') renderBurn();
  }
  var SUN = '<circle cx="8" cy="8" r="3" fill="currentColor"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
  var MOON = '<path d="M13.5 9.6A6 6 0 1 1 6.4 2.5a5 5 0 0 0 7.1 7.1z" fill="currentColor"/>';
  function applyTheme(t, save) {
    document.documentElement.setAttribute('data-theme', t);
    if (save) { try { localStorage.setItem('bm-theme', t); } catch (e) { /* storage unavailable */ } }
    $('#theme-label').textContent = t === 'dark' ? 'Light' : 'Dark';
    $('#theme').setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' theme');
    $('#theme-icon').innerHTML = t === 'dark' ? SUN : MOON;
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'dark' ? '#0c1118' : '#f2f4f8');
  }
  function renderAll() { renderStages(); renderSummary(); renderRepos(); renderChips(); renderTable(); renderSprintCard(); if (S.tab === 'burn') renderBurn(); if (S.openId) renderDrawer(); }

  function fillCategories() { var c = $('#f-cat'); Object.keys(CATS).forEach(function (k) { c.add(new Option(CATS[k], k)); }); }

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light', false);
    fillCategories();
    S.findings = generate(); S.findings.forEach(function (f) { f.status = baseStatus(f); });
    S.ready = true; S.done = 5; S.active = 6; renderAll();

    $('#scan').addEventListener('click', runScan);
    $('#theme').addEventListener('click', function () { applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true); });
    $('#about-btn').addEventListener('click', function () { $('#about').showModal(); });
    $('#about-close').addEventListener('click', function () { $('#about').close(); });
    $('#about').addEventListener('click', function (e) { if (e.target === $('#about')) $('#about').close(); });

    $('#sev-chips').addEventListener('click', function (e) { var b = e.target.closest('[data-sev]'); if (!b) return; S.sev[b.dataset.sev] = !S.sev[b.dataset.sev]; S.shown = 25; renderChips(); renderTable(); });
    $('#f-cat').addEventListener('change', function (e) { S.cat = e.target.value; S.shown = 25; renderTable(); });
    $('#f-status').addEventListener('change', function (e) { S.status = e.target.value; S.shown = 25; renderTable(); });
    $('#f-q').addEventListener('input', function (e) { S.q = e.target.value.trim().toLowerCase(); S.shown = 25; renderTable(); });
    $('#more').addEventListener('click', function () { S.shown += 25; renderTable(); });
    $('#repos').addEventListener('click', function (e) { var b = e.target.closest('[data-repo]'); if (!b || S.scanning) return; S.repo = (S.repo === b.dataset.repo) ? '' : b.dataset.repo; S.shown = 25; selectTab('findings'); renderRepos(); renderTable(); });
    $('#table-wrap').addEventListener('click', function (e) { var r = e.target.closest('tr[data-id]'); if (r) openFinding(r.dataset.id); });

    $('#backdrop').addEventListener('click', closeDrawer);
    $('#drawer').addEventListener('click', function (e) { if (e.target.closest('#drawer-close')) closeDrawer(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
      if (e.key === 'Tab' && !$('#drawer').hidden) {
        var f = $$('button, [href], input, select, [tabindex]:not([tabindex="-1"])', $('#drawer')).filter(function (x) { return !x.disabled; });
        if (!f.length) return; var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    $$('.tab').forEach(function (t) { t.addEventListener('click', function () { selectTab(t.id === 'tab-burn' ? 'burn' : 'findings'); }); });
    $('.tabs').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var to = S.tab === 'findings' ? 'burn' : 'findings'; selectTab(to); $('#tab-' + to).focus();
    });
    $('#cap').addEventListener('input', function (e) { S.cap = +e.target.value; $('#cap-val').textContent = S.cap; if (S.started && !S.playing) { resetSprint(); } });
    $('#play').addEventListener('click', playSprint);
    $('#reset-sprint').addEventListener('click', resetSprint);
  });

  window.__bugManager = { generate: generate };
})();
