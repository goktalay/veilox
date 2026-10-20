(function(){
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM) document.documentElement.classList.add('rm');

  /* ---------- Brand / data config ---------- */
  var GSHOTS = [
    { src:'/static/img/landing/shots/randevu.webp?v=2', alt:'HEPGO Randevu Takvimi ekranı' },
    { src:'/static/img/landing/shots/field.webp?v=2', alt:'HEPGO Saha Yönetimi ekranı' },
    { src:'/static/img/landing/shots/dashboard.webp?v=2', alt:'HEPGO Müşteri / Firma Kartı ekranı' }
  ];
  function renderGShot(i){
    var s = GSHOTS[i] || GSHOTS[0];
    var img = document.getElementById('gtShot');
    if (img){ img.src = s.src; img.alt = s.alt; }
  }
  renderGShot(0);

  var gtabs = document.querySelectorAll('.gtab');
  gtabs.forEach(function(btn,i){
    btn.addEventListener('click', function(){
      gtabs.forEach(function(b){ b.classList.remove('on'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('on'); btn.setAttribute('aria-selected','true');
      renderGShot(i);
    });
  });

  /* ---------- Beta koltuk sayacı ---------- */
  (function(){
    var left = document.getElementById('seatLeft');
    var fill = document.getElementById('seatFill');
    var note = document.getElementById('seatNote');
    if (!left && !note) return;
    // Not metni çok dilli: site kiti (kit.js) varsa mtKit.t ile çevrilir, dil değişince yeniden yazılır
    var T = function(s, v){ return window.mtKit ? window.mtKit.t(s, v) : s.replace(/\{(\w+)\}/g, function(m, k){ return v && k in v ? v[k] : m; }); };
    var seat = null;
    var drawNote = function(){
      if (!note || !seat) return;
      note.textContent = seat.err ? T('Beta koltukları açık — hemen başvurun')
        : seat.rem > 0 ? T('{taken} firma katıldı · {rem} beta koltuğu kaldı', {taken: seat.taken, rem: seat.rem})
        : T('Tüm beta koltukları doldu — bekleme listesine katılın');
    };
    if (note) note.setAttribute('data-noi18n', '');
    window.addEventListener('mt-lang', drawNote);
    fetch('/api/beta/seats').then(function(r){ return r.json(); }).then(function(d){
      var total = d.total || 100, taken = d.taken || 0, rem = (typeof d.left === 'number') ? d.left : (total - taken);
      if (left) left.textContent = rem;
      if (fill) fill.style.width = Math.max(4, Math.min(100, Math.round(taken / total * 100))) + '%';
      seat = {taken: taken, rem: rem}; drawNote();
    }).catch(function(){
      if (left) left.textContent = '100';
      seat = {err: true}; drawNote();
    });
  })();

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.acc').forEach(function(acc){
    var head = acc.querySelector('.acc-head'), body = acc.querySelector('.acc-body');
    function setHeight(){ body.style.maxHeight = acc.classList.contains('open') ? body.scrollHeight + 'px' : '0px'; }
    head.addEventListener('click', function(){
      var open = acc.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      setHeight();
    });
    setHeight();
    window.addEventListener('resize', setHeight);
  });

  /* ---------- Key Tools panels ---------- */
  var ktTabs = document.querySelectorAll('.kt-tab');
  var ktPanels = document.querySelectorAll('.kt-panel');
  function ktSet(i){
    ktTabs.forEach(function(t,j){ t.classList.toggle('on', i===j); t.setAttribute('aria-selected', i===j?'true':'false'); });
    ktPanels.forEach(function(p,j){ p.classList.toggle('on', i===j); });
  }
  ktTabs.forEach(function(t,i){ t.addEventListener('click', function(){ ktSet(i); }); });

  /* ---------- Motion ---------- */
  if (window.gsap && window.ScrollTrigger && !RM){
    gsap.registerPlugin(ScrollTrigger);

    /* Hero load: staggered entrance with line-level blur reveal */
    gsap.set('[data-hero]', {opacity:0, y:26});
    gsap.set('[data-hero-line]', {yPercent:112, filter:'blur(10px)'});
    gsap.set('[data-hero-dash]', {opacity:0, y:80});
    var tl = gsap.timeline({defaults:{ease:'power3.out'}});
    tl.to('[data-hero]', {opacity:1, y:0, duration:.9, stagger:.12}, .15)
      .to('[data-hero-line]', {yPercent:0, filter:'blur(0px)', duration:1.05, stagger:.14, ease:'power4.out'}, .3)
      .to('[data-hero-dash]', {opacity:1, y:0, duration:1.15, ease:'power3.out'}, .75);

    /* Generic scroll reveals — reversible: play on enter, reverse on leave, both directions */
    gsap.utils.toArray('[data-reveal]').forEach(function(el){
      if (el.matches('.bcard,.dcard,.pcard,.acc,.tstat,.tquote')) return; /* grouped/directional choreo below */
      gsap.to(el, {
        opacity:1, y:0, duration:.9, ease:'power3.out',
        scrollTrigger:{trigger:el, start:'top 86%', toggleActions:'play reverse play reverse'}
      });
    });

    /* Section headings: word-level blur reveal, reversible */
    document.querySelectorAll('h2.sec').forEach(function(h){
      var parts = h.innerHTML.split(/<br\s*\/?>/i);
      h.setAttribute('aria-label', parts.map(function(t){ return t.replace(/<[^>]*>/g,'').trim(); }).filter(Boolean).join(' '));
      h.innerHTML = parts.map(function(line){
        return line.trim().split(/\s+/).filter(Boolean).map(function(w){
          return '<span class="w" aria-hidden="true">'+w+'</span>';
        }).join(' ');
      }).join('<br>');
      gsap.fromTo(h.querySelectorAll('.w'),
        {opacity:0, y:16, filter:'blur(8px)'},
        {opacity:1, y:0, filter:'blur(0px)', duration:.7, ease:'power3.out', stagger:.045,
         scrollTrigger:{trigger:h, start:'top 88%', toggleActions:'play reverse play reverse', pinnedContainer:(h.closest('#ktPin')||undefined)}});
    });

    /* Card grids: staggered rise, reversible */
    [['.bento','.bcard'],['.dgrid','.dcard'],['.pcards','.pcard'],['.faq','.acc']].forEach(function(pair){
      var grid = document.querySelector(pair[0]);
      if (!grid) return;
      var cards = grid.querySelectorAll(pair[1]);
      if (!cards.length) return;
      gsap.fromTo(cards, {opacity:0, y:34},
        {opacity:1, y:0, duration:.8, ease:'power3.out', stagger:.09,
         scrollTrigger:{trigger:grid, start:'top 84%', toggleActions:'play reverse play reverse'}});
    });

    /* Testimonials: directional slides (stats from left, quotes from right), reversible */
    gsap.utils.toArray('.tstat').forEach(function(el){
      gsap.fromTo(el, {opacity:0, x:-48, y:0},
        {opacity:1, x:0, y:0, duration:.85, ease:'power3.out',
         scrollTrigger:{trigger:el, start:'top 88%', toggleActions:'play reverse play reverse'}});
    });
    gsap.utils.toArray('.tquote').forEach(function(el){
      gsap.fromTo(el, {opacity:0, x:48, y:0},
        {opacity:1, x:0, y:0, duration:.85, ease:'power3.out',
         scrollTrigger:{trigger:el, start:'top 88%', toggleActions:'play reverse play reverse'}});
    });

    /* Hero parallax drift (scrub) */
    gsap.to('[data-hero-dash]', {yPercent:-9, ease:'none',
      scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:.6}});
    gsap.to('.hero-chart-bg', {yPercent:18, ease:'none',
      scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:.6}});

    /* Showcase dashboard drift (scrub) */
    var scDash = document.querySelector('.showcase .dash');
    if (scDash) gsap.fromTo(scDash, {y:56}, {y:-56, ease:'none',
      scrollTrigger:{trigger:'.showcase', start:'top bottom', end:'bottom top', scrub:.8}});

    /* Key Tools: scroll-driven tab swap with pinned right panel */
    ScrollTrigger.create({
      trigger:'#keytools', start:'top 15%', end:'+=1400', pin:'#ktPin', scrub:true, refreshPriority:1,
      onUpdate:function(self){
        var i = Math.min(2, Math.floor(self.progress * 3));
        ktSet(i);
      }
    });

    /* Dark panel entrance */
    gsap.from('.dark', {
      yPercent:6, borderRadius:'56px', ease:'none',
      scrollTrigger:{trigger:'.dark', start:'top 95%', end:'top 45%', scrub:true}
    });
  } else {
    /* Reduced motion / no GSAP: everything visible, key tools clickable only */
    document.querySelectorAll('[data-reveal]').forEach(function(el){ el.style.opacity=1; el.style.transform='none'; });
  }
})();
