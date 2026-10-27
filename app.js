/* Forçats'Nou — appli de forum (visiteur + espace équipe).
   Routes (hash) :
     #/                 accueil + inscription
     #/activite/<id>    validation d'une activité (cible des QR codes)
     #/parcours         progression du visiteur
     #/verdict          rôle final
     #/retrouver        retrouver son dossier (autre téléphone / navigateur)
     #/equipe[/impression|sortie|qr]   espace équipe (code d'accès)       */
(() => {
  'use strict';

  const C = window.FORUM_CONFIG;
  const app = document.getElementById('app');
  const DEMO = !(C.supabaseUrl && C.supabaseAnonKey);

  /* ================= Utilitaires ================= */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const activite = id => C.activites.find(a => a.id === id);
  const role = id => C.roles.find(r => r.id === id);
  const heure = iso => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const nomComplet = v => `${v.prenom} ${v.nom.toUpperCase()}`;
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
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
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
      async creer({ prenom, nom, matricule }) {
        const d = lire();
        if (d.visiteurs.some(v => v.matricule === matricule)) throw { code: 'MATRICULE_PRIS' };
        const v = { id: uid(), prenom, nom, matricule, role: null, imprime: false, remis: false, created_at: new Date().toISOString(), termine_at: null };
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

  /* ================= Calcul du rôle ================= */
  function calculerRole(scans) {
    const score = Object.fromEntries(C.roles.map(r => [r.id, 0]));
    scans.forEach(id => {
      const a = activite(id); if (!a) return;
      Object.entries(a.points || {}).forEach(([r, p]) => { if (r in score) score[r] += Number(p) || 0; });
    });
    let meilleur = C.roles[0];
    C.roles.forEach(r => { if (score[r.id] > score[meilleur.id]) meilleur = r; });
    return meilleur;
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
    if (v) return aller(v.role ? 'verdict' : 'parcours');
    const attente = activite(store.get(K_ATTENTE, sessionStorage));
    cadre(`
      <section class="stack">
        <p class="label">Pénitencier de l'île Nou</p>
        <h1 class="display-xl">Ouvre ton dossier</h1>
        <p class="muted">Tu entres au bagne. Fais les activités de la salle et découvre, à la sortie, qui tu aurais été ici au XIX<sup>e</sup> siècle.</p>
      </section>

      <section class="panneau" aria-labelledby="t-guide">
        <h2 id="t-guide">Comment ça marche</h2>
        <ol class="etapes">
          <li><span class="n">1</span><div><b>Inscris-toi</b><span class="muted small">Prénom, nom et 4 chiffres au choix : ce sera ton matricule.</span></div></li>
          <li><span class="n">2</span><div><b>Fais les activités</b><span class="muted small">À chaque activité, scanne son QR code avec l'appareil photo de ton téléphone.</span></div></li>
          <li><span class="n">3</span><div><b>Reçois ton verdict</b><span class="muted small">À la sortie, l'appli te donne ton rôle et l'équipe te remet ta carte de forçat.</span></div></li>
        </ol>
      </section>

      ${attente ? `<p class="alerte">Inscris-toi d'abord : l'activité <b>${esc(attente.nom)}</b> sera validée juste après.</p>` : ''}

      <form class="dossier" id="f" novalidate>
        <div class="dossier-tete"><span class="label">Fiche d'entrée</span><span class="registre muted">N° ……</span></div>
        <div class="champ"><label for="prenom">Prénom</label><input type="text" id="prenom" autocomplete="given-name" maxlength="60" required></div>
        <div class="champ"><label for="nom">Nom</label><input type="text" id="nom" autocomplete="family-name" maxlength="60" required></div>
        <div class="champ"><label for="matricule">Ton matricule (4 chiffres)</label>
          <input id="matricule" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" class="matricule-input" placeholder="····" required>
          <span class="aide">Choisis 4 chiffres et retiens-les : l'équipe te retrouvera grâce à eux à la sortie.</span></div>
        <p class="erreur" id="err" hidden></p>
        <button class="btn btn-or btn-bloc" type="submit">Entrer au bagne</button>
      </form>
      <p class="pied"><a href="#/retrouver">J'ai déjà un dossier</a></p>`);

    const f = document.getElementById('f'), err = document.getElementById('err');
    const mat = document.getElementById('matricule');
    mat.addEventListener('input', () => { mat.value = mat.value.replace(/\D/g, '').slice(0, 4); });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const prenom = f.prenom.value.trim(), nom = f.nom.value.trim(), matricule = mat.value;
      err.hidden = true;
      if (!prenom || !nom) { err.textContent = 'Indique ton prénom et ton nom.'; err.hidden = false; return; }
      if (!/^\d{4}$/.test(matricule)) { err.textContent = 'Le matricule doit faire exactement 4 chiffres.'; err.hidden = false; mat.focus(); return; }
      const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Ouverture…';
      try {
        const v = await db.creer({ prenom, nom, matricule });
        store.set(K_MOI, v.id);
        const att = store.get(K_ATTENTE, sessionStorage);
        store.set(K_ATTENTE, null, sessionStorage);
        aller(att && activite(att) ? 'activite/' + att : 'parcours');
      } catch (e2) {
        err.textContent = e2 && e2.code === 'MATRICULE_PRIS'
          ? `Le matricule ${matricule} est déjà pris par un autre forçat. Choisis 4 autres chiffres.`
          : "L'inscription n'est pas passée. Vérifie ta connexion et réessaie.";
        err.hidden = false; b.disabled = false; b.textContent = 'Entrer au bagne';
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
        aller(att && activite(att) && !v.role ? 'activite/' + att : (v.role ? 'verdict' : 'parcours'));
      } catch (e2) { panne(e2); }
    });
  }

  async function ecranActivite(id) {
    const a = activite(id);
    if (!a) {
      cadre(`<section class="dossier"><h2>QR code inconnu</h2><p class="muted">Ce QR code ne correspond à aucune activité. Préviens un membre de l'équipe.</p><a class="btn btn-ligne" href="#/parcours">Voir mon parcours</a></section>`);
      return;
    }
    const v = await moi();
    if (!v) { store.set(K_ATTENTE, id, sessionStorage); return aller(''); }
    if (v.role) {
      cadre(`<section class="dossier"><h2>Ton verdict est déjà rendu</h2><p class="muted">Ton parcours est terminé, cette activité ne compte plus. Tu peux quand même la découvrir.</p><a class="btn btn-or" href="#/verdict">Revoir mon verdict</a></section>`, { mat: v.matricule });
      return;
    }
    const res = await db.scanner(v.id, id);
    const faites = await db.scans(v.id);
    const n = faites.filter(activite).length, total = C.activites.length;
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
          ? 'Tu as fait toutes les activités. Va à la sortie pour recevoir ton verdict.'
          : `Rejoins une autre activité et scanne son QR code. Il t'en reste ${total - n}.`}</p>
        <a class="btn btn-or btn-bloc" href="#/parcours">Voir mon parcours</a>
      </section>`, { mat: v.matricule });
  }

  async function ecranParcours() {
    const v = await moi();
    if (!v) return aller('');
    if (v.role) return aller('verdict');
    const faites = new Set(await db.scans(v.id));
    const n = C.activites.filter(a => faites.has(a.id)).length, total = C.activites.length;
    const peut = n >= Math.min(C.minActivites, total);
    cadre(`
      <section class="stack">
        <p class="label">Dossier de ${esc(v.prenom)}</p>
        <h1>Ton parcours</h1>
        <div class="progression" aria-label="${n} activités sur ${total}">
          <div class="barre"><i style="width:${total ? Math.round(n / total * 100) : 0}%"></i></div>
          <span class="compteur">${n} / ${total}</span>
        </div>
      </section>

      <section class="dossier">
        <div class="dossier-tete"><span class="label">Activités</span><span class="registre muted">#${esc(v.matricule)}</span></div>
        <ul class="activites">
          ${C.activites.map(a => `<li><div class="stack-sm" style="gap:2px;min-width:0"><span class="nom">${esc(a.nom)}</span><span class="muted small">${esc(a.description)}</span></div>
            ${faites.has(a.id) ? '<span class="pastille ok">Validé</span>' : '<span class="pastille">À faire</span>'}</li>`).join('')}
        </ul>
      </section>

      <section class="panneau">
        <p class="label">Comment valider une activité</p>
        <p class="muted small">Ouvre l'appareil photo de ton téléphone, vise le QR code affiché à l'activité et touche le lien qui apparaît. Le tampon « Validé » confirme qu'elle compte.</p>
      </section>

      <section class="stack" id="fin">
        ${peut
          ? `<button class="btn btn-or btn-bloc" id="terminer">Terminer mon parcours</button>
             <p class="aide" style="text-align:center">Tu pourras encore faire d'autres activités avant, plus il y en a, plus ton verdict est juste.</p>`
          : `<button class="btn btn-or btn-bloc" disabled>Terminer mon parcours</button>
             <p class="aide" style="text-align:center">Valide au moins ${Math.min(C.minActivites, total)} activités pour recevoir ton verdict.</p>`}
      </section>`, { mat: v.matricule });

    const t = document.getElementById('terminer');
    if (t) t.onclick = () => {
      document.getElementById('fin').innerHTML = `
        <div class="confirm">
          <p><b>Rendre ton verdict maintenant ?</b><br><span class="muted small">Les activités que tu n'as pas faites ne compteront plus.</span></p>
          <div class="row"><button class="btn btn-or" id="oui">Oui, mon verdict</button><button class="btn btn-discret" id="non">Pas encore</button></div>
        </div>`;
      document.getElementById('non').onclick = ecranParcours;
      document.getElementById('oui').onclick = async e => {
        e.target.disabled = true;
        try {
          const r = calculerRole([...faites]);
          await db.maj(v.id, { role: r.id, termine_at: new Date().toISOString() });
          store.set('forcats.anim', '1', sessionStorage);
          aller('verdict');
        } catch (e2) { panne(e2); }
      };
    };

    nettoyage = db.suivre(async () => {
      const f2 = await db.scans(v.id);
      if (f2.length !== faites.size) ecranParcours();
    });
  }

  async function ecranVerdict() {
    const v = await moi();
    if (!v) return aller('');
    if (!v.role) return aller('parcours');
    const r = role(v.role) || { nom: v.role, description: '' };
    const faites = (await db.scans(v.id)).map(activite).filter(Boolean);
    const anim = store.get('forcats.anim', sessionStorage); store.set('forcats.anim', null, sessionStorage);
    cadre(`
      <section class="stack" style="text-align:center">
        <p class="label">Verdict rendu</p>
        <h1 class="display-lg">${esc(nomComplet(v))}</h1>
        <p class="registre muted">MATRICULE #${esc(v.matricule)}</p>
      </section>
      <section class="dossier" style="align-items:center;text-align:center">
        <p class="muted small">À l'île Nou, tu aurais été…</p>
        <div class="tampon grand ${anim ? 'anim' : ''}">${esc(r.nom)}</div>
        <p>${esc(r.description)}</p>
      </section>
      <section class="panneau">
        <p class="label">Dernière étape</p>
        <h2>Présente-toi à la sortie</h2>
        <p class="muted small">Donne ton matricule <span class="registre" style="color:var(--gold-ink)">#${esc(v.matricule)}</span> à l'équipe : elle te remet ta carte de forçat avec l'autocollant de ton rôle.</p>
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
        <p class="muted small">Réservé à l'équipe du forum : impression des cartes, sortie et QR codes.</p>
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

  async function ecranEquipe(onglet = 'impression') {
    if (store.get(K_EQUIPE, sessionStorage) !== '1') return ecranCode(onglet);
    if (!['impression', 'sortie', 'qr'].includes(onglet)) onglet = 'impression';

    cadre(`
      <nav class="onglets no-print" aria-label="Postes">
        <a href="#/equipe/impression" ${onglet === 'impression' ? 'aria-current="page"' : ''}>Impression<span class="nb" id="nb-imp"></span></a>
        <a href="#/equipe/sortie" ${onglet === 'sortie' ? 'aria-current="page"' : ''}>Sortie<span class="nb" id="nb-sor"></span></a>
        <a href="#/equipe/qr" ${onglet === 'qr' ? 'aria-current="page"' : ''}>QR codes</a>
      </nav>
      <div id="zone"></div>`, { equipe: true });
    const zone = document.getElementById('zone');

    if (onglet === 'qr') return posteQR(zone);

    let filtre = '';
    let voirTout = false;
    zone.innerHTML = onglet === 'impression'
      ? `<div class="stack">
           <div class="stats" id="stats"></div>
           <div class="row" style="justify-content:space-between">
             <div><h1>À imprimer</h1><p class="muted small">Les nouvelles inscriptions arrivent ici en direct. Touche un champ pour le copier, colle-le dans Canva, puis marque la carte comme imprimée.</p></div>
             <button class="btn btn-discret btn-sm" id="tout">Voir aussi les imprimées</button>
           </div>
           <div class="grille" id="liste"></div></div>`
      : `<div class="stack">
           <div class="stats" id="stats"></div>
           <h1>Sortie</h1>
           <p class="muted small">Demande le matricule au visiteur, colle l'autocollant de son rôle sur sa carte, puis marque la carte comme remise.</p>
           <div class="champ" style="max-width:420px"><label for="cherche">Matricule ou nom</label><input type="search" id="cherche" placeholder="ex. 1864 ou Dupont" autocomplete="off"></div>
           <div class="grille" id="liste"></div></div>`;

    const liste = document.getElementById('liste');
    const cherche = document.getElementById('cherche');
    if (cherche) cherche.addEventListener('input', () => { filtre = cherche.value; dessiner(); });
    const tout = document.getElementById('tout');
    if (tout) tout.onclick = () => { voirTout = !voirTout; tout.textContent = voirTout ? 'Masquer les imprimées' : 'Voir aussi les imprimées'; dessiner(); };

    let donnees = [];
    async function charger() {
      try { donnees = await db.tous(); dessiner(); }
      catch (e) { console.error(e); liste.innerHTML = '<p class="erreur">Connexion à la base impossible. Vérifie le réseau.</p>'; }
    }

    function dessiner() {
      const aImprimer = donnees.filter(v => !v.imprime);
      const enAttente = donnees.filter(v => v.role && !v.remis);
      document.getElementById('nb-imp').textContent = aImprimer.length || '';
      document.getElementById('nb-sor').textContent = enAttente.length || '';
      document.getElementById('stats').innerHTML = `
        <div class="stat"><span class="label">Inscrits</span><b>${donnees.length}</b></div>
        <div class="stat"><span class="label">À imprimer</span><b>${aImprimer.length}</b></div>
        <div class="stat"><span class="label">Verdict rendu</span><b>${donnees.filter(v => v.role).length}</b></div>
        <div class="stat"><span class="label">Cartes remises</span><b>${donnees.filter(v => v.remis).length}</b></div>`;

      let items;
      if (onglet === 'impression') {
        items = (voirTout ? donnees : aImprimer).slice().sort((a, b) => (a.imprime - b.imprime) || a.created_at.localeCompare(b.created_at));
        liste.innerHTML = items.length ? items.map(ficheImpression).join('') : '<p class="vide">Aucune carte en attente. Les nouvelles inscriptions apparaîtront ici.</p>';
      } else {
        const q = norm(filtre);
        items = donnees.filter(v => !q || v.matricule.includes(q) || norm(v.nom).includes(q) || norm(v.prenom).includes(q));
        const rang = v => v.role && !v.remis ? 0 : !v.role ? 1 : 2;
        items.sort((a, b) => rang(a) - rang(b) || (b.termine_at || b.created_at).localeCompare(a.termine_at || a.created_at));
        liste.innerHTML = items.length ? items.map(ficheSortie).join('') : `<p class="vide">${q ? 'Aucun visiteur ne correspond.' : 'Personne ne s\'est encore inscrit.'}</p>`;
      }
    }

    function ficheImpression(v) {
      return `<article class="dossier fiche">
        <div class="dossier-tete"><span class="fiche-mat"><button class="copiable" data-copie="${esc(v.matricule)}" title="Copier le matricule">#${esc(v.matricule)}</button></span><span class="registre muted">${heure(v.created_at)}</span></div>
        <div class="stack-sm">
          <div><span class="label" style="color:var(--ink-muted)">Prénom</span><div class="fiche-nom"><button class="copiable" data-copie="${esc(v.prenom)}" title="Copier le prénom">${esc(v.prenom)}</button></div></div>
          <div><span class="label" style="color:var(--ink-muted)">Nom</span><div class="fiche-nom"><button class="copiable" data-copie="${esc(v.nom)}" title="Copier le nom">${esc(v.nom)}</button></div></div>
        </div>
        <div class="row">
          <button class="btn btn-discret btn-sm" data-copie="${esc(`${v.prenom} ${v.nom}\nMatricule #${v.matricule}`)}">Tout copier</button>
          ${v.imprime
            ? `<button class="btn btn-ok btn-sm" data-act="imprime" data-id="${v.id}" data-val="0">Imprimée · annuler</button>`
            : `<button class="btn btn-or btn-sm" data-act="imprime" data-id="${v.id}" data-val="1">Marquer imprimée</button>`}
        </div>
      </article>`;
    }

    function ficheSortie(v) {
      const r = v.role ? role(v.role) : null;
      const nb = v.scans.filter(activite).length;
      return `<article class="dossier fiche">
        <div class="dossier-tete"><span class="fiche-mat">#${esc(v.matricule)}</span>
          ${v.remis ? '<span class="pastille ok">Remise</span>' : v.role ? '<span class="pastille or">À remettre</span>' : '<span class="pastille">En visite</span>'}</div>
        <div class="fiche-nom">${esc(nomComplet(v))}</div>
        ${r ? `<div class="role-sortie"><span class="rond" aria-hidden="true">${esc(r.nom.charAt(0))}</span>
                 <div><div class="display-md">${esc(r.nom)}</div><div class="label">${esc(r.autocollant || '')}</div></div></div>`
            : `<p class="muted small">Pas encore de verdict · ${nb} activité${nb > 1 ? 's' : ''} validée${nb > 1 ? 's' : ''}.</p>`}
        <p class="muted small">${v.scans.map(activite).filter(Boolean).map(a => esc(a.nom)).join(' · ') || 'Aucune activité'}</p>
        <div class="row">
          ${!v.imprime ? '<span class="pastille ko">Carte pas imprimée</span>' : ''}
          ${!v.role ? `<button class="btn btn-ligne btn-sm" data-act="verdict" data-id="${v.id}">Rendre le verdict</button>` : ''}
          ${v.role && !v.remis ? `<button class="btn btn-or btn-sm" data-act="remis" data-id="${v.id}" data-val="1">Carte remise</button>` : ''}
          ${v.remis ? `<button class="btn btn-discret btn-sm" data-act="remis" data-id="${v.id}" data-val="0">Annuler la remise</button>` : ''}
        </div>
      </article>`;
    }

    liste.addEventListener('click', async e => {
      const c = e.target.closest('[data-copie]');
      if (c) return copier(c.dataset.copie);
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const v = donnees.find(x => x.id === b.dataset.id); if (!v) return;
      b.disabled = true;
      try {
        if (b.dataset.act === 'imprime') { await db.maj(v.id, { imprime: b.dataset.val === '1' }); toast(b.dataset.val === '1' ? `Carte #${v.matricule} imprimée` : 'Annulé'); }
        if (b.dataset.act === 'remis') { await db.maj(v.id, { remis: b.dataset.val === '1' }); toast(b.dataset.val === '1' ? `Carte #${v.matricule} remise` : 'Annulé'); }
        if (b.dataset.act === 'verdict') { const r = calculerRole(v.scans); await db.maj(v.id, { role: r.id, termine_at: new Date().toISOString() }); toast(`Verdict : ${r.nom}`); }
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
    const carte = (titre, sous, route) => `<article class="qr-carte">${qr(lien(route))}<h3>${esc(titre)}</h3><p class="small">${esc(sous)}</p><p class="registre">${esc(lien(route))}</p></article>`;
    zone.innerHTML = `
      <div class="stack">
        <h1>QR codes</h1>
        ${!C.baseUrl ? `<p class="alerte no-print">Ces QR codes pointent vers <span class="registre">${esc(base)}</span>. Avant d'imprimer, renseigne l'adresse Netlify dans <span class="registre">baseUrl</span> (config.js).</p>` : ''}
        <p class="muted small no-print">Imprime cette page (Ctrl/Cmd + P) depuis le site déployé : un QR pour l'entrée, un par activité.</p>
        <div class="grille">
          ${carte('Entrée', 'Scanne pour ouvrir ton dossier', '')}
          ${C.activites.map(a => carte(a.nom, 'Scanne pour valider l\'activité', 'activite/' + a.id)).join('')}
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
      if (page === 'verdict') return await ecranVerdict();
      if (page === 'retrouver') return await ecranRetrouver();
      if (page === 'equipe') return await ecranEquipe(arg);
      return await ecranAccueil();
    } catch (e) { panne(e); }
  }
  window.addEventListener('hashchange', route);
  route();
})();
