/* ==========================================================
   Le Pendu du Bagne — logique du jeu
   Règles :
   - une partie = 10 mots tirés au hasard, sans répétition
   - la première lettre de chaque mot est affichée d'office
   - 7 erreurs maximum par mot : la lame descend d'un cran à chaque erreur
   - une défaite termine la partie
   - 2 indices par partie : un indice révèle une lettre au hasard
     (bloqué quand il ne reste qu'une lettre à trouver)
   - les accents sont ignorés à la saisie
   ========================================================== */
(() => {
  "use strict";

  const MOTS_PAR_PARTIE = 10;
  const ERREURS_MAX = 7;
  const INDICES_PAR_PARTIE = 2;
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  /* Repères mesurés sur l'image de la guillotine (1394 px de haut) :
     bas de la lame au départ, et descente par erreur. */
  const IMG_HAUTEUR = 1394;
  const BAS_LAME_DEPART = 559;
  const PAS_LAME = 37.1;

  // ---------- Éléments ----------
  const $ = (id) => document.getElementById(id);
  const elMot = $("mot");
  const elClavier = $("clavier");
  const elGuillotine = $("guillotine");
  const elGraduation = $("graduation");
  const elTrouves = $("nb-trouves");
  const elTotal = $("nb-total");
  const btnIndice = $("btn-indice");
  const elNbIndices = $("nb-indices");
  const popupVictoire = $("popup-victoire");
  const popupParametres = $("popup-parametres");
  const ecranFin = $("ecran-fin");
  const btnRecommencer = $("btn-recommencer");

  // ---------- État ----------
  const etat = {
    file: [],          // mots restants de la partie
    actuel: null,      // { mot, def, lettres: [{ aff, base }] }
    trouvees: new Set(), // lettres (sans accent) déjà jouées
    erreurs: 0,
    motsTrouves: 0,
    indices: INDICES_PAR_PARTIE,
    actif: false       // false pendant les pop-ups et animations
  };

  // ---------- Outils ----------
  const sansAccent = (c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const estLettre = (c) => /^[A-Z]$/.test(c);

  function melanger(tab) {
    const t = tab.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  }

  /* Taille d'écran réelle (corrige la barre d'adresse des tablettes) */
  function majTailleEcran() {
    const r = document.documentElement.style;
    r.setProperty("--h", window.innerHeight / 100 + "px");
    r.setProperty("--w", window.innerWidth / 100 + "px");
  }
  window.addEventListener("resize", majTailleEcran);
  window.addEventListener("orientationchange", () => setTimeout(majTailleEcran, 250));
  majTailleEcran();

  // ---------- Sons (générés, aucun fichier) ----------
  const sons = {
    actifs: lire("pendu-sons", "1") === "1",
    ctx: null,
    initialiser() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    },
    note(freq, duree, type = "triangle", volume = .18, delai = 0) {
      if (!this.actifs || !this.ctx) return;
      const t = this.ctx.currentTime + delai;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + duree);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + duree + .02);
    },
    coup(volume = .5, duree = .35) {
      if (!this.actifs || !this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + duree);
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + duree);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + duree + .02);
      // grincement métallique
      this.note(1900, .12, "sawtooth", .025);
    },
    juste()    { this.note(660, .12); this.note(990, .14, "triangle", .1, .05); },
    faux()     { this.coup(.35, .3); },
    chute()    { this.coup(.7, .6); },
    indice()   { this.note(1046, .4, "sine", .14); this.note(1568, .5, "sine", .08, .08); },
    victoire() { [523, 659, 784, 1046].forEach((f, i) => this.note(f, .35, "triangle", .15, i * .11)); }
  };

  function lire(cle, defaut) {
    try { return localStorage.getItem(cle) ?? defaut; } catch { return defaut; }
  }
  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, valeur); } catch { /* stockage indisponible */ }
  }

  // ---------- Construction de l'interface ----------
  function construireClavier() {
    ALPHABET.forEach((l) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "touche";
      b.textContent = l;
      b.dataset.lettre = l;
      b.setAttribute("aria-label", "Lettre " + l);
      b.addEventListener("click", () => jouer(l));
      elClavier.appendChild(b);
    });
  }

  function construireGraduation() {
    for (let k = 1; k <= ERREURS_MAX; k++) {
      const li = document.createElement("li");
      li.style.top = ((BAS_LAME_DEPART + PAS_LAME * k) / IMG_HAUTEUR * 100) + "%";
      elGraduation.appendChild(li);
    }
  }

  function afficherMot() {
    const lettres = etat.actuel.lettres;
    elMot.style.setProperty("--n", lettres.length);
    elMot.innerHTML = "";
    elMot.setAttribute("aria-label", lettres.length + " lettres");
    lettres.forEach(() => {
      const c = document.createElement("div");
      c.className = "case";
      c.appendChild(document.createElement("span"));
      elMot.appendChild(c);
    });
  }

  /* Révèle dans le mot toutes les cases correspondant à une lettre */
  function revelerLettre(base) {
    etat.actuel.lettres.forEach((l, i) => {
      if (l.base === base) {
        const c = elMot.children[i];
        c.firstChild.textContent = l.aff;
        c.classList.add("revelee");
      }
    });
  }

  function majGuillotine() {
    elGuillotine.style.setProperty("--e", etat.erreurs);
    elGuillotine.setAttribute("aria-label", `Erreurs : ${etat.erreurs} sur ${ERREURS_MAX}`);
    [...elGraduation.children].forEach((li, i) => li.classList.toggle("atteint", i < etat.erreurs));
  }

  function majIndice() {
    elNbIndices.textContent = etat.indices;
    btnIndice.disabled = !etat.actif || etat.indices === 0 || lettresRestantes().length <= 1;
  }

  function majCompteur() {
    elTrouves.textContent = etat.motsTrouves;
    elTotal.textContent = MOTS_PAR_PARTIE;
  }

  function desactiverTouche(base) {
    const b = elClavier.querySelector(`[data-lettre="${base}"]`);
    if (b) b.disabled = true;
  }

  // ---------- Logique ----------
  function lettresRestantes() {
    if (!etat.actuel) return [];
    const r = new Set();
    etat.actuel.lettres.forEach((l) => {
      if (estLettre(l.base) && !etat.trouvees.has(l.base)) r.add(l.base);
    });
    return [...r];
  }

  function nouvellePartie() {
    etat.file = melanger(MOTS).slice(0, MOTS_PAR_PARTIE);
    etat.motsTrouves = 0;
    etat.indices = INDICES_PAR_PARTIE;
    majCompteur();
    motSuivant();
  }

  function motSuivant() {
    const entree = etat.file.shift();
    etat.actuel = {
      mot: entree.mot,
      def: entree.def,
      lettres: [...entree.mot].map((c) => ({ aff: c, base: sansAccent(c) }))
    };
    etat.trouvees = new Set();

    // la lame remonte doucement
    elGuillotine.classList.remove("chute");
    elGuillotine.classList.add("remonte");
    etat.erreurs = 0;
    majGuillotine();
    setTimeout(() => elGuillotine.classList.remove("remonte"), 950);

    elClavier.querySelectorAll(".touche").forEach((b) => (b.disabled = false));
    afficherMot();

    // la première lettre est donnée d'office
    const premiere = etat.actuel.lettres[0].base;
    etat.trouvees.add(premiere);
    desactiverTouche(premiere);
    revelerLettre(premiere);

    etat.actif = true;
    majIndice();
  }

  function jouer(lettre) {
    if (!etat.actif || etat.trouvees.has(lettre)) return;
    sons.initialiser();
    etat.trouvees.add(lettre);
    desactiverTouche(lettre);

    const presente = etat.actuel.lettres.some((l) => l.base === lettre);
    if (presente) {
      revelerLettre(lettre);
      sons.juste();
      if (lettresRestantes().length === 0) return gagnerMot();
    } else {
      etat.erreurs++;
      if (etat.erreurs >= ERREURS_MAX) elGuillotine.classList.add("chute");
      majGuillotine();
      if (etat.erreurs >= ERREURS_MAX) return perdre();
      sons.faux();
    }
    majIndice();
  }

  function utiliserIndice() {
    const restantes = lettresRestantes();
    if (!etat.actif || etat.indices === 0 || restantes.length <= 1) return;
    sons.initialiser();
    const lettre = restantes[Math.floor(Math.random() * restantes.length)];
    etat.indices--;
    etat.trouvees.add(lettre);
    desactiverTouche(lettre);
    revelerLettre(lettre);
    sons.indice();
    majIndice();
  }

  function gagnerMot() {
    etat.actif = false;
    etat.motsTrouves++;
    majCompteur();
    majIndice();
    sons.victoire();
    const dernier = etat.motsTrouves >= MOTS_PAR_PARTIE;
    setTimeout(() => {
      $("victoire-mot").textContent = etat.actuel.mot;
      $("victoire-def").textContent = etat.actuel.def;
      $("btn-suivant").textContent = dernier ? "Voir le résultat" : "Mot suivant";
      ouvrir(popupVictoire);
    }, 650);
  }

  function perdre() {
    etat.actif = false;
    majIndice();
    sons.chute();
    setTimeout(() => {
      elGuillotine.classList.remove("secousse");
      void elGuillotine.offsetWidth; // relance l'animation
      elGuillotine.classList.add("secousse");
    }, 200);

    // on montre les lettres manquantes
    etat.actuel.lettres.forEach((l, i) => {
      const c = elMot.children[i];
      if (!c.firstChild.textContent) {
        c.firstChild.textContent = l.aff;
        c.classList.add("revelee", "manquee");
      }
    });

    setTimeout(() => afficherFin(false), 1500);
  }

  /* Écran de fin provisoire (gagné = 10 mots trouvés) */
  function afficherFin(gagne) {
    if (gagne) {
      $("fin-surtitre").textContent = "Libéré !";
      $("fin-titre").textContent = "Partie gagnée";
      $("fin-texte").textContent = "Vous avez trouvé les " + MOTS_PAR_PARTIE + " mots sans que la lame ne tombe.";
    } else {
      $("fin-surtitre").textContent = "La lame est tombée";
      $("fin-titre").textContent = etat.actuel.mot;
      $("fin-texte").textContent = etat.actuel.def;
    }
    $("fin-score").textContent = `Mots trouvés : ${etat.motsTrouves}/${MOTS_PAR_PARTIE}`;
    ouvrir(ecranFin);
  }

  // ---------- Pop-ups ----------
  function ouvrir(popup) {
    popup.hidden = false;
    const btn = popup.querySelector("button");
    if (btn) btn.focus({ preventScroll: true });
  }
  function fermer(popup) { popup.hidden = true; }

  $("btn-suivant").addEventListener("click", () => {
    fermer(popupVictoire);
    if (etat.motsTrouves >= MOTS_PAR_PARTIE) afficherFin(true);
    else motSuivant();
  });

  $("btn-rejouer").addEventListener("click", () => {
    fermer(ecranFin);
    nouvellePartie();
  });

  btnIndice.addEventListener("click", utiliserIndice);

  // Paramètres
  let etaitActif = false;
  $("btn-parametres").addEventListener("click", () => {
    sons.initialiser();
    etaitActif = etat.actif;
    etat.actif = false;
    btnRecommencer.textContent = "Recommencer la partie";
    btnRecommencer.dataset.confirmer = "";
    ouvrir(popupParametres);
  });
  $("btn-fermer").addEventListener("click", () => {
    fermer(popupParametres);
    etat.actif = etaitActif;
    majIndice();
  });

  const btnSon = $("btn-son");
  const majBoutonSon = () => (btnSon.textContent = "Sons : " + (sons.actifs ? "activés" : "coupés"));
  btnSon.addEventListener("click", () => {
    sons.actifs = !sons.actifs;
    ecrire("pendu-sons", sons.actifs ? "1" : "0");
    majBoutonSon();
  });
  majBoutonSon();

  // Recommencer : demande une confirmation (2e appui)
  btnRecommencer.addEventListener("click", () => {
    if (!btnRecommencer.dataset.confirmer) {
      btnRecommencer.dataset.confirmer = "1";
      btnRecommencer.textContent = "Confirmer ?";
      return;
    }
    fermer(popupParametres);
    nouvellePartie();
  });

  // Plein écran (caché si le navigateur ne le permet pas)
  const btnPleinEcran = $("btn-plein-ecran");
  const racine = document.documentElement;
  const demanderPE = racine.requestFullscreen || racine.webkitRequestFullscreen;
  if (!demanderPE) btnPleinEcran.hidden = true;
  btnPleinEcran.addEventListener("click", () => {
    const enPE = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      const p = enPE
        ? (document.exitFullscreen || document.webkitExitFullscreen).call(document)
        : demanderPE.call(racine);
      if (p && p.catch) p.catch(() => {});
    } catch { /* refusé par le navigateur */ }
  });

  // ---------- Clavier physique (tests sur ordinateur) ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const ouvert = [popupVictoire, ecranFin, popupParametres].find((p) => !p.hidden);
    if (ouvert) {
      if (e.key === "Escape" && ouvert === popupParametres) $("btn-fermer").click();
      return; // Entrée active le bouton qui a le focus
    }
    const l = sansAccent(e.key);
    if (l.length === 1 && estLettre(l)) jouer(l);
  });

  // ---------- Démarrage ----------
  construireClavier();
  construireGraduation();
  nouvellePartie();
})();
