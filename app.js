/* Forçats'Nou — appli de forum (visiteur + espace équipe).
   Routes (hash) :
     #/                 accueil + inscription (avec photo)
     #/parcours         guide : liste des activités, progression, fin
     #/scanner          scanner de QR code intégré
     #/activite/<id>    validation d'une activité (cible des QR codes)
     #/fin              parcours terminé : niveau + sortie
     #/retrouver        retrouver son dossier (autre téléphone / navigateur)
     #/equipe[/impression|qr]   espace équipe (code d'accès)              */
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
  const K_MOI = 'forcats.moi', K_ATTENTE = 'forcats.attente', K_EQUIPE = 'forcats.equipe';

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
  async function copierPhoto(url) {
    try {
      // La promesse est passée directement à ClipboardItem : Safari l'exige.
      const png = (async () => {
        const bmp = await createImageBitmap(await (await fetch(url)).blob());
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        c.getContext('2d').drawImage(bmp, 0, 0);
        return new Promise(ok => c.toBlob(ok, 'image/png'));
      })();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      toast('Photo copiée : colle-la dans Canva (Ctrl/Cmd + V)');
    } catch (e) { console.error(e); toast('Copie impossible : utilise « Télécharger »'); }
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
          ${C.activites.map(a => `<li><div class="stack-sm" style="gap:2px;min-width:0"><span class="nom">${esc(a.nom)}</span><span class="muted small">${esc(a.description)}</span></div>
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

    let voirTout = false;
    zone.innerHTML = `<div class="stack">
        <div class="stats" id="stats"></div>
        <div class="row" style="justify-content:space-between">
          <div><h1>À imprimer</h1><p class="muted small">Les inscriptions arrivent ici en direct, dans l'ordre d'arrivée (la plus ancienne en premier). Copie les infos et la photo dans Canva, imprime, puis « Marquer imprimée ».</p></div>
          <button class="btn btn-discret btn-sm" id="tout">Voir aussi les imprimées</button>
        </div>
        <div class="grille" id="liste"></div></div>`;

    const liste = document.getElementById('liste');
    const tout = document.getElementById('tout');
    tout.onclick = () => { voirTout = !voirTout; tout.textContent = voirTout ? 'Masquer les imprimées' : 'Voir aussi les imprimées'; dessiner(); };

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

      const items = (voirTout ? donnees : aImprimer).slice().sort((a, b) => (a.imprime - b.imprime) || a.created_at.localeCompare(b.created_at));
      liste.innerHTML = items.length ? items.map((v, i) => fiche(v, voirTout ? null : i + 1)).join('') : '<p class="vide">Aucune carte en attente. Les nouvelles inscriptions apparaîtront ici.</p>';
    }

    function fiche(v, rang) {
      const nb = v.scans.filter(activite).length;
      const nv = v.niveau ? niveau(v.niveau) : null;
      const fichierPhoto = `${v.matricule}-${norm(v.prenom)}-${norm(v.nom)}.jpg`.replace(/[^a-z0-9.-]+/g, '-');
      return `<article class="dossier fiche">
        <div class="dossier-tete"><span class="fiche-mat"><button class="copiable" data-copie="${esc(v.matricule)}" title="Copier le matricule">#${esc(v.matricule)}</button></span>
          <span class="registre muted">${rang ? `${rang}<sup>${rang === 1 ? 'er' : 'e'}</sup> · ` : ''}${heure(v.created_at)}</span></div>
        <div class="fiche-corps">
          ${v.photo ? `<img class="fiche-photo" src="${esc(v.photo)}" alt="Photo de ${esc(v.prenom)}" loading="lazy">` : '<div class="fiche-photo vide-photo">Pas de photo</div>'}
          <div class="stack-sm" style="min-width:0">
            <div><span class="label" style="color:var(--ink-muted)">Prénom</span><div class="fiche-nom"><button class="copiable" data-copie="${esc(v.prenom)}" title="Copier le prénom">${esc(v.prenom)}</button></div></div>
            <div><span class="label" style="color:var(--ink-muted)">Nom</span><div class="fiche-nom"><button class="copiable" data-copie="${esc(v.nom)}" title="Copier le nom">${esc(v.nom)}</button></div></div>
            ${nv ? `<span class="pastille or">Terminé · ${esc(nv.titre)}</span>` : `<span class="pastille">En visite · ${pluriel(nb, 'activité')}</span>`}
          </div>
        </div>
        <div class="row">
          ${v.photo ? `<button class="btn btn-discret btn-sm" data-act="photo-copie" data-id="${v.id}">Copier la photo</button>
          <button class="btn btn-discret btn-sm" data-act="photo-dl" data-id="${v.id}" data-nom="${esc(fichierPhoto)}">Télécharger</button>` : ''}
          <button class="btn btn-discret btn-sm" data-copie="${esc(`${v.prenom} ${v.nom}\nMatricule #${v.matricule}`)}">Copier le texte</button>
        </div>
        ${v.imprime
          ? `<button class="btn btn-ok btn-sm" data-act="imprime" data-id="${v.id}" data-val="0">✓ Imprimée · annuler</button>`
          : `<button class="btn btn-or" data-act="imprime" data-id="${v.id}" data-val="1">Carte imprimée</button>`}
      </article>`;
    }

    liste.addEventListener('click', async e => {
      const c = e.target.closest('[data-copie]');
      if (c) return copier(c.dataset.copie);
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const v = donnees.find(x => x.id === b.dataset.id); if (!v) return;
      if (b.dataset.act === 'photo-copie') return copierPhoto(v.photo);
      if (b.dataset.act === 'photo-dl') return telechargerPhoto(v.photo, b.dataset.nom);
      b.disabled = true;
      try {
        await db.maj(v.id, { imprime: b.dataset.val === '1' });
        toast(b.dataset.val === '1' ? `Carte #${v.matricule} imprimée` : 'Annulé');
        await charger();
      } catch (err) { console.error(err); b.disabled = false; toast('Action impossible, vérifie le réseau'); }
    });

    await charger();
    nettoyage = db.suivre(charger);
  }

  function posteQR(zone) {
    const base = (C.baseUrl || (location.origin + location.pathname)).replace(/#.*$/, '');
    const lien = route => base + '#/' + route;
    const qr = texte => {
      if (!window.qrcode) return '<p class="muted small">Générateur de QR indisponible (hors ligne ?).</p>';
      const q = window.qrcode(0, 'M'); q.addData(texte); q.make();
      return q.createSvgTag(6, 2);
    };
    const carte = (titre, sous, route, desc = '') => `<article class="qr-carte">${qr(lien(route))}<h3>${esc(titre)}</h3>${desc ? `<p class="small">${esc(desc)}</p>` : ''}<p class="small"><b>${esc(sous)}</b></p><p class="registre">${esc(lien(route))}</p></article>`;
    zone.innerHTML = `
      <div class="stack">
        <h1>QR codes</h1>
        ${!C.baseUrl ? `<p class="alerte no-print">Ces QR codes pointent vers <span class="registre">${esc(base)}</span>. Avant d'imprimer, renseigne l'adresse Netlify dans <span class="registre">baseUrl</span> (config.js).</p>` : ''}
        <p class="muted small no-print">Imprime cette page (Ctrl/Cmd + P) depuis le site déployé : un QR pour l'entrée (à scanner avec l'appareil photo), un par activité (à scanner avec le bouton « Scanner » de l'appli).</p>
        <div class="grille">
          ${carte('Entrée', "Scanne avec l'appareil photo de ton téléphone pour t'inscrire", '')}
          ${C.activites.map(a => carte(a.nom, "Scanne avec le bouton « Scanner » de l'appli", 'activite/' + a.id, a.description)).join('')}
        </div>
      </div>`;
  }

  /* ================= Routeur ================= */
  async function route() {
    if (nettoyage) { try { nettoyage(); } catch { } nettoyage = null; }
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    try {
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
