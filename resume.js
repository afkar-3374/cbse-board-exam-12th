/* Study Hub: remembers where you left off (this browser only, via localStorage). */
(function () {
  var P = 'sh:', path = location.pathname.replace(/index\.html$/, '');
  function get(k) { try { return JSON.parse(localStorage.getItem(P + k)); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(P + k); } catch (e) {} }
  var isHome = !!document.querySelector('meta[name="sh-home"]');

  // 1. Scroll position per page
  var pos = get('pos:' + path);
  if (pos && !location.hash) {
    var restore = function () { window.scrollTo(0, pos); };
    restore(); window.addEventListener('load', restore);
  }
  var tmr;
  window.addEventListener('scroll', function () {
    clearTimeout(tmr);
    tmr = setTimeout(function () {
      set('pos:' + path, Math.round(window.scrollY));
      if (!isHome) set('last', { path: location.pathname, title: document.title, t: Date.now() });
    }, 300);
  }, { passive: true });
  if (!isHome) set('last', { path: location.pathname, title: document.title, t: Date.now() });

  // 2. Opened answers (<details>)
  var dets = document.querySelectorAll('main details');
  if (dets.length) {
    var open = get('det:' + path) || [];
    open.forEach(function (i) { if (dets[i]) dets[i].open = true; });
    var saveDet = function () {
      var o = []; dets.forEach(function (d, i) { if (d.open) o.push(i); }); set('det:' + path, o);
    };
    dets.forEach(function (d) { d.addEventListener('toggle', saveDet); });
  }

  // 3. Answered MCQs in the NEET mock (.qcard)
  var cards = document.querySelectorAll('.qcard');
  if (cards.length) {
    var picks = get('mcq:' + path) || {};
    cards.forEach(function (c, ci) {
      var bs = c.querySelectorAll('button');
      bs.forEach(function (b, bi) {
        b.addEventListener('click', function () {
          if (picks[ci] === undefined) { picks[ci] = bi; set('mcq:' + path, picks); }
        });
      });
    });
    Object.keys(picks).forEach(function (ci) {
      var c = cards[ci]; if (!c) return;
      var b = c.querySelectorAll('button')[picks[ci]];
      var keep = picks[ci]; delete picks[ci];
      if (b) b.click();
      picks[ci] = keep;
    });
    set('mcq:' + path, picks);
    var main = document.querySelector('main');
    if (main && Object.keys(picks).length) {
      var r = document.createElement('p');
      r.innerHTML = '<button type="button" style="font:inherit;font-size:.88rem;background:var(--accent-soft);color:var(--accent);border:0;border-radius:999px;padding:5px 13px;cursor:pointer">Reset my answers and start again</button>';
      r.firstChild.onclick = function () { del('mcq:' + path); del('pos:' + path); location.reload(); };
      var score = document.querySelector('.score');
      (score ? score.parentNode : main).insertBefore(r, score || main.firstChild);
    }
  }

  // 4. "Continue where you left off" on the home page
  if (isHome) {
    var last = get('last'), slot = document.getElementById('resume');
    if (last && slot) {
      var mins = Math.round((Date.now() - last.t) / 60000);
      var ago = mins < 1 ? 'just now' : mins < 60 ? mins + ' min ago' : mins < 1440 ? Math.round(mins / 60) + ' h ago' : Math.round(mins / 1440) + ' days ago';
      var a = document.createElement('a');
      a.href = last.path; a.className = 'resume';
      a.innerHTML = '<span class="ic">↩️</span><div><b>Continue where you left off</b><span></span></div>';
      a.querySelector('div span').textContent = last.title + ' · ' + ago;
      slot.appendChild(a);
    }
  }
})();
