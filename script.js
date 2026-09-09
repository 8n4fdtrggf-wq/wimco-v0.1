document.addEventListener("DOMContentLoaded", () => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loader = document.querySelector(".loader");
  const loaderPercent = document.querySelector(".loader-percent");
  const cursor = document.querySelector(".cursor");
  const ambient = document.querySelector(".ambient-light");
  const menu = document.querySelector(".site-menu");
  const menuToggle = document.querySelector(".menu-toggle");
  const magnetic = document.querySelectorAll(".magnetic");
  const parallax = document.querySelectorAll("[data-parallax]");
  const sections = document.querySelectorAll("section[data-theme]");
  const hero = document.querySelector(".hero");
  const heroTitle = document.querySelector(".hero-title-wrap");
  const scrollCue = document.querySelector(".scroll-cue");

  document.body.classList.add("is-loading");
  if (loader) {
    const started = performance.now(), duration = reduced ? 250 : 1250;
    function tick(now){
      const p=Math.min(1,(now-started)/duration);
      if(loaderPercent) loaderPercent.textContent=String(Math.round(p*100));
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(()=>{
      loader.classList.add("is-done");
      document.body.classList.remove("is-loading");
      document.body.classList.add("site-ready");
      setTimeout(()=>loader.remove(),950);
    },duration);
  } else {
    document.body.classList.add("site-ready");
  }

  // Cinematic section paging: one deliberate wheel gesture moves one scene.
  // The old fixed timeout was unreliable on trackpads because the browser's
  // smooth-scroll duration varies. We now unlock when the target is reached,
  // with a short safety timeout, and require a new wheel gesture before paging again.
  const snapSections = Array.from(document.querySelectorAll("main > section"));
  let snapIndex = 0;
  let snapLocked = false;
  let wheelGestureActive = false;
  let snapSafetyTimer = null;
  let wheelEndTimer = null;

  function syncSnapIndex(){
    const y = window.scrollY;
    let closest = 0, distance = Infinity;
    snapSections.forEach((section, i) => {
      const d = Math.abs(section.offsetTop - y);
      if(d < distance){ distance = d; closest = i; }
    });
    snapIndex = closest;
  }

  function unlockSnap(){
    snapLocked = false;
    clearTimeout(snapSafetyTimer);
    snapSafetyTimer = null;
    syncSnapIndex();
  }

  function goToSection(index){
    index = Math.max(0, Math.min(snapSections.length - 1, index));
    snapIndex = index;
    snapLocked = true;
    const targetY = snapSections[index].offsetTop;
    window.scrollTo({top:targetY, behavior: reduced ? "auto" : "smooth"});

    clearTimeout(snapSafetyTimer);
    snapSafetyTimer = setTimeout(unlockSnap, reduced ? 80 : 1250);

    if(reduced) {
      unlockSnap();
      return;
    }

    // Watch the actual scroll position instead of guessing the animation duration.
    let settleFrames = 0;
    const watch = () => {
      if(!snapLocked) return;
      const distance = Math.abs(window.scrollY - targetY);
      if(distance < 3) {
        settleFrames++;
        if(settleFrames >= 3) { unlockSnap(); return; }
      } else {
        settleFrames = 0;
      }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  }

  window.addEventListener("wheel", e=>{
    if(reduced || window.innerWidth <= 800 || document.body.classList.contains("menu-open")) return;
    if(Math.abs(e.deltaY) < 10) return;

    // About is intentionally a little taller than one viewport so its three
    // principles can be read naturally. Do not hijack the middle of it.
    const about = document.querySelector("#about");
    if(about){
      const y = window.scrollY;
      const top = about.offsetTop;
      const bottom = top + about.offsetHeight - window.innerHeight;
      const insideAbout = y > top + 8 && y < bottom - 8;
      if(insideAbout) return;
    }

    e.preventDefault();
    clearTimeout(wheelEndTimer);
    wheelEndTimer = setTimeout(()=>{wheelGestureActive=false}, 170);

    // A burst of trackpad/wheel events is one gesture. Only the first event
    // gets to choose a new section.
    if(snapLocked || wheelGestureActive) return;
    wheelGestureActive = true;

    syncSnapIndex();
    goToSection(snapIndex + (e.deltaY > 0 ? 1 : -1));
  }, {passive:false});

  window.addEventListener("scroll", ()=>{
    if(!snapLocked) syncSnapIndex();
  }, {passive:true});

  // Cursor and pointer light use a single animation loop.
  let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my,lx=mx,ly=my;
  window.addEventListener("pointermove",e=>{
    mx=e.clientX;my=e.clientY;
    if(ambient){ambient.style.setProperty("--light-x",mx+"px");ambient.style.setProperty("--light-y",my+"px")}
    if(window.innerWidth>800){
      parallax.forEach(el=>{const a=parseFloat(el.dataset.parallax||0);el.style.setProperty("--px",((mx/innerWidth-.5)*a*120)+"px");el.style.setProperty("--py",((my/innerHeight-.5)*a*120)+"px")});
    }
  },{passive:true});
  function pointerFrame(){
    cx+=(mx-cx)*.18;cy+=(my-cy)*.18;
    if(cursor){cursor.style.left=cx+"px";cursor.style.top=cy+"px"}
    lx+=(mx-lx)*.075;ly+=(my-ly)*.075;
    if(ambient){ambient.style.setProperty("--light-x",lx+"px");ambient.style.setProperty("--light-y",ly+"px")}
    requestAnimationFrame(pointerFrame)
  }
  if(!reduced)requestAnimationFrame(pointerFrame);

  magnetic.forEach(el=>{
    el.addEventListener("mouseenter",()=>cursor&&cursor.classList.add("big"));
    el.addEventListener("mouseleave",()=>{if(cursor)cursor.classList.remove("big");el.style.transform=""});
    el.addEventListener("mousemove",e=>{if(innerWidth<801)return;const r=el.getBoundingClientRect(),x=(e.clientX-(r.left+r.width/2))*.11,y=(e.clientY-(r.top+r.height/2))*.11;el.style.transform=`translate3d(${x}px,${y}px,0)`});
  });
  document.querySelectorAll("[data-cursor]").forEach(el=>{el.addEventListener("mouseenter",()=>{if(cursor){cursor.classList.add("big");cursor.querySelector("span").textContent=el.dataset.cursor.toUpperCase()}});el.addEventListener("mouseleave",()=>{if(cursor){cursor.classList.remove("big");cursor.querySelector("span").textContent=""}})});

  // Menu overlay.
  function closeMenu(){menuToggle?.setAttribute("aria-expanded","false");menu?.setAttribute("aria-hidden","true");menu?.classList.remove("is-open");document.body.classList.remove("menu-open")}
  menuToggle?.addEventListener("click",()=>{const open=menuToggle.getAttribute("aria-expanded")==="true";if(open)closeMenu();else{menuToggle.setAttribute("aria-expanded","true");menu.setAttribute("aria-hidden","false");menu.classList.add("is-open");document.body.classList.add("menu-open")}});
  menu?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{closeMenu();setTimeout(()=>{const target=document.querySelector(a.getAttribute("href")); if(target){goToSection(snapSections.indexOf(target))}},20)}));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});

  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)document.body.classList.toggle("dark",entry.target.dataset.theme==="dark")}),{threshold:.3});
  sections.forEach(s=>observer.observe(s));

  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("in-view");revealObserver.unobserve(entry.target)}}),{threshold:.12});
  document.querySelectorAll(".intro-copy,.about-layout,.statement-word,.contact-main").forEach(el=>{el.style.opacity="0";el.style.transform="translateY(28px)";el.style.transition="opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1)";revealObserver.observe(el)});
  const st=document.createElement("style");st.textContent=".in-view{opacity:1!important;transform:none!important}";document.head.appendChild(st);

  let ticking=false;
  function updateHero(){const y=window.scrollY,h=hero?.offsetHeight||innerHeight,p=Math.min(1,Math.max(0,y/(h*.9)));if(scrollCue)scrollCue.classList.toggle("is-hidden",y>35);if(heroTitle){heroTitle.style.transform=`translate3d(var(--px,0px),calc(var(--py,0px) - ${p*8}px),0) scale(${1+p*.025})`;heroTitle.style.opacity=String(1-p*.6)}}
  function requestUpdate(){if(!ticking){requestAnimationFrame(()=>{updateHero();ticking=false});ticking=true}}
  window.addEventListener("scroll",requestUpdate,{passive:true});window.addEventListener("resize",requestUpdate,{passive:true});updateHero();
  /* =======================================================
     WIM & CO. — premium interaction layer
     ======================================================= */

  const allSections = Array.from(document.querySelectorAll("main > section"));
  const progressBar = document.querySelector(".scroll-progress i");
  const counter = document.querySelector(".section-counter");
  const counterCurrent = counter?.querySelector("span");
  const preview = document.querySelector(".cursor-preview");
  const previewLabel = preview?.querySelector(".preview-label");

  // 1) Scroll progress + dynamic section counter.
  function updateScrollUI(){
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / max));
    if(progressBar) progressBar.style.transform = `scaleX(${progress})`;

    let active = 0;
    let best = Infinity;
    allSections.forEach((section, i)=>{
      const rect = section.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height * .35 - innerHeight * .42);
      if(distance < best){best = distance; active = i;}
    });
    document.body.classList.toggle("on-contact", allSections[active]?.id === "contact");
    if(counterCurrent){
      const next = String(active + 1).padStart(2,"0");
      if(counterCurrent.textContent !== next){
        counterCurrent.style.transform = "translateY(-7px)";
        counterCurrent.style.opacity = ".2";
        setTimeout(()=>{
          counterCurrent.textContent = next;
          counterCurrent.style.transform = "translateY(0)";
          counterCurrent.style.opacity = "1";
        },110);
      }
    }

    allSections.forEach((section,i)=>{
      const rect = section.getBoundingClientRect();
      const visible = rect.top < innerHeight * .7 && rect.bottom > innerHeight * .3;
      section.classList.toggle("in-transition", visible && i < allSections.length-1);
    });
  }
  let uiTick = false;
  function requestScrollUI(){
    if(uiTick) return;
    uiTick = true;
    requestAnimationFrame(()=>{updateScrollUI();uiTick=false});
  }
  window.addEventListener("scroll",requestScrollUI,{passive:true});
  window.addEventListener("resize",requestScrollUI,{passive:true});
  updateScrollUI();

  // 2) Scroll-driven word reveal for editorial headlines.
  function splitHeadline(el){
    if(!el || el.dataset.splitDone) return;
    const walker = document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const text=node.nodeValue;
      if(!text.trim()) return;
      const frag=document.createDocumentFragment();
      const parts=text.split(/(\s+)/);
      parts.forEach(part=>{
        if(/^\s+$/.test(part)){
          frag.appendChild(document.createTextNode(part));
        }else if(part){
          const span=document.createElement("span");
          span.className="word";
          span.style.setProperty("--word-delay", `${Math.min(420, nodes.indexOf(node)*100 + frag.childNodes.length*35)}ms`);
          span.textContent=part;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag,node);
    });
    el.dataset.splitDone="true";
  }
  document.querySelectorAll(".intro-copy h2,.about-layout h2").forEach(splitHeadline);

  // 3) Cursor-following visual previews on About principles.
  if(preview && !reduced && innerWidth > 800){
    const rows=document.querySelectorAll(".principle-row");
    rows.forEach(row=>{
      row.addEventListener("mouseenter",()=>{
        const variant=row.dataset.preview || "clarity";
        preview.dataset.variant=variant;
        if(previewLabel) previewLabel.textContent=variant;
        preview.classList.add("is-visible");
        cursor?.classList.add("big");
        if(cursor?.querySelector("span")) cursor.querySelector("span").textContent="VIEW";
      });
      row.addEventListener("mousemove",e=>{
        preview.style.left=`${e.clientX + 28}px`;
        preview.style.top=`${e.clientY - 24}px`;
      });
      row.addEventListener("mouseleave",()=>{
        preview.classList.remove("is-visible");
        cursor?.classList.remove("big");
        if(cursor?.querySelector("span")) cursor.querySelector("span").textContent="";
      });
    });
  }

  // 4) Smarter contextual cursor labels.
  document.querySelectorAll("[data-cursor-label]").forEach(el=>{
    const label=el.dataset.cursorLabel;
    el.addEventListener("mouseenter",()=>{
      if(cursor?.querySelector("span")) cursor.querySelector("span").textContent=label.toUpperCase();
      cursor?.classList.add("big");
    });
  });

  // 5) Subtle "seamless" section motion based on viewport position.
  function updateSectionDepth(){
    if(reduced) return;
    allSections.forEach(section=>{
      const rect=section.getBoundingClientRect();
      const center=(rect.top + rect.height/2) / innerHeight;
      const distance=Math.max(-1,Math.min(1,center-.5));
      section.style.setProperty("--section-shift", `${distance * -12}px`);
    });
  }
  let depthTick=false;
  window.addEventListener("scroll",()=>{
    if(depthTick || reduced) return;
    depthTick=true;
    requestAnimationFrame(()=>{updateSectionDepth();depthTick=false});
  },{passive:true});
  updateSectionDepth();

  // 6) Magnetic interactions, slightly stronger for the main CTA.
  document.querySelectorAll(".magnetic").forEach(el=>{
    if(el.dataset.premiumMagnetic) return;
    el.dataset.premiumMagnetic="true";
    el.addEventListener("mousemove",e=>{
      if(innerWidth < 801 || reduced) return;
      const r=el.getBoundingClientRect();
      const strength=el.classList.contains("contact-cta") ? .16 : .11;
      const x=(e.clientX-(r.left+r.width/2))*strength;
      const y=(e.clientY-(r.top+r.height/2))*strength;
      el.style.transform=`translate3d(${x}px,${y}px,0)`;
    });
    el.addEventListener("mouseleave",()=>{el.style.transform=""});
  });

  // 7) Five quick logo clicks unlock a tiny experimental easter egg.
  const logo=document.querySelector(".site-header .logo");
  let logoClicks=0, logoReset=null;
  logo?.addEventListener("click",(e)=>{
    if(e.metaKey || e.ctrlKey) return;
    logoClicks++;
    clearTimeout(logoReset);
    logoReset=setTimeout(()=>logoClicks=0,1100);
    if(logoClicks>=5){
      logoClicks=0;
      document.body.classList.toggle("experimental-mode");
      const active=document.body.classList.contains("experimental-mode");
      const label=counterCurrent;
      if(label) label.textContent=active ? "∞" : String(String(snapIndex+1).padStart(2,"0"));
      // Tiny haptic-style feedback where supported — intentionally harmless.
      if(active && navigator.vibrate) navigator.vibrate([18,35,18]);
      clearTimeout(window.__wimEggTimer);
      window.__wimEggTimer=setTimeout(()=>{
        document.body.classList.remove("experimental-mode");
        if(counterCurrent) counterCurrent.textContent=String(String(snapIndex+1).padStart(2,"0"));
      }, active ? 4200 : 0);
    }
  });

  // 8) Keyboard shortcut: M toggles the menu, Esc closes it.
  document.addEventListener("keydown",e=>{
    if(e.key.toLowerCase()==="m" && document.activeElement?.tagName!=="INPUT"){
      menuToggle?.click();
    }
  });

  // 9) Let touch devices keep native scrolling; desktop gets the cinematic pager.
  //    This listener intentionally does not interfere with the existing About
  //    internal-scroll safeguard.


  // FINAL POLISH ------------------------------------------------------------

  // Hero scroll cue disappears naturally after the first scroll.
  function updateHeroCue(){
    if(!scrollCue) return;
    scrollCue.classList.toggle("is-hidden", window.scrollY > Math.max(40, innerHeight * .08));
  }
  window.addEventListener("scroll", updateHeroCue, {passive:true});
  updateHeroCue();

  // Header gets a tiny state change after leaving the hero.
  const siteHeader = document.querySelector(".site-header");
  function updateHeaderState(){
    siteHeader?.classList.toggle("is-scrolled", window.scrollY > 28);
  }
  window.addEventListener("scroll", updateHeaderState, {passive:true});
  updateHeaderState();

  // Subtle text parallax on the small metadata lines.
  const microParallax = document.querySelectorAll(".hero-meta, .about-meta, .contact-top");
  function updateMicroParallax(){
    if(reduced) return;
    const y = window.scrollY;
    microParallax.forEach((el,i)=>{
      const r=el.getBoundingClientRect();
      if(r.bottom < 0 || r.top > innerHeight) return;
      const offset=(r.top + r.height/2 - innerHeight/2) * -0.012;
      el.style.transform=`translate3d(0,${offset}px,0)`;
    });
  }
  window.addEventListener("scroll",()=>{
    requestAnimationFrame(updateMicroParallax);
  },{passive:true});
  updateMicroParallax();

  // Tiny hover intent on section labels: cursor becomes a pointer-like marker.
  // Contact stays intentionally calm: no cursor enlargement or magnetic hover.
  document.querySelectorAll(".principle-row").forEach(el=>{
    el.addEventListener("mouseenter",()=>cursor?.classList.add("big"));
    el.addEventListener("mouseleave",()=>cursor?.classList.remove("big"));
  });

});
