/* Stravik admin: reading customer lists (Number Lookup, inquiries).
   Loaded right after core.js and replaces its L.parseListText / L.parseListFile / L.listToText:
   - title rows above the headings are skipped (the heading row is found in the first 10 rows);
   - Arabic and French headings are understood (الكمية / quantité = quantity, رقم القطعة / référence = part number, تسلسل = serial);
   - a column that only counts the rows (1, 2, 3 ...) is never taken as the part-number column;
   - "54500-2D002/2C000" is searched as 54500-2D002 or 54500-2C000, and "a + b" becomes two rows with the same quantity. */
(function (L) {
  'use strict';
  var isQty = function (s) { return /^\d{1,6}([.,]0+)?$/.test(String(s).trim()); };
  function uniq(a) { var seen = {}; return a.filter(function (x) { var k = L.clean(x); if (!k || seen[k]) return false; seen[k] = 1; return true; }); }
  // "54500-2D002/2C000" is short for 54500-2D002 or 54500-2C000: a shorter part after "/" replaces the same number of
  // characters at the end of the first number ("54500-3K000/500" -> 54500-3K500). Only used when the first number has at
  // least 6 letters/digits and every part after "/" at least 3, so "W 67/1" or "A/C" stay as written.
  L.splitAlts = function (v) {
    v = String(v == null ? '' : v).trim(); if (v.indexOf('/') < 0) return [v];
    var parts = v.split(/\s*\/\s*/).map(function (p) { return p.trim(); }).filter(Boolean), base = parts[0];
    if (parts.length < 2 || L.clean(base).length < 6 || parts.slice(1).some(function (p) { var n = L.clean(p).length; return n < 3; })) return [v];
    return uniq([base].concat(parts.slice(1).map(function (p) { return p.length < base.length ? base.slice(0, base.length - p.length) + p : p; })));
  };
  // " + " joins two different parts that are both needed: each becomes its own row
  L.splitPlus = function (v) { return String(v == null ? '' : v).split(/\s+\+\s+/).map(function (x) { return x.trim(); }).filter(Boolean); };
  // pasted text, one row per line:
  //   "number"                         a single number
  //   "number ; qty"  or "number<TAB>qty"   keeps the quantity
  //   "OE | reference ; qty" or tab-separated columns: several numbers for the same row (any of them may match)
  //   "a, b, c"                        three separate rows
  //   "44400-52002/52000"              shorthand: either number (see L.splitAlts)
  //   "a + b"                          two different parts: two rows with the same quantity
  L.parseListText = function (text) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      var qty = 1, m = /(?:;|\t|,)\s*(\d{1,6})(?:[.,]0+)?\s*$/.exec(line);
      if (m && line.slice(0, m.index).trim() && !isQty(line.slice(0, m.index).trim())) { qty = parseInt(m[1], 10) || 1; line = line.slice(0, m.index).trim(); }
      L.splitPlus(line).forEach(function (seg) {
        if (/\||\t/.test(seg)) {
          var alts = [];
          seg.split(/\||\t/).forEach(function (x) { x = x.trim(); if (x) alts = alts.concat(L.splitAlts(x)); });
          alts = uniq(alts);
          if (alts.length) out.push({ no: alts[0], alts: alts, cols: [], qty: qty });
          return;
        }
        seg.split(/;|,/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (p) {
          var alts = uniq(L.splitAlts(p)); if (alts.length) out.push({ no: alts[0], alts: alts, cols: [], qty: qty });
        });
      });
    });
    return out;
  };
  L.listToText = function (items) { return items.map(function (i) { return i.alts.join(' | ') + (i.qty > 1 ? ' ; ' + i.qty : ''); }).join('\n'); };
  var NUM_HEADS = /^(stravikpn|stravik|stravikno|stravikpartnumber|svpn|lucaspn|lucas|ctr|ctrno|ctrnumber|externalno|oe|oes|oenumber|oenumbers|oeno|oeref|oereference|oem|oemnumber|oemno|oempartnumber|partnumber|partno|pn|number|no|reference|references|ref|refno|refnumber|item|itemno|itemcode|code|productcode|articleno|articlenumber|article|crossreference|crossref|xref|competitornumber|competitor|manufacturerpartnumber|mpn|supplierpn|aftermarket|interchange|alternative|alternate|altpn)$/;
  var NUM_HEADS_LOOSE = /(oe|oem|part|number|ref|code|article|item|cross|interchange|competitor|mpn)/;
  var QTY_HEADS = /^(qty|quantity|qnty|qtty|pcs|pieces|units|orderqty|requiredqty|qtyrequired|reqqty|orderquantity|quantite|qte)$/;
  var DESC_HEADS = /^(description|desc|partname|name|itemdescription|productname|application|vehicle|make|model|remarks|notes|brand)$/;
  var SERIAL_HEADS = /^(serial|sno|srno|slno|serialno|sn|line|lineno|seq|sequence)$/;
  // headings in Arabic and French are mapped to the English ones; everything else is normalised as before
  var headKey = function (h) {
    var s = String(h == null ? '' : h).trim().toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    var ar = s.replace(/[\s\u0640]+/g, '');
    if (/^(ال)?كمي(ة|ه)(المطلوب(ة|ه))?$|^(ال)?عدد$/.test(ar)) return 'qty';
    if (/^(ال)?تسلسل|^(ال)?مسلسل|^م$|^(ال)?رقمالتسلسلي$/.test(ar)) return 'serial';
    if (/^(ال)?رقم((ال)?قطع(ة|ه)|(ال)?صنف)?$/.test(ar)) return 'partno';
    if (/^(ال)?(وصف|بيان|الاسم|اسم)/.test(ar)) return 'description';
    return L.normHead(s);
  };
  // a column that only counts rows (1, 2, 3 ... or 1, 2, 5, 6 ...) is a serial number, not a part number
  var isCounter = function (vals) {
    vals = vals.map(function (v) { return String(v == null ? '' : v).trim(); }).filter(Boolean);
    if (vals.length < 3 || !vals.every(function (v) { return /^\d{1,5}$/.test(v); })) return false;
    var up = 0; for (var i = 1; i < vals.length; i++) if (+vals[i] > +vals[i - 1]) up++;
    return up >= (vals.length - 1) * 0.8;
  };
  // keeps an Arabic heading from scrambling the order of the English sentence around it
  var iso = function (t) { return '\u2068' + t + '\u2069'; };
  var looksLikePN = function (v) { v = String(v == null ? '' : v).trim(); return !!v && (/[A-Za-z]/.test(v) && /\d/.test(v) || /-/.test(v) && /\d/.test(v) || /^\d{5,}$/.test(L.clean(v))); };
  // uploaded list: every column that holds part numbers is used (OE, Reference, Article no., ...);
  // quantity and description columns are recognised by their headings (English, Arabic or French).
  // Title rows above the headings are skipped: the first of the top 10 rows with a recognised heading is the heading row.
  L.parseListFile = async function (file) {
    var rows = await L.readRows(file); if (!rows.length) return { items: [], info: 'The file is empty.' };
    var filled = function (r) { return r.filter(function (c) { return String(c == null ? '' : c).trim(); }).length; };
    var hr = -1, strict = true;
    for (var t = 0; t < Math.min(10, rows.length) && hr < 0; t++) if (filled(rows[t]) >= 2 && rows[t].map(headKey).some(function (h) { return NUM_HEADS.test(h) || QTY_HEADS.test(h); })) hr = t;
    if (hr < 0) for (t = 0; t < Math.min(10, rows.length) && hr < 0; t++) if (filled(rows[t]) >= 2 && rows[t].map(headKey).some(function (h) { return h && !DESC_HEADS.test(h) && NUM_HEADS_LOOSE.test(h); })) { hr = t; strict = false; }
    var hasHead = hr >= 0, head = hasHead ? rows[hr].map(headKey) : [], data = hasHead ? rows.slice(hr + 1) : rows;
    var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var colVals = function (i) { return data.map(function (r) { return r[i]; }); };
    var qi = -1, di = -1, cols = [];
    head.forEach(function (h, i) { if (qi < 0 && QTY_HEADS.test(h)) qi = i; else if (di < 0 && /^(description|desc|partname|itemdescription|productname)$/.test(h)) di = i; });
    if (hasHead) {
      head.forEach(function (h, i) { if (i !== qi && i !== di && h && !SERIAL_HEADS.test(h) && (strict ? NUM_HEADS.test(h) : !DESC_HEADS.test(h) && NUM_HEADS_LOOSE.test(h))) cols.push(i); });
      // a "No." column that just counts the rows is dropped when there is a real number column beside it
      var real = cols.filter(function (i) { return !isCounter(colVals(i)); });
      if (real.length) cols = real;
    }
    if (!cols.length) {   // no usable heading: take the column that looks most like part numbers, never a row counter
      var best = -1, bestScore = 0;
      for (var c = 0; c < width; c++) {
        if (c === qi || c === di || isCounter(colVals(c))) continue;
        var v = colVals(c).filter(function (x) { return String(x == null ? '' : x).trim(); }), score = v.length ? v.filter(looksLikePN).length / v.length : 0;
        if (score > bestScore) { best = c; bestScore = score; }
      }
      cols = [best >= 0 && bestScore >= 0.5 ? best : 0];
      if (!hasHead && qi < 0) for (c = width - 1; c >= 0; c--) {   // and an unlabelled column of whole numbers as the quantity
        if (cols.indexOf(c) >= 0 || isCounter(colVals(c))) continue;
        var q = colVals(c).filter(function (x) { return String(x == null ? '' : x).trim(); });
        if (q.length && q.every(isQty)) { qi = c; break; }
      }
    }
    var names = cols.map(function (i) { return hasHead ? String(rows[hr][i] || '').trim() : ''; });
    var items = [], split = 0;
    data.forEach(function (r) {
      var groups = [], did = false;   // one group per part: " + " in a cell makes several parts out of one row
      cols.forEach(function (ci, k) {
        L.splitPlus(r[ci]).forEach(function (seg, g) {
          if (g > 0) did = true;
          var grp = groups[g] || (groups[g] = { vals: [], cn: [] });
          seg.split(/[\n,;]+/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (v0) {
            var alts = L.splitAlts(v0); if (alts.length > 1) did = true;
            alts.forEach(function (v) { if (L.clean(v) && !grp.vals.some(function (x) { return L.clean(x) === L.clean(v); })) { grp.vals.push(v); grp.cn.push(names[k]); } });
          });
        });
      });
      if (did) split++;
      var q = qi >= 0 ? parseInt(String(r[qi]).replace(/[^\d]/g, ''), 10) : NaN;
      groups.forEach(function (g) {
        if (!g || !g.vals.length) return;
        items.push({ no: g.vals[0], alts: g.vals, cols: g.cn, qty: q > 0 ? q : 1, desc: di >= 0 ? String(r[di] || '').trim() : '', orig: r });
      });
    });
    var info = items.length.toLocaleString() + ' rows read' + (hr > 0 ? ' (headings in row ' + (hr + 1) + ')' : '') + '. Numbers taken from ' +
      (hasHead && names.some(Boolean) ? 'column' + (names.length > 1 ? 's ' : ' ') + names.map(function (n) { return '"' + iso(n) + '"'; }).join(', ') : 'column ' + (cols[0] + 1)) +
      (names.length > 1 ? ' (a row is found if any of them matches)' : '') + '; ' +
      (qi >= 0 ? 'quantities from ' + (hasHead && String(rows[hr][qi] || '').trim() ? '"' + iso(String(rows[hr][qi]).trim()) + '"' : 'column ' + (qi + 1)) + '.' : 'quantity 1 each (no quantity column found).') +
      (split ? ' ' + split + ' row' + (split > 1 ? 's' : '') + ' with several numbers in one cell ("/" or "+") split.' : '');
    // the customer's own columns are kept so downloads can return their file with the results added
    var headers = []; for (var h = 0; h < width; h++) headers.push(hasHead ? String(rows[hr][h] == null ? '' : rows[hr][h]).trim() || 'Column ' + (h + 1) : 'Column ' + (h + 1));
    return { items: items, info: info, headers: headers, fileName: file.name };
  };
})(window.LS);
