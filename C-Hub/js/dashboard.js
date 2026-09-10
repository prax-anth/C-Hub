/* ============================================================
   Nova — Tournament Dashboard logic
   Sections: Tournaments · Teams · Money · Rules · Manual Bracket
   Data persists in localStorage.
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "nova-tournament-data-v1";

  /* ============================ State ============================ */

  var state = {
    tournaments: [],
    activeId: null
  };

  function uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function activeT() {
    return state.tournaments.find(function (t) { return t.id === state.activeId; }) || null;
  }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tournaments) && parsed.tournaments.length) {
          state.tournaments = parsed.tournaments;
          state.activeId = parsed.activeId;
        }
      }
    } catch (e) { /* corrupted store */ }
    if (!state.tournaments.length) seedDemo();
    if (!activeT()) state.activeId = state.tournaments[0].id;
  }

  function seedDemo() {
    var t = makeTournament("Nova Cup 2026", todayISO(), "Knockout", 500, "Upcoming");
    ["Thunder Strikers", "Blue Falcons", "Royal Titans", "Night Wolves", "Iron Pioneers", "Solar Rush"].forEach(function (n) {
      t.teams.push(makeTeam(n, "", ""));
    });
    t.rules.push(
      makeRule("Match timings", "Teams must report 15 minutes before kickoff. A 10-minute delay forfeits the match."),
      makeRule("", "Disputes are settled by the referee committee; their decision is final."),
      makeRule("", "Maximum 5 substitutes per match. Roll-on substitutions allowed in group stage.")
    );
    state.tournaments = [t];
    state.activeId = t.id;
    persist();
  }

  /* ============================ Factories ============================ */

  function makeTournament(name, date, format, fee, status) {
    return { id: uid(), name: name, date: date, format: format, fee: fee || 0, status: status || "Upcoming",
             teams: [], rules: [], bracket: [], expenses: [] };
  }
  function makeTeam(name, captain, contact) {
    return { id: uid(), name: name, captain: captain || "", contact: contact || "", paid: false, paidOn: null };
  }
  function makeRule(title, text) {
    return { id: uid(), title: title || "", text: text };
  }
  function makeMatch(a, b) {
    return { id: uid(), a: a || "", b: b || "", winner: null };
  }

  /* ============================ Helpers ============================ */

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function money(n) {
    var v = Number(n) || 0;
    return "\u20B9" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  var icons = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    rupee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667 10 0 10"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>'
  };

  /* ============================ Toasts ============================ */

  function toast(msg, kind) {
    var stack = $("#toasts");
    if (!stack) return;
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.innerHTML = (kind === "ok" ? icons.check : kind === "warn" ? icons.info : icons.info) + "<span>" + esc(msg) + "</span>";
    stack.appendChild(el);
    setTimeout(function () {
      el.classList.add("leaving");
      setTimeout(function () { el.remove(); }, 320);
    }, 2600);
  }

  /* ============================ Tournaments ============================ */

  var editingT = null;

  function bindTournamentForm() {
    var form = $("#t-form");
    form.addEventListener("submit", function (e) {
      if (!ADMIN_SESSION) { toast("Only administrators can manage tournaments.", "warn"); return; }
      e.preventDefault();
      var name = $("#t-name").value.trim();
      var date = $("#t-date").value;
      if (!name) { toast("Tournament name is required.", "warn"); $("#t-name").focus(); return; }
      if (!date) { toast("Pick a date.", "warn"); $("#t-date").focus(); return; }
      var fee = Number($("#t-fee").value) || 0;

      if (editingT) {
        editingT.name = name;
        editingT.date = date;
        editingT.format = $("#t-format").value;
        editingT.fee = fee;
        editingT.status = $("#t-status").value;
        editingT = null;
        toast("Tournament updated.", "ok");
      } else {
        var t = makeTournament(name, date, $("#t-format").value, fee, $("#t-status").value);
        state.tournaments.push(t);
        state.activeId = t.id;
        toast("Tournament created.", "ok");
      }
      form.reset();
      $("#t-date").value = todayISO();
      $("#t-cancel").hidden = true;
      $("#t-form-title").textContent = "Create tournament";
      $("#t-submit").textContent = "Create Tournament";
      persist();
      renderAll();
    });

    $("#t-cancel").addEventListener("click", function () {
      editingT = null;
      form.reset();
      $("#t-date").value = todayISO();
      this.hidden = true;
      $("#t-form-title").textContent = "Create tournament";
      $("#t-submit").textContent = "Create Tournament";
    });
  }

  function startEditT(id) {
    var t = state.tournaments.find(function (x) { return x.id === id; });
    if (!t) return;
    editingT = t;
    $("#t-name").value = t.name;
    $("#t-date").value = t.date;
    $("#t-format").value = t.format;
    $("#t-fee").value = t.fee;
    $("#t-status").value = t.status;
    $("#t-cancel").hidden = false;
    $("#t-form-title").textContent = "Edit tournament";
    $("#t-submit").textContent = "Save Changes";
    $("#t-name").focus();
  }

  function deleteT(id) {
    var t = state.tournaments.find(function (x) { return x.id === id; });
    if (!t) return;
    if (!window.confirm('Delete "' + t.name + '" and all its teams, money and bracket data?')) return;
    state.tournaments = state.tournaments.filter(function (x) { return x.id !== id; });
    if (!state.tournaments.length) seedDemo();
    if (!activeT()) state.activeId = state.tournaments[0].id;
    persist();
    renderAll();
    toast("Tournament deleted.", "ok");
  }

  function renderTournaments() {
    var wrap = $("#t-list");
    var t = activeT();

    wrap.innerHTML = state.tournaments.map(function (x) {
      return '<div class="t-card' + (x.id === state.activeId ? " active" : "") + '" data-action="select-t" data-id="' + x.id + '" role="button" tabindex="0">' +
        '<div class="t-card-top">' +
          '<span class="t-card-name">' + esc(x.name) + '</span>' +
          '<span class="row-actions">' +
            (ADMIN_SESSION
              ? '<button class="icon-btn" data-action="edit-t" data-id="' + x.id + '" title="Edit" aria-label="Edit ' + esc(x.name) + '">' + icons.edit + '</button>'
              : '') +
            (ADMIN_SESSION
              ? '<button class="icon-btn danger" data-action="del-t" data-id="' + x.id + '" title="Delete" aria-label="Delete ' + esc(x.name) + '">' + icons.trash + '</button>'
              : '') +
          '</span>' +
        '</div>' +
        '<div class="t-card-meta">' +
          '<span class="chip ' + x.status.toLowerCase() + '">' + esc(x.status) + '</span>' +
          '<span>' + esc(fmtDate(x.date)) + '</span>' +
          '<span>' + esc(x.format) + '</span>' +
          '<span>' + x.teams.length + ' teams</span>' +
          '<span>' + money(x.fee) + ' / team</span>' +
        '</div>' +
      '</div>';
    }).join("") || '<p class="empty">No tournaments yet.</p>';

    /* selector in topbar */
    var sel = $("#t-select");
    sel.innerHTML = state.tournaments.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === state.activeId ? " selected" : "") + '>' + esc(x.name) + '</option>';
    }).join("");

    var sideName = $("#side-active-name");
    var sideChip = $("#side-active-status");
    sideName.textContent = t ? t.name : "—";
    sideName.title = t ? t.name : "";
    if (t) {
      sideChip.hidden = false;
      sideChip.className = "chip " + t.status.toLowerCase();
      sideChip.textContent = t.status;
    } else {
      sideChip.hidden = true;
    }
  }

  /* ============================ Teams ============================ */

  var editingTm = null;

  function bindTeamForm() {
    var form = $("#tm-form");
    form.addEventListener("submit", function (e) {
      if (!ADMIN_SESSION) { toast("Only administrators can manage teams.", "warn"); return; }
      e.preventDefault();
      var t = activeT();
      if (!t) return;
      var name = $("#tm-name").value.trim();
      if (!name) { toast("Team name is required.", "warn"); $("#tm-name").focus(); return; }

      if (editingTm) {
        editingTm.name = name;
        editingTm.captain = $("#tm-captain").value.trim();
        editingTm.contact = $("#tm-contact").value.trim();
        editingTm = null;
        $("#tm-cancel").hidden = true;
        $("#tm-form-title").textContent = "Add team";
        $("#tm-submit").textContent = "Add Team";
        toast("Team updated.", "ok");
      } else {
        t.teams.push(makeTeam(name, $("#tm-captain").value.trim(), $("#tm-contact").value.trim()));
        toast("Team added.", "ok");
      }
      form.reset();
      persist();
      renderAll();
    });

    $("#tm-cancel").addEventListener("click", function () {
      editingTm = null;
      form.reset();
      this.hidden = true;
      $("#tm-form-title").textContent = "Add team";
      $("#tm-submit").textContent = "Add Team";
    });

    $("#tm-search").addEventListener("input", renderTeams);
  }

  function startEditTm(id) {
    var t = activeT();
    var tm = t && t.teams.find(function (x) { return x.id === id; });
    if (!tm) return;
    editingTm = tm;
    $("#tm-name").value = tm.name;
    $("#tm-captain").value = tm.captain;
    $("#tm-contact").value = tm.contact;
    $("#tm-cancel").hidden = false;
    $("#tm-form-title").textContent = "Edit team";
    $("#tm-submit").textContent = "Save Changes";
    $("#tm-name").focus();
  }

  function deleteTm(id) {
    var t = activeT();
    if (!t) return;
    var tm = t.teams.find(function (x) { return x.id === id; });
    if (!tm) return;
    if (!window.confirm('Remove "' + tm.name + '"? They will also be removed from the bracket.')) return;
    t.teams = t.teams.filter(function (x) { return x.id !== id; });
    t.bracket.forEach(function (round) {
      round.forEach(function (match) {
        if (match.a === tm.name) match.a = "";
        if (match.b === tm.name) match.b = "";
        if (match.winner === tm.name) match.winner = null;
      });
    });
    persist();
    renderAll();
    toast("Team removed.", "ok");
  }

  function renderTeams() {
    var t = activeT();
    var tbody = $("#tm-rows");
    if (!t) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No tournament selected.</td></tr>'; return; }

    var q = ($("#tm-search").value || "").trim().toLowerCase();
    var list = t.teams.filter(function (x) {
      return !q || x.name.toLowerCase().indexOf(q) !== -1 ||
        (x.captain || "").toLowerCase().indexOf(q) !== -1 ||
        (x.contact || "").toLowerCase().indexOf(q) !== -1;
    });

    $("#tm-count-note").textContent = t.teams.length
      ? t.teams.length + " team" + (t.teams.length > 1 ? "s" : "") + " registered · fee " + money(t.fee) + " each"
      : "No teams yet — add your first team.";

    tbody.innerHTML = list.map(function (x, i) {
      return "<tr>" +
        '<td class="mono">' + (i + 1) + "</td>" +
        '<td class="t-name">' + esc(x.name) + "</td>" +
        "<td>" + (esc(x.captain) || "—") + "</td>" +
        "<td>" + (esc(x.contact) || "—") + "</td>" +
        '<td class="mono">' + money(t.fee) + "</td>" +
        '<td><span class="row-actions">' +
          (ADMIN_SESSION
            ? '<button class="icon-btn" data-action="edit-tm" data-id="' + x.id + '" title="Edit" aria-label="Edit ' + esc(x.name) + '">' + icons.edit + "</button>"
            : '') +
          (ADMIN_SESSION
            ? '<button class="icon-btn danger" data-action="del-tm" data-id="' + x.id + '" title="Remove" aria-label="Remove ' + esc(x.name) + '">' + icons.trash + "</button>"
            : '') +
        "</span></td>" +
      "</tr>";
    }).join("") || '<tr><td colspan="6" class="empty">' + (q ? "No teams match “" + esc(q) + "”." : "No teams registered yet.") + "</td></tr>";
  }

  /* ============================ Money ============================ */

  var moneyBound = false;

  function bindMoney() {
    if (moneyBound) return;
    moneyBound = true;
    $("#ex-form").addEventListener("submit", function (e) {
      if (!ADMIN_SESSION) { toast("Only administrators can manage expenses.", "warn"); return; }
      e.preventDefault();
      var t = activeT();
      if (!t) return;
      var label = $("#ex-label").value.trim();
      var amount = Number($("#ex-amount").value);
      if (!label) { toast("Expense name is required.", "warn"); $("#ex-label").focus(); return; }
      if (!(amount > 0)) { toast("Enter an amount greater than 0.", "warn"); $("#ex-amount").focus(); return; }
      t.expenses.push({ id: uid(), label: label, amount: amount });
      this.reset();
      persist();
      renderMoney();
      toast("Expense added.", "ok");
    });
  }

  function renderMoney() {
    var t = activeT();
    var stats = $("#money-stats");
    var payBody = $("#pay-rows");
    var exBody = $("#ex-rows");
    if (!t) { stats.innerHTML = ""; payBody.innerHTML = ""; exBody.innerHTML = ""; return; }

    var expected = t.fee * t.teams.length;
    var collected = t.teams.filter(function (x) { return x.paid; }).length * t.fee;
    var pending = expected - collected;
    var spent = t.expenses.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
    var paidCount = t.teams.filter(function (x) { return x.paid; }).length;

    stats.innerHTML =
      '<div class="stat blue"><div class="stat-label">Expected</div><div class="stat-value">' + money(expected) + '</div><div class="stat-sub">' + t.teams.length + " × " + money(t.fee) + "</div></div>" +
      '<div class="stat ok"><div class="stat-label">Collected</div><div class="stat-value">' + money(collected) + '</div><div class="stat-sub">' + paidCount + " of " + t.teams.length + " teams paid</div></div>" +
      '<div class="stat warn"><div class="stat-label">Pending</div><div class="stat-value">' + money(pending) + '</div><div class="stat-sub">' + (t.teams.length - paidCount) + " teams outstanding</div></div>" +
      '<div class="stat"><div class="stat-label">Expenses</div><div class="stat-value">' + money(spent) + '</div><div class="stat-sub">' + t.expenses.length + " recorded</div></div>";

    payBody.innerHTML = t.teams.map(function (x) {
      var pill = x.paid ? '<span class="pill pill-paid">Paid</span>'
                        : '<span class="pill pill-unpaid">Unpaid</span>';
      return "<tr>" +
        '<td class="t-name">' + esc(x.name) + "</td>" +
        '<td class="mono">' + money(t.fee) + "</td>" +
        "<td>" + pill + "</td>" +
        "<td>" + (x.paid && x.paidOn ? esc(fmtDate(x.paidOn)) : "—") + "</td>" +
        '<td><span class="row-actions">' +
          (x.paid
            ? '<button class="icon-btn" data-action="unmark-paid" data-id="' + x.id + '" title="Mark as unpaid">' + icons.undo + "</button>"
            : '<button class="icon-btn" data-action="mark-paid" data-id="' + x.id + '" title="Mark as paid">' + icons.rupee + "</button>") +
        "</span></td>" +
      "</tr>";
    }).join("") || '<tr><td colspan="5" class="empty">Add teams to track their entry fees.</td></tr>';

    exBody.innerHTML = t.expenses.map(function (x) {
      return "<tr>" +
        "<td>" + esc(x.label) + "</td>" +
        '<td class="mono">' + money(x.amount) + "</td>" +
        '<td><span class="row-actions">' + (ADMIN_SESSION
            ? '<button class="icon-btn danger" data-action="del-ex" data-id="' + x.id + '" title="Delete" aria-label="Delete expense">' + icons.trash + "</button>"
            : '') + '</span></td>' +
      "</tr>";
    }).join("") || '<tr><td colspan="3" class="empty">No expenses recorded.</td></tr>';
  }

  /* ============================ Rules ============================ */

  var editingRule = null;

  function bindRules() {
    $("#rule-form").addEventListener("submit", function (e) {
      if (!ADMIN_SESSION) { toast("Only administrators can manage rules.", "warn"); return; }
      e.preventDefault();
      var t = activeT();
      if (!t) return;
      var text = $("#rule-text").value.trim();
      if (!text) { toast("Rule text is required.", "warn"); $("#rule-text").focus(); return; }

      if (editingRule) {
        editingRule.title = $("#rule-title").value.trim();
        editingRule.text = text;
        editingRule = null;
        $("#rule-cancel").hidden = true;
        document.querySelector("#view-rules .panel-title").textContent = "Add a rule";
        $("#rule-submit").textContent = "Add Rule";
        toast("Rule updated.", "ok");
      } else {
        t.rules.push(makeRule($("#rule-title").value.trim(), text));
        toast("Rule added.", "ok");
      }
      this.reset();
      persist();
      renderRules();
    });

    $("#rule-cancel").addEventListener("click", function () {
      editingRule = null;
      $("#rule-form").reset();
      this.hidden = true;
      document.querySelector("#view-rules .panel-title").textContent = "Add a rule";
      $("#rule-submit").textContent = "Add Rule";
    });
  }

  function renderRules() {
    var t = activeT();
    var list = $("#rules-list");
    var empty = $("#rules-empty");
    if (!t) { list.innerHTML = ""; return; }

    list.innerHTML = t.rules.map(function (r) {
      return "<li>" +
        '<div class="rule-body">' +
          (r.title ? '<span class="rule-title">' + esc(r.title) + "</span>" : "") +
          '<span class="rule-text">' + esc(r.text) + "</span>" +
        "</div>" +
        '<span class="row-actions">' +
          (ADMIN_SESSION
            ? '<button class="icon-btn" data-action="edit-rule" data-id="' + r.id + '" title="Edit rule" aria-label="Edit rule">' + icons.edit + "</button>"
            : '') +
          (ADMIN_SESSION
            ? '<button class="icon-btn danger" data-action="del-rule" data-id="' + r.id + '" title="Delete rule" aria-label="Delete rule">' + icons.trash + "</button>"
            : '') +
        "</span>" +
      "</li>";
    }).join("");
    empty.hidden = t.rules.length > 0;
  }

  function startEditRule(id) {
    var t = activeT();
    var r = t && t.rules.find(function (x) { return x.id === id; });
    if (!r) return;
    editingRule = r;
    $("#rule-title").value = r.title;
    $("#rule-text").value = r.text;
    $("#rule-cancel").hidden = false;
    document.querySelector("#view-rules .panel-title").textContent = "Edit rule";
    $("#rule-submit").textContent = "Save Changes";
    $("#rule-text").focus();
  }

  function deleteRule(id) {
    var t = activeT();
    if (!t) return;
    t.rules = t.rules.filter(function (x) { return x.id !== id; });
    persist();
    renderRules();
    toast("Rule deleted.", "ok");
  }

  /* ============================ Bracket (manual) ============================ */

  function roundName(i, total) {
    if (total === 1) return "Round 1";
    var fromEnd = total - i;
    if (fromEnd === 1) return "Final";
    if (fromEnd === 2) return "Semi-final";
    if (fromEnd === 3) return "Quarter-final";
    return "Round " + (i + 1);
  }

  function ensureNextRound(t, roundIdx) {
    /* Make sure round roundIdx+1 exists when round roundIdx has a match */
    if (roundIdx + 1 < t.bracket.length) return;
    t.bracket.push([makeMatch("", "")]);
  }

  function pruneTrailingEmptyRounds(t) {
    while (t.bracket.length > 1) {
      var last = t.bracket[t.bracket.length - 1];
      var isEmpty = last.every(function (m) { return !m.a && !m.b && !m.winner; });
      if (isEmpty) t.bracket.pop(); else break;
    }
  }

  function markWinner(t, roundIdx, matchIdx, which) {
    var match = t.bracket[roundIdx][matchIdx];
    if (!match) return;
    var name = which === "a" ? match.a : match.b;
    if (!name) { toast("Enter a team name in that slot first.", "warn"); return; }

    /* If the winner changes, clear downstream slots that depended on it */
    if (match.winner !== name) {
      clearDownstream(t, roundIdx, matchIdx);
    }
    match.winner = name;
    advance(t, roundIdx, matchIdx, name);
    persist();
    renderBracket();
    toast(name + " advances.", "ok");
  }

  function clearDownstream(t, roundIdx, matchIdx) {
    /* Walk forward clearing every slot fed by this match */
    var targetMatch = Math.floor(matchIdx / 2);
    var targetSlot = matchIdx % 2 === 0 ? "a" : "b";
    var r = roundIdx + 1;
    while (r < t.bracket.length && t.bracket[r][targetMatch]) {
      var m = t.bracket[r] && t.bracket[r][targetMatch];
      if (!m) return;
      var changed = false;
      if (m[targetSlot]) { m[targetSlot] = ""; changed = true; }
      if (m.winner) { m.winner = null; changed = true; }
      if (!changed) return;
      var nextMatch = Math.floor(targetMatch / 2);
      var nextSlot = targetMatch % 2 === 0 ? "a" : "b";
      targetMatch = nextMatch;
      targetSlot = nextSlot;
      r++;
    }
  }

  function advance(t, roundIdx, matchIdx, name) {
    /* A single match in the last round is the final: its winner is the
       champion, so there is no next round to advance into. */
    var isFinal = roundIdx === t.bracket.length - 1 && t.bracket[roundIdx].length === 1;
    if (isFinal) return;
    /* Write winner into the next round slot */
    ensureNextRound(t, roundIdx);
    var next = t.bracket[roundIdx + 1];
    if (!next) return;
    var mIdx = Math.floor(matchIdx / 2);
    if (!next[mIdx]) next[mIdx] = makeMatch("", "");
    next[mIdx][matchIdx % 2 === 0 ? "a" : "b"] = name;
    pruneTrailingEmptyRounds(t);
  }

  function renderBracket() {
    var t = activeT();
    var wrap = $("#bracket");
    var chips = $("#bracket-chips");
    var champ = $("#champion");
    var dl = $("#team-names");
    if (!t) { wrap.innerHTML = '<p class="empty">No tournament selected.</p>'; return; }

    if (!t.bracket.length) {
      t.bracket = [[makeMatch("", "")]];
      persist();
    }

    var names = t.teams.map(function (x) { return x.name; });
    var isAdmin = ADMIN_SESSION;

    /* chips — focus-round is view-only (scrolls into view), so it stays for everyone;
       add-round mutates the bracket and is admin-only. */
    chips.innerHTML = '<span class="chips-label">Rounds</span>' + t.bracket.map(function (_, i) {
      return '<button class="chip-btn" data-action="focus-round" data-round="' + i + '">' + esc(roundName(i, t.bracket.length)) + "</button>";
    }).join("") +
    (isAdmin ? '<button class="chip-btn" data-action="add-round" title="Append an empty round">+ Round</button>' : '');

    /* datalist for team-name completion — only useful when editing slots (admin). */
    dl.innerHTML = isAdmin ? names.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("") : '';

    /* champion detection: final round with exactly one match and a winner */
    var finalRound = t.bracket[t.bracket.length - 1];
    var champion = null;
    if (finalRound.length === 1 && finalRound[0].winner) champion = finalRound[0].winner;
    if (champion) {
      champ.hidden = false;
      champ.innerHTML = icons.trophy + "<div><div class='champ-label'>Champion</div><div class='champ-name'>" + esc(champion) + "</div></div>";
    } else {
      champ.hidden = true;
      champ.innerHTML = "";
    }

    var html = t.bracket.map(function (round, ri) {
      var matchesHtml = round.map(function (m, mi) {
        var done = !!m.winner;
        function slotHtml(side) {
          var val = m[side] || "";
          var isW = done && m.winner === val && !!val;
          if (isAdmin) {
            return '<div class="slot' + (isW ? " winner" : "") + '">' +
              '<span class="seed">' + (side === "a" ? "A" : "B") + "</span>" +
              '<input type="text" list="team-names" value="' + esc(val) + '" placeholder="Team name"' +
                ' data-action="slot" data-round="' + ri + '" data-match="' + mi + '" data-side="' + side + '"' +
                ' aria-label="Slot ' + side.toUpperCase() + ' of ' + esc(roundName(ri, t.bracket.length)) + " match " + (mi + 1) + '" />' +
              '<button type="button" class="slot-pick" data-action="pick-winner" data-round="' + ri + '" data-match="' + mi + '" data-side="' + side + '"' +
                ' title="Set ' + esc(val || "this team") + ' as winner" aria-label="Set winner">' + icons.check + "</button>" +
            "</div>";
          }
          return '<div class="slot' + (isW ? " winner" : "") + '">' +
            '<span class="seed">' + (side === "a" ? "A" : "B") + "</span>" +
            '<span class="slot-val' + (isW ? " champ" : "") + '">' + esc(val || "—") + '</span>' +
          "</div>";
        }
        return '<div class="match' + (done ? " done" : "") + '">' +
          slotHtml("a") +
          slotHtml("b") +
          '<span class="vs">VS</span>' +
          '<div class="match-foot">' +
            '<span class="match-status">' + (done ? "Winner: " + esc(m.winner) : "Awaiting result") + "</span>" +
            (isAdmin ? '<span class="row-actions">' +
              '<button class="icon-btn" data-action="reset-match" data-round="' + ri + '" data-match="' + mi + '" title="Reset result">' + icons.undo + "</button>" +
              '<button class="icon-btn danger" data-action="del-match" data-round="' + ri + '" data-match="' + mi + '" title="Delete match">' + icons.trash + "</button>" +
            "</span>" : '') +
          "</div>" +
        "</div>";
      }).join("");

      return '<div class="round">' +
        '<div class="round-head"><span class="round-title">' + esc(roundName(ri, t.bracket.length)) + "</span>" +
          '<span class="match-status">' + round.filter(function (m) { return m.winner; }).length + "/" + round.length + " done</span>" +
        "</div>" +
        matchesHtml +
        (isAdmin ? '<button class="round-add" data-action="add-match" data-round="' + ri + '">+ Add match</button>' : '') +
      "</div>";
    }).join("");

    /* champion column */
    html += '<div class="round"><div class="round-head"><span class="round-title" style="color:#facc15">Champion</span></div>' +
      (champion
        ? '<div class="champ-box">' + icons.trophy + "<strong>" + esc(champion) + "</strong><span>Winner of " + esc(roundName(t.bracket.length - 1, t.bracket.length)) + "</span></div>"
        : '<div class="champ-box">Pick winners through the<br>final to crown a champion</div>') +
      "</div>";

    wrap.innerHTML = html;
  }

  function bindBracket() {
    var bracketEl = $("#bracket");

    bracketEl.addEventListener("input", function (e) {
      if (!ADMIN_SESSION) return; /* only admins can edit bracket slots */
      var el = e.target;
      if (el.getAttribute("data-action") !== "slot") return;
      var t = activeT();
      if (!t) return;
      var ri = +el.getAttribute("data-round");
      var mi = +el.getAttribute("data-match");
      var side = el.getAttribute("data-side");
      var m = t.bracket[ri] && t.bracket[ri][mi];
      if (!m) return;
      var old = m[side];
      m[side] = el.value.trim();
      if (m.winner && m.winner === old) {
        /* the winning slot was renamed (or cleared) → follow it */
        m.winner = m[side] || null;
        if (m.winner) {
          advance(t, ri, mi, m.winner);
        } else {
          clearDownstream(t, ri, mi);
          pruneTrailingEmptyRounds(t);
        }
      }
      persist();
      refreshChampionOnly(t);
    });

    bracketEl.addEventListener("change", function (e) {
      if (!ADMIN_SESSION) return;
      /* keep visuals in sync after picking a team from the datalist */
      if (e.target.getAttribute && e.target.getAttribute("data-action") === "slot") renderBracket();
    });
  }

  function refreshChampionOnly(t) {
    /* cheap update while typing: recalc champion banner only */
    var champ = $("#champion");
    var finalRound = t.bracket[t.bracket.length - 1];
    var champion = finalRound && finalRound.length === 1 && finalRound[0].winner ? finalRound[0].winner : null;
    if (champion) {
      champ.hidden = false;
      champ.innerHTML = icons.trophy + "<div><div class='champ-label'>Champion</div><div class='champ-name'>" + esc(champion) + "</div></div>";
    } else {
      champ.hidden = true;
      champ.innerHTML = "";
    }
  }

  function autofillRound1(t) {
    if (!t.teams.length) { toast("Add teams first — nothing to fill from.", "warn"); return; }
    if (t.bracket.some(function (r) { return r.some(function (m) { return m.a || m.b || m.winner; }); })) {
      if (!window.confirm("Round 1 already has content. Overwrite it with the current team list?")) return;
    }
    var names = t.teams.map(function (x) { return x.name; });
    var matches = [];
    for (var i = 0; i < names.length; i += 2) {
      matches.push(makeMatch(names[i] || "", names[i + 1] || ""));
    }
    if (matches.length % 2 === 0 && matches.length > 1) {
      /* even number of matches keeps pairing clean; odd is fine too */
    }
    t.bracket[0] = matches;
    pruneTrailingEmptyRounds(t);
    persist();
    renderBracket();
    toast("Round 1 filled with " + matches.length + " matches.", "ok");
  }

  /* ============================ Global actions & nav ============================ */

  function switchView(name) {
    $all(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
    $all(".nav-item").forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-view") === name); });
    var v = $("#view-" + name);
    $("#view-title").textContent = v.getAttribute("data-title");
    $("#view-sub").textContent = v.getAttribute("data-sub");
    /* Money is admin-only: non-admin users cannot switch into that view at all.
       If they somehow arrive there (cached URL, deep link, etc.), force them out. */
    if (name === "money" && !ADMIN_SESSION) {
      switchView("tournaments");
      toast("The Money section is only available to administrators.", "warn");
      return;
    }
    if (name === "money") {
      bindMoney();
    }
    if (name === "bracket") renderBracket();
    /* Money section is physically hidden for non-admins (the view is never
       activated for them, and the nav button is removed from their DOM).
       Administrators see it normally via the active-view logic. */
    $("#view-money").hidden = !ADMIN_SESSION;
  }

  function resetActiveForm() {
    var activeView = document.querySelector(".view.active");
    if (!activeView) return;

    var viewId = activeView.id;
    var form;
    var message;

    if (viewId === "view-tournaments") {
      form = $("#t-form");
      message = "Reset the tournament form? Saved tournaments will not be changed.";
    } else if (viewId === "view-teams") {
      form = $("#tm-form");
      message = "Reset the team form? Saved teams will not be changed.";
    } else if (viewId === "view-money") {
      form = $("#ex-form");
      message = "Reset the expense form? Saved expenses will not be changed.";
    } else if (viewId === "view-rules") {
      form = $("#rule-form");
      message = "Reset the rule form? Saved rules will not be changed.";
    } else {
      toast("There is no editable form on this page.", "warn");
      return;
    }

    if (!window.confirm(message)) return;
    form.reset();

    if (viewId === "view-tournaments") {
      editingT = null;
      $("#t-date").value = todayISO();
      $("#t-cancel").hidden = true;
      $("#t-form-title").textContent = "Create tournament";
      $("#t-submit").textContent = "Create Tournament";
    } else if (viewId === "view-teams") {
      editingTm = null;
      $("#tm-cancel").hidden = true;
      $("#tm-form-title").textContent = "Add team";
      $("#tm-submit").textContent = "Add Team";
    } else if (viewId === "view-rules") {
      editingRule = null;
      $("#rule-cancel").hidden = true;
      $("#view-rules .panel-title").textContent = "Add a rule";
      $("#rule-submit").textContent = "Add Rule";
    }

    toast("Current form reset. Saved details were kept.", "ok");
  }

  function bindGlobal() {
    document.addEventListener("click", function (e) {
      var nav = e.target.closest("[data-action='nav']");
      if (nav) { switchView(nav.getAttribute("data-view")); return; }

      var el = e.target.closest("[data-action]");
      if (!el) return;
      var act = el.getAttribute("data-action");
      if (!act) return;

      /* Role-based permissions: mutating operations require an admin session,
       * enforced at the action/API layer (not just hidden in the DOM). */
      if (ADMIN_ACTIONS.has(act) && !requireAdmin()) return;

      var t = activeT();

      if (act === "select-t") {
        if (e.target.closest("[data-action='edit-t'],[data-action='del-t']")) return;
        state.activeId = el.getAttribute("data-id");
        persist();
        renderAll();
        toast("Active tournament: " + (activeT() ? activeT().name : "—"), "ok");
      } else if (act === "edit-t") {
        e.stopPropagation();
        startEditT(el.getAttribute("data-id"));
      } else if (act === "del-t") {
        e.stopPropagation();
        deleteT(el.getAttribute("data-id"));
      } else if (act === "edit-tm") {
        startEditTm(el.getAttribute("data-id"));
      } else if (act === "del-tm") {
        deleteTm(el.getAttribute("data-id"));
      } else if (act === "mark-paid") {
        var tm1 = t && t.teams.find(function (x) { return x.id === el.getAttribute("data-id"); });
        if (tm1) { tm1.paid = true; tm1.paidOn = todayISO(); persist(); renderAll(); toast(tm1.name + " marked as paid.", "ok"); }
      } else if (act === "unmark-paid") {
        var tm2 = t && t.teams.find(function (x) { return x.id === el.getAttribute("data-id"); });
        if (tm2) { tm2.paid = false; tm2.paidOn = null; persist(); renderAll(); toast(tm2.name + " marked unpaid.", "warn"); }
      } else if (act === "del-ex") {
        if (t) { t.expenses = t.expenses.filter(function (x) { return x.id !== el.getAttribute("data-id"); }); persist(); renderMoney(); toast("Expense removed.", "ok"); }
      } else if (act === "edit-rule") {
        startEditRule(el.getAttribute("data-id"));
      } else if (act === "del-rule") {
        deleteRule(el.getAttribute("data-id"));
      } else if (act === "cancel-edit-t") {
        editingT = null;
        $("#t-form").reset();
        $("#t-date").value = todayISO();
        $("#t-cancel").hidden = true;
        $("#t-form-title").textContent = "Create tournament";
        $("#t-submit").textContent = "Create Tournament";
      } else if (act === "cancel-edit-tm") {
        editingTm = null;
        $("#tm-form").reset();
        $("#tm-cancel").hidden = true;
        $("#tm-form-title").textContent = "Add team";
        $("#tm-submit").textContent = "Add Team";
      } else if (act === "reset-details") {
        resetActiveForm();
      } else if (act === "cancel-edit-rule") {
        editingRule = null;
        $("#rule-form").reset();
        $("#rule-cancel").hidden = true;
        document.querySelector("#view-rules .panel-title").textContent = "Add a rule";
        $("#rule-submit").textContent = "Add Rule";
      } else if (act === "pick-winner") {
        if (t) markWinner(t, +el.getAttribute("data-round"), +el.getAttribute("data-match"), el.getAttribute("data-side"));
      } else if (act === "add-match") {
        if (!t) return;
        var r = el.getAttribute("data-round");
        var idx = r === "auto" ? 0 : +r;
        if (!t.bracket[idx]) t.bracket[idx] = [];
        t.bracket[idx].push(makeMatch("", ""));
        persist();
        renderBracket();
      } else if (act === "add-round") {
        if (!t) return;
        t.bracket.push([makeMatch("", "")]);
        persist();
        renderBracket();
      } else if (act === "del-match") {
        if (!t) return;
        t.bracket[+el.getAttribute("data-round")].splice(+el.getAttribute("data-match"), 1);
        pruneTrailingEmptyRounds(t);
        persist();
        renderBracket();
      } else if (act === "reset-match") {
        if (!t) return;
        var ri3 = +el.getAttribute("data-round");
        var mi3 = +el.getAttribute("data-match");
        t.bracket[ri3][mi3].winner = null;
        clearDownstream(t, ri3, mi3);
        pruneTrailingEmptyRounds(t);
        persist();
        renderBracket();
        toast("Match result cleared.", "ok");
      } else if (act === "autofill") {
        if (t) autofillRound1(t);
      } else if (act === "focus-round") {
        el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });

    $("#t-select").addEventListener("change", function () {
      if (!ADMIN_SESSION) {
        this.value = state.activeId;
        toast("Only administrators can change the active tournament.", "warn");
        return;
      }
      state.activeId = this.value;
      persist();
      renderAll();
    });

    /* Enter key on tournament cards */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.getAttribute && e.target.getAttribute("data-action") === "select-t") {
        e.target.click();
      }
    });
  }

  /* ============================ Boot ============================ */

  function renderAll() {
    renderTournaments();
    renderTeams();
    if (ADMIN_SESSION) renderMoney();
    renderRules();
    renderBracket();
  }

  /* The active session's role (admin vs normal user) drives visibility of
     admin-only UI such as the Money menu and its handlers. This is enforced
     at the DOM level (insertion/removal) AND visually — not just display:none. */
  var ADMIN_SESSION = false; /* flipped by refreshSession() before any binding/render */

  /** Set of actions that only administrators may perform. Mutating handlers
   * call requireAdmin() first so the restriction is enforced at the action/
   * "API" layer, not just by hiding buttons in the DOM. */
  var ADMIN_ACTIONS = new Set([
    "edit-t", "del-t", "cancel-edit-t",
    "edit-tm", "del-tm", "cancel-edit-tm",
    "edit-rule", "del-rule", "cancel-edit-rule",
    "del-ex",
    "autofill", "add-match", "del-match", "reset-match", "pick-winner", "add-round",
    "mark-paid", "unmark-paid",
    "reset-details",
    "select-t"
  ]);

  /** Enforce role-based permissions at the action/API layer. If the current
   * session is not an admin session, the action is rejected even if someone
   * triggers it outside the normal UI (e.g. by crafting a DOM click). */
  function requireAdmin() {
    if (ADMIN_SESSION) return true;
    toast("Only administrators can perform this action.", "warn");
    return false;
  }

  function refreshSession() {
    var s = window.NovaAuth && window.NovaAuth.getSession();
    ADMIN_SESSION = !!(s && window.NovaAuth.isAdminSession(s));
    document.body.classList.toggle("ns-admin", ADMIN_SESSION);
    document.querySelector(".shell").dataset.admin = ADMIN_SESSION ? "1" : "0";
    renderAdminNav();
  }

  function renderAdminNav() {
    /* Physically insert or remove the Money nav button based on the session role.
       A normal user's DOM never contains a Money nav item and never has its
       click handler reachable, so this is not a purely visual hide. */
    var moneyBtn = document.querySelector(".nav-item[data-view='money']");
    var nav = document.querySelector(".nav");
    if (!moneyBtn || !nav) return;
    if (ADMIN_SESSION) {
      if (!moneyBtn.parentNode) nav.appendChild(moneyBtn);
    } else {
      moneyBtn.parentNode && moneyBtn.parentNode.removeChild(moneyBtn);
    }
  }

  function boot() {
    /* Route guard: no valid session → bounce to login before rendering anything */
    if (!window.NovaAuth || !window.NovaAuth.requireAuth()) return;

    refreshSession(); /* sets ADMIN_SESSION + dom flag + removes Money nav BEFORE any binding */
    $("#view-money").hidden = !ADMIN_SESSION; /* non-admins never see the Money section */
    paintUser();
    load();
    bindTournamentForm();
    bindTeamForm();
    bindRules();
    bindBracket();
    bindGlobal();
    $("#t-date").value = todayISO();
    if (ADMIN_SESSION) bindMoney();
    renderAll();
  }

  /* Signed-in user chip + logout */
  function paintUser() {
    try {
      var s = window.NovaAuth.getSession();
      if (!s) return;
      var box = document.getElementById("user-box");
      var name = window.NovaAuth.displayName(s);
      document.getElementById("user-name").textContent = name;
      document.getElementById("user-id").textContent = s.user;
      document.getElementById("user-avatar").textContent = (name[0] || "U").toUpperCase();
      box.hidden = false;
      document.getElementById("logout-btn").addEventListener("click", function () {
        window.NovaAuth.logout();
      });
    } catch (e) { /* user chip is cosmetic; never block the dashboard */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
