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

  // Cinematic section paging: one wheel gesture moves to the next full section.
  const snapSections = Array.from(document.querySelectorAll("main > section"));
  let snapIndex = 0;
  let snapLocked = false;
  let snapTimer = null;

  function syncSnapIndex(){
    const y = window.scrollY;
    let closest = 0, distance = Infinity;
    snapSections.forEach((section, i) => {
      const d = Math.abs(section.offsetTop - y);
      if(d < distance){ distance = d; closest = i; }
    });
    snapIndex = closest;
  }

  function goToSection(index){
    index = Math.max(0, Math.min(snapSections.length - 1, index));
    snapIndex = index;
    snapLocked = true;
    window.scrollTo({top:snapSections[index].offsetTop, behavior: reduced ? "auto" : "smooth"});
    clearTimeout(snapTimer);
    snapTimer = setTimeout(()=>{snapLocked=false; syncSnapIndex()}, reduced ? 50 : 850);
  }

  window.addEventListener("wheel", e=>{
    if(reduced || window.innerWidth <= 800 || document.body.classList.contains("menu-open")) return;
    if(Math.abs(e.deltaY) < 8) return;
    // About is intentionally a little taller than one viewport so the three
    // principles can be read without being skipped by the section pager.
    const about = document.querySelector("#about");
    if(about){
      const y = window.scrollY;
      const top = about.offsetTop;
      const bottom = top + about.offsetHeight - window.innerHeight;
      const insideAbout = y > top + 8 && y < bottom - 8;
      if(insideAbout) return;
    }
    e.preventDefault();
    if(snapLocked) return;
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
});
