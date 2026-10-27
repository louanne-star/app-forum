/* ==========================================================
   L'Évasion — le son
   Tout est fabriqué avec la Web Audio API (aucun fichier) :
   - une ambiance de vagues (bruit filtré qui monte et descend)
   - quelques bruitages : carte, réussite, échec, fin
   Le navigateur n'autorise le son qu'après un premier appui :
   SON.reveiller() est appelé à chaque interaction.
   Le choix « son coupé » est mémorisé sur l'appareil.
   ========================================================== */
const SON = (() => {
  "use strict";

  const CLE = "evasion-son";
  let actif = true;
  try { actif = localStorage.getItem(CLE) !== "0"; } catch (e) { /* stockage bloqué */ }

  let ctx = null, general = null, ambiance = null;

  function creer() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    general = ctx.createGain();
    general.gain.value = actif ? 1 : 0;
    general.connect(ctx.destination);
    lancerVagues();
    return true;
  }

  /* Bruit brun en boucle, filtré, dont le volume ondule lentement */
  function lancerVagues() {
    const duree = 4, n = ctx.sampleRate * duree;
    const tampon = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = tampon.getChannelData(0);
    let dernier = 0;
    for (let i = 0; i < n; i++) {
      dernier = (dernier + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = dernier * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = tampon;
    source.loop = true;

    const filtre = ctx.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = 520;

    ambiance = ctx.createGain();
    ambiance.gain.value = 0.16;

    // la houle : un oscillateur très lent fait varier le volume
    const houle = ctx.createOscillator();
    houle.frequency.value = 0.11;
    const amplitude = ctx.createGain();
    amplitude.gain.value = 0.1;
    houle.connect(amplitude).connect(ambiance.gain);

    source.connect(filtre).connect(ambiance).connect(general);
    source.start();
    houle.start();
  }

  function reveiller() {
    if (!ctx && !creer()) return;
    if (ctx.state === "suspended") ctx.resume();
  }

  /* Une note courte avec attaque douce */
  function note(freq, debut, duree, type = "triangle", volume = 0.18) {
    if (!ctx || !actif) return;
    const t = ctx.currentTime + debut;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    osc.connect(g).connect(general);
    osc.start(t);
    osc.stop(t + duree + 0.05);
  }

  /* Bruit court filtré : frottement de papier */
  function papier() {
    if (!ctx || !actif) return;
    const n = Math.floor(ctx.sampleRate * 0.18);
    const tampon = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const source = ctx.createBufferSource();
    source.buffer = tampon;
    const filtre = ctx.createBiquadFilter();
    filtre.type = "bandpass";
    filtre.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.value = 0.25;
    source.connect(filtre).connect(g).connect(general);
    source.start();
  }

  const effets = {
    carte: papier,
    reussite: () => { note(523, 0, 0.25); note(784, 0.1, 0.4); },
    atout: () => { note(659, 0, 0.2); note(880, 0.08, 0.2); note(1175, 0.16, 0.45); },
    echec: () => { note(220, 0, 0.35, "sawtooth", 0.07); note(185, 0.18, 0.4, "sawtooth", 0.07); note(147, 0.36, 0.7, "sawtooth", 0.07); },
    victoire: () => [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, 0.6)),
    decouverte: () => { note(1319, 0, 0.3, "sine", 0.12); note(1568, 0.1, 0.5, "sine", 0.12); }
  };

  function jouer(nom) {
    reveiller();
    if (effets[nom]) effets[nom]();
  }

  function basculer() {
    actif = !actif;
    try { localStorage.setItem(CLE, actif ? "1" : "0"); } catch (e) { /* tant pis */ }
    reveiller();
    if (general) general.gain.setTargetAtTime(actif ? 1 : 0, ctx.currentTime, 0.1);
    return actif;
  }

  return { reveiller, jouer, basculer, estActif: () => actif };
})();
