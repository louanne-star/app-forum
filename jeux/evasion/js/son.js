/* Sons de L'Évasion (les mêmes que les autres jeux) + bouton pour couper le son */
const SON = (() => {
  "use strict";

  const CLE = "evasion-son";
  let actif = true;
  try { actif = localStorage.getItem(CLE) !== "0"; } catch (e) { /* pas de stockage */ }

  let ctx = null, general = null;

  function creer() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    general = ctx.createGain();
    general.gain.value = actif ? 1 : 0;
    general.connect(ctx.destination);
    return true;
  }

  function reveiller() {
    if (!ctx && !creer()) return;
    if (ctx.state === "suspended") ctx.resume();
  }

  /* Joue une note (glisse = la note descend ou monte) */
  function note(freq, debut, duree, { type = "triangle", vol = 0.16, glisse = 0 } = {}) {
    if (!ctx || !actif) return;
    const t = ctx.currentTime + debut;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glisse) osc.frequency.exponentialRampToValueAtTime(glisse, t + duree);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    osc.connect(g).connect(general);
    osc.start(t);
    osc.stop(t + duree + 0.05);
  }

  const effets = {
    // clic
    carte: () => note(1400, 0, 0.05, { type: "sine", vol: 0.07, glisse: 900 }),
    // bon choix
    reussite: () => { note(659, 0, 0.16); note(988, 0.09, 0.32); },
    // bon choix avec un objet
    atout: () => { note(659, 0, 0.16); note(988, 0.09, 0.32); },
    // mauvais choix
    echec: () => { note(233, 0, 0.22, { type: "square", vol: 0.05 }); note(175, 0.14, 0.34, { type: "square", vol: 0.05 }); },
    // évadé
    victoire: () => {
      [523, 659, 784].forEach((f, i) => note(f, i * 0.11, 0.3));
      [523, 659, 784, 1047].forEach((f) => note(f, 0.36, 0.9, { vol: 0.09 }));
    },
    // repris
    perdu: () => [392, 330, 262].forEach((f, i) => note(f, i * 0.2, i === 2 ? 0.8 : 0.3, { vol: 0.12 }))
  };

  function jouer(nom) {
    reveiller();
    if (effets[nom]) effets[nom]();
  }

  function basculer() {
    actif = !actif;
    try { localStorage.setItem(CLE, actif ? "1" : "0"); } catch (e) { /* pas de stockage */ }
    reveiller();
    if (general) general.gain.setTargetAtTime(actif ? 1 : 0, ctx.currentTime, 0.1);
    return actif;
  }

  return { reveiller, jouer, basculer, estActif: () => actif };
})();
