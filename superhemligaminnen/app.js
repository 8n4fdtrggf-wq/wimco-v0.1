/* ─────────────────────────────────────────────────────────────
   Superhemliga minnen — Supabase-backed.
   Anonymous client only. RLS enforces access control.
   ───────────────────────────────────────────────────────────── */

(() => {
  "use strict";

  const CFG = window.SHM_CONFIG || {};
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  const BUCKET = "memories";
  const SIGNED_URL_TTL = 60 * 60 * 6; // 6h
  const MAX_IMAGE_DIM = 1600;
  const JPEG_QUALITY = 0.85;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ── Auth gate ─────────────────────────────────────────────
  const loginEl = $("#login");
  const appEl = $("#app");
  const loginForm = $("#login-form");
  const loginError = $("#login-error");

  function showLogin() {
    loginEl.hidden = false;
    appEl.hidden = true;
    document.body.classList.remove("is-loading");
  }
  function showApp() {
    loginEl.hidden = true;
    appEl.hidden = false;
    document.body.classList.remove("is-loading");
    load();
  }

  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) showApp(); else showLogin();
  });

  sb.auth.onAuthStateChange((_event, session) => {
    if (session) showApp(); else showLogin();
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = "Fel e-post eller lösenord.";
      return;
    }
  });

  $("#signout").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.reload();
  });

  // ── Helpers ───────────────────────────────────────────────
  function svgSticker(kind) {
    const s = 28;
    switch (kind) {
      case "heart":
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-7.5-4.7-9.7-9.1C.7 8.6 2.4 5 5.7 5c2 0 3.4 1.1 4.3 2.3.4.5.6 1 .8 1.3.2-.3.4-.8.8-1.3C12.5 6.1 13.9 5 15.9 5c3.3 0 5 3.6 3.4 6.9C19.1 16.3 12 21 12 21z" fill="var(--shm-heart)" stroke="rgba(30,27,24,.25)" stroke-width=".8"/></svg>`;
      case "pookie":
        return `<svg width="56" height="28" viewBox="0 0 56 28" aria-hidden="true"><rect x="1" y="1" width="54" height="26" rx="3" fill="var(--shm-pookie)" stroke="rgba(30,27,24,.2)" stroke-width=".8"/><text x="28" y="19" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="13" font-style="italic" fill="#F4EFE7">pookie</text></svg>`;
      case "star":
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5l2.6 6.2 6.7.5-5.1 4.4 1.6 6.5L12 16.6l-5.8 3.5 1.6-6.5L2.7 9.2l6.7-.5L12 2.5z" fill="var(--shm-star)" stroke="rgba(30,27,24,.25)" stroke-width=".8"/></svg>`;
      case "mark":
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 20L15 4" stroke="var(--shm-ink)" stroke-width="2.4" stroke-linecap="round"/><path d="M11 20L19 4" stroke="var(--shm-ink)" stroke-width="2.4" stroke-linecap="round" opacity=".45"/></svg>`;
      default:
        return "";
    }
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
  }

  async function compressImage(file, maxDim = MAX_IMAGE_DIM, quality = JPEG_QUALITY) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      const { naturalWidth: w0, naturalHeight: h0 } = img;
      let w = w0, h = h0;
      if (Math.max(w0, h0) > maxDim) {
        const scale = maxDim / Math.max(w0, h0);
        w = Math.round(w0 * scale);
        h = Math.round(h0 * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
      return { blob, width: w, height: h };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ── Data ──────────────────────────────────────────────────
  let memories = [];

  async function load() {
    const { data, error } = await sb
      .from("memories")
      .select("*")
      .order("date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("load memories", error);
      return;
    }

    memories = data || [];

    // Signed URLs for all photos
    const paths = memories.map((m) => m.storage_path).filter(Boolean);
    if (paths.length) {
      const { data: signed, error: sErr } = await sb.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL);
      if (sErr) console.error("signed urls", sErr);
      const map = new Map((signed || []).map((s) => [s.path, s.signedUrl]));
      memories.forEach((m) => { m._url = map.get(m.storage_path) || null; });
    }

    renderJournal();
    if (map) renderMarkers();
  }

  async function deleteMemory(memory) {
    if (!confirm("Radera minnet?")) return;
    if (memory.storage_path) {
      await sb.storage.from(BUCKET).remove([memory.storage_path]);
    }
    await sb.from("memories").delete().eq("id", memory.id);
    await load();
  }

  // ── Journal ───────────────────────────────────────────────
  const journalEl = $("#journal");
  const journalEmpty = $("#journal-empty");

  function renderJournal() {
    journalEl.innerHTML = "";
    journalEmpty.hidden = memories.length > 0;

    memories.forEach((m) => {
      const article = document.createElement("article");
      article.className = "shm-memory";
      article.dataset.id = m.id;

      const inner = document.createElement("div");
      inner.className = "shm-memory-inner";

      const photoWrap = document.createElement("div");
      photoWrap.className = "shm-photo-wrap";

      const photoBtn = document.createElement("button");
      photoBtn.type = "button";
      photoBtn.className = "shm-photo-btn";
      photoBtn.setAttribute("aria-expanded", "false");
      photoBtn.setAttribute("aria-label", (m.title || "Minne") + " – visa anteckning");

      if (m._url) {
        const img = document.createElement("img");
        img.src = m._url;
        img.alt = m.title || "Minne";
        img.loading = "lazy";
        photoBtn.appendChild(img);
      } else {
        const ph = document.createElement("div");
        ph.style.cssText = "aspect-ratio:4/3;background:var(--shm-pencil);display:grid;place-items:center;color:var(--shm-faded);font:400 12px var(--shm-mono)";
        ph.textContent = "ingen bild";
        photoBtn.appendChild(ph);
      }

      const stickersLayer = document.createElement("div");
      stickersLayer.className = "shm-stickers-layer";
      (m.stickers || []).forEach((st) => {
        stickersLayer.appendChild(makeStickerEl(st));
      });

      photoWrap.append(photoBtn, stickersLayer);

      photoBtn.addEventListener("click", () => {
        const has = article.classList.toggle("has-note");
        photoBtn.setAttribute("aria-expanded", String(has));
      });

      const note = document.createElement("div");
      note.className = "shm-note";
      note.id = "note-" + m.id;

      const p = document.createElement("p");
      p.textContent = m.note || m.title || "";
      const meta = document.createElement("p");
      meta.className = "shm-meta";
      meta.textContent = formatDate(m.date);
      note.append(p);
      if (meta.textContent) note.appendChild(meta);

      if (m.location_name) {
        const loc = document.createElement("p");
        loc.className = "shm-loc";
        loc.textContent = m.location_name;
        note.appendChild(loc);
      }

      const del = document.createElement("button");
      del.type = "button";
      del.className = "shm-delete";
      del.textContent = "radera";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteMemory(m);
      });
      note.appendChild(del);

      inner.append(photoWrap, note);
      article.appendChild(inner);
      journalEl.appendChild(article);
    });

    observeJournal();
  }

  function makeStickerEl(st) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shm-sticker";
    btn.style.left = (st.x * 100) + "%";
    btn.style.top = (st.y * 100) + "%";
    btn.setAttribute("aria-label", st.kind + (st.note ? ": " + st.note : ""));
    btn.innerHTML = svgSticker(st.kind);

    if (st.note) {
      const tip = document.createElement("span");
      tip.className = "shm-sticker-note";
      tip.textContent = st.note;
      btn.appendChild(tip);
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = btn.classList.toggle("is-open");
      btn.setAttribute("aria-pressed", String(open));
    });

    return btn;
  }

  let journalObserver = null;
  function observeJournal() {
    if (journalObserver) journalObserver.disconnect();
    if (reduced) {
      $$(".shm-memory").forEach((el) => el.classList.add("in-view"));
      return;
    }
    journalObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          journalObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $$(".shm-memory").forEach((el) => journalObserver.observe(el));
  }

  // ── Map ───────────────────────────────────────────────────
  let map = null;
  let markersLayer = null;
  const mapPanel = $("#map-panel");
  const mapPanelContent = $("#map-panel-content");

  function initMap() {
    if (map) return;
    map = L.map("map", {
      center: [62.0, 15.0],
      zoom: 4,
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    renderMarkers();
  }

  function renderMarkers() {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    const groups = new Map();
    memories.filter((m) => m.location_lat != null && m.location_lng != null).forEach((m) => {
      const key = m.location_name || (m.location_lat.toFixed(2) + "," + m.location_lng.toFixed(2));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    });

    groups.forEach((items) => {
      const { location_lat: lat, location_lng: lng, location_name: name } = items[0];
      const isCluster = items.length > 1;
      const icon = L.divIcon({
        className: "shm-marker" + (isCluster ? " shm-cluster" : ""),
        html: `<div class="shm-marker-dot">${isCluster ? items.length : ""}</div>`,
        iconSize: isCluster ? [22, 22] : [12, 12],
        iconAnchor: isCluster ? [11, 11] : [6, 6],
      });
      const marker = L.marker([lat, lng], { icon, title: name || "" }).addTo(markersLayer);
      marker.on("click", () => {
        showMapPanel(items, 0);
        map.setView([lat, lng], Math.max(map.getZoom(), 8), { animate: !reduced });
      });
    });
  }

  function showMapPanel(items, index) {
    const m = items[index];
    mapPanelContent.innerHTML = "";

    if (m._url) {
      const img = document.createElement("img");
      img.src = m._url;
      img.alt = m.title || "Minne";
      mapPanelContent.appendChild(img);
    }

    const note = document.createElement("div");
    note.className = "shm-note";
    const p = document.createElement("p");
    p.textContent = m.note || m.title || "";
    const meta = document.createElement("p");
    meta.className = "shm-meta";
    meta.textContent = [formatDate(m.date), m.location_name].filter(Boolean).join(" · ");
    note.append(p);
    if (meta.textContent) note.appendChild(meta);
    mapPanelContent.appendChild(note);

    if (items.length > 1) {
      const pager = document.createElement("div");
      pager.className = "shm-map-pager";
      const prev = document.createElement("button");
      prev.type = "button";
      prev.textContent = "←";
      prev.setAttribute("aria-label", "Föregående");
      prev.disabled = index === 0;
      const count = document.createElement("span");
      count.textContent = (index + 1) + " / " + items.length;
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "→";
      next.setAttribute("aria-label", "Nästa");
      next.disabled = index === items.length - 1;
      prev.addEventListener("click", () => showMapPanel(items, index - 1));
      next.addEventListener("click", () => showMapPanel(items, index + 1));
      pager.append(prev, count, next);
      mapPanelContent.appendChild(pager);
    }

    mapPanel.hidden = false;
  }

  $("#map-close").addEventListener("click", () => { mapPanel.hidden = true; });

  // ── View toggle ───────────────────────────────────────────
  const views = $$(".shm-views button");
  const viewJournal = $("#view-journal");
  const viewMap = $("#view-map");

  views.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      views.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      viewJournal.classList.toggle("is-active", view === "journal");
      viewJournal.hidden = view !== "journal";
      viewMap.classList.toggle("is-active", view === "map");
      viewMap.hidden = view !== "map";
      if (view === "map") {
        initMap();
        setTimeout(() => map.invalidateSize(), 50);
      }
    });
  });

  // ── Add memory ────────────────────────────────────────────
  const addDialog = $("#add-dialog");
  const addForm = $("#add-form");
  const addFile = $("#add-file");
  const addPreview = $("#add-preview");
  const addPreviewImg = $("#add-preview-img");
  const addStickersLayer = $("#add-stickers-layer");
  const addTitleInput = $("#add-title-input");
  const addDate = $("#add-date");
  const addSave = $("#add-save");
  const addStatus = $("#add-status");
  const gpsHint = $("#gps-hint");
  const addPlaceSearch = $("#add-place-search");
  const addPlaceSearchBtn = $("#add-place-search-btn");
  const addPlaceResults = $("#add-place-results");
  const addPlaceChosen = $("#add-place-chosen");

  let pendingFile = null;      // original File (for EXIF)
  let pendingBlob = null;      // compressed JPEG Blob
  let pendingLocation = null;  // { lat, lng, name }
  let pendingStickers = [];
  let activeStickerKind = null;

  $("#open-add").addEventListener("click", () => { resetAddForm(); addDialog.showModal(); });
  $("[data-open-add]")?.addEventListener("click", () => { resetAddForm(); addDialog.showModal(); });
  $("#add-cancel").addEventListener("click", () => addDialog.close());

  function resetAddForm() {
    addForm.reset();
    pendingFile = null;
    pendingBlob = null;
    pendingLocation = null;
    pendingStickers = [];
    activeStickerKind = null;
    addPreview.hidden = true;
    addPreviewImg.removeAttribute("src");
    addStickersLayer.innerHTML = "";
    addPlaceResults.hidden = true;
    addPlaceChosen.textContent = "";
    gpsHint.textContent = "Välj ett foto först.";
    addSave.disabled = true;
    addStatus.textContent = "";
    $$("#sticker-picker button").forEach((b) => b.classList.remove("is-active"));
  }

  addFile.addEventListener("change", async () => {
    const file = addFile.files?.[0];
    if (!file) return;
    pendingFile = file;

    // 1. Read EXIF GPS from the ORIGINAL file (compression strips EXIF)
    gpsHint.textContent = "Läser plats…";
    let gps = null;
    try { if (window.exifr) gps = await exifr.gps(file); } catch { /* no GPS */ }

    if (gps && isFinite(gps.latitude) && isFinite(gps.longitude)) {
      pendingLocation = { lat: gps.latitude, lng: gps.longitude, name: "" };
      gpsHint.textContent = "Plats hittad i fotot.";
      addPlaceChosen.textContent = `Vald: ${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`;
      reverseGeocode(gps.latitude, gps.longitude).then((name) => {
        if (name && pendingLocation) {
          pendingLocation.name = name;
          addPlaceChosen.textContent = "Vald: " + name;
        }
      });
    } else {
      gpsHint.textContent = "Ingen plats i fotot. Sök nedan om du vill.";
    }

    // 2. Compress
    addStatus.textContent = "Bearbetar fotot…";
    try {
      const { blob } = await compressImage(file);
      pendingBlob = blob;
    } catch (e) {
      console.error(e);
      addStatus.textContent = "Kunde inte läsa fotot.";
      return;
    }
    addStatus.textContent = "";

    const url = URL.createObjectURL(pendingBlob);
    addPreviewImg.onload = () => URL.revokeObjectURL(url);
    addPreviewImg.src = url;
    addPreview.hidden = false;
    checkSave();
  });

  async function reverseGeocode(lat, lng) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=sv`,
        { headers: { "Accept": "application/json" } }
      );
      const j = await r.json();
      return j.display_name?.split(",").slice(0, 2).join(",").trim() || "";
    } catch { return ""; }
  }

  async function doPlaceSearch() {
    const q = addPlaceSearch.value.trim();
    if (!q) return;
    addPlaceResults.hidden = false;
    addPlaceResults.innerHTML = "<button disabled>Söker…</button>";
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=se&limit=5&accept-language=sv`,
        { headers: { "Accept": "application/json" } }
      );
      const j = await r.json();
      if (!j.length) { addPlaceResults.innerHTML = "<button disabled>Inget hittades</button>"; return; }
      addPlaceResults.innerHTML = "";
      j.forEach((place) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = place.display_name;
        b.addEventListener("click", () => {
          pendingLocation = {
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            name: place.name || place.display_name.split(",")[0],
          };
          addPlaceChosen.textContent = "Vald: " + pendingLocation.name;
          addPlaceResults.hidden = true;
          checkSave();
        });
        addPlaceResults.appendChild(b);
      });
    } catch {
      addPlaceResults.innerHTML = "<button disabled>Sökningen misslyckades</button>";
    }
  }
  addPlaceSearchBtn.addEventListener("click", doPlaceSearch);
  addPlaceSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); doPlaceSearch(); }
  });

  $$("#sticker-picker button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.sticker;
      if (activeStickerKind === kind) {
        activeStickerKind = null;
        btn.classList.remove("is-active");
        return;
      }
      activeStickerKind = kind;
      $$("#sticker-picker button").forEach((b) => b.classList.toggle("is-active", b === btn));
    });
  });

  addPreview.addEventListener("pointerdown", (e) => {
    if (!activeStickerKind || !pendingBlob) return;
    if (e.target.closest(".shm-sticker")) return;
    const rect = addPreview.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    pendingStickers.push({ kind: activeStickerKind, x, y, note: "" });
    renderPendingStickers();
    openStickerNote(pendingStickers.length - 1);
  });

  function renderPendingStickers() {
    addStickersLayer.innerHTML = "";
    pendingStickers.forEach((st, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shm-sticker";
      btn.style.left = (st.x * 100) + "%";
      btn.style.top = (st.y * 100) + "%";
      btn.innerHTML = svgSticker(st.kind);
      if (st.note) {
        const tip = document.createElement("span");
        tip.className = "shm-sticker-note";
        tip.textContent = st.note;
        btn.appendChild(tip);
      }
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (st.note) btn.classList.toggle("is-open");
        else openStickerNote(i);
      });
      addStickersLayer.appendChild(btn);
    });
  }

  const stickerDialog = $("#sticker-dialog");
  const stickerNoteInput = $("#sticker-note-input");
  let editingStickerIndex = -1;

  function openStickerNote(index) {
    editingStickerIndex = index;
    stickerNoteInput.value = pendingStickers[index]?.note || "";
    stickerDialog.showModal();
    setTimeout(() => stickerNoteInput.focus(), 50);
  }

  $("#sticker-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (editingStickerIndex >= 0) {
      pendingStickers[editingStickerIndex].note = stickerNoteInput.value.trim();
      renderPendingStickers();
    }
    stickerDialog.close();
  });

  $("#sticker-remove").addEventListener("click", () => {
    if (editingStickerIndex >= 0) {
      pendingStickers.splice(editingStickerIndex, 1);
      renderPendingStickers();
    }
    stickerDialog.close();
  });

  function checkSave() {
    addSave.disabled = !pendingBlob;
  }
  addTitleInput.addEventListener("input", checkSave);

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pendingBlob) return;

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    addSave.disabled = true;
    addStatus.textContent = "Laddar upp fotot…";

    // 1. Upload photo
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(path, pendingBlob, { contentType: "image/jpeg", upsert: false });

    if (upErr) {
      console.error(upErr);
      addStatus.textContent = "Uppladdningen misslyckades.";
      addSave.disabled = false;
      return;
    }

    addStatus.textContent = "Sparar…";

    // 2. Insert row
    const { error: insErr } = await sb.from("memories").insert({
      title: addTitleInput.value.trim() || null,
      note: addTitleInput.value.trim() || null,
      date: addDate.value || null,
      location_name: pendingLocation?.name || null,
      location_lat: pendingLocation?.lat ?? null,
      location_lng: pendingLocation?.lng ?? null,
      storage_path: path,
      stickers: pendingStickers,
    });

    if (insErr) {
      console.error(insErr);
      // Roll back the storage upload so we don't leave orphans
      await sb.storage.from(BUCKET).remove([path]);
      addStatus.textContent = "Kunde inte spara.";
      addSave.disabled = false;
      return;
    }

    addStatus.textContent = "";
    addDialog.close();
    await load();

    // Jump to map if a location was set
    const targetView = pendingLocation ? "map" : "journal";
    views.find((b) => b.dataset.view === targetView)?.click();
  });

  // ── Close panel on Escape ─────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !mapPanel.hidden) mapPanel.hidden = true;
  });

})();
