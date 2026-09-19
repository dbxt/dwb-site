/* Bug manager demo. Everything here is simulated: fictional repositories, generated findings,
   no network calls, and no language model. The same seed always produces the same findings. */
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
  function baseStatus(f) { return f.pr ? 'PR open' : 'Needs engineer'; }
  var FINDINGS = [], scanned = false, filters = { sev: {}, cat: '', repo: '', status: '', q: '' }, shown = 20, expanded = {};
  var sprintTimer = null;
  function setAreas(show) {
    ['findings', 'burn'].forEach(function (k) { $('#' + k + '-area').hidden = !show; $('#' + k + '-empty').hidden = show; });
  }

  /* ---------- pipeline stage indicators ---------- */
  function stage(n, state) {
    var li = $('#stage-' + n); if (!li) return;
    li.classList.remove('done', 'active'); if (state) li.classList.add(state);
  }

  /* ---------- scan ---------- */
  function renderRepos() {
    $('#repos').innerHTML = REPOS.map(function (r, i) {
      return '<li id="repo-' + i + '"><b>' + esc(r.name) + '</b><span>' + esc(r.note) + '</span></li>';
    }).join('');
  }
  async function runScan() {
    var btn = $('#scan'); btn.disabled = true; $('#reset').disabled = true;
    FINDINGS = generate(); scanned = false; expanded = {}; shown = 20;
    setAreas(false);
    $('#log').innerHTML = ''; $('#bar').style.width = '0';
    renderRepos(); [1, 2, 3, 4, 5, 6].forEach(function (n) { stage(n); }); stage(1, 'active');
    var counts = {};
    FINDINGS.forEach(function (f) { counts[f.repo.name] = (counts[f.repo.name] || 0) + 1; });
    var running = 0;
    for (var i = 0; i < REPOS.length; i++) {
      var li = $('#repo-' + i); li.classList.add('scanning');
      await wait(260);
      var n = counts[REPOS[i].name] || 0; running += n;
      li.classList.remove('scanning'); li.classList.add('scanned');
      li.querySelector('span').textContent = n + ' findings';
      var row = document.createElement('li'); row.innerHTML = 'Scanned <b>' + esc(REPOS[i].name) + '</b>: ' + n + ' findings';
      $('#log').appendChild(row); $('#log').scrollTop = 9999;
      $('#bar').style.width = Math.round((i + 1) / REPOS.length * 100) + '%';
    }
    stage(1, 'done'); stage(2, 'active'); await wait(350);
    stage(2, 'done'); stage(3, 'active'); await wait(350);
    stage(3, 'done'); stage(4, 'active'); await wait(350);
    FINDINGS.forEach(function (f) { f.status = 'Logged'; });
    stage(4, 'done'); stage(5, 'active'); await wait(450);
    FINDINGS.forEach(function (f) { f.status = baseStatus(f); });
    var prs = FINDINGS.filter(function (f) { return f.pr; }).length;
    stage(5, 'done'); stage(6, 'active');
    var live = document.createElement('li'); live.innerHTML = '<b>Done.</b> ' + FINDINGS.length + ' findings classified, ranked, and logged as tickets. ' + prs + ' pull requests opened; ' + (FINDINGS.length - prs) + ' need an engineer.';
    $('#log').appendChild(live); $('#log').scrollTop = 9999;
    scanned = true; resetSprint(true); renderAll();
    setAreas(true);
    btn.textContent = 'Scan again'; btn.disabled = false; $('#reset').disabled = false;
  }

  /* ---------- summary ---------- */
  function renderSummary() {
    var by = {}; SEVS.forEach(function (s) { by[s] = 0; });
    FINDINGS.forEach(function (f) { by[f.sev]++; });
    var total = FINDINGS.length;
    var open = FINDINGS.filter(function (f) { return f.status !== 'Fixed'; }).length;
    $('#kpis').innerHTML =
      '<div class="kpi"><b>' + total + '</b><span>findings</span></div>' +
      '<div class="kpi"><b>' + FINDINGS.filter(function (f) { return f.status === 'PR open'; }).length + '</b><span>pull requests open</span></div>' +
      '<div class="kpi"><b>' + FINDINGS.filter(function (f) { return f.status === 'Needs engineer'; }).length + '</b><span>need an engineer</span></div>' +
      '<div class="kpi"><b>' + (total - open) + '</b><span>closed this sprint</span></div>';
    $('#sevbar').innerHTML = SEVS.map(function (s) { return '<i class="s-' + s + '" style="width:' + (by[s] / total * 100) + '%" title="' + SEV_LABEL[s] + ': ' + by[s] + '"></i>'; }).join('');
    $('#legend').innerHTML = SEVS.map(function (s) { return '<li><span class="dot s-' + s + '"></span>' + SEV_LABEL[s] + ' ' + by[s] + '</li>'; }).join('');
  }

  /* ---------- filters and table ---------- */
  function ticketText(f) {
    return 'Summary:   [' + SEV_LABEL[f.sev] + '] ' + f.title + '\n' +
      'Project:   ' + f.repo.name + '\n' +
      'Labels:    agent-found, ' + f.cat + '\n' +
      'Location:  ' + f.file + '\n' +
      'Pull req:  ' + (f.pr ? 'https://git.example.com/' + f.repo.name + '/pull/' + f.pr.num : 'none (needs an engineer)') + '\n\n' +
      'Why it matters\n' + f.why + '\n\n' +
      'Suggested fix\n' + f.fix;
  }
  function visible() {
    return FINDINGS.filter(function (f) {
      var anySev = SEVS.some(function (s) { return filters.sev[s]; });
      if (anySev && !filters.sev[f.sev]) return false;
      if (filters.cat && f.cat !== filters.cat) return false;
      if (filters.repo && f.repo.name !== filters.repo) return false;
      if (filters.status === 'pr' && f.status !== 'PR open') return false;
      if (filters.status === 'human' && f.status !== 'Needs engineer') return false;
      if (filters.status === 'fixed' && f.status !== 'Fixed') return false;
      if (filters.q && (f.title + ' ' + f.repo.name + ' ' + f.id).toLowerCase().indexOf(filters.q) < 0) return false;
      return true;
    });
  }
  function renderTable() {
    var list = visible(), part = list.slice(0, shown);
    $('#count').textContent = 'Showing ' + part.length + ' of ' + list.length + ' matching findings (' + FINDINGS.length + ' in total). Ranked highest risk first.';
    if (!list.length) { $('#table-wrap').innerHTML = '<p class="empty">No findings match these filters.</p>'; $('#more').hidden = true; return; }
    var rows = part.map(function (f) {
      var fixed = f.status === 'Fixed';
      var open = !!expanded[f.id];
      var main = '<tr class="' + (fixed ? 'is-fixed' : '') + '">' +
        '<td class="rank first" data-label="Rank">#' + f.rank + '</td>' +
        '<td class="sevcell" data-label="Severity"><span class="dot s-' + f.sev + '"></span>' + SEV_LABEL[f.sev] + '</td>' +
        '<td data-label="Category">' + CATS[f.cat] + '</td>' +
        '<td data-label="Finding"><button type="button" class="expander" data-id="' + f.id + '" aria-expanded="' + open + '">' + esc(f.title) + '</button><span class="sub">' + esc(f.repo.name) + ' · ' + f.id + (f.pr ? ' · PR #' + f.pr.num : '') + '</span></td>' +
        '<td data-label="Status" class="' + (fixed ? 'status-fixed' : '') + '">' + f.status + '</td></tr>';
      var detail = open ? '<tr class="detail"><td colspan="5"><div class="detailbox">' +
        '<h4>Where</h4><p><code>' + esc(f.file) + '</code> in ' + esc(f.repo.name) + '</p>' +
        '<h4>Code</h4><pre><code>' + esc(f.code) + '</code></pre>' +
        '<h4>Why it matters</h4><p>' + esc(f.why) + '</p>' +
        '<h4>Suggested fix</h4><p>' + esc(f.fix) + '</p>' +
        '<h4>Pull request (simulated)</h4><p>' + (f.pr
          ? 'PR #' + f.pr.num + ': “Fix: ' + esc(f.title) + '”. +' + f.pr.add + ' −' + f.pr.del + ' across ' + f.pr.files + (f.pr.files === 1 ? ' file' : ' files') + '. The agent opened it with the proposed fix and a link back to this ticket, and it is ' + (f.status === 'Fixed' ? 'reviewed and merged.' : 'waiting for an engineer to review it.')
          : (f.human ? 'The agent did not open one: this fix needs a design decision, so it is flagged for an engineer.' : 'The agent did not open one: its confidence (' + Math.round(f.conf * 100) + '%) was too low to propose a fix, so it is flagged for an engineer.')) + '</p>' +
        '<h4>Ticket as logged (simulated)</h4><pre><code>' + esc(ticketText(f)) + '</code></pre>' +
        '<h4>Ranking</h4><p>Risk score ' + f.score + ' = severity weight ' + SEV_WEIGHT[f.sev] + ' × client exposure of the repository (1 + ' + f.repo.exposure.toFixed(2) + ') × the agent’s confidence (' + Math.round(f.conf * 100) + '%).</p>' +
        '</div></td></tr>' : '';
      return main + detail;
    }).join('');
    $('#table-wrap').innerHTML = '<table class="findings"><thead><tr><th>Rank</th><th>Severity</th><th>Category</th><th>Finding</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
    $('#more').hidden = list.length <= shown;
    $('#more').textContent = 'Show ' + Math.min(20, list.length - shown) + ' more';
  }
  function renderFilters() {
    $('#sev-chips').innerHTML = SEVS.map(function (s) { return '<button type="button" class="chip" data-sev="' + s + '" aria-pressed="' + !!filters.sev[s] + '"><span class="dot s-' + s + '"></span>' + SEV_LABEL[s] + '</button>'; }).join('');
    var c = $('#f-cat'); if (c.options.length <= 1) Object.keys(CATS).forEach(function (k) { c.add(new Option(CATS[k], k)); });
    var r = $('#f-repo'); if (r.options.length <= 1) REPOS.forEach(function (x) { r.add(new Option(x.name, x.name)); });
  }

  /* ---------- burn-down sprint ---------- */
  function riskRemaining(fixedCount) {
    var total = 0, removed = 0;
    FINDINGS.forEach(function (f, i) { total += f.score; if (i < fixedCount) removed += f.score; });
    return { total: total, ranked: total - removed, random: total * (1 - fixedCount / FINDINGS.length) };
  }
  function drawChart(upToDay, capacity) {
    if (!FINDINGS.length) { $('#chart').innerHTML = ''; return; } // nothing to plot before a scan
    var W = 640, H = 250, L = 46, R = 14, Tp = 14, B = 34, pw = W - L - R, ph = H - Tp - B;
    var total = riskRemaining(0).total, x = function (d) { return L + d / 10 * pw; }, y = function (v) { return Tp + (1 - v / total) * ph; };
    var g = '', i;
    for (i = 0; i <= 4; i++) { var v = total * i / 4; g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(i * 25) + '%</text>'; }
    for (i = 0; i <= 10; i += 2) g += '<text x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="' + (i === 10 ? 'end' : (i === 0 ? 'start' : 'middle')) + '">Day ' + i + '</text>';
    var rk = [], rd = [];
    for (i = 0; i <= upToDay; i++) { var k = Math.floor(capacity * i / 10), rr = riskRemaining(k); rk.push(x(i) + ',' + y(rr.ranked)); rd.push(x(i) + ',' + y(rr.random)); }
    var lines = upToDay >= 0 ? '<polyline class="random" points="' + rd.join(' ') + '"/><polyline class="ranked" points="' + rk.join(' ') + '"/>' : '';
    $('#chart').innerHTML = g + lines;
  }
  function setFixed(count) {
    FINDINGS.forEach(function (f, i) { f.status = i < count ? 'Fixed' : baseStatus(f); });
    renderSummary(); renderTable();
  }
  function resetSprint(silent) {
    if (sprintTimer) { clearTimeout(sprintTimer); sprintTimer = null; }
    if (scanned) FINDINGS.forEach(function (f) { f.status = baseStatus(f); });
    drawChart(-1, 0); $('#sprint-result').textContent = 'Choose a sprint capacity and run the sprint to see the top of the ranked list get fixed.';
    $('#run-sprint').disabled = false; stage(6, scanned ? 'active' : null);
    if (!silent) { renderSummary(); renderTable(); }
  }
  function runSprint() {
    var cap = +$('#cap').value, day = 0; $('#run-sprint').disabled = true; $('#reset-sprint').disabled = true;
    FINDINGS.forEach(function (f) { f.status = baseStatus(f); });
    (function tick() {
      var k = Math.floor(cap * day / 10); setFixed(k); drawChart(day, cap);
      $('#sprint-result').textContent = 'Day ' + day + ' of 10: ' + k + ' findings closed.';
      if (day >= 10) {
        var rr = riskRemaining(k), removedRanked = Math.round((1 - rr.ranked / rr.total) * 100), removedRandom = Math.round((1 - rr.random / rr.total) * 100);
        var hard = FINDINGS.filter(function (f) { return (f.sev === 'fatal' || f.sev === 'high') && f.status !== 'Fixed'; }).length;
        var viaPr = FINDINGS.filter(function (f) { return f.status === 'Fixed' && f.pr; }).length;
        $('#sprint-result').textContent = 'Sprint complete. ' + k + ' of ' + FINDINGS.length + ' findings closed (' + viaPr + ' by reviewing and merging an agent’s pull request, ' + (k - viaPr) + ' fixed by an engineer), removing ' + removedRanked + '% of the total risk, compared with about ' + removedRandom + '% if the same number had been closed in no particular order. Fatal or high findings still open: ' + hard + '.';
        $('#reset-sprint').disabled = false; stage(6, 'done'); sprintTimer = null; return;
      }
      day++; sprintTimer = setTimeout(tick, reduce ? 0 : 420);
    })();
  }
  function renderAll() { renderSummary(); renderFilters(); renderTable(); }

  /* ---------- wiring ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderRepos(); setAreas(false);
    $('#scan').addEventListener('click', runScan);
    $('#reset').addEventListener('click', function () {
      if (sprintTimer) { clearTimeout(sprintTimer); sprintTimer = null; }
      FINDINGS = []; scanned = false; setAreas(false);
      $('#log').innerHTML = ''; $('#bar').style.width = '0'; renderRepos(); [1, 2, 3, 4, 5, 6].forEach(function (n) { stage(n); });
      $('#scan').textContent = 'Run the scan'; filters = { sev: {}, cat: '', repo: '', status: '', q: '' };
      $('#f-cat').value = ''; $('#f-repo').value = ''; $('#f-status').value = ''; $('#f-q').value = '';
    });
    $('#sev-chips').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-sev]'); if (!b) return;
      filters.sev[b.dataset.sev] = !filters.sev[b.dataset.sev]; shown = 20; renderFilters(); renderTable();
    });
    ['cat', 'repo', 'status'].forEach(function (k) { $('#f-' + k).addEventListener('change', function (e) { filters[k] = e.target.value; shown = 20; renderTable(); }); });
    $('#f-q').addEventListener('input', function (e) { filters.q = e.target.value.trim().toLowerCase(); shown = 20; renderTable(); });
    $('#more').addEventListener('click', function () { shown += 20; renderTable(); });
    $('#table-wrap').addEventListener('click', function (e) {
      var b = e.target.closest('.expander'); if (!b) return;
      expanded[b.dataset.id] = !expanded[b.dataset.id]; renderTable();
      var again = $('.expander[data-id="' + b.dataset.id + '"]'); if (again) again.focus();
    });
    $('#cap').addEventListener('input', function (e) { $('#cap-val').textContent = e.target.value; });
    $('#run-sprint').addEventListener('click', runSprint);
    $('#reset-sprint').addEventListener('click', function () { resetSprint(false); });
    drawChart(-1, 0);
  });

  window.__bugDemo = { generate: generate, REPOS: REPOS };
})();
