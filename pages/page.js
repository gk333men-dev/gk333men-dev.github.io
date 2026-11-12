/* Portfolyo sayfası çalışma kodu: ölçekleme, görünürken oynatma, tıklayınca sesli izleme */
(function () {
  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  var root = document.documentElement;
  var board = document.querySelector('.board');
  var small = false;
  try { small = (framed ? window.parent.innerWidth : window.innerWidth) < 820; } catch (e) { small = window.innerWidth < 820; }
  if (small) root.classList.add('lite');
  var deck = null;
  try { deck = framed ? window.parent.__deck : null; } catch (e) {}

  if (framed) {
    root.classList.add('framed');
    if (deck) {
      // Mobil sunum: sayfa üzerinde kaydırınca önceki/sonraki sayfaya geç
      var tx = 0, ty = 0;
      document.addEventListener('touchstart', function (e) { var t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
      document.addEventListener('touchend', function (e) {
        var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
        if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy)) deck.go(dx < 0 ? 1 : -1);
      }, { passive: true });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') deck.go(1);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') deck.go(-1);
      });
    }
  } else {
    var fit = function () {
      var W = window.innerWidth, H = window.innerHeight;
      var land = W > H;
      var s = W / 1440;
      if (land) s = Math.min(s, H / 1018);
      var x = Math.max(0, (W - 1440 * s) / 2);
      var y = land ? Math.max(0, (H - 1018 * s) / 2) : 0;
      board.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
      document.body.style.height = (land ? H : Math.ceil(1018 * s)) + 'px';
      var hint = document.getElementById('gc-rotate');
      if (hint) hint.style.display = land ? 'none' : '';
    };
    window.addEventListener('resize', fit);
    fit();
    // Telefonda dik tutulduysa: yan çevirme ipucu
    if (window.innerWidth < 820 && window.innerHeight > window.innerWidth) {
      var h = document.createElement('div');
      h.id = 'gc-rotate';
      h.textContent = 'Daha büyük görmek için telefonu yan çevir';
      document.body.appendChild(h);
      setTimeout(function () { if (h.parentNode) h.style.opacity = '0'; }, 4500);
    }
  }

  // Giriş animasyonları: sayfa ekrana gelmeden içerik gizli kalmasın,
  // sayfa ilk kez görününce baştan oynasın.
  function finiteAnims() {
    if (!document.getAnimations) return [];
    return document.getAnimations().filter(function (a) {
      try { return a.effect && a.effect.getTiming().iterations !== Infinity; } catch (e) { return false; }
    });
  }
  var intro = finiteAnims();
  intro.forEach(function (a) { try { a.finish(); } catch (e) {} });

  var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  var seen = false, visible = null;
  function setVisible(on) {
    if (on && !seen) {
      seen = true;
      intro.forEach(function (a) { try { a.currentTime = 0; a.play(); } catch (e) {} });
    }
    if (on === visible) return;
    visible = on;
    root.classList.toggle('offscreen', !on);
    vids.forEach(function (v) {
      if (on) {
        // Telefonda küçük çerçevede otomatik oynatma yok: dokununca sesli oynar
        // GIF gibi: her ekranda sessiz ve döngüde kendiliğinden oynar
        if (v.preload === 'none') v.preload = 'auto';
        play(v);
      }
      else v.pause();
    });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { setVisible(es[0].isIntersecting); }, { threshold: 0.12 }).observe(board);
  } else {
    setVisible(true);
  }

  if (!vids.length) return;
  function muteAll() { vids.forEach(function (v) { v.muted = true; v.controls = false; }); }
  window.__gcMuteAll = muteAll;
  function muteOtherPages() {
    try {
      var fr = window.parent.frames;
      for (var i = 0; i < fr.length; i++) {
        try { if (fr[i] !== window && fr[i].__gcMuteAll) fr[i].__gcMuteAll(); } catch (e) {}
      }
    } catch (e) {}
  }
  vids.forEach(function (v) {
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.style.cursor = 'pointer';
    // GIF gibi: sessizken beklenmedik şekilde durursa kaldığı yerden devam et
    v.addEventListener('pause', function () {
      setTimeout(function () { if (visible && v.muted && v.paused && !document.hidden) play(v); }, 500);
    });
    v.addEventListener('click', function () {
      vids.forEach(function (o) { if (o !== v) { o.muted = true; o.controls = false; } });
      if (v.muted) {
        muteOtherPages();
        v.muted = false; v.controls = true; v.currentTime = 0;
        play(v);
      }
    });
  });

  // Doom 3B / AI: iki videoyu aynı karede tut
  if (document.body.hasAttribute('data-sync') && vids.length === 2) {
    var a = vids[0], b = vids[1];
    setInterval(function () {
      if (!a.duration || !b.duration || a.paused) return;
      var t = a.currentTime % b.duration;
      if (Math.abs(b.currentTime - t) > 0.25) b.currentTime = t;
    }, 1500);
  }
})();
