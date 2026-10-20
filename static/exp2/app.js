/* Quotia — motion & interaction layer (GSAP + ScrollTrigger, self-hosted) */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- hero word-split reveal ---------- */
  var heroTitle = document.getElementById("heroTitle");
  if (heroTitle) {
    var parts = heroTitle.innerHTML.split(/<br\s*\/?>/i);
    heroTitle.innerHTML = parts.map(function (line) {
      return line.trim().split(/\s+/).map(function (w) {
        return '<span class="w">' + w + "</span>";
      }).join(" ");
    }).join("<br>");
  }

  if (hasGsap && !reduced) {
    gsap.from("#heroTitle .w", {
      opacity: 0, y: 26, filter: "blur(8px)",
      duration: 0.7, ease: "power3.out", stagger: 0.06
    });
    gsap.from(".hero [data-reveal], .hero-note", {
      opacity: 0, y: 18, duration: 0.6, ease: "power3.out",
      stagger: 0.1, delay: 0.35
    });
    gsap.from(".dash-frame", {
      opacity: 0, y: 60, scale: 0.985, duration: 0.9,
      ease: "power3.out", delay: 0.55
    });
  }

  /* ---------- scroll reveals ---------- */
  if (hasGsap && window.ScrollTrigger && !reduced) {
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      gsap.from(group.children, {
        opacity: 0, y: 24, duration: 0.7, ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: "top 82%", once: true }
      });
    });
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      if (el.closest(".hero") || el.closest("[data-reveal-group]")) return;
      gsap.from(el, {
        opacity: 0, y: 24, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true }
      });
    });

    /* dark section curtain rise */
    var curtain = document.querySelector("[data-curtain]");
    if (curtain) {
      gsap.from(curtain, {
        y: 90, borderRadius: "48px", duration: 1, ease: "power2.out",
        scrollTrigger: { trigger: curtain, start: "top 92%", once: true }
      });
    }
  }

  /* ---------- traffic bars ---------- */
  var bars = document.querySelectorAll(".bar[data-val]");
  function fillBars() {
    bars.forEach(function (bar) {
      var v = parseFloat(bar.dataset.val) || 0;
      var target = Math.min(78, v * 1.5) + "%"; // keep % label inside card like reference
      bar.style.setProperty("--bar-w", target);
      if (hasGsap && !reduced) gsap.to(bar, { width: target, duration: 0.9, ease: "power3.out" });
      else bar.style.width = target;
    });
  }
  if (hasGsap && window.ScrollTrigger && !reduced) {
    ScrollTrigger.create({
      trigger: ".mini-traffic", start: "top 85%", once: true, onEnter: fillBars
    });
  } else {
    fillBars();
  }

  /* ---------- count-up stats ---------- */
  var counters = document.querySelectorAll(".count[data-to]");
  function runCounter(el) {
    var to = parseFloat(el.dataset.to) || 0;
    if (!hasGsap || reduced) { el.textContent = to; return; }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: to, duration: 1.1, ease: "power2.out",
      onUpdate: function () { el.textContent = Math.round(obj.v); }
    });
  }
  if (hasGsap && window.ScrollTrigger && !reduced) {
    counters.forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: function () { runCounter(el); } });
    });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- AI tabs: click + scroll-spy ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".ai-tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".ai-panel"));
  function activateTab(i) {
    tabs.forEach(function (t, j) {
      t.classList.toggle("is-active", i === j);
      t.setAttribute("aria-selected", i === j ? "true" : "false");
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      activateTab(i);
      if (panels[i]) panels[i].scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
  });
  if ("IntersectionObserver" in window && panels.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var idx = panels.indexOf(entry.target);
          if (idx >= 0) activateTab(idx);
        }
      });
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
    panels.forEach(function (p) { spy.observe(p); });
  }

  /* ---------- pricing toggle ---------- */
  var toggle = document.querySelector(".billing-toggle");
  if (toggle) {
    toggle.dataset.active = "monthly";
    toggle.querySelectorAll(".bt-opt").forEach(function (opt) {
      opt.addEventListener("click", function () {
        var period = opt.dataset.period;
        toggle.dataset.active = period;
        toggle.querySelectorAll(".bt-opt").forEach(function (o) {
          o.classList.toggle("is-active", o === opt);
        });
        document.querySelectorAll(".price-val").forEach(function (val) {
          val.textContent = period === "yearly" ? val.dataset.yearly : val.dataset.monthly;
        });
        document.querySelectorAll(".price-bill").forEach(function (bill) {
          bill.textContent = period === "yearly" ? "billed yearly" : "billed monthly";
        });
      });
    });
  }

  /* ---------- mobile nav ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      nav.style.display = open ? "flex" : "";
      if (open) {
        nav.style.position = "absolute";
        nav.style.top = "66px";
        nav.style.left = "0";
        nav.style.right = "0";
        nav.style.flexDirection = "column";
        nav.style.background = "#fff";
        nav.style.padding = "18px 24px";
        nav.style.borderBottom = "1px solid #E9EAEE";
        nav.style.gap = "16px";
      }
    });
  }

  /* ---------- cleanup ---------- */
  window.addEventListener("pagehide", function () {
    if (hasGsap && window.ScrollTrigger) {
      ScrollTrigger.getAll().forEach(function (st) { st.kill(); });
    }
    if (spy) spy.disconnect();
  });
})();
