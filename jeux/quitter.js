/* Bouton « Quitter » commun aux jeux de la tablette, dans la charte des « Mots du Bagne ».
   Dans la tablette (jeu ouvert dans l'appli) : demande à l'appli de revenir au menu des jeux.
   Jeu ouvert seul : va directement sur index.html#/tablette.

   Utilisation, en bas de la page du jeu :
     <script src="../quitter.js" data-dans=".top-right"></script>   → ajouté dans ce conteneur
     <script src="../quitter.js" data-style="top:…;right:…"></script> → flottant, position ajustée
     <script src="../quitter.js"></script>                          → flottant en haut à droite      */
(() => {
  "use strict";
  const script = document.currentScript;
  const menu = new URL("../index.html#/tablette", script.src).href;

  if (!document.querySelector('link[href*="family=Lora"]')) {
    const police = document.createElement("link");
    police.rel = "stylesheet";
    police.href = "https://fonts.googleapis.com/css2?family=Lora:wght@600&display=swap";
    document.head.appendChild(police);
  }

  const style = document.createElement("style");
  style.textContent = `
    .bouton-quitter{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;
      height:44px;padding:0 22px;border-radius:999px;font:600 16px/1 'Lora',Georgia,serif;letter-spacing:.02em;
      color:#F5EBDD;background:#192D3D;border:2px solid #A96F3F;box-shadow:0 4px 12px rgba(0,0,0,.35);
      transition:filter .2s,transform .15s;-webkit-tap-highlight-color:transparent}
    .bouton-quitter:hover{filter:brightness(1.2);transform:translateY(-1px)}
    .bouton-quitter:active{transform:scale(.96)}
    .bouton-quitter:focus-visible{outline:3px solid #DCC9A6;outline-offset:3px}
    .bouton-quitter svg{width:16px;height:16px}
    .bouton-quitter.flottant{position:fixed;z-index:1000;
      top:max(12px,env(safe-area-inset-top,0px));right:max(12px,env(safe-area-inset-right,0px))}`;
  document.head.appendChild(style);

  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "bouton-quitter";
  bouton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Quitter';
  bouton.addEventListener("click", () => {
    if (window.parent !== window) parent.postMessage("quitter", "*");
    else location.href = menu;
  });

  const cible = script.dataset.dans && document.querySelector(script.dataset.dans);
  if (cible) cible.appendChild(bouton);
  else {
    bouton.classList.add("flottant");
    if (script.dataset.style) bouton.style.cssText = script.dataset.style;
    document.body.appendChild(bouton);
  }
})();
