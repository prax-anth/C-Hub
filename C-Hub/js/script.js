/* ============================================================
   Nova — shared script: effects engine + auth page logic
   ============================================================ */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     Effects engine (both pages)
     ============================================================ */

  // Pointer spotlight: grid mask + card glow follow the cursor
  function initSpotlight() {
    var grid = document.querySelector(".bg-grid");
    var cards = document.querySelectorAll(".card");

    document.addEventListener("pointermove", function (e) {
      if (grid) {
        grid.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 100) + "%");
        grid.style.setProperty("--my", ((e.clientY / window.innerHeight) * 100) + "%");
      }
      cards.forEach(function (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100) + "%");
        card.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    }, { passive: true });
  }

  // Subtle 3D tilt on the card
  function initTilt() {
    if (reducedMotion) return;
    var card = document.querySelector(".card");
    if (!card) return;

    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      var rx = (-py * 2.5).toFixed(2);
      var ry = (px * 3.5).toFixed(2);
      card.style.transform = "perspective(1100px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    });
    card.addEventListener("pointerleave", function () {
      card.style.transform = "";
    });
  }

  // Spawn a ripple inside a button
  function spawnRipple(el, e) {
    var rect = el.getBoundingClientRect();
    var d = Math.max(rect.width, rect.height);
    var ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = d + "px";
    ripple.style.height = d + "px";
    ripple.style.left = (e.clientX - rect.left - d / 2) + "px";
    ripple.style.top = (e.clientY - rect.top - d / 2) + "px";
    el.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 700);
  }

  function initRipples() {
    document.querySelectorAll(".btn, .admin-opt").forEach(function (el) {
      el.addEventListener("pointerdown", function (e) {
        if (el.disabled) return;
        spawnRipple(el, e);
      });
    });
  }

  // Staggered entrance for card children
  function initReveal() {
    if (reducedMotion) return;
    document.querySelectorAll(".card").forEach(function (card) {
      Array.prototype.forEach.call(card.children, function (el, i) {
        el.classList.add("reveal");
        setTimeout(function () { el.classList.add("in"); }, 90 + i * 55);
      });
    });
  }

  /* ============================================================
     Shared validation
     ============================================================ */

  function validateEmailOrPhone(value) {
    var v = value.trim();
    if (!v) return { ok: false, msg: "Email or phone is required." };

    var digits = v.replace(/[\s()\-.]/g, "");
    if (/^\+?\d+$/.test(digits)) {
      if (digits.length < 7 || digits.length > 15) {
        return { ok: false, msg: "Enter a valid phone number (7\u201315 digits)." };
      }
      return { ok: true, msg: "Looks good \u2014 we\u2019ll text you a code." };
    }

    var emailRe = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
    if (!emailRe.test(v)) {
      return { ok: false, msg: v.indexOf("@") === -1
        ? "Enter a valid email address or phone number."
        : "That email address doesn\u2019t look right." };
    }
    return { ok: true, msg: "Looks good \u2014 we\u2019ll email you a verification link." };
  }

  function scorePassword(value) {
    if (!value) return 0;
    var score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    if (value.length >= 8 && (/^(.)\1+$/.test(value) || /^(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf|zxcv)/i.test(value))) score = Math.min(score, 2);
    return Math.max(1, Math.min(4, score));
  }

  function validatePassword(value) {
    if (!value) return { ok: false, msg: "Password is required." };
    if (value.length < 8) return { ok: false, msg: "Password must be at least 8 characters." };
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
      return { ok: false, msg: "Use at least one letter and one number." };
    }
    var s = scorePassword(value);
    var labels = ["", "Weak", "Fair", "Strong", "Excellent"];
    return { ok: true, msg: "Password strength: " + labels[s], score: s };
  }

  function attachToggles(root) {
    root.querySelectorAll(".toggle-pass").forEach(function (t) {
      t.addEventListener("click", function () {
        var input = document.getElementById(t.getAttribute("data-target"));
        var showing = input.type === "text";
        input.type = showing ? "password" : "text";
        t.setAttribute("aria-pressed", String(!showing));
        t.setAttribute("aria-label", (showing ? "Show" : "Hide") +
          (t.getAttribute("data-target").indexOf("confirm") !== -1 ? " confirm password" : " password"));
        input.focus({ preventScroll: true });
      });
    });
  }

  function wireField(f, revalidate, touched, hideBanner) {
    f.input.addEventListener("input", function () {
      if (hideBanner) hideBanner();
      revalidate(f.key);
    });
    f.input.addEventListener("blur", function () {
      touched[f.key] = true;
      revalidate(f.key, true);
    });
  }

  /* ============================================================
     Page bootstrap by data-page attribute
     ============================================================ */
  var page = document.body.getAttribute("data-page");
  var isRegisterPage = page === "register" || page === "both";
  var isLoginPage = page === "login" || page === "both";

  /* ---------------- REGISTER ---------------- */
  if (isRegisterPage) (function () {
    var regForm = document.getElementById("register-form");
    var regBtn = document.getElementById("register-btn");
    var strengthEl = document.getElementById("reg-strength");
    if (!regForm || !regBtn) return; /* register markup missing; skip safely */

    var regFields = {
      contact: {
        key: "contact",
        input: document.getElementById("reg-contact"),
        wrap: document.getElementById("wrap-reg-contact"),
        msg: document.getElementById("reg-contact-msg")
      },
      password: {
        key: "password",
        input: document.getElementById("reg-password"),
        wrap: document.getElementById("wrap-reg-password"),
        msg: document.getElementById("reg-password-msg")
      },
      confirm: {
        key: "confirm",
        input: document.getElementById("reg-confirm"),
        wrap: document.getElementById("wrap-reg-confirm"),
        msg: document.getElementById("reg-confirm-msg")
      }
    };
    var regTouched = { contact: false, password: false, confirm: false };
    var regResults = {
      contact: { ok: false, msg: "" },
      password: { ok: false, msg: "" },
      confirm: { ok: false, msg: "" }
    };

    function validateConfirm(value) {
      if (!value) return { ok: false, msg: "Please confirm your password." };
      if (value !== regFields.password.input.value) return { ok: false, msg: "Passwords do not match." };
      return { ok: true, msg: "Passwords match." };
    }

    function regRender(key, result, force) {
      var f = regFields[key];
      var show = force || regTouched[key];
      f.wrap.classList.toggle("invalid", show && !result.ok);
      f.wrap.classList.toggle("valid", show && result.ok);
      f.input.setAttribute("aria-invalid", String(show && !result.ok));
      var msgEl = f.msg;
      if (show && result.msg) {
        msgEl.textContent = result.msg;
        msgEl.classList.add("show");
        msgEl.classList.toggle("ok", result.ok);
      } else {
        msgEl.classList.remove("show", "ok");
      }
      regUpdateButton();
    }

    function regUpdateButton() {
      regBtn.disabled = !["contact", "password", "confirm"].every(function (k) {
        return regResults[k] && regResults[k].ok;
      });
    }

    function regRevalidate(key, force) {
      var value = regFields[key].input.value;
      var r;
      if (key === "contact") r = validateEmailOrPhone(value);
      else if (key === "password") r = validatePassword(value);
      else r = validateConfirm(value);
      regResults[key] = r;
      regRender(key, r, force);

      if (key === "password") {
        if (value) {
          strengthEl.hidden = false;
          strengthEl.className = "strength s" + scorePassword(value);
        } else {
          strengthEl.hidden = true;
          strengthEl.className = "strength";
        }
        if (regTouched.confirm || regFields.confirm.input.value) {
          regResults.confirm = validateConfirm(regFields.confirm.input.value);
          regRender("confirm", regResults.confirm);
        }
      }
    }

    Object.keys(regFields).forEach(function (key) {
      wireField(regFields[key], regRevalidate, regTouched);
    });

    regForm.addEventListener("submit", function (e) {
      e.preventDefault();
      ["contact", "password", "confirm"].forEach(function (k) {
        regTouched[k] = true;
        regRevalidate(k, true);
      });
      if (regBtn.disabled) {
        var firstBad = ["contact", "password", "confirm"].find(function (k) { return !regResults[k].ok; });
        if (firstBad) regFields[firstBad].input.focus();
        return;
      }

      /* Save the account (hashed password) in the user store, then go log in */
      regBtn.disabled = true;
      regBtn.textContent = "Creating account\u2026";
      try { sessionStorage.setItem("nova-last-registered", regFields.contact.input.value.trim().toLowerCase()); } catch (err) { /* ignore */ }
      window.NovaAuth.register(regFields.contact.input.value, regFields.password.input.value)
        .then(function (res) {
          if (!res.ok) {
            regBtn.disabled = false;
            regBtn.textContent = "Create Account";
            if (res.error === "exists") {
              regResults.contact = { ok: false, msg: "An account with this email or phone already exists. Try logging in instead." };
              regRender("contact", regResults.contact, true);
              regFields.contact.input.focus();
            } else if (res.error === "reserved") {
              regResults.contact = { ok: false, msg: "This email is reserved for the administrator and cannot be registered." };
              regRender("contact", regResults.contact, true);
              regFields.contact.input.focus();
            } else {
              regResults.password = { ok: false, msg: "Please choose a stronger password." };
              regRender("password", regResults.password, true);
            }
            return;
          }
          regBtn.textContent = "Account created \u2713 \u2014 taking you to login\u2026";
          regBtn.style.background = "linear-gradient(135deg, #059669, #10b981)";
          setTimeout(function () {
            window.location.href = window.NovaAuth.LOGIN_URL + "?registered=1";
          }, 900);
        })
        .catch(function () {
          regBtn.disabled = false;
          regBtn.textContent = "Create Account";
        });
    });

    regUpdateButton();
  })();

  /* ---------------- LOGIN (+ ADMIN) ---------------- */
  if (isLoginPage) (function () {
    var card = document.getElementById("login-form");
    if (!card) return; /* login markup missing; skip login logic safely */
    card = card.closest(".card");
    if (!card) return;

    var badge = document.getElementById("badge");
    var title = document.getElementById("login-title");
    var subtitle = document.getElementById("subtitle");
    var contactLabel = document.getElementById("contact-label");
    var banner = document.getElementById("banner");
    var bannerText = document.getElementById("banner-text");
    var loginBtn = document.getElementById("login-btn");
    var adminToggle = document.getElementById("admin-toggle");
    var adminToggleLabel = document.getElementById("admin-toggle-label");
    var forgotUser = document.getElementById("forgot-user");
    var altText = document.getElementById("alt-text");

    if (!loginBtn || !adminToggle) return; /* required controls missing */

    var loginForm = document.getElementById("login-form");
    var loginFields = {
      contact: {
        key: "contact",
        input: document.getElementById("login-contact"),
        wrap: document.getElementById("wrap-login-contact"),
        msg: document.getElementById("login-contact-msg")
      },
      password: {
        key: "password",
        input: document.getElementById("login-password"),
        wrap: document.getElementById("wrap-login-password"),
        msg: document.getElementById("login-password-msg")
      }
    };
    var loginTouched = { contact: false, password: false };
    var adminMode = false;
    var loginResults = {
      contact: { ok: false, msg: "" },
      password: { ok: false, msg: "" }
    };

    function validateLoginContact(value) {
      var v = value.trim();
      if (adminMode) {
        if (!v) return { ok: false, msg: "Admin ID is required." };
        var base = validateEmailOrPhone(v);
        if (!base.ok) return base;
        return { ok: true, msg: "Admin ID accepted." };
      }
      return validateEmailOrPhone(value);
    }

    function validateLoginPassword(value) {
      if (!value) return { ok: false, msg: "Password is required." };
      if (value.length < 8) return { ok: false, msg: "Password must be at least 8 characters." };
      return { ok: true, msg: "" };
    }

    function loginRender(key, result, force) {
      var f = loginFields[key];
      var show = force || loginTouched[key];
      f.wrap.classList.toggle("invalid", show && !result.ok);
      f.wrap.classList.toggle("valid", show && result.ok && !!result.msg);
      f.input.setAttribute("aria-invalid", String(show && !result.ok));
      var msgEl = f.msg;
      if (show && result.msg) {
        msgEl.textContent = result.msg;
        msgEl.classList.add("show");
        msgEl.classList.toggle("ok", result.ok);
      } else {
        msgEl.classList.remove("show", "ok");
      }
      loginUpdateButton();
    }

    function loginUpdateButton() {
      loginBtn.disabled = !["contact", "password"].every(function (k) {
        return loginResults[k] && loginResults[k].ok;
      });
    }

    function loginRevalidate(key, force) {
      var value = loginFields[key].input.value;
      var r = key === "contact" ? validateLoginContact(value) : validateLoginPassword(value);
      loginResults[key] = r;
      loginRender(key, r, force);
    }

    function showBanner(text) {
      bannerText.textContent = text;
      banner.classList.add("show");
    }
    function hideBanner() {
      banner.classList.remove("show");
    }

    forgotUser.addEventListener("click", function (e) {
      e.preventDefault();
      showBanner("Password reset is not available in this local demo. Please create a new account or contact an administrator.");
      history.replaceState(null, "", location.pathname + location.search + "#forgot");
    });

    /* Swap User Login <-> Admin Login instantly (no transition).
       The 0.5s page transition was removed per design change. */

    function applyAdminMode(on) {
      adminMode = on;
      card.classList.toggle("admin", on);
      if (badge) badge.hidden = !on;
      adminToggle.setAttribute("aria-pressed", String(on));
      if (adminToggleLabel) adminToggleLabel.textContent = on ? "Switch to User Login" : "Admin Login";
      if (forgotUser) forgotUser.hidden = on;
      if (title) title.textContent = on ? "Admin Console" : "Welcome back";
      if (subtitle) subtitle.textContent = on
        ? "Sign in with your administrator credentials to access the Nova control plane."
        : "Log in to your Nova workspace to pick up where you left off.";
      if (contactLabel) contactLabel.textContent = on ? "Admin ID" : "Email or phone";
      loginFields.contact.input.placeholder = on
        ? "customhub@gmail.com"
        : "you@example.com or +1 555 000 1234";
      loginFields.contact.input.setAttribute("aria-label", on ? "Admin ID" : "Email or phone");
      loginBtn.textContent = on ? "Log In to Admin Console" : "Log In";
      if (altText) altText.textContent = on ? "Not an admin?" : "New to Nova?";

      loginRevalidate("contact", true);
      loginRevalidate("password", true);
      hideBanner();
      document.title = on ? "Admin Console \u00b7 Nova" : "Login \u00b7 Nova";
    }

    function setAdminMode(on) {
      if (adminMode === on) return;
      applyAdminMode(on);
      if (history.replaceState) history.replaceState(null, "", on ? "#admin" : "#login");
    }

    adminToggle.addEventListener("click", function () {
      setAdminMode(!adminMode);
    });

    /* Deep link: /login.html#admin opens straight into Admin Console */
    if (location.hash === "#admin") {
      applyAdminMode(true);
    }

    /* Authenticated users never sit on the login page — send them to the dashboard */
    if (window.NovaAuth.getSession()) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Already signed in \u2014 opening dashboard\u2026";
      setTimeout(function () { window.location.replace(window.NovaAuth.DASHBOARD_URL); }, 600);
      return;
    }

    /* Status banners driven by query params from the auth flow */
    var qp = new URLSearchParams(location.search);
    if (qp.get("registered") === "1") {
      showBanner("Account created \u2713 \u2014 log in with your email/phone and password.");
      var firstReg = sessionStorage.getItem("nova-last-registered");
      if (firstReg) {
        loginFields.contact.input.value = firstReg;
        loginTouched.contact = true;
        loginRevalidate("contact", true);
      }
      history.replaceState(null, "", location.pathname + location.hash);
    } else if (qp.get("auth") === "required") {
      showBanner("Please log in to access the Tournament Dashboard.");
      history.replaceState(null, "", location.pathname + location.hash);
    } else if (qp.get("logged-out") === "1") {
      showBanner("You have been logged out.");
      history.replaceState(null, "", location.pathname + location.hash);
    }

    Object.keys(loginFields).forEach(function (key) {
      wireField(loginFields[key], loginRevalidate, loginTouched, hideBanner);
    });

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      ["contact", "password"].forEach(function (k) {
        loginTouched[k] = true;
        loginRevalidate(k, true);
      });
      if (loginBtn.disabled) {
        var firstBad = ["contact", "password"].find(function (k) { return !loginResults[k].ok; });
        if (firstBad) loginFields[firstBad].input.focus();
        return;
      }

      /* Authenticate against the local user store, then start a session */
      var busyLabel = adminMode ? "Verifying\u2026" : "Logging in\u2026";
      var restLabel = adminMode ? "Log In to Admin Console" : "Log In";
      loginBtn.disabled = true;
      loginBtn.textContent = busyLabel;
      var creds = loginFields.contact.input.value;
      var pass = loginFields.password.input.value;

      var attempt = window.NovaAuth.login(creds, pass);

      attempt.then(function (res) {
        if (!res.ok) {
          loginBtn.disabled = false;
          loginBtn.textContent = restLabel;
          showBanner(res.error === "nouser"
            ? (adminMode ? "No admin account found with this ID."
                         : "No account found for this email or phone. Create one below.")
            : (adminMode ? "Incorrect admin password. Please try again."
                         : "Incorrect password. Please try again."));
          loginFields.password.input.value = "";
          loginFields.password.input.focus();
          return;
        }
        window.NovaAuth.createSession(res.user);
        loginBtn.textContent = res.admin
          ? "Administrator verified \u2713 \u2014 opening dashboard\u2026"
          : "Welcome back \u2713 \u2014 opening dashboard\u2026";
        setTimeout(function () {
          window.location.href = window.NovaAuth.postLoginUrl();
        }, 700);
      }).catch(function () {
        loginBtn.disabled = false;
        loginBtn.textContent = restLabel;
        showBanner("Something went wrong. Please try again.");
      });
    });

    loginUpdateButton();
  })();

  /* ============================================================
     Boot effects — must run even if a page block above failed
     ============================================================ */
  try { attachToggles(document); } catch (e) { /* non-fatal */ }
  try { initSpotlight(); } catch (e) { /* non-fatal */ }
  try { initTilt(); } catch (e) { /* non-fatal */ }
  try { initRipples(); } catch (e) { /* non-fatal */ }
  try { initReveal(); } catch (e) { /* non-fatal */ }
})();
