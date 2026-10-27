/* Forçats'Nou — appli de forum (visiteur + espace équipe).
   Routes (hash) :
     #/                 accueil + inscription (avec photo)
     #/parcours         guide : liste des activités, progression, fin
     #/scanner          scanner de QR code intégré
     #/activite/<id>    validation d'une activité (cible des QR codes)
     #/fin              parcours terminé : niveau + sortie
     #/retrouver        retrouver son dossier (autre téléphone / navigateur)
     #/equipe[/impression|qr]   espace équipe (code d'accès)
     #/tablette[/<id>]  jeux numériques sur les tablettes du stand (code d'accès) */
(() => {
  'use strict';

  const C = window.FORUM_CONFIG;
  const app = document.getElementById('app');
  const DEMO = !(C.supabaseUrl && C.supabaseAnonKey);
  const TITRE = "Forçats'Nou";

  /* ================= Utilitaires ================= */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const activite = id => C.activites.find(a => a.id === id);
  const niveau = id => C.niveaux.find(n => n.id === id);
  const minimum = () => Math.min(C.minActivites, C.activites.length);
  const heure = iso => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const nomComplet = v => `${v.prenom} ${v.nom.toUpperCase()}`;
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  const store = {
    get(k, s = localStorage) { try { return s.getItem(k); } catch { return null; } },
    set(k, v, s = localStorage) { try { v == null ? s.removeItem(k) : s.setItem(k, v); } catch { /* stockage indisponible */ } },
  };
  const K_MOI = 'forcats.moi', K_ATTENTE = 'forcats.attente', K_EQUIPE = 'forcats.equipe', K_TABLETTE = 'forcats.tablette';

  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  async function copier(texte) {
    try { await navigator.clipboard.writeText(texte); toast('Copié'); }
    catch {
      const ta = document.createElement('textarea'); ta.value = texte; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { }
      ta.remove(); toast(ok ? 'Copié' : 'Copie impossible : sélectionne le texte à la main');
    }
  }
  const aller = route => { location.hash = '#/' + route; };

  /* Le niveau atteint = le plus haut dont le minimum est atteint. */
  function niveauPour(nbActivites) {
    const tries = C.niveaux.slice().sort((a, b) => a.min - b.min);
    return tries.filter(n => nbActivites >= n.min).pop() || tries[0];
  }

  /* ================= Photo ================= */
  /* Recadre au format photo d'identité (35 × 45 mm) et compresse en JPEG. */
  const PHOTO_L = 700, PHOTO_H = 900;
  async function preparerPhoto(fichier) {
    const url = URL.createObjectURL(fichier);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const ratio = PHOTO_L / PHOTO_H;
      let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
      if (sw / sh > ratio) { const l = sh * ratio; sx = (sw - l) / 2; sw = l; }
      else { const h = sw / ratio; sy = (sh - h) * 0.4; sh = h; } // un peu vers le haut : le visage y est souvent
      const c = document.createElement('canvas'); c.width = PHOTO_L; c.height = PHOTO_H;
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, PHOTO_L, PHOTO_H);
      return await new Promise((ok, ko) => c.toBlob(b => b ? ok(b) : ko(new Error('toBlob')), 'image/jpeg', 0.85));
    } finally { URL.revokeObjectURL(url); }
  }
  async function telechargerPhoto(url, nomFichier) {
    try {
      const blob = await (await fetch(url)).blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nomFichier;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { console.error(e); window.open(url, '_blank'); }
  }
  /* ================= Carte matricule ================= */
  /* Positions mesurées sur le modèle Canva (carte/recto.png, 1050 × 600 px = 88,9 × 50,8 mm). */
  const CARTE = {
    fond: 'carte/recto.png', verso: 'carte/verso.png', l: 1050, h: 600,
    photo: { x: 43, y: 55, l: 351, h: 436 },
    cadre: { x: 40, y: 52, l: 356, h: 442, ep: 6 },
    texte: { x: 428, l: 290, nom: 184, prenom: 269, taille: 83 },
    badge: { x: 434, y: 310, l: 251, h: 104, r: 18, taille: 92 },
    brun: '#6d5b4a', encre: '#655b52', creme: '#f6eedd',
    police: "'Roboto Slab', Georgia, serif", serrage: 0.78,
  };
  /* Fond et verso intégrés (carte/images.js, chargé par l'espace équipe) : en file://,
     une image du disque dessinée dans un canvas le rendrait inutilisable. */
  const imagesCarte = () => window.CARTE_IMAGES || { recto: CARTE.fond, verso: CARTE.verso };
  const chargerScript = src => new Promise(ok => {
    const s = document.createElement('script'); s.src = src; s.onload = s.onerror = ok; document.head.appendChild(s);
  });
  const chargerImage = src => new Promise((ok, ko) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => ok(i); i.onerror = () => ko(new Error('image ' + src)); i.src = src;
  });
  async function dessinerCarte(v) {
    await document.fonts.load(`800 ${CARTE.texte.taille}px ${CARTE.police}`).catch(() => {});
    const [fond, photo] = await Promise.all([chargerImage(imagesCarte().recto), v.photo ? chargerImage(v.photo).catch(() => null) : null]);
    const c = document.createElement('canvas'); c.width = CARTE.l; c.height = CARTE.h;
    const x = c.getContext('2d');
    x.drawImage(fond, 0, 0, CARTE.l, CARTE.h);

    const P = CARTE.photo;
    x.fillStyle = '#e9dfca'; x.fillRect(P.x, P.y, P.l, P.h);
    if (photo) {
      const r = Math.max(P.l / photo.naturalWidth, P.h / photo.naturalHeight);
      const l = P.l / r, h = P.h / r;
      x.drawImage(photo, (photo.naturalWidth - l) / 2, (photo.naturalHeight - h) / 2, l, h, P.x, P.y, P.l, P.h);
    }
    x.strokeStyle = CARTE.brun; x.lineWidth = CARTE.cadre.ep;
    x.strokeRect(CARTE.cadre.x, CARTE.cadre.y, CARTE.cadre.l, CARTE.cadre.h);

    /* Texte resserré comme sur le modèle ; rétréci si le nom est long. */
    const ecrire = (texte, gauche, base, taille, largeurMax, centre = false) => {
      let sx = CARTE.serrage;
      x.font = `800 ${taille}px ${CARTE.police}`;
      let w = x.measureText(texte).width * sx;
      if (w > largeurMax) { sx = Math.max(0.62, sx * largeurMax / w); w = x.measureText(texte).width * sx; }
      if (w > largeurMax) { taille *= largeurMax / w; x.font = `800 ${taille}px ${CARTE.police}`; w = x.measureText(texte).width * sx; }
      x.save(); x.translate(centre ? gauche - w / 2 : gauche, base); x.scale(sx, 1); x.fillText(texte, 0, 0); x.restore();
    };
    const T = CARTE.texte;
    x.fillStyle = CARTE.encre; x.textBaseline = 'alphabetic';
    ecrire(v.nom.toUpperCase(), T.x, T.nom, T.taille, T.l);
    ecrire(v.prenom.charAt(0).toUpperCase() + v.prenom.slice(1), T.x, T.prenom, T.taille, T.l);

    const B = CARTE.badge;
    x.fillStyle = CARTE.brun; x.beginPath(); x.roundRect(B.x, B.y, B.l, B.h, B.r); x.fill();
    x.fillStyle = CARTE.creme; x.textBaseline = 'middle';
    ecrire('#' + v.matricule, B.x + B.l / 2, B.y + B.h / 2 + 4, B.taille, B.l - 36, true);
    return c;
  }
  /* Image de la carte, gardée en cache tant que nom / prénom / photo ne changent pas. */
  const cacheCartes = new Map();
  function imageCarte(v) {
    const cle = [v.id, v.prenom, v.nom, v.matricule, v.photo].join('|');
    if (!cacheCartes.has(cle)) {
      cacheCartes.set(cle, dessinerCarte(v)
        .then(c => new Promise(ok => c.toBlob(b => ok(URL.createObjectURL(b)), 'image/png')))
        .catch(e => { cacheCartes.delete(cle); throw e; }));
    }
    return cacheCartes.get(cle);
  }
  /* Planche A4 : 2 × 5 cartes à taille réelle. Le verso est placé en miroir pour
     une feuille retournée comme une page de livre, et déborde un peu (fond perdu)
     pour pardonner un léger décalage. Repères de coupe dans les marges du recto. */
  const PLANCHE = { l: 88.9, h: 50.8, cols: 2, rows: 5, gout: 4, perdu: 1.5, pageL: 210, pageH: 297 };
  PLANCHE.max = PLANCHE.cols * PLANCHE.rows;
  PLANCHE.x0 = (PLANCHE.pageL - (PLANCHE.cols * PLANCHE.l + (PLANCHE.cols - 1) * PLANCHE.gout)) / 2;
  PLANCHE.y0 = (PLANCHE.pageH - (PLANCHE.rows * PLANCHE.h + (PLANCHE.rows - 1) * PLANCHE.gout)) / 2;
  function imprimerPlanche(urls, verso) {
    const P = PLANCHE, mm = n => n.toFixed(2) + 'mm';
    const imgs = urls.map((u, i) => {
      const c = i % P.cols, r = Math.floor(i / P.cols);
      const col = verso ? P.cols - 1 - c : c, d = verso ? P.perdu : 0;
      const x = P.x0 + col * (P.l + P.gout), y = P.y0 + r * (P.h + P.gout);
      return `<img src="${u}" style="left:${mm(x - d)};top:${mm(y - d)};width:${mm(P.l + 2 * d)};height:${mm(P.h + 2 * d)}">`;
    }).join('');
    let reperes = '';
    if (!verso) {
      const xs = [], ys = [];
      for (let c = 0; c < P.cols; c++) { const x = P.x0 + c * (P.l + P.gout); xs.push(x, x + P.l); }
      for (let r = 0; r < P.rows; r++) { const y = P.y0 + r * (P.h + P.gout); ys.push(y, y + P.h); }
      const xFin = xs[xs.length - 1], yFin = ys[ys.length - 1];
      xs.forEach(x => { reperes += `<i style="left:${mm(x)};top:${mm(3)};width:.2mm;height:${mm(P.y0 - 5)}"></i><i style="left:${mm(x)};top:${mm(yFin + 2)};width:.2mm;height:${mm(P.pageH - yFin - 5)}"></i>`; });
      ys.forEach(y => { reperes += `<i style="top:${mm(y)};left:${mm(3)};height:.2mm;width:${mm(P.x0 - 5)}"></i><i style="top:${mm(y)};left:${mm(xFin + 2)};height:.2mm;width:${mm(P.pageL - xFin - 5)}"></i>`; });
    }
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open();
    d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${verso ? 'Verso' : 'Recto'}</title><style>
      @page { size: A4 portrait; margin: 0; }
      html, body { margin: 0; }
      .feuille { position: relative; width: ${P.pageL}mm; height: ${P.pageH}mm; overflow: hidden; }
      img { position: absolute; display: block; }
      i { position: absolute; background: #000; }
    </style></head><body><div class="feuille">${imgs}${reperes}</div></body></html>`);
    d.close();
    const images = [...d.images];
    Promise.all(images.map(i => i.complete ? null : new Promise(ok => { i.onload = i.onerror = ok; }))).then(() => {
      f.contentWindow.focus(); f.contentWindow.print();
      setTimeout(() => f.remove(), 60000);
    });
  }

  /* ================= Données ================= */
  const db = DEMO ? magasinDemo() : magasinSupabase();

  function magasinDemo() {
    const KEY = 'forcats.demo';
    const ecoute = new Set();
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('forcats-demo') : null;
    const notifier = () => ecoute.forEach(f => f());
    if (bc) bc.onmessage = notifier;
    window.addEventListener('storage', e => { if (e.key === KEY) notifier(); });
    let memoire = { visiteurs: [], scans: [] };
    const lire = () => { try { return JSON.parse(store.get(KEY)) || memoire; } catch { return memoire; } };
    const ecrire = d => { memoire = d; store.set(KEY, JSON.stringify(d)); bc && bc.postMessage(1); notifier(); };
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    return {
      async deposerPhoto(blob) {
        return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
      },
      async creer({ prenom, nom, matricule, photo }) {
        const d = lire();
        if (d.visiteurs.some(v => v.matricule === matricule)) throw { code: 'MATRICULE_PRIS' };
        const v = { id: uid(), prenom, nom, matricule, photo, niveau: null, imprime: false, created_at: new Date().toISOString(), termine_at: null };
        d.visiteurs.push(v); ecrire(d); return v;
      },
      async lire(id) { return lire().visiteurs.find(v => v.id === id) || null; },
      async parMatricule(m) { return lire().visiteurs.find(v => v.matricule === m) || null; },
      async scanner(vid, aid) {
        const d = lire();
        if (d.scans.some(s => s.visiteur_id === vid && s.activite_id === aid)) return 'deja';
        d.scans.push({ visiteur_id: vid, activite_id: aid, created_at: new Date().toISOString() }); ecrire(d); return 'ok';
      },
      async scans(vid) { return lire().scans.filter(s => s.visiteur_id === vid).map(s => s.activite_id); },
      async maj(id, patch) { const d = lire(); const v = d.visiteurs.find(x => x.id === id); if (v) { Object.assign(v, patch); ecrire(d); } return v; },
      async tous() { const d = lire(); return d.visiteurs.map(v => ({ ...v, scans: d.scans.filter(s => s.visiteur_id === v.id).map(s => s.activite_id) })); },
      suivre(f) { ecoute.add(f); return () => ecoute.delete(f); },
    };
  }

  function magasinSupabase() {
    const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
    const ok = ({ data, error }) => { if (error) throw error; return data; };
    return {
      async deposerPhoto(blob) {
        const chemin = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
        ok(await sb.storage.from('photos').upload(chemin, blob, { contentType: 'image/jpeg' }));
        return sb.storage.from('photos').getPublicUrl(chemin).data.publicUrl;
      },
      async creer(v) {
        const r = await sb.from('visiteurs').insert(v).select().single();
        if (r.error) { if (r.error.code === '23505') throw { code: 'MATRICULE_PRIS' }; throw r.error; }
        return r.data;
      },
      async lire(id) { return ok(await sb.from('visiteurs').select('*').eq('id', id).maybeSingle()); },
      async parMatricule(m) { return ok(await sb.from('visiteurs').select('*').eq('matricule', m).maybeSingle()); },
      async scanner(vid, aid) {
        const r = await sb.from('scans').insert({ visiteur_id: vid, activite_id: aid });
        if (r.error) { if (r.error.code === '23505') return 'deja'; throw r.error; }
        return 'ok';
      },
      async scans(vid) { return ok(await sb.from('scans').select('activite_id').eq('visiteur_id', vid)).map(s => s.activite_id); },
      async maj(id, patch) { return ok(await sb.from('visiteurs').update(patch).eq('id', id).select().single()); },
      async tous() {
        const [v, s] = await Promise.all([
          sb.from('visiteurs').select('*').order('created_at').limit(5000),
          sb.from('scans').select('visiteur_id, activite_id').limit(20000),
        ]);
        const vs = ok(v), ss = ok(s);
        return vs.map(x => ({ ...x, scans: ss.filter(y => y.visiteur_id === x.id).map(y => y.activite_id) }));
      },
      suivre(f) {
        const ch = sb.channel('forum')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'visiteurs' }, f)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'scans' }, f)
          .subscribe();
        return () => sb.removeChannel(ch);
      },
    };
  }

  /* ================= Visiteur courant ================= */
  async function moi() {
    const id = store.get(K_MOI);
    if (!id) return null;
    const v = await db.lire(id);
    if (!v) store.set(K_MOI, null);
    return v;
  }

  /* ================= Mise en page ================= */
  let nettoyage = null;
  function cadre(contenu, { mat = '', equipe = false } = {}) {
    document.body.classList.toggle('equipe', equipe);
    document.body.classList.remove('avec-action');
    document.title = TITRE;
    app.innerHTML = `
      <header class="bandeau"><div class="bandeau-in">
        <a class="marque" href="#/">Forçats<span>'</span>Nou</a>
        ${mat ? `<span class="bandeau-mat">MATRICULE #${esc(mat)}</span>` : equipe ? '<span class="bandeau-mat">ESPACE ÉQUIPE</span>' : ''}
      </div></header>
      ${DEMO ? `<div class="page" style="padding-block:12px 0"><p class="alerte"><b>Mode démo.</b> Les données restent dans ce navigateur. Renseigne Supabase dans <span class="registre">config.js</span> pour le forum.</p></div>` : ''}
      <main class="page">${contenu}</main>`;
    window.scrollTo(0, 0);
  }
  function chargement() { cadre('<p class="muted">Ouverture du dossier…</p>'); }
  function panne(e) {
    console.error(e);
    cadre(`<section class="dossier"><h2>Connexion impossible</h2>
      <p class="muted">Le serveur ne répond pas. Vérifie le réseau puis réessaie.</p>
      <button class="btn btn-or" id="re">Réessayer</button></section>`);
    document.getElementById('re').onclick = route;
  }

  /* ================= Écrans visiteur ================= */
  async function ecranAccueil() {
    const v = await moi();
    if (v) return aller(v.niveau ? 'fin' : 'parcours');
    const attente = activite(store.get(K_ATTENTE, sessionStorage));
    cadre(`
      <section class="stack">
        <p class="label">Pénitencier de l'île Nou</p>
        <h1 class="display-xl">Ouvre ton dossier</h1>
        <p class="muted">Bienvenue au bagne ! Inscris-toi pour recevoir ta carte matricule, puis découvre les activités du stand.</p>
      </section>

      <section class="panneau" aria-labelledby="t-guide">
        <h2 id="t-guide">Comment ça marche</h2>
        <ol class="etapes">
          <li><span class="n">1</span><div><b>Inscris-toi</b><span class="muted small">Prénom, nom, photo et 4 chiffres au choix : ce sera ton matricule.</span></div></li>
          <li><span class="n">2</span><div><b>Fais les activités de ton choix</b><span class="muted small">Tu es libre ! Au moins ${minimum()}, dans l'ordre que tu veux. Scanne le QR code de chaque activité avec le bouton « Scanner » de l'appli.</span></div></li>
          <li><span class="n">3</span><div><b>Termine ton parcours</b><span class="muted small">Découvre ton niveau, puis sors par la porte arrière récupérer ta carte matricule.</span></div></li>
        </ol>
      </section>

      ${attente ? `<p class="alerte">Inscris-toi d'abord : l'activité <b>${esc(attente.nom)}</b> sera validée juste après.</p>` : ''}

      <form class="dossier" id="f" novalidate>
        <div class="dossier-tete"><span class="label">Fiche d'entrée</span><span class="registre muted">N° ……</span></div>
        <div class="champ"><label for="prenom">Prénom</label><input type="text" id="prenom" autocomplete="given-name" maxlength="60" required></div>
        <div class="champ"><label for="nom">Nom</label><input type="text" id="nom" autocomplete="family-name" maxlength="60" required></div>
        <div class="champ"><label for="matricule">Ton matricule (4 chiffres)</label>
          <input id="matricule" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" class="matricule-input" placeholder="····" required>
          <span class="aide">Choisis 4 chiffres et retiens-les : ils seront imprimés sur ta carte.</span></div>

        <div class="champ">
          <span class="champ-titre">Ta photo (format identité)</span>
          <div class="photo-zone">
            <div class="photo-cadre" id="apercu" aria-live="polite"><span class="photo-vide" aria-hidden="true"></span></div>
            <div class="stack-sm" style="flex:1;min-width:0">
              <label class="btn btn-ligne btn-sm">Prendre une photo<input class="fichier" type="file" accept="image/*" capture="user" data-photo></label>
              <label class="btn btn-discret btn-sm">Choisir dans ma galerie<input class="fichier" type="file" accept="image/*" data-photo></label>
              <span class="aide">De face, visage bien centré, sur un fond clair.</span>
            </div>
          </div>
        </div>

        <label class="consent"><input type="checkbox" id="consent"><span>${esc(C.consentement)}</span></label>
        <p class="erreur" id="err" hidden></p>
        <button class="btn btn-or btn-bloc" type="submit">Entrer au bagne</button>
      </form>
      <p class="pied"><a href="#/retrouver">J'ai déjà un dossier</a></p>`);

    const f = document.getElementById('f'), err = document.getElementById('err');
    const mat = document.getElementById('matricule'), apercu = document.getElementById('apercu');
    const erreur = msg => { err.textContent = msg; err.hidden = false; err.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    let photo = null;      // Blob JPEG recadré
    let photoUrl = null;   // adresse une fois envoyée (réutilisée si on réessaie)
    mat.addEventListener('input', () => { mat.value = mat.value.replace(/\D/g, '').slice(0, 4); });

    f.querySelectorAll('[data-photo]').forEach(inp => inp.addEventListener('change', async () => {
      const fichier = inp.files && inp.files[0]; inp.value = '';
      if (!fichier) return;
      apercu.classList.add('charge');
      try {
        photo = await preparerPhoto(fichier); photoUrl = null;
        apercu.innerHTML = `<img src="${URL.createObjectURL(photo)}" alt="Ta photo">`;
        err.hidden = true;
      } catch (e2) { console.error(e2); erreur("Cette image n'a pas pu être ouverte. Essaie une autre photo."); }
      apercu.classList.remove('charge');
    }));

    f.addEventListener('submit', async e => {
      e.preventDefault();
      const prenom = f.prenom.value.trim(), nom = f.nom.value.trim(), matricule = mat.value;
      err.hidden = true;
      if (!prenom || !nom) return erreur('Indique ton prénom et ton nom.');
      if (!/^\d{4}$/.test(matricule)) { mat.focus(); return erreur('Le matricule doit faire exactement 4 chiffres.'); }
      if (!photo) return erreur('Ajoute ta photo : elle sera imprimée sur ta carte matricule.');
      if (!f.consent.checked) return erreur('Coche la case pour accepter que ta photo serve à imprimer ta carte.');
      const b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Envoi de ta fiche…';
      try {
        // Vérifié avant l'envoi de la photo pour ne pas en déposer pour rien.
        if (await db.parMatricule(matricule)) throw { code: 'MATRICULE_PRIS' };
        photoUrl = photoUrl || await db.deposerPhoto(photo);
        const v = await db.creer({ prenom, nom, matricule, photo: photoUrl });
        store.set(K_MOI, v.id);
        const att = store.get(K_ATTENTE, sessionStorage);
        store.set(K_ATTENTE, null, sessionStorage);
        aller(att && activite(att) ? 'activite/' + att : 'parcours');
      } catch (e2) {
        erreur(e2 && e2.code === 'MATRICULE_PRIS'
          ? `Le matricule ${matricule} est déjà pris par un autre forçat. Choisis 4 autres chiffres.`
          : "L'inscription n'est pas passée. Vérifie ta connexion et réessaie.");
        b.disabled = false; b.textContent = 'Entrer au bagne';
        if (!(e2 && e2.code)) console.error(e2);
      }
    });
  }

  async function ecranRetrouver() {
    cadre(`
      <section class="stack"><p class="label">Dossier existant</p><h1>Retrouver mon dossier</h1>
        <p class="muted">Tu as changé de téléphone ou de navigateur ? Indique ton matricule et ton nom.</p></section>
      <form class="dossier" id="f" novalidate>
        <div class="champ"><label for="matricule">Matricule</label><input id="matricule" inputmode="numeric" maxlength="4" class="matricule-input" placeholder="····" autocomplete="off"></div>
        <div class="champ"><label for="nom">Nom</label><input type="text" id="nom" autocomplete="family-name" maxlength="60"></div>
        <p class="erreur" id="err" hidden></p>
        <button class="btn btn-or btn-bloc" type="submit">Retrouver</button>
      </form>
      <p class="pied"><a href="#/">Je n'ai pas encore de dossier</a></p>`);
    const f = document.getElementById('f'), err = document.getElementById('err');
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.hidden = true;
      try {
        const v = await db.parMatricule(f.matricule.value.trim());
        if (!v || norm(v.nom) !== norm(f.nom.value)) { err.textContent = 'Aucun dossier ne correspond. Vérifie les 4 chiffres et l\'orthographe du nom.'; err.hidden = false; return; }
        store.set(K_MOI, v.id);
        const att = store.get(K_ATTENTE, sessionStorage); store.set(K_ATTENTE, null, sessionStorage);
        aller(att && activite(att) && !v.niveau ? 'activite/' + att : (v.niveau ? 'fin' : 'parcours'));
      } catch (e2) { panne(e2); }
    });
  }

  async function ecranActivite(id) {
    const a = activite(id);
    if (!a) {
      cadre(`<section class="dossier"><h2>QR code inconnu</h2><p class="muted">Ce QR code ne correspond à aucune activité. Préviens un membre de l'équipe.</p><a class="btn btn-ligne" href="#/parcours">Voir les activités</a></section>`);
      return;
    }
    const v = await moi();
    if (!v) { store.set(K_ATTENTE, id, sessionStorage); return aller(''); }
    if (v.niveau) {
      cadre(`<section class="dossier"><h2>Ton parcours est terminé</h2><p class="muted">Cette activité ne compte plus, mais tu peux quand même la découvrir. N'oublie pas ta carte matricule à la porte arrière !</p><a class="btn btn-or" href="#/fin">Revoir mon niveau</a></section>`, { mat: v.matricule });
      return;
    }
    const res = await db.scanner(v.id, id);
    const faites = await db.scans(v.id);
    const n = faites.filter(activite).length, total = C.activites.length, min = minimum();
    cadre(`
      <section class="dossier" style="align-items:center;text-align:center">
        <div class="tampon ${res === 'ok' ? 'ok anim' : ''}" aria-hidden="true">${res === 'ok' ? 'Validé' : 'Déjà<br>validé'}<small>${n} / ${total}</small></div>
        <p class="label">${res === 'ok' ? 'Activité validée' : 'Tu avais déjà validé cette activité'}</p>
        <h1>${esc(a.nom)}</h1>
        <p>${esc(a.description)}</p>
      </section>
      <section class="panneau">
        <p class="label">Et maintenant ?</p>
        <p class="muted small">${n >= total
          ? 'Tu as fait toutes les activités du stand, bravo ! Tu peux terminer ton parcours.'
          : n >= min
            ? `Tu as fait ${pluriel(n, 'activité')} : tu peux terminer ton parcours quand tu veux, ou continuer avec d'autres activités si tu en as envie.`
            : `Encore ${pluriel(min - n, 'activité')} au choix et tu pourras terminer ton parcours.`}</p>
        <a class="btn btn-or btn-bloc" href="#/scanner">Scanner une autre activité</a>
        <a class="btn btn-ligne btn-bloc" href="#/parcours">${n >= min ? 'Voir les activités ou terminer' : 'Voir les activités'}</a>
      </section>`, { mat: v.matricule });
  }

  async function ecranParcours() {
    const v = await moi();
    if (!v) return aller('');
    if (v.niveau) return aller('fin');
    const faites = new Set(await db.scans(v.id));
    const n = C.activites.filter(a => faites.has(a.id)).length, total = C.activites.length, min = minimum();
    const peut = n >= min;
    cadre(`
      <section class="stack">
        <p class="label">Dossier de ${esc(v.prenom)}</p>
        <h1>Les activités du stand</h1>
      </section>

      <section class="panneau libre">
        <h2>Tu es libre !</h2>
        <p class="muted small">Fais les activités qui te plaisent, dans l'ordre que tu veux. Pas besoin de tout faire : il en faut <b>au moins ${min}</b> pour terminer ton parcours. Plus tu en fais, plus ton niveau monte.</p>
        <div class="jalons" aria-label="${n} activités validées sur ${min} minimum">
          ${Array.from({ length: min }, (_, i) => `<span class="jalon ${i < n ? 'ok' : ''}" aria-hidden="true">${i < n ? '✓' : i + 1}</span>`).join('')}
          <span class="small ${peut ? '' : 'muted'}" style="margin-left:4px">${peut ? `<b>${pluriel(n, 'activité')} validée${n > 1 ? 's' : ''}</b> · tu peux terminer` : `Encore ${pluriel(min - n, 'activité')}`}</span>
        </div>
      </section>

      <section class="dossier">
        <div class="dossier-tete"><span class="label">${pluriel(total, 'activité')}</span><span class="registre muted">${n} / ${total} faite${n > 1 ? 's' : ''}</span></div>
        <ul class="activites">
          ${C.activites.map(a => `<li><div class="stack-sm" style="gap:2px;min-width:0"><span class="nom">${esc(a.nom)}</span><span class="muted small">${a.format ? `<b>${esc(a.format)}</b> · ` : ''}${esc(a.description)}</span></div>
            ${faites.has(a.id) ? '<span class="pastille ok">Validé</span>' : '<span class="pastille">À découvrir</span>'}</li>`).join('')}
        </ul>
      </section>

      <section class="stack" id="fin">
        ${peut
          ? `<button class="btn btn-ligne btn-bloc" id="terminer">Terminer mon parcours</button>
             <p class="aide" style="text-align:center">Tu peux encore faire d'autres activités avant, c'est toi qui décides.</p>`
          : `<button class="btn btn-ligne btn-bloc" disabled>Terminer mon parcours</button>
             <p class="aide" style="text-align:center">Valide encore ${pluriel(min - n, 'activité')} pour pouvoir terminer.</p>`}
      </section>

      <div class="barre-action"><a class="btn btn-or btn-bloc btn-scan" href="#/scanner"><span class="ico-scan" aria-hidden="true"></span>Scanner un QR code</a></div>`, { mat: v.matricule });
    document.body.classList.add('avec-action');

    const t = document.getElementById('terminer');
    if (t) t.onclick = () => {
      document.getElementById('fin').innerHTML = `
        <div class="confirm">
          <p><b>Terminer ton parcours maintenant ?</b><br><span class="muted small">Tu ne pourras plus valider d'activité ensuite.</span></p>
          <div class="row"><button class="btn btn-or" id="oui">Oui, j'ai fini</button><button class="btn btn-discret" id="non">Pas encore</button></div>
        </div>`;
      document.getElementById('fin').scrollIntoView({ block: 'center', behavior: 'smooth' });
      document.getElementById('non').onclick = ecranParcours;
      document.getElementById('oui').onclick = async e => {
        e.target.disabled = true;
        try {
          const nb = (await db.scans(v.id)).filter(activite).length;
          await db.maj(v.id, { niveau: niveauPour(nb).id, termine_at: new Date().toISOString() });
          store.set('forcats.anim', '1', sessionStorage);
          aller('fin');
        } catch (e2) { panne(e2); }
      };
    };
  }

  async function ecranScanner() {
    const v = await moi();
    if (!v) return aller('');
    if (v.niveau) return aller('fin');
    cadre(`
      <section class="scanner" aria-label="Scanner">
        <video id="video" playsinline muted autoplay></video>
        <div class="viseur" aria-hidden="true"></div>
        <p class="scanner-msg" id="msg" role="status">Ouverture de la caméra…</p>
        <a class="btn btn-or scanner-fermer" href="#/parcours">Annuler</a>
      </section>`, { mat: v.matricule });

    const video = document.getElementById('video'), msg = document.getElementById('msg');
    let flux = null, actif = true, minuteur = null;
    const arreter = () => { actif = false; clearTimeout(minuteur); if (flux) flux.getTracks().forEach(t => t.stop()); };
    nettoyage = arreter;

    /* Extrait l'id d'activité d'un QR (URL ".../#/activite/<id>" ou id seul). */
    const lireId = texte => { const m = /#\/activite\/([^/?#\s]+)/.exec(texte); return m ? decodeURIComponent(m[1]) : texte.trim(); };

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      msg.innerHTML = "Ton navigateur ne permet pas d'utiliser la caméra ici. Scanne le QR code avec l'appareil photo de ton téléphone, ça marche aussi.";
      return;
    }
    try {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch (e) {
      console.error(e);
      msg.innerHTML = "La caméra est bloquée. Autorise l'accès à la caméra pour ce site (réglages du navigateur), ou scanne le QR code avec l'appareil photo de ton téléphone.";
      return;
    }
    if (!actif) return arreter(); // l'utilisateur a quitté l'écran pendant l'autorisation
    video.srcObject = flux;
    try { await video.play(); } catch { }
    msg.textContent = "Vise le QR code de l'activité";

    const detecteur = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    const toile = document.createElement('canvas'), ctx = toile.getContext('2d', { willReadFrequently: true });
    let dernierInconnu = '';
    async function lire() {
      if (!actif) return;
      let texte = null;
      try {
        if (video.readyState >= 2 && video.videoWidth) {
          if (detecteur) {
            const r = await detecteur.detect(video); texte = r[0] && r[0].rawValue;
          } else if (window.jsQR) {
            const k = Math.min(1, 640 / video.videoWidth);
            toile.width = Math.round(video.videoWidth * k); toile.height = Math.round(video.videoHeight * k);
            ctx.drawImage(video, 0, 0, toile.width, toile.height);
            const r = window.jsQR(ctx.getImageData(0, 0, toile.width, toile.height).data, toile.width, toile.height, { inversionAttempts: 'dontInvert' });
            texte = r && r.data;
          }
        }
      } catch (e) { console.error(e); }
      if (texte && actif) {
        const id = lireId(texte);
        if (activite(id)) {
          if (navigator.vibrate) navigator.vibrate(80);
          arreter();
          return aller('activite/' + id);
        }
        if (texte !== dernierInconnu) { dernierInconnu = texte; msg.textContent = "Ce QR code n'est pas une activité du stand."; }
      }
      minuteur = setTimeout(lire, 150);
    }
    lire();
  }

  async function ecranFin() {
    const v = await moi();
    if (!v) return aller('');
    if (!v.niveau) return aller('parcours');
    const faites = (await db.scans(v.id)).map(activite).filter(Boolean);
    const nv = niveau(v.niveau) || niveauPour(faites.length);
    const anim = store.get('forcats.anim', sessionStorage); store.set('forcats.anim', null, sessionStorage);
    cadre(`
      <section class="stack" style="text-align:center">
        <p class="label">Parcours terminé</p>
        <h1 class="display-lg">${esc(nomComplet(v))}</h1>
        <p class="registre muted">MATRICULE #${esc(v.matricule)}</p>
      </section>
      <section class="panneau sortie">
        <span class="fleche" aria-hidden="true">➜</span>
        <div class="stack-sm">
          <p class="label">Dernière étape</p>
          <h2>Direction la porte arrière</h2>
          <p>${esc(C.messageFin)}</p>
          <p class="muted small">Donne ton matricule <span class="registre" style="color:var(--gold-ink)">#${esc(v.matricule)}</span> à l'équipe.</p>
        </div>
      </section>
      <section class="dossier" style="align-items:center;text-align:center">
        <p class="muted small">Avec ${pluriel(faites.length, 'activité')}, ton niveau au bagne :</p>
        <div class="tampon grand ${anim ? 'anim' : ''}">${esc(nv.titre)}</div>
        <h2>${esc(nv.nom)}</h2>
        <p>${esc(nv.description)}</p>
      </section>
      <section class="dossier">
        <div class="dossier-tete"><span class="label">Activités validées</span><span class="registre muted">${faites.length} / ${C.activites.length}</span></div>
        <ul class="activites">${faites.map(a => `<li><span class="nom">${esc(a.nom)}</span><span class="pastille ok">Validé</span></li>`).join('') || '<li class="muted">Aucune</li>'}</ul>
      </section>`, { mat: v.matricule });
  }

  /* ================= Espace équipe ================= */
  function ecranCode(onglet) {
    cadre(`
      <form class="dossier" id="f" novalidate style="max-width:420px;width:100%;margin:0 auto">
        <h1>Espace équipe</h1>
        <p class="muted small">Réservé à l'équipe du forum : impression des cartes et QR codes.</p>
        <div class="champ"><label for="code">Code d'accès</label><input type="password" id="code" inputmode="numeric" autocomplete="off"></div>
        <p class="erreur" id="err" hidden>Code incorrect.</p>
        <button class="btn btn-or" type="submit">Entrer</button>
      </form>`, { equipe: true });
    document.getElementById('f').addEventListener('submit', e => {
      e.preventDefault();
      if (document.getElementById('code').value === String(C.codeEquipe)) { store.set(K_EQUIPE, '1', sessionStorage); ecranEquipe(onglet); }
      else document.getElementById('err').hidden = false;
    });
  }

  /* Petit « ding » quand une inscription arrive (le navigateur l'autorise après un premier clic). */
  let audio = null;
  function bip() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime;
      [880, 1320].forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.15 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.35);
        o.connect(g).connect(audio.destination); o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.4);
      });
    } catch { /* pas de son, tant pis */ }
  }

  async function ecranEquipe(onglet = 'impression') {
    if (store.get(K_EQUIPE, sessionStorage) !== '1') return ecranCode(onglet);
    if (!['impression', 'qr'].includes(onglet)) onglet = 'impression';

    cadre(`
      <nav class="onglets no-print" aria-label="Postes">
        <a href="#/equipe/impression" ${onglet === 'impression' ? 'aria-current="page"' : ''}>Impression<span class="nb" id="nb-imp"></span></a>
        <a href="#/equipe/qr" ${onglet === 'qr' ? 'aria-current="page"' : ''}>QR codes</a>
      </nav>
      <div id="zone"></div>`, { equipe: true });
    const zone = document.getElementById('zone');

    if (onglet === 'qr') return posteQR(zone);
    if (!window.CARTE_IMAGES) await chargerScript('carte/images.js');

    let voirTout = false;
    let nbVoulu = PLANCHE.max;   // nombre de cartes souhaité sur la prochaine planche
    let enCours = null;          // ids figés au moment d'imprimer le recto
    let etape = 0;               // 0 : rien d'imprimé, 1 : recto imprimé, 2 : verso imprimé
    zone.innerHTML = `<div class="stack">
        <div class="stats" id="stats"></div>
        <section class="panneau planche" id="planche"></section>
        <div class="row" style="justify-content:space-between">
          <div><h1>File d'attente</h1><p class="muted small">Les inscriptions arrivent ici en direct. Les visiteurs qui ont terminé leur parcours passent en premier, puis l'ordre d'arrivée.</p></div>
          <button class="btn btn-discret btn-sm" id="tout">Voir aussi les imprimées</button>
        </div>
        <div class="grille" id="liste"></div></div>`;

    const liste = document.getElementById('liste'), panneau = document.getElementById('planche');
    const tout = document.getElementById('tout');
    tout.onclick = () => { voirTout = !voirTout; tout.textContent = voirTout ? 'Masquer les imprimées' : 'Voir aussi les imprimées'; dessiner(); };

    /* Ordre de la file : parcours terminé d'abord (la carte est attendue à la porte), puis arrivée. */
    const file = () => donnees.filter(v => !v.imprime).sort((a, b) =>
      (!!b.niveau - !!a.niveau) || (a.niveau ? (a.termine_at || '').localeCompare(b.termine_at || '') : 0) || a.created_at.localeCompare(b.created_at));
    const prochaine = () => enCours ? enCours.map(id => donnees.find(v => v.id === id)).filter(Boolean) : file().slice(0, nbVoulu);

    function dessinerPlanche() {
      const cartes = prochaine(), n = cartes.length, attente = file().length;
      if (!enCours && !attente) { panneau.innerHTML = '<h2>Planche à imprimer</h2><p class="muted small">Aucune carte en attente.</p>'; return; }
      panneau.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <h2>Planche à imprimer · ${pluriel(n, 'carte')}</h2>
          ${enCours ? '<button class="btn btn-discret btn-sm" data-pl="annuler">Annuler cette planche</button>'
            : `<label class="small muted">Cartes sur la feuille
                 <select data-pl="nb">${Array.from({ length: Math.min(attente, PLANCHE.max) }, (_, i) => `<option ${i + 1 === n ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>`}
        </div>
        <p class="small">${cartes.map(v => `<b>#${esc(v.matricule)}</b> ${esc(nomComplet(v))}`).join(' · ')}</p>
        <ol class="planche-etapes">
          <li class="${etape > 0 ? 'fait' : ''}"><button class="btn ${etape === 0 ? 'btn-or' : 'btn-discret'}" data-pl="recto">1 · Imprimer le recto</button>
            <span class="small muted">Feuille A4 épaisse. Dans la fenêtre d'impression : échelle 100 %, sans marges ni en-têtes.</span></li>
          <li class="${etape > 1 ? 'fait' : ''}"><span class="n-etape">2</span>
            <span class="small"><b>Remets la même feuille</b> dans l'imprimante, <b>retournée comme une page de livre</b> (le haut reste en haut).</span></li>
          <li class="${etape > 1 ? 'fait' : ''}"><button class="btn ${etape === 1 ? 'btn-or' : 'btn-discret'}" data-pl="verso" ${etape < 1 ? 'disabled' : ''}>3 · Imprimer le verso</button></li>
          <li><button class="btn ${etape === 2 ? 'btn-or' : 'btn-discret'}" data-pl="fini" ${etape < 2 ? 'disabled' : ''}>4 · Découpé : ${n > 1 ? `ces ${n} cartes sont imprimées` : 'carte imprimée'}</button>
            <span class="small muted">Découpe en suivant les traits dans les marges.</span></li>
        </ol>`;
    }

    panneau.addEventListener('change', e => { if (e.target.dataset.pl === 'nb') { nbVoulu = Number(e.target.value); dessinerPlanche(); dessiner(); } });
    panneau.addEventListener('click', async e => {
      const b = e.target.closest('[data-pl]'); if (!b || b.tagName === 'SELECT') return;
      const act = b.dataset.pl;
      if (act === 'annuler') { enCours = null; etape = 0; dessiner(); return; }
      if (act === 'recto' || act === 'verso') {
        const cartes = prochaine(); if (!cartes.length) return;
        b.disabled = true;
        try {
          if (act === 'recto') { enCours = cartes.map(v => v.id); imprimerPlanche(await Promise.all(cartes.map(imageCarte)), false); etape = Math.max(etape, 1); }
          else { imprimerPlanche(cartes.map(() => imagesCarte().verso), true); etape = 2; }
        } catch (err) { console.error(err); toast('Planche impossible à préparer, vérifie le réseau'); }
        dessiner(); return;
      }
      if (act === 'fini') {
        b.disabled = true;
        try {
          await Promise.all(prochaine().map(v => db.maj(v.id, { imprime: true })));
          toast(`${pluriel(enCours.length, 'carte')} marquée${enCours.length > 1 ? 's' : ''} imprimée${enCours.length > 1 ? 's' : ''}`);
          enCours = null; etape = 0; await charger();
        } catch (err) { console.error(err); b.disabled = false; toast('Action impossible, vérifie le réseau'); }
      }
    });

    let donnees = [], connus = null;
    async function charger() {
      try {
        donnees = await db.tous();
        const nouveaux = connus ? donnees.filter(v => !connus.has(v.id)) : [];
        connus = new Set(donnees.map(v => v.id));
        if (nouveaux.length) { bip(); toast(nouveaux.length > 1 ? `${nouveaux.length} nouvelles inscriptions` : `Nouvelle inscription : ${nouveaux[0].prenom} #${nouveaux[0].matricule}`); }
        dessiner();
      } catch (e) { console.error(e); liste.innerHTML = '<p class="erreur">Connexion à la base impossible. Vérifie le réseau.</p>'; }
    }

    function dessiner() {
      const aImprimer = donnees.filter(v => !v.imprime);
      document.getElementById('nb-imp').textContent = aImprimer.length || '';
      document.title = aImprimer.length ? `(${aImprimer.length}) ${TITRE}` : TITRE;
      document.getElementById('stats').innerHTML = `
        <div class="stat"><span class="label">Inscrits</span><b>${donnees.length}</b></div>
        <div class="stat"><span class="label">À imprimer</span><b>${aImprimer.length}</b></div>
        <div class="stat"><span class="label">En visite</span><b>${donnees.filter(v => !v.niveau).length}</b></div>
        <div class="stat"><span class="label">Parcours terminés</span><b>${donnees.filter(v => v.niveau).length}</b></div>`;

      const items = voirTout ? [...file(), ...donnees.filter(v => v.imprime).sort((a, b) => a.created_at.localeCompare(b.created_at))] : file();
      const surPlanche = new Set(prochaine().map(v => v.id));
      liste.innerHTML = items.length ? items.map(v => fiche(v, surPlanche.has(v.id))).join('') : '<p class="vide">Aucune carte en attente. Les nouvelles inscriptions apparaîtront ici.</p>';
      dessinerPlanche();
      apercus();
    }

    function fiche(v, surPlanche) {
      const nb = v.scans.filter(activite).length;
      const nv = v.niveau ? niveau(v.niveau) : null;
      return `<article class="dossier fiche ${surPlanche ? 'sur-planche' : ''}">
        <div class="dossier-tete"><span class="fiche-mat"><button class="copiable" data-copie="${esc(v.matricule)}" title="Copier le matricule">#${esc(v.matricule)}</button></span>
          <span class="registre muted">${surPlanche ? '<span class="pastille or">Sur la planche</span> ' : ''}${heure(v.created_at)}</span></div>
        <div class="fiche-carte" data-carte="${v.id}"><span class="muted small">Préparation de la carte…</span></div>
        <div class="row" style="justify-content:space-between">
          <span class="fiche-nom">${esc(nomComplet(v))}</span>
          ${nv ? `<span class="pastille or">Terminé · ${esc(nv.titre)}</span>` : `<span class="pastille">En visite · ${pluriel(nb, 'activité')}</span>`}
        </div>
        <div class="row">
          ${v.imprime
            ? `<button class="btn btn-ok btn-sm" data-act="imprime" data-id="${v.id}" data-val="0">✓ Imprimée · remettre dans la file</button>`
            : `<button class="btn btn-discret btn-sm" data-act="imprime" data-id="${v.id}" data-val="1">Marquer imprimée</button>`}
          <button class="btn btn-discret btn-sm" data-act="carte-dl" data-id="${v.id}">Télécharger la carte</button>
        </div>
      </article>`;
    }

    /* Remplit les aperçus de cartes (dessinés une seule fois grâce au cache). */
    function apercus() {
      liste.querySelectorAll('[data-carte]').forEach(el => {
        const v = donnees.find(x => x.id === el.dataset.carte); if (!v) return;
        imageCarte(v).then(url => { el.innerHTML = `<img src="${url}" alt="Carte matricule de ${esc(nomComplet(v))}">`; })
          .catch(e => { console.error(e); el.innerHTML = '<span class="erreur small">Carte impossible à dessiner (photo ?)</span>'; });
      });
    }

    liste.addEventListener('click', async e => {
      const c = e.target.closest('[data-copie]');
      if (c) return copier(c.dataset.copie);
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const v = donnees.find(x => x.id === b.dataset.id); if (!v) return;
      if (b.dataset.act === 'carte-dl') {
        try { telechargerPhoto(await imageCarte(v), `carte-${v.matricule}-${norm(v.nom)}.png`.replace(/[^a-z0-9.-]+/g, '-')); }
        catch (err) { console.error(err); toast('Carte impossible à préparer, vérifie le réseau'); }
        return;
      }
      b.disabled = true;
      try {
        await db.maj(v.id, { imprime: b.dataset.val === '1' });
        toast(b.dataset.val === '1' ? `Carte #${v.matricule} imprimée` : 'Annulé');
        await charger();
      } catch (err) { console.error(err); b.disabled = false; toast('Action impossible, vérifie le réseau'); }
    });

    await charger();
    // Le temps réel peut rater un événement (connexion pas encore prête, wifi coupé) : filet de sécurité.
    const stop = db.suivre(charger), filet = setInterval(charger, 15000);
    nettoyage = () => { stop(); clearInterval(filet); };
  }

  const baseQR = () => (C.baseUrl || (location.origin + location.pathname)).replace(/#.*$/, '');
  const lien = route => baseQR() + '#/' + route;
  const qr = texte => {
    if (!window.qrcode) return '<p class="muted small">Générateur de QR indisponible (hors ligne ?).</p>';
    const q = window.qrcode(0, 'M'); q.addData(texte); q.make();
    return q.createSvgTag(6, 2);
  };

  function posteQR(zone) {
    const base = baseQR();
    const carte = (titre, sous, route, desc = '') => `<article class="qr-carte">${qr(lien(route))}<h3>${esc(titre)}</h3>${desc ? `<p class="small">${esc(desc)}</p>` : ''}<p class="small"><b>${esc(sous)}</b></p><p class="registre">${esc(lien(route))}</p></article>`;
    zone.innerHTML = `
      <div class="stack">
        <h1>QR codes</h1>
        ${!C.baseUrl ? `<p class="alerte no-print">Ces QR codes pointent vers <span class="registre">${esc(base)}</span>. Avant d'imprimer, renseigne l'adresse Netlify dans <span class="registre">baseUrl</span> (config.js).</p>` : ''}
        <p class="muted small no-print">Imprime cette page (Ctrl/Cmd + P) depuis le site déployé : un QR pour l'entrée (à scanner avec l'appareil photo), un par activité (à scanner avec le bouton « Scanner » de l'appli).</p>
        <div class="grille">
          ${carte('Entrée', "Scanne avec l'appareil photo de ton téléphone pour t'inscrire", '')}
          ${C.activites.map(a => carte(a.nom, "Activité finie ? Scanne avec le bouton « Scanner » de l'appli pour la valider", 'activite/' + a.id, (a.format ? a.format + ' · ' : '') + a.description)).join('')}
        </div>
      </div>`;
  }

  /* ================= Tablettes du stand ================= */
  /* Les jeux numériques tournent sur les tablettes de l'équipe, jamais sur le téléphone
     du visiteur. Partie finie : l'équipe montre le QR imprimé de l'activité (#/equipe/qr),
     le visiteur le scanne avec le bouton « Scanner » de son appli pour la valider. */
  const jeuxNumeriques = () => C.activites.filter(a => a.jeu);

  function ecranTablette(id) {
    if (store.get(K_TABLETTE) !== '1') {
      cadre(`
        <form class="dossier" id="f" novalidate style="max-width:420px;width:100%;margin:0 auto">
          <h1>Tablette du stand</h1>
          <p class="muted small">Réservé à l'équipe : à déverrouiller une fois, la tablette s'en souvient.</p>
          <div class="champ"><label for="code">Code d'accès</label><input type="password" id="code" inputmode="numeric" autocomplete="off"></div>
          <p class="erreur" id="err" hidden>Code incorrect.</p>
          <button class="btn btn-or" type="submit">Entrer</button>
        </form>`, { equipe: true });
      document.getElementById('f').addEventListener('submit', e => {
        e.preventDefault();
        if (document.getElementById('code').value === String(C.codeEquipe)) { store.set(K_TABLETTE, '1'); ecranTablette(id); }
        else document.getElementById('err').hidden = false;
      });
      return;
    }
    const a = activite(id);
    if (!a || !a.jeu) {
      cadre(`
        <div class="stack">
          <h1>Quel jeu sur cette tablette ?</h1>
          <p class="muted small">Touche un jeu : il s'ouvre en plein écran et revient au début pour chaque visiteur.</p>
          <div class="grille">
            ${jeuxNumeriques().map(j => `<a class="choix-jeu" href="#/tablette/${esc(j.id)}"><span class="nom">${esc(j.nom)}</span><span class="muted small">${esc(j.description)}</span></a>`).join('')}
          </div>
        </div>`, { equipe: true });
      return;
    }
    jouer(a);
  }

  async function jouer(a) {
    document.body.classList.add('equipe');
    document.title = a.nom + ' — ' + TITRE;
    let installe = true;
    try { installe = (await fetch(a.jeu, { method: 'HEAD', cache: 'no-store' })).ok; } catch { /* file:// : on tente quand même */ }
    app.innerHTML = `
      <div class="tablette">
        ${installe
          ? `<iframe class="tablette-jeu" src="${esc(a.jeu)}" title="${esc(a.nom)}" allow="autoplay; fullscreen"></iframe>`
          : `<div class="tablette-vide dossier"><h1>${esc(a.nom)}</h1><p class="muted">Jeu pas encore installé : mets ses fichiers dans <span class="registre">${esc(a.jeu)}</span>.</p></div>`}
        <div class="tablette-outils">
          <a class="btn btn-ligne" href="#/tablette/menu" aria-label="Changer de jeu">☰</a>
          <button class="btn btn-or" id="suivant">Visiteur suivant</button>
        </div>
      </div>`;
    /* Relance le jeu à zéro. Deux appuis, pour qu'un visiteur ne coupe pas sa partie par erreur. */
    const bouton = document.getElementById('suivant');
    let delai;
    bouton.onclick = () => {
      clearTimeout(delai);
      if (!bouton.dataset.confirmer) {
        bouton.dataset.confirmer = '1'; bouton.textContent = 'Confirmer ?';
        delai = setTimeout(() => { delete bouton.dataset.confirmer; bouton.textContent = 'Visiteur suivant'; }, 3000);
        return;
      }
      delete bouton.dataset.confirmer; bouton.textContent = 'Visiteur suivant';
      const f = app.querySelector('iframe');
      if (f) f.src = a.jeu;
    };
    nettoyage = () => clearTimeout(delai);
  }

  /* ================= Routeur ================= */
  async function route() {
    if (nettoyage) { try { nettoyage(); } catch { } nettoyage = null; }
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    try {
      if (page === 'tablette') return ecranTablette(arg);
      if (page !== 'equipe') chargement();
      if (page === 'activite') return await ecranActivite(arg);
      if (page === 'parcours') return await ecranParcours();
      if (page === 'scanner') return await ecranScanner();
      if (page === 'fin' || page === 'verdict') return await ecranFin();
      if (page === 'retrouver') return await ecranRetrouver();
      if (page === 'equipe') return await ecranEquipe(arg);
      return await ecranAccueil();
    } catch (e) { panne(e); }
  }
  window.addEventListener('hashchange', route);
  route();
})();
