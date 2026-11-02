/* Sons des jeux de la tablette (faits avec la Web Audio API, pas de fichiers).
   Dans un jeu : SONS.jouer("bonne"), SONS.jouer("mauvaise"), SONS.fin(score, total)...
   data-sans-clic="..." sur la balise script = pas de clic sur ces éléments. */
(() => {
  "use strict";
  const VOLUME = 0.9;
  const script = document.currentScript;
  const sansClic = script && script.dataset.sansClic;

  let ctx = null, sortie = null;
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      sortie = ctx.createGain();
      sortie.gain.value = VOLUME;
      sortie.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* Joue une note (glisse = la note descend ou monte) */
  function note(freq, debut, duree, { type = "triangle", vol = 0.16, glisse = 0 } = {}) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + debut;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glisse) osc.frequency.exponentialRampToValueAtTime(glisse, t + duree);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    osc.connect(g).connect(sortie);
    osc.start(t);
    osc.stop(t + duree + 0.05);
  }

  const effets = {
    // clic
    clic: () => note(1400, 0, 0.05, { type: "sine", vol: 0.07, glisse: 900 }),
    // objet posé
    pose: () => { note(320, 0, 0.12, { type: "sine", vol: 0.22, glisse: 140 }); note(900, 0, 0.04, { type: "triangle", vol: 0.05 }); },
    // bonne réponse
    bonne: () => { note(659, 0, 0.16); note(988, 0.09, 0.32); },
    // mauvaise réponse
    mauvaise: () => { note(233, 0, 0.22, { type: "square", vol: 0.05 }); note(175, 0.14, 0.34, { type: "square", vol: 0.05 }); },
    // gagné
    gagne: () => {
      [523, 659, 784].forEach((f, i) => note(f, i * 0.11, 0.3));
      [523, 659, 784, 1047].forEach((f) => note(f, 0.36, 0.9, { vol: 0.09 }));
    },
    // perdu
    perdu: () => [392, 330, 262].forEach((f, i) => note(f, i * 0.2, i === 2 ? 0.8 : 0.3, { vol: 0.12 }))
  };

  window.SONS = {
    jouer(nom) { if (effets[nom]) effets[nom](); },
    fin(score, total) { this.jouer(score >= total / 2 ? "gagne" : "perdu"); }
  };

  // petit clic sur tous les boutons
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("button, [role=button], a[href]");
    if (!b || b.disabled) return;
    if (sansClic && b.closest(sansClic)) return;
    effets.clic();
  }, true);
})();
