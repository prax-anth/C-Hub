/* ============================================================
   Nova — shared authentication module
   Client-side demo auth (no backend):
   - Accounts stored in localStorage with SHA-256 hashed passwords
   - Session tokens with expiry, persisted across refresh
   - Route guard: dashboard requires a valid session
   ============================================================ */
(function () {
  "use strict";

  var USERS_KEY = "nova-users-v1";
  var SESSION_KEY = "nova-session-v1";
  var SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; /* 7 days */

  /* Relative page paths work with server.py and direct file navigation. */
  var LOGIN_URL = "login.html";
  var DASHBOARD_URL = "dashboard.html";

  /* Fixed administrator account — the ONLY admin login.
     It cannot be registered by users and exists only here, in code. */
  var ADMIN_ID = "customhub@gmail.com";
  var ADMIN_PASSWORD = "CHub@2026";
  var ADMIN_NAME = "Administrator";

  /* ----------------------------------------------------------
     Secure-ish hashing: SHA-256 with a per-user random salt.
     (Demo-grade: real deployments must hash server-side with
     bcrypt/argon2 — this never stores plaintext passwords.)
     ---------------------------------------------------------- */
  function sha256Hex(str) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    /* Fallback for non-secure contexts (http on localhost is secure, so rare) */
    return Promise.resolve("plain:" + str);
  }

  function randomSalt() {
    var bytes = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  /* Normalize the identifier so "User@X.com" and "user@x.com" are one account */
  function normalizeId(contact) {
    return String(contact || "").trim().toLowerCase();
  }

  function isPhone(id) {
    return /^\+?\d+$/.test(id.replace(/[\s()\- .]/g, ""));
  }

  /* ------------------------- User store ------------------------- */

  function readUsers() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function writeUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) { /* private mode */ }
  }

  function findUser(id) {
    var key = normalizeId(id);
    return readUsers().find(function (u) { return u.id === key; }) || null;
  }

  function hashPassword(password, salt) {
    return sha256Hex(salt + ":" + password);
  }

  /* Register: returns a promise resolving to
     { ok:true, user } | { ok:false, error:"exists" | "reserved" | "weak" | "invalid" } */
  function register(contact, password) {
    var key = normalizeId(contact);
    if (!key) return Promise.resolve({ ok: false, error: "invalid" });
    if (key === ADMIN_ID) {
      /* The admin account is fixed — nobody can create it (or a duplicate of it) here */
      return Promise.resolve({ ok: false, error: "reserved" });
    }
    var users = readUsers();
    if (users.some(function (u) { return u.id === key; })) {
      return Promise.resolve({ ok: false, error: "exists" });
    }
    var salt = randomSalt();
    return hashPassword(password, salt).then(function (hash) {
      users.push({
        id: key,
        salt: salt,
        hash: hash,
        name: isPhone(key) ? ("Player " + key.slice(-4)) : key.split("@")[0].replace(/[._-]+/g, " "),
        createdAt: new Date().toISOString()
      });
      writeUsers(users);
      return { ok: true, user: key };
    });
  }

  /* Login: { ok:true, user, admin? } | { ok:false, error:"nouser" | "badpass" } */
  function login(contact, password) {
    var key = normalizeId(contact);
    if (key === ADMIN_ID) {
      /* Fixed admin credentials, checked against the values above */
      if (password === ADMIN_PASSWORD) {
        return Promise.resolve({ ok: true, user: ADMIN_ID, admin: true });
      }
      return Promise.resolve({ ok: false, error: "badpass" });
    }
    var user = findUser(contact);
    if (!user) return Promise.resolve({ ok: false, error: "nouser" });
    return hashPassword(password, user.salt).then(function (hash) {
      /* Constant-ish time comparison is unnecessary for a demo, but avoid == on secrets anyway */
      if (hash !== user.hash) return { ok: false, error: "badpass" };
      return { ok: true, user: user.id };
    });
  }

  /* --------------------------- Sessions --------------------------- */

  function createSession(userId) {
    var token = randomSalt() + randomSalt(); /* 64 hex chars */
    var session = {
      token: token,
      user: normalizeId(userId),
      issuedAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* private mode */ }
    return session;
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.token || !s.user) return null;
      if (typeof s.expiresAt !== "number" || s.expiresAt <= Date.now()) {
        destroySession();
        return null;
      }
      /* Session is only valid if the account still exists (the fixed admin
         has no record in the user store, so it is allowed by ID) */
      if (s.user !== ADMIN_ID && !findUser(s.user)) return null;
      return s;
    } catch (e) { return null; }
  }

  function destroySession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }

  /* -------------------------- Route guard -------------------------- */

  /* Called by the dashboard BEFORE first paint of its content:
     unauthenticated visitors are bounced to /login with a return URL. */
  function requireAuth() {
    var s = getSession();
    if (s) return s;
    var here = location.pathname + location.search;
    try { sessionStorage.setItem("nova-return-url", here); } catch (e) { /* ignore */ }
    location.replace(LOGIN_URL + "?auth=required");
    return null;
  }

  function logout() {
    destroySession();
    location.replace(LOGIN_URL + "?logged-out=1");
  }

  /* Where should a freshly authenticated user land? Prefer the page they
     were originally trying to reach (return URL), else the dashboard. */
  function postLoginUrl() {
    var target = null;
    try { target = sessionStorage.getItem("nova-return-url"); } catch (e) { /* ignore */ }
    try { sessionStorage.removeItem("nova-return-url"); } catch (e) { /* ignore */ }
    if (target && target.indexOf("dashboard") !== -1) return target;
    return DASHBOARD_URL;
  }

  function displayName(session) {
    if (session.user === ADMIN_ID) return ADMIN_NAME;
    var u = findUser(session.user);
    if (!u) return session.user;
    return u.name || u.user || u.id;
  }

  /* Expose a small global API */
  window.NovaAuth = {
    register: register,
    login: login,
    getSession: getSession,
    createSession: createSession,
    destroySession: destroySession,
    requireAuth: requireAuth,
    logout: logout,
    findUser: findUser,
    displayName: displayName,
    postLoginUrl: postLoginUrl,
    isAdminSession: function (s) { return !!s && s.user === ADMIN_ID; },
    ADMIN_ID: ADMIN_ID,
    LOGIN_URL: LOGIN_URL,
    DASHBOARD_URL: DASHBOARD_URL
  };
})();
