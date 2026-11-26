/* App: All Star. The stores' monthly Stravik sales reports of the Stravik All Star programme: what each store reported,
   what counts (covered by its invoices), the Heroes' rewards, and the flags to look at. A report goes
     sent by the store (to check) -> checked (to approve) -> approved (final),
   and can be sent back to the store for a correction, or rejected. Who checks and who approves is in Customers > Settings
   (approvers_allstar_check, approvers_allstar_approve). Every version a store replaced is kept and shown.
   Data: stravik_as_admin_month(), stravik_as_admin_report(), stravik_as_admin_action(). */
(function (L) {
  'use strict';
  var esc = L.esc, sb = L.sb, $ = L.$;
  var S = L.state.allstar = { period: null, test: false };
  var BASE = L.href('allstar');
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var monthName = function (p) { var m = /^(\d{4})-(\d{2})/.exec(p || ''); return m ? MONTHS[+m[2] - 1] + ' ' + m[1] : ''; };
  var rand = function (v) { return v == null || v === '' ? '' : 'R' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var ym = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  // the months to choose from: this month and the 12 before it
  var periods = function () { var n = new Date(), out = []; for (var i = 0; i <= 12; i++) out.push(ym(new Date(n.getFullYear(), n.getMonth() - i, 1))); return out; };
  var LABEL = { Submitted: 'To check', Checked: 'To approve', Approved: 'Approved', Returned: 'Sent back to the store', Rejected: 'Rejected' };
  var CLS = { Submitted: 'New', Checked: 'Quoted', Approved: 'Active', Returned: 'warn', Rejected: 'Inactive' };
  var pill = function (s) { return L.pill(LABEL[s] || s, CLS[s] || ''); };
  // what to look at on a report
  function flags(s) {
    var r = s.report, f = [];
    if (!s.registered) return [['Not registered', '']];
    if (!r) return [['No report', 'warn']];
    if (r.correction_request) f.push(['Store asks for a correction', 'warn']);
    if (r.late) f.push(['Sent late', '']);
    if (Number(r.not_covered) > 0.004) f.push([rand(r.not_covered) + ' not covered by invoices', 'warn']);
    if (Number(r.unlinked) > 0.004) f.push([rand(r.unlinked) + ' not linked to a Hero', '']);
    if (!Number(s.heroes)) f.push(['No Heroes registered', 'warn']);
    if (s.low) f.push(['Below 30% of purchases, 2 months', 'warn']);
    if (Number(r.version) > 1) f.push(['Version ' + r.version, '']);
    if (Number(r.award) > 0) f.push(['Leading Store of the Month', 'Active']);
    return f;
  }

  // ---------- the month: every store of the programme
  async function home(r) {
    if (r.q.m && /^\d{4}-\d{2}$/.test(r.q.m)) S.period = r.q.m;
    if (r.q.test != null) S.test = r.q.test === '1';
    var ps = periods(); if (!S.period) S.period = ps[1];
    L.cp({ crumbs: [['All Star'], [monthName(S.period)]], buttons: '<button type="button" class="btn ghost" id="asXls">Download</button><span id="asBulk"></span>',
      tools: '<select id="asMonth" aria-label="Month">' + ps.map(function (p) { return '<option value="' + p + '"' + (p === S.period ? ' selected' : '') + '>' + esc(monthName(p)) + '</option>'; }).join('') + '</select>' +
        '<select id="asTest" aria-label="Stores"><option value="0"' + (S.test ? '' : ' selected') + '>Stores</option><option value="1"' + (S.test ? ' selected' : '') + '>Test stores</option></select>' });
    $('cpSearch').innerHTML = '';
    $('asMonth').onchange = function () { L.go(L.href('allstar') + '?m=' + this.value + '&test=' + (S.test ? 1 : 0)); };
    $('asTest').onchange = function () { L.go(L.href('allstar') + '?m=' + S.period + '&test=' + this.value); };
    L.content('<div class="cards" id="asStats" style="margin-bottom:14px"></div><div id="asList"><p class="muted">Loading…</p></div>');
    try {
      var d = L.must(await sb.rpc('stravik_as_admin_month', { p_period: S.period, p_test: S.test })), st = d.stores || [];
      var rep = st.filter(function (s) { return s.report; }), c = function (x) { return rep.filter(function (s) { return s.report.status === x; }).length; };
      var sum = function (k) { return rep.filter(function (s) { return s.report.status !== 'Rejected'; }).reduce(function (a, s) { return a + Number(s.report[k] || 0); }, 0); };
      var reg = st.filter(function (s) { return s.registered; }).length;
      $('asStats').innerHTML = [[rep.length + ' of ' + reg, 'reports sent by registered stores'], [c('Submitted'), 'to check'], [c('Checked'), 'to approve'], [c('Approved'), 'approved'],
        [rand(sum('value')), 'product value'], [rand(sum('pool')), 'rewards for the Heroes']]
        .map(function (x) { return '<div class="card"><div class="stat">' + esc(String(x[0])) + '</div><div class="stat-l">' + esc(x[1]) + '</div></div>'; }).join('');
      if (!st.length) { $('asList').innerHTML = L.empty('No stores', S.test ? 'There are no test stores in a network.' : 'No stores of a network have a class yet. Set them up in Networks.'); return; }
      // stores with something to do first
      var ord = { Submitted: 0, Checked: 1, Returned: 2, Approved: 4, Rejected: 5 };
      st.sort(function (a, b) { var x = a.report ? ord[a.report.status] : (a.registered ? 3 : 6), y = b.report ? ord[b.report.status] : (b.registered ? 3 : 6); return x - y || a.store.localeCompare(b.store); });
      $('asList').innerHTML = L.listView([
        { label: 'Store', render: function (s) { return '<b>' + esc(s.store) + '</b><div class="small muted">' + esc([s.town, 'class ' + s.class, s.network].filter(Boolean).join(' · ')) + '</div>'; } },
        { label: 'Report', render: function (s) { return s.report ? pill(s.report.status) + '<div class="small muted">' + esc(L.dt(s.report.submitted_at)) + '</div>' : '<span class="muted">' + (s.registered ? 'Not sent' : '') + '</span>'; } },
        { label: 'Product value', num: true, render: function (s) { return s.report ? '<b>' + rand(s.report.value) + '</b>' : ''; } },
        { label: '% of month target', num: true, render: function (s) { return s.report && s.report.pct != null ? s.report.pct + '%' : ''; } },
        { label: "Heroes' rewards", num: true, render: function (s) { return s.report ? rand(s.report.pool) + (s.report.booster ? ' <span class="small muted">4%</span>' : '') : ''; } },
        { label: 'Heroes', num: true, render: function (s) { return s.registered ? L.qty(s.heroes) : ''; } },
        { label: 'To look at', render: function (s) { return flags(s).map(function (f) { return L.pill(f[0], f[1]); }).join(' '); } }
      ], st, function (s) { return s.report ? L.href('allstar', ['r', s.report.id]) : null; });
      // approve everything that has been checked
      var todo = rep.filter(function (s) { return s.report.status === 'Checked'; });
      if (d.can_approve && todo.length) {
        $('asBulk').innerHTML = '<button type="button" class="btn" id="asAll">Approve the ' + todo.length + ' checked</button>';
        $('asAll').onclick = async function () {
          if (!confirm('Approve ' + todo.length + ' checked report' + (todo.length === 1 ? '' : 's') + ' for ' + monthName(S.period) + '? Approved reports are final.')) return;
          this.disabled = true;
          try { for (var i = 0; i < todo.length; i++) L.must(await sb.rpc('stravik_as_admin_action', { p_id: todo[i].report.id, p_action: 'approve', p_note: null })); L.toast(todo.length + ' approved'); home({ q: {} }); }
          catch (e) { L.fail(e); home({ q: {} }); }
        };
      }
      $('asXls').onclick = function () {
        L.saveXlsx([{ name: monthName(S.period), head: ['Store', 'Town', 'Class', 'Network', 'Report', 'Sent', 'Late', 'Version', 'Reported at buy price', 'Product value', 'Not covered', '% of month target', "Heroes' rewards", 'Not linked to a Hero', 'Heroes registered', 'Below 30% of purchases', 'Leading Store of the Month', 'Checked by', 'Approved by'],
          widths: [30, 16, 7, 16, 18, 18, 7, 8, 16, 14, 12, 12, 14, 14, 10, 12, 12, 26, 26],
          rows: st.map(function (s) { var r = s.report || {}; return [s.store, s.town || '', s.class, s.network, s.report ? LABEL[r.status] : (s.registered ? 'Not sent' : 'Not registered'), r.submitted_at ? L.dt(r.submitted_at) : '', r.late ? 'Yes' : '', r.version || '',
            r.value_credited == null ? '' : Number(r.value_credited), r.value == null ? '' : Number(r.value), r.not_covered == null ? '' : Number(r.not_covered), r.pct == null ? '' : Number(r.pct), r.pool == null ? '' : Number(r.pool), r.unlinked == null ? '' : Number(r.unlinked),
            Number(s.heroes || 0), s.low ? 'Yes' : '', Number(r.award) > 0 ? 'Yes' : '', r.checked_by || '', r.approved_by || '']; }) }], 'Stravik_All_Star_' + S.period + (S.test ? '_test' : '') + '.xlsx');
      };
    } catch (e) { L.fail(e); }
  }

  // ---------- one report
  // what changed between two versions: lines are {pn, staff_id, hero, qty, value} per part and Hero
  function diff(a, b) {
    var key = function (l) { return l.pn + '|' + (l.staff_id || ''); }, m = {}, out = [];
    (a || []).forEach(function (l) { m[key(l)] = { pn: l.pn, hero: l.hero, was: Number(l.qty), now: 0 }; });
    (b || []).forEach(function (l) { var x = m[key(l)] || (m[key(l)] = { pn: l.pn, hero: l.hero, was: 0, now: 0 }); x.now = Number(l.qty); });
    Object.keys(m).forEach(function (k) { if (m[k].was !== m[k].now) out.push(m[k]); });
    return out.sort(function (x, y) { return x.pn.localeCompare(y.pn); });
  }
  async function report(id) {
    try {
      var d = L.must(await sb.rpc('stravik_as_admin_report', { p_id: Number(id) }));
      if (!d) { L.cp({ crumbs: [['All Star', BASE], ['Report']] }); return L.content(L.empty('Report not found', 'The store may have replaced it. Open the month again.')); }
      var r = d.report, st = d.store, m = d.month || {}, q = d.quarter || {}, per = String(r.period).slice(0, 7);
      var back = BASE + '?m=' + per + '&test=' + (st.is_test ? 1 : 0);
      var act = '';
      if (r.status === 'Submitted') act = (d.can_check ? '<button type="button" class="btn" data-a="check">Mark as checked</button>' : '<span class="small muted" style="align-self:center">Waiting to be checked.</span>') +
        (d.can_check || d.can_approve ? '<button type="button" class="btn ghost" data-a="return">Send back to the store</button><button type="button" class="btn ghost" data-a="reject">Reject</button>' : '');
      else if (r.status === 'Checked') act = (d.can_approve ? '<button type="button" class="btn" data-a="approve">Approve</button>' : '<span class="small muted" style="align-self:center">Checked. Waiting for approval.</span>') +
        (d.can_check || d.can_approve ? '<button type="button" class="btn ghost" data-a="uncheck">Back to checking</button><button type="button" class="btn ghost" data-a="return">Send back to the store</button>' : '');
      else if (r.status === 'Returned') act = '<span class="small muted" style="align-self:center">Sent back: waiting for the store to correct and send it again.</span>' + (d.can_check || d.can_approve ? '<button type="button" class="btn ghost" data-a="reject">Reject</button>' : '');
      var steps = ['To check', 'To approve', 'Approved'], cur = LABEL[r.status];
      if (r.status === 'Returned' || r.status === 'Rejected') steps = [cur].concat(steps);
      var who = function (by, at, note) { return by ? esc(by) + ' <span class="small muted">' + esc(L.dt(at)) + '</span>' + (note ? '<div class="small">' + esc(note) + '</div>' : '') : ''; };
      var notCov = Number(r.value_credited || 0) - Number(m.value_checked || 0);
      var tbl = function (head, rows) { return '<div class="o-list"><table class="grid"><thead><tr>' + head.map(function (h) { return '<th' + (h[1] ? ' class="num"' : '') + '>' + esc(h[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'; };
      // versions, newest change first
      var vs = (d.versions || []).slice().sort(function (a, b) { return b.version - a.version; }), vhtml = '';
      vs.forEach(function (v, i) {
        var next = i === 0 ? d.current : vs[i - 1].lines, ch = diff(v.lines, next);
        vhtml += '<p style="margin:12px 0 4px"><b>Version ' + v.version + ' → ' + (v.version + 1) + '</b> <span class="small muted">replaced ' + esc(L.dt(v.replaced_at)) + ' · version ' + v.version + ' was sent ' + esc(L.dt(v.submitted_at)) + ' by ' + esc(v.submitted_by || '') + ' (' + rand(v.value_credited) + ')</span></p>' +
          (ch.length ? tbl([['Part'], ['Hero'], ['Was', 1], ['Now', 1], ['Change', 1]], ch.map(function (x) { return '<tr><td><b>' + esc(x.pn) + '</b></td><td>' + (x.hero ? esc(x.hero) : '<span class="muted">Not linked to a Hero</span>') + '</td><td class="num">' + x.was + '</td><td class="num">' + x.now + '</td><td class="num ' + (x.now > x.was ? 'ok' : 'flag') + '">' + (x.now > x.was ? '+' : '') + (x.now - x.was) + '</td></tr>'; })) : '<p class="small muted">No quantities changed.</p>');
      });
      L.form({
        crumbs: [['All Star', back], [monthName(per), back], [st.name]],
        actions: act,
        status: { steps: steps, current: cur, clickable: false },
        sheet: '<h1 class="o-title">' + esc(st.name) + ' ' + (st.is_test ? L.pill('Test', 'warn') : '') + '</h1>' +
          '<p class="muted" style="margin:-4px 0 12px">' + esc([monthName(per), st.town, 'class ' + st.class, st.network].filter(Boolean).join(' · ')) + '</p>' +
          (r.correction_request ? '<div class="notice"><b>The store asks for a correction</b> <span class="small muted">' + esc(L.dt(r.correction_requested_at)) + '</span><div>' + esc(r.correction_request) + '</div><div class="small muted">Send it back to the store to let it change the report.</div></div>' : '') +
          (r.status === 'Returned' ? '<div class="notice"><b>Sent back to the store</b> by ' + who(r.returned_by, r.returned_at, r.return_note) + '</div>' : '') +
          (r.status === 'Rejected' ? '<div class="notice"><b>Rejected</b> by ' + who(r.rejected_by, r.rejected_at, r.reject_note) + '</div>' : '') +
          '<div class="o-groups">' +
          L.group('Rewards', [['Product value', '<b>' + rand(m.value_checked) + '</b>' + (notCov > 0.004 ? ' <span class="flag">' + rand(notCov) + ' of what was reported is not covered by invoices</span>' : '')],
            ['Reported at buy price', rand(r.value_credited)], ["Heroes' rewards", '<b>' + rand(m.pool) + '</b> <span class="small muted">' + (m.booster ? '4% launch booster' : '2%') + '</span>'],
            ['Month target', rand(m.month_target) + (m.pct != null ? ' <span class="small muted">' + m.pct + '% reached</span>' : '') + (Number(m.award) > 0 ? ' ' + L.pill('Leading Store of the Month', 'Active') : '')],
            ['Quarter so far', q.value_checked != null ? rand(q.value_checked) + ' <span class="small muted">' + q.pct + '% of ' + rand(q.target) + '</span> ' + (q.tier ? L.pill(q.tier, 'Active') : '<span class="small muted">not yet Bronze</span>') : '']]) +
          L.group('Report', [['Sent', esc(L.dt(r.submitted_at)) + (r.late ? ' <span class="flag">after the 5th</span>' : '')], ['Sent by', esc(r.submitted_by || '')], ['How', esc(r.file_name || '')], ['Version', String(r.version) + (vs.length ? ' <span class="small muted">see the changes below</span>' : '')],
            ['Checked', who(r.checked_by, r.checked_at, r.check_note)], ['Approved', who(r.approved_by, r.approved_at, r.approve_note)]]) +
          '</div>' +
          '<div style="margin-top:22px"><h3 style="margin:0 0 6px">Heroes</h3>' + tbl([['Hero'], ['Parts', 1], ['Product value', 1], ['Reward', 1]], (d.people || []).map(function (p) {
            return '<tr><td>' + (p.name ? '<b>' + esc(p.name) + '</b>' : '<span class="flag">Not linked to a Hero</span>') + '</td><td class="num">' + L.qty(p.units) + '</td><td class="num">' + rand(p.value) + '</td><td class="num"><b>' + rand(p.share) + '</b></td></tr>'; })) + '</div>' +
          '<div style="margin-top:22px"><h3 style="margin:0 0 6px">Parts against the invoices</h3><p class="small muted" style="margin:0 0 6px">A part counts up to what was invoiced to the store by the end of the month, less what it reported in earlier months.</p>' +
          tbl([['Part'], ['Reported', 1], ['Invoiced to date', 1], ['Reported before', 1], ['Counts', 1], ['Buy price', 1], ['Reported value', 1]], (d.parts || []).map(function (p) {
            var short = Number(p.counted) < Number(p.reported);
            return '<tr><td><b>' + esc(p.pn) + '</b> <span class="small muted">' + esc((p.desc || '').slice(0, 70)) + '</span></td><td class="num">' + L.qty(p.reported) + '</td><td class="num">' + L.qty(p.invoiced) + '</td><td class="num">' + L.qty(p.reported_before) + '</td><td class="num' + (short ? ' flag' : '') + '">' + L.qty(p.counted) + '</td><td class="num">' + rand(p.price) + '</td><td class="num">' + rand(p.value) + '</td></tr>'; })) + '</div>' +
          (vs.length ? '<div style="margin-top:22px"><h3 style="margin:0 0 6px">What the store changed</h3>' + vhtml + '</div>' : '')
      });
      $('content').querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { ask(r, st, b.dataset.a); }; });
    } catch (e) { L.fail(e); }
  }
  // the dialog behind each action
  function ask(r, st, a) {
    var T = { check: ['Mark as checked', 'The report moves to the approvers. The store can no longer change it.', 'Note for the approvers (optional)', false],
      approve: ['Approve', 'The rewards of this month become final for ' + st.name + '. An approved report cannot be changed.', 'Note (optional)', false],
      'return': ['Send back to the store', 'The store can change the report and send it again. It sees your note.', 'What should the store correct?', true],
      reject: ['Reject', 'The report does not count and the store cannot send this month again. The store sees your reason.', 'Reason', true],
      uncheck: ['Back to checking', 'The report goes back to "To check".', '', false] }[a];
    L.modal(T[0], '<p>' + esc(T[1]) + '</p>' + (T[2] ? '<label for="asNote">' + esc(T[2]) + '</label><textarea id="asNote" rows="3" style="width:100%"></textarea>' : '') +
      '<div class="o-footer"><button class="btn" id="asGo">' + esc(T[0]) + '</button><button class="btn ghost" id="asX">Close</button></div>');
    $('asX').onclick = L.closeModal;
    $('asGo').onclick = async function () {
      var b = this, note = $('asNote') ? $('asNote').value.trim() : '';
      if (T[3] && !note) { L.toast('Write a note for the store'); return; }
      b.disabled = true;
      try {
        var res = L.must(await sb.rpc('stravik_as_admin_action', { p_id: r.id, p_action: a, p_note: note || null }));
        L.closeModal(); L.toast(LABEL[res.status] || res.status); report(r.id);
      } catch (e) { L.fail(e); b.disabled = false; }
    };
  }

  L.register({
    key: 'allstar', name: 'All Star', color: '#c99a1c',
    icon: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/>',
    menus: [{ label: 'Monthly reports', href: BASE }],
    route: function (r) { if (r.parts[0] === 'r' && r.parts[1]) return report(r.parts[1]); return home(r); }
  });
})(window.LS);
