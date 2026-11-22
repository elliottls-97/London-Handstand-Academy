/* ── the free beginner plan, on every Learn page (23 Nov 2026) ─────────
   Elliott: "Learn should be our main lead magnet". A first name and an
   email make a free account (no password), the app's plan email goes to
   the address with five short notes over ten days, and the app opens on
   this phone already signed in, on Foundations. An address that already
   has an account gets a sign in code instead. The card is placed by the
   page ([data-plan]) or, on a page without one, before the page's own
   "Train it" box or at the end of the article. */
(function(){
  if (window.__lhaPlan) return; window.__lhaPlan = 1;
  var css = '.lp-card{margin:40px 0 0;background:#fff;border:1.5px solid rgba(35,127,149,.35);border-radius:24px;padding:26px 24px;'
    + 'box-shadow:0 1px 2px rgba(29,85,102,.05),0 8px 20px rgba(29,85,102,.06);font-family:Figtree,system-ui,sans-serif;color:#111}'
    + '.lp-k{font:600 12px/1 Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#237f95}'
    + '.lp-h{font:400 32px/1.05 Newsreader,Georgia,serif;margin:10px 0 8px;letter-spacing:-.01em;text-wrap:balance}.lp-h em{font-style:normal;color:#237f95}'
    + '.lp-p{margin:0 0 16px;font-size:16px;line-height:1.55;color:#5a5a5a}'
    + '.lp-f{display:grid;grid-template-columns:1fr 1.4fr auto;gap:10px}'
    + '.lp-f input[type=text],.lp-f input[type=email]{height:52px;border-radius:14px;border:1px solid rgba(29,85,102,.2);padding:0 14px;font:500 16px/1 Figtree,system-ui,sans-serif;min-width:0;background:#fff;color:#111}'
    + '.lp-f button{height:52px;border:0;border-radius:999px;padding:0 22px;cursor:pointer;font:600 16px/1 Figtree,system-ui,sans-serif;color:#f7f4f1;'
    + 'background:linear-gradient(180deg,#2f93a9,#237f95);box-shadow:0 12px 30px rgba(35,127,149,.3),inset 0 1px 0 rgba(255,255,255,.35);white-space:nowrap}'
    + '.lp-f button[disabled]{opacity:.6;cursor:default}'
    + '.lp-m{display:flex;gap:9px;align-items:flex-start;margin-top:12px;font-size:14px;line-height:1.45;color:#5a5a5a}.lp-m input{margin-top:3px;width:18px;height:18px;accent-color:#237f95}'
    + '.lp-e{margin-top:10px;font:500 14px/1.45 Figtree,system-ui,sans-serif;color:#a4503c}'
    + '.lp-ok b{display:block;font:400 26px/1.1 Newsreader,Georgia,serif;margin:8px 0 6px}.lp-ok a{display:inline-block;margin-top:12px;text-decoration:none;'
    + 'background:linear-gradient(180deg,#2f93a9,#237f95);color:#f7f4f1;font:600 16px/1 Figtree,system-ui,sans-serif;padding:16px 24px;border-radius:999px}'
    + '@media(max-width:640px){.lp-f{grid-template-columns:1fr}.lp-card{padding:22px 18px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var src = (location.pathname.split('/').pop() || 'learn').replace(/[^a-z0-9-]/gi, '').slice(0, 12) || 'learn';
  var html = '<div class="lp-k">Free beginner plan</div>'
    + '<h2 class="lp-h">Your first handstand session, <em>sent to you.</em></h2>'
    + '<p class="lp-p">Tell me where to send it. Your first session opens in the free app straight away, and five short emails over ten days tell you what to work on first. No password, no card.</p>'
    + '<form class="lp-f" novalidate><input type="text" name="name" placeholder="First name" autocomplete="given-name" aria-label="First name" required>'
    + '<input type="email" name="email" placeholder="you@example.com" autocomplete="email" aria-label="Email" required>'
    + '<button type="submit">Send my plan</button></form>'
    + '<label class="lp-m"><input type="checkbox" name="mk"> Also tell me about classes and workshops in London. Unsubscribe any time.</label>'
    + '<div class="lp-e" role="alert" hidden></div>';
  function place(){
    var box = document.querySelector('[data-plan]');
    if (!box) {
      box = document.createElement('section');
      var before = document.querySelector('.cta, section[style*="#0f191d"]') ;
      var art = document.querySelector('article') || document.querySelector('main');
      if (before && before.parentNode) before.parentNode.insertBefore(box, before);
      else if (art) art.appendChild(box); else return;
    }
    box.className = (box.className ? box.className + ' ' : '') + 'lp-card';
    box.id = box.id || 'plan';
    box.innerHTML = html;
    wire(box);
  }
  function wire(box){
    var f = box.querySelector('form'), err = box.querySelector('.lp-e'), btn = f.querySelector('button');
    var say = function(t){ err.textContent = t; err.hidden = !t; };
    f.addEventListener('submit', function(e){
      e.preventDefault(); say('');
      var name = f.name.value.trim(), mail = f.email.value.trim();
      if (!name) { say('Add your first name.'); f.name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { say('That does not look like an email address.'); f.email.focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/app/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: mail, stage: 0, ref: 'learn-' + src, marketing: !!box.querySelector('.lp-m input').checked }) })
        .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
        .then(function(x){
          var d = x.d || {};
          if (x.ok && d.token) {
            /* the app opens on this phone signed in, unless somebody is already using it here */
            try { var s0 = JSON.parse(localStorage.getItem('lha_app') || 'null');
              if (!s0 || !s0.token) localStorage.setItem('lha_app', JSON.stringify(Object.assign({}, s0 || {}, { email: mail.toLowerCase(), token: d.token, name: name, mode: 'free', stage: 0, quizDone: true, tab: 'home' }))); } catch (e2) {}
            box.innerHTML = '<div class="lp-ok"><div class="lp-k">Sent</div><b>Check your inbox, ' + name.replace(/[<>&"]/g, '') + '.</b>'
              + '<p class="lp-p" style="margin:0">Your plan is on its way. Your first session is ready now, and it is free.</p>'
              + '<a href="/lha-app.html?ref=learn-plan">Open my first session</a></div>';
            try { if (window.gtag) gtag('event', 'plan_signup', { src: src }); } catch (e3) {}
            return;
          }
          if (d.codeSent || d.exists || d.setPassword) {
            box.innerHTML = '<div class="lp-ok"><div class="lp-k">You already have an account</div><b>Welcome back.</b>'
              + '<p class="lp-p" style="margin:0">' + (d.codeSent ? 'I have emailed you a sign in code. Open the app, press Sign in and type it in.' : 'Open the app and sign in with your email.') + '</p>'
              + '<a href="/lha-app.html?ref=learn-plan">Open the app</a></div>';
            return;
          }
          btn.disabled = false; btn.textContent = 'Send my plan';
          say(d.error || 'That did not go through. Check your signal and try again.');
        })
        .catch(function(){ btn.disabled = false; btn.textContent = 'Send my plan'; say('That did not go through. Check your signal and try again.'); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
})();
