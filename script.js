document.addEventListener("DOMContentLoaded", () => {
  const cursor = document.querySelector(".cursor");
  const magnetic = document.querySelectorAll(".magnetic");
  const parallax = document.querySelectorAll("[data-parallax]");
  const projects = document.querySelectorAll(".project");
  const preview = document.querySelector(".project-preview");
  const previewArts = document.querySelectorAll(".preview-art");
  const sections = document.querySelectorAll("section[data-theme]");

  // Custom cursor
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let cursorX = mouseX, cursorY = mouseY;

  window.addEventListener("mousemove", e => {
    mouseX = e.clientX; mouseY = e.clientY;
    parallax.forEach(el => {
      const amount = parseFloat(el.dataset.parallax || 0);
      const x = (e.clientX / window.innerWidth - .5) * amount * 180;
      const y = (e.clientY / window.innerHeight - .5) * amount * 180;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  });

  function renderCursor() {
    cursorX += (mouseX - cursorX) * .16;
    cursorY += (mouseY - cursorY) * .16;
    cursor.style.left = cursorX + "px";
    cursor.style.top = cursorY + "px";
    requestAnimationFrame(renderCursor);
  }
  renderCursor();

  magnetic.forEach(el => {
    el.addEventListener("mouseenter", () => cursor.classList.add("big"));
    el.addEventListener("mouseleave", () => {
      cursor.classList.remove("big");
      el.style.transform = "";
    });
    el.addEventListener("mousemove", e => {
      if (window.innerWidth < 801) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width/2)) * .16;
      const y = (e.clientY - (r.top + r.height/2)) * .16;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
  });

  // Project hover previews
  projects.forEach(project => {
    project.addEventListener("mouseenter", () => {
      if (window.innerWidth < 801) return;
      const name = project.dataset.project;
      preview.classList.add("active");
      previewArts.forEach(art => art.classList.toggle("active", art.classList.contains("preview-" + name)));
      cursor.classList.add("big");
      cursor.querySelector("span").textContent = "VIEW";
    });
    project.addEventListener("mouseleave", () => {
      preview.classList.remove("active");
      cursor.classList.remove("big");
      cursor.querySelector("span").textContent = "";
    });
  });

  // Cursor labels for special links
  document.querySelectorAll("[data-cursor]").forEach(el => {
    el.addEventListener("mouseenter", () => {
      cursor.classList.add("big");
      cursor.querySelector("span").textContent = el.dataset.cursor.toUpperCase();
    });
    el.addEventListener("mouseleave", () => {
      cursor.classList.remove("big");
      cursor.querySelector("span").textContent = "";
    });
  });

  // Change body class according to the section currently in view
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.body.classList.toggle("dark", entry.target.dataset.theme === "dark");
      }
    });
  }, {threshold: .35});
  sections.forEach(section => observer.observe(section));

  // Reveal elements when they enter the viewport
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold: .12});
  document.querySelectorAll(".project, .intro-copy, .about-layout, .statement-word, .contact-main").forEach(el => {
    el.style.opacity = "0";
    el.style.transform += " translateY(35px)";
    el.style.transition = "opacity .9s cubic-bezier(.2,.8,.2,1), transform .9s cubic-bezier(.2,.8,.2,1)";
    revealObserver.observe(el);
  });

  const style = document.createElement("style");
  style.textContent = `.in-view{opacity:1!important;transform:none!important}`;
  document.head.appendChild(style);
});
