/* ==========================================================
   L'Évasion — logique du jeu
   Déroulé : accueil → intro → 5 étapes (2 de plan, 3 de fuite) → fin.
   - chaque choix donne 1 point à un profil (M, R ou A)
   - les choix du plan donnent des atouts, visibles dans le sac
   - pendant la fuite, un choix peut demander un atout :
     sans lui, le forçat est repris (fin « Repris ») et on lui
     explique quel choix du plan lui a manqué
   - si les 5 étapes sont passées, le profil qui a le plus de
     points donne la fin ; en cas d'égalité, celui du choix le
     plus récent parmi les ex æquo
   - pas de collection de fins : chaque visiteur ne fait qu'une ou deux parties
   ========================================================== */
(() => {
  "use strict";

  const LARGEUR = 1536, HAUTEUR = 1024;     // taille de la maquette
  const NB_ETAPES = 5;
  /* En dessous de cette échelle, le texte devient trop petit :
     on passe en mise en page « compacte » (éléments empilés, défilement) */
  const SEUIL_COMPACT = 0.68;

  const $ = (id) => document.getElementById(id);
  const racine = document.documentElement;
  const scene = $("scene");
  const scenesPopup = document.querySelectorAll(".scene-popup");
  const ecrans = { accueil: $("ecran-accueil"), intro: $("ecran-intro"), etape: $("ecran-etape"), fin: $("ecran-fin") };
  const popupConseq = $("popup-consequence");
  const popupQuitter = $("popup-quitter");
  const btnRetour = $("btn-retour");
  const btnSon = $("btn-son");
  const bulle = $("bulle");

  // ---------- État de la partie ----------
  const etat = {
    ecran: null,
    histoire: null,
    etape: 0,
    atouts: new Set(),
    chemin: [],         // { choix, ok } dans l'ordre
    verrou: false,      // bloque les doubles appuis pendant les animations
    suite: null         // action du bouton « Continuer »
  };

  // ---------- Mise à l'échelle ----------
  /* La scène (1536 × 1024) est réduite ou agrandie pour tenir dans
     l'écran. Si l'écran est plus large, elle se cale vers la droite
     (le forçat du décor est à gauche).
     Sur petit écran (téléphone, petite fenêtre, zoom du navigateur),
     on passe en mode compact : échelle fixe et défilement vertical. */
  function adapter() {
    const l = window.innerWidth, h = window.innerHeight;
    let u = Math.min(l / LARGEUR, h / HAUTEUR);
    const compact = u < SEUIL_COMPACT;
    racine.classList.toggle("compact", compact);

    if (compact) {
      // récit (510) + deux cartes (622) côte à côte si la largeur le permet
      // (marge pour les bords et une éventuelle barre de défilement)
      const cote = (l - 80) / 1160;
      u = cote >= 0.62 ? Math.min(0.9, cote) : Math.min(0.9, (l - 48) / 622);
      racine.style.setProperty("--u", u + "px");
      scene.style.left = scene.style.top = "";
      scenesPopup.forEach((s) => { s.style.left = s.style.top = ""; });
      return;
    }
    racine.style.setProperty("--u", u + "px");
    const largeurScene = LARGEUR * u, hauteurScene = HAUTEUR * u;
    const haut = (h - hauteurScene) / 2;
    scene.style.left = (l - largeurScene) * 0.85 + "px";
    scene.style.top = haut + "px";
    scenesPopup.forEach((s) => {
      s.style.left = (l - largeurScene) / 2 + "px";
      s.style.top = haut + "px";
    });
  }
  window.addEventListener("resize", () => { adapter(); ajusterCartes(); cacherBulle(); });
  window.addEventListener("orientationchange", () => setTimeout(() => { adapter(); ajusterCartes(); }, 250));
  adapter();

  /* Si le texte d'une carte touche le bouton (police plus large,
     petit écran…), on réduit un peu sa taille, par paliers. */
  function ajusterCartes() {
    document.querySelectorAll(".carte").forEach((carte) => {
      const corps = carte.querySelector(".carte-corps");
      const texte = carte.querySelector(".carte-texte");
      const bouton = carte.querySelector(".btn-pinceau");
      let fit = 1;
      corps.style.setProperty("--fit", fit);
      const marge = 8 * parseFloat(getComputedStyle(racine).getPropertyValue("--u"));
      while (fit > 0.76 && texte.getBoundingClientRect().bottom > bouton.getBoundingClientRect().top - marge) {
        fit -= 0.04;
        corps.style.setProperty("--fit", fit.toFixed(2));
      }
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajusterCartes);

  // ---------- Décor avec fondu ----------
  const calques = [$("decor-a"), $("decor-b")];
  let calqueActif = 0, decorActuel = "";
  function changerDecor(chemin) {
    if (chemin === decorActuel) return;
    decorActuel = chemin;
    const suivant = calques[1 - calqueActif];
    suivant.style.backgroundImage = `url("${chemin}")`;
    suivant.classList.add("visible");
    calques[calqueActif].classList.remove("visible");
    calqueActif = 1 - calqueActif;
  }

  // Précharge les images d'une histoire pour éviter les cartes vides
  function precharger(h) {
    const urls = [`assets/decors/${h.decors.plan}.webp`, `assets/decors/${h.decors.fuite}.webp`];
    h.etapes.forEach((e) => e.choix.forEach((c) => urls.push(imageCarte(c.image))));
    Object.values(FINS).forEach((f) => urls.push(`assets/fins/${f.image}.webp`));
    urls.forEach((u) => { const i = new Image(); i.src = u; });
  }
  /* Typographie française : espace insécable avant ? ! : ; et dans « » */
  const typo = (t) => t.replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");

  /* La question en écriture pinceau : les deux derniers mots restent
     ensemble (évite « choisis- / tu ? ») */
  function poserQuestion(el, q) {
    const mots = typo(q).split(" ");
    const fin = mots.splice(-1).join(" ");
    el.textContent = mots.join(" ") + " ";
    const span = document.createElement("span");
    span.style.whiteSpace = "nowrap";
    span.textContent = fin;
    el.appendChild(span);
  }

  const imageCarte = (n) => `assets/cartes/carte-${String(n).padStart(2, "0")}.webp`;

  // ---------- Glossaire ----------
  /* Les mots difficiles deviennent des boutons soulignés ; chaque mot
     n'est souligné qu'une fois par paragraphe. */
  const formes = new Map();
  GLOSSAIRE.forEach((g) => g.formes.forEach((f) => formes.set(f.toLowerCase(), g)));
  const motifGlossaire = new RegExp(
    "(?<!\\p{L})(" + [...formes.keys()].sort((a, b) => b.length - a.length).join("|") + ")(?!\\p{L})", "giu");

  function glossariser(el) {
    const vus = new Set();
    const marcheur = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const noeuds = [];
    while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
    noeuds.forEach((noeud) => {
      const texte = noeud.nodeValue;
      const morceaux = document.createDocumentFragment();
      let dernier = 0, change = false;
      for (const m of texte.matchAll(motifGlossaire)) {
        const g = formes.get(m[1].toLowerCase());
        if (vus.has(g)) continue;
        vus.add(g);
        change = true;
        morceaux.append(texte.slice(dernier, m.index));
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mot";
        b.textContent = m[1];
        b.setAttribute("aria-expanded", "false");
        b.addEventListener("click", (e) => { e.stopPropagation(); basculerBulle(b, g); });
        // la ponctuation qui suit reste collée au mot (pas de « , » seule en début de ligne)
        const groupe = document.createElement("span");
        groupe.className = "mot-groupe";
        dernier = m.index + m[1].length;
        const ponctuation = texte.slice(dernier).match(/^[ ]?[,.;:!?»)…]+/);
        groupe.append(b);
        if (ponctuation) { groupe.append(ponctuation[0]); dernier += ponctuation[0].length; }
        morceaux.append(groupe);
      }
      if (!change) return;
      morceaux.append(texte.slice(dernier));
      noeud.replaceWith(morceaux);
    });
  }

  /* Remplit un élément avec un texte du jeu (typographie + glossaire) */
  function ecrire(el, t) {
    el.textContent = typo(t);
    glossariser(el);
  }

  let motOuvert = null;
  function basculerBulle(bouton, g) {
    if (motOuvert === bouton) { cacherBulle(); return; }
    cacherBulle();
    motOuvert = bouton;
    bouton.setAttribute("aria-expanded", "true");
    bulle.innerHTML = "";
    const titre = document.createElement("strong");
    titre.textContent = g.mot;
    bulle.append(titre, " " + typo(g.def));
    bulle.hidden = false;

    // au-dessus du mot s'il y a la place, sinon en dessous
    const r = bouton.getBoundingClientRect();
    const b = bulle.getBoundingClientRect();
    const marge = 10;
    let x = r.left + r.width / 2 - b.width / 2;
    x = Math.max(marge, Math.min(x, window.innerWidth - b.width - marge));
    let y = r.top - b.height - marge;
    if (y < marge) y = r.bottom + marge;
    bulle.style.left = x + "px";
    bulle.style.top = y + "px";
    annoncer(g.mot + " : " + g.def);
  }
  function cacherBulle() {
    if (!motOuvert) return;
    motOuvert.setAttribute("aria-expanded", "false");
    motOuvert = null;
    bulle.hidden = true;
  }
  document.addEventListener("click", (e) => { if (!bulle.contains(e.target)) cacherBulle(); });
  scene.addEventListener("scroll", cacherBulle);

  // ---------- Lecteurs d'écran ----------
  function annoncer(texte) {
    const zone = $("annonce");
    zone.textContent = "";
    setTimeout(() => (zone.textContent = texte), 60);
  }

  // ---------- Écrans ----------
  /* Boutons qui ouvrent un panneau (règles, histoire vraie, parcours) :
     un seul panneau ouvert à la fois sur un même écran */
  const ctas = [...document.querySelectorAll(".btn-cta[aria-controls]")];
  function fermerPanneaux() {
    ctas.forEach((b) => {
      b.setAttribute("aria-expanded", "false");
      $(b.getAttribute("aria-controls")).hidden = true;
    });
  }
  ctas.forEach((b) => b.addEventListener("click", () => {
    const ouvrir = b.getAttribute("aria-expanded") !== "true";
    b.closest(".ecran").querySelectorAll(".btn-cta[aria-controls]").forEach((autre) => {
      autre.setAttribute("aria-expanded", "false");
      $(autre.getAttribute("aria-controls")).hidden = true;
    });
    b.setAttribute("aria-expanded", String(ouvrir));
    $(b.getAttribute("aria-controls")).hidden = !ouvrir;
    SON.jouer("carte");
  }));

  function montrer(nom) {
    etat.ecran = nom;
    cacherBulle();
    fermerPanneaux();
    Object.entries(ecrans).forEach(([n, el]) => (el.hidden = n !== nom));
    btnRetour.hidden = nom === "accueil";
    scene.scrollTop = 0;
  }

  let focusAvantPopup = null;
  function ouvrir(popup) {
    focusAvantPopup = document.activeElement;
    cacherBulle();
    popup.hidden = false;
    const b = popup.querySelector(".btn-pinceau");
    if (b) b.focus({ preventScroll: true });
  }
  function fermer(popup) {
    popup.hidden = true;
    if (focusAvantPopup && document.contains(focusAvantPopup)) focusAvantPopup.focus({ preventScroll: true });
    focusAvantPopup = null;
  }
  const popupRegles = $("popup-regles");
  const popupOuverte = () => (!popupRegles.hidden ? popupRegles : !popupQuitter.hidden ? popupQuitter : !popupConseq.hidden ? popupConseq : null);

  // ---------- Accueil ----------
  function afficherAccueil() {
    const liste = $("liste-histoires");
    liste.innerHTML = "";
    HISTOIRES.forEach((h) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choix-histoire";
      const titre = document.createElement("span");
      titre.className = "choix-histoire-titre";
      titre.textContent = h.titre;
      b.append(titre);
      b.addEventListener("click", () => lancerHistoire(h));
      li.appendChild(b);
      liste.appendChild(li);
    });
    changerDecor(`assets/decors/${HISTOIRES[0].decors.plan}.webp`);
    montrer("accueil");
    annoncer("Accueil. Choisis ton histoire.");
    liste.querySelector("button").focus({ preventScroll: true });
  }

  // ---------- Déroulé ----------
  function reinitialiser(h) {
    parent.postMessage('debut', '*'); // tablette du stand : recache les boutons de l'équipe
    etat.histoire = h;
    etat.etape = 0;
    etat.atouts = new Set();
    etat.chemin = [];
    precharger(h);
  }

  function lancerHistoire(h) {
    reinitialiser(h);
    $("intro-titre").textContent = h.titre;
    ecrire($("intro-texte"), h.intro);
    changerDecor(`assets/decors/${h.decors.plan}.webp`);
    montrer("intro");
    annoncer(h.titre);
    $("btn-commencer").focus({ preventScroll: true });
  }

  /* Autre histoire que celle qu'on vient de jouer, au hasard */
  function histoireAuHasard() {
    const possibles = HISTOIRES.filter((h) => !etat.histoire || h.id !== etat.histoire.id);
    lancerHistoire(possibles[Math.floor(Math.random() * possibles.length)]);
  }

  function afficherSac(nouveau) {
    const liste = $("sac-liste");
    liste.innerHTML = "";
    if (!etat.atouts.size) {
      const li = document.createElement("li");
      li.className = "sac-vide";
      li.textContent = "Vide";
      liste.appendChild(li);
      return;
    }
    etat.atouts.forEach((cle) => {
      const a = ATOUTS[cle];
      const li = document.createElement("li");
      li.className = "atout" + (cle === nouveau ? " nouveau" : "");
      li.innerHTML = `<span class="atout-icone" aria-hidden="true">${a.icone}</span>`;
      li.append(a.court);
      liste.appendChild(li);
    });
  }

  function afficherEtape() {
    const h = etat.histoire;
    const e = h.etapes[etat.etape];
    const plan = etat.etape < 2;

    changerDecor(`assets/decors/${plan ? h.decors.plan : h.decors.fuite}.webp`);
    $("etape-phase").textContent = plan ? "Le plan" : "La fuite";
    $("etape-titre").textContent = e.titre;
    ecrire($("etape-texte"), e.texte);
    poserQuestion($("etape-question"), e.question);
    afficherSac();

    // progression
    const prog = $("progression");
    prog.innerHTML = "";
    prog.setAttribute("aria-label", `Étape ${etat.etape + 1} sur ${NB_ETAPES}`);
    for (let i = 0; i < NB_ETAPES; i++) {
      const li = document.createElement("li");
      li.className = i < etat.etape ? "faite" : i === etat.etape ? "actuelle" : "avenir";
      prog.appendChild(li);
    }

    // cartes
    const zone = $("cartes");
    zone.innerHTML = "";
    e.choix.forEach((c, i) => {
      const carte = document.createElement("article");
      carte.className = "carte";
      carte.innerHTML = `
        <img class="carte-image" src="${imageCarte(c.image)}" alt="">
        <div class="carte-corps">
          <h3 class="carte-titre"></h3>
          <p class="carte-texte"></p>
          <button class="btn-pinceau" type="button">Choisir <span aria-hidden="true">→</span></button>
        </div>`;
      carte.querySelector(".carte-titre").textContent = c.titre;
      ecrire(carte.querySelector(".carte-texte"), c.texte);
      carte.querySelector("button").setAttribute("aria-label", "Choisir : " + c.titre);

      /* indice discret : l'icône de l'atout que ce choix demande,
         à rapprocher du contenu du sac */
      if (c.condition && ATOUTS[c.condition]) {
        const indice = document.createElement("span");
        indice.className = "carte-indice";
        indice.textContent = ATOUTS[c.condition].icone;
        indice.title = "Ce chemin demande " + ATOUTS[c.condition].nom;
        indice.setAttribute("aria-hidden", "true");
        carte.appendChild(indice);
      }
      // toute la carte est tactile, pas seulement le bouton
      carte.addEventListener("click", () => choisir(i));
      zone.appendChild(carte);
    });

    // relance l'animation d'apparition de l'écran
    const el = ecrans.etape;
    el.hidden = true; void el.offsetWidth;
    montrer("etape");
    ajusterCartes();
    annoncer(`Étape ${etat.etape + 1} sur ${NB_ETAPES}, ${plan ? "le plan" : "la fuite"} : ${e.titre}. ${e.question}`);
    etat.verrou = false;
  }

  /* Pourquoi le choix a échoué : quel atout manquait, et quel choix
     du plan aurait permis de l'avoir */
  function expliquerEchec(c) {
    const a = ATOUTS[c.condition];
    if (!a) return "";
    let phrase = `Il te manquait ${a.icone} ${a.nom}`;
    const k = etat.histoire.etapes.findIndex((e) => e.choix.some((x) => x.gagne === c.condition));
    if (k >= 0) phrase += ` (étape ${k + 1})`;
    return typo(phrase + ".");
  }

  function choisir(i) {
    if (etat.verrou) return;
    etat.verrou = true;
    cacherBulle();
    SON.jouer("carte");
    const c = etat.histoire.etapes[etat.etape].choix[i];

    // animation : la carte choisie avance, l'autre s'efface
    [...$("cartes").children].forEach((carte, j) =>
      carte.classList.add(j === i ? "choisie" : "ecartee"));

    const ok = !c.condition || etat.atouts.has(c.condition);
    etat.chemin.push({ choix: c, ok });
    const gain = ok && c.gagne && ATOUTS[c.gagne] ? c.gagne : null;
    if (gain) {
      etat.atouts.add(gain);
      afficherSac(gain);
    }

    const plan = etat.etape < 2;
    const derniere = etat.etape === NB_ETAPES - 1;
    const popup = popupConseq.querySelector(".parchemin");
    popup.classList.toggle("rate", !ok);
    $("conseq-titre").textContent = typo(!ok ? "Repéré !" : plan ? "Ton plan avance." : derniere ? "Libre !" : "Tu passes.");
    ecrire($("conseq-texte"), ok ? c.ok : c.rate);

    const elGain = $("conseq-gain");
    elGain.hidden = !gain;
    if (gain) elGain.textContent = `${ATOUTS[gain].icone} ${ATOUTS[gain].court} → dans ton sac`;

    const elExpl = $("conseq-explication");
    elExpl.hidden = ok;
    if (!ok) elExpl.textContent = expliquerEchec(c);

    $("btn-continuer").innerHTML = (!ok || derniere ? "Voir la fin" : "Continuer") + ' <span aria-hidden="true">→</span>';
    etat.suite = !ok ? () => afficherFin("repris") : derniere ? () => afficherFin(profilFinal()) : etapeSuivante;

    setTimeout(() => {
      SON.jouer(!ok ? "echec" : gain ? "atout" : "reussite");
      ouvrir(popupConseq);
    }, 650);
  }

  function continuer() {
    popupConseq.hidden = true;
    focusAvantPopup = null;
    const suite = etat.suite;
    etat.suite = null;
    if (suite) suite();
  }

  function etapeSuivante() {
    etat.etape++;
    afficherEtape();
    focusCarte(0);
  }

  function compterPoints() {
    const points = { M: 0, R: 0, A: 0 };
    etat.chemin.forEach(({ choix }) => points[choix.profil]++);
    return points;
  }

  /* Profil qui a le plus de points ; égalité → le plus récent */
  function profilFinal() {
    const points = compterPoints();
    const max = Math.max(...Object.values(points));
    for (let i = etat.chemin.length - 1; i >= 0; i--) {
      const p = etat.chemin[i].choix.profil;
      if (points[p] === max) return p;
    }
    return "M";
  }

  function afficherFin(cle) {
    const f = FINS[cle];
    const h = etat.histoire;
    const repris = cle === "repris";

    changerDecor(`assets/fins/${f.image}.webp`);
    ecrans.fin.classList.toggle("repris", repris);
    $("fin-surtitre").textContent = h.titre;
    $("fin-titre").textContent = f.titre;
    ecrire($("fin-texte"), f.texte);
    $("fin-vrai").innerHTML = typo(f.vrai);   // contient seulement de l'italique
    glossariser($("fin-vrai"));

    const points = compterPoints();
    $("fin-score").textContent = ["M", "R", "A"].map((p) => `${NOMS_PROFILS[p]} ${points[p]}`).join(" · ");

    // le chemin suivi, étape par étape
    const chemin = $("fin-chemin");
    chemin.innerHTML = "";
    etat.chemin.forEach(({ choix, ok }) => {
      const li = document.createElement("li");
      li.className = ok ? "" : "rate";
      li.textContent = choix.titre;
      if (!ok) li.setAttribute("aria-label", choix.titre + " (repéré)");
      chemin.appendChild(li);
    });

    montrer("fin");
    parent.postMessage('fini', '*'); // tablette du stand : affiche les boutons de l'équipe
    SON.jouer(repris ? "perdu" : "victoire");
    annoncer(f.titre);
    $("btn-reessayer").focus({ preventScroll: true });
  }

  /* Réessayer la même histoire, directement à l'étape 1 */
  function reessayer() {
    reinitialiser(etat.histoire);
    afficherEtape();
    focusCarte(0);
  }

  // ---------- Boutons ----------
  $("btn-hasard").addEventListener("click", histoireAuHasard);
  $("btn-commencer").addEventListener("click", () => { afficherEtape(); focusCarte(0); });
  $("btn-continuer").addEventListener("click", continuer);
  $("btn-reessayer").addEventListener("click", reessayer);
  $("btn-rejouer").addEventListener("click", histoireAuHasard);

  btnRetour.addEventListener("click", () => {
    // en pleine partie, on demande confirmation
    if (etat.ecran === "etape") ouvrir(popupQuitter);
    else afficherAccueil();
  });
  $("btn-rester").addEventListener("click", () => fermer(popupQuitter));
  $("btn-quitter").addEventListener("click", () => {
    popupQuitter.hidden = true;
    focusAvantPopup = null;
    afficherAccueil();
  });

  function majBoutonSon() {
    const actif = SON.estActif();
    btnSon.classList.toggle("muet", !actif);
    btnSon.setAttribute("aria-pressed", String(actif));
    btnSon.setAttribute("aria-label", actif ? "Couper le son" : "Activer le son");
  }
  btnSon.addEventListener("click", () => { SON.basculer(); majBoutonSon(); });
  majBoutonSon();

  // Le son ne peut démarrer qu'après une première interaction
  ["pointerdown", "keydown"].forEach((t) => document.addEventListener(t, () => SON.reveiller(), { capture: true }));

  // ---------- Clavier ----------
  // ← / → = passer d'une carte à l'autre, Entrée = choisir,
  // 1 / 2 = choisir directement, Échap = retour à l'accueil
  const boutonsCartes = () => [...$("cartes").querySelectorAll(".carte .btn-pinceau")];
  function focusCarte(i) {
    const b = boutonsCartes()[i];
    if (b) b.focus({ preventScroll: true });
  }

  /* Garde le focus dans la fenêtre ouverte (Tab / Maj+Tab) */
  function pieger(e, popup) {
    const focusables = [...popup.querySelectorAll("button")].filter((b) => !b.closest("[hidden]"));
    if (!focusables.length) return;
    const premier = focusables[0], dernier = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    else if (!popup.contains(document.activeElement)) { e.preventDefault(); premier.focus(); }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && motOuvert) {
      const mot = motOuvert;
      cacherBulle();
      mot.focus();
      return;
    }
    const popup = popupOuverte();
    if (popup) {
      if (e.key === "Tab") pieger(e, popup);
      else if (e.key === "Escape") popup === popupRegles || popup === popupQuitter ? fermer(popup) : continuer();
      return;
    }
    if (etat.ecran !== "etape" || etat.verrou) return;
    if (e.key === "1") choisir(0);
    else if (e.key === "2") choisir(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const boutons = boutonsCartes();
      const actuel = boutons.indexOf(document.activeElement);
      if (actuel < 0) focusCarte(e.key === "ArrowLeft" ? 0 : boutons.length - 1);
      else focusCarte(Math.max(0, Math.min(boutons.length - 1, actuel + (e.key === "ArrowLeft" ? -1 : 1))));
    }
    else if (e.key === "Escape") ouvrir(popupQuitter);
  });

  // ---------- Démarrage ----------
  afficherAccueil();
  // Explication rapide à l'ouverture (une fois par visiteur : « Visiteur suivant » recharge le jeu)
  $("btn-regles-ok").addEventListener("click", () => { SON.jouer("carte"); fermer(popupRegles); });
  ouvrir(popupRegles);
})();
