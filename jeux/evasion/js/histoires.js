/* ==========================================================
   L'Évasion — les histoires
   Adaptées du document « L'Évasion — Histoires du jeu »,
   en version courte (une idée par phrase, peu de mots).

   Pour chaque choix :
   - profil    : "M" (marin), "R" (rusé) ou "A" (audacieux), +1 point
   - gagne     : atout gagné (étapes du plan), ou null
   - condition : atout nécessaire pour réussir, "!atout" = il ne faut PAS
                 l'avoir, null = réussit toujours
   - ok        : conséquence si le choix réussit
   - rate      : conséquence si le choix échoue (=> fin « Repris »)
   - image     : numéro de l'image dans assets/cartes/
   ========================================================== */
const HISTOIRES = [
  /* ------------------------------------------------------ */
  {
    id: "h1",
    titre: "Les murs de l'île Nou",
    intro: "Île Nou, 1885. Tu es le matricule 4127 et tu tailles la pierre mauve au bagne. Ce soir, tu décides de t'évader.",
    decors: { plan: "h1-plan", fuite: "h1-fuite" },
    etapes: [
      {
        titre: "Ce qu'il te faut",
        texte: "Pour t'évader, il te faut un objet utile.",
        question: "Que prends-tu ?",
        choix: [
          { titre: "Voler une corde", texte: "À la briqueterie. Risqué, mais utile.", image: 1, profil: "A", gagne: "corde", condition: null,
            ok: "Tu caches la corde sous ta paillasse." },
          { titre: "Garder du pain", texte: "Un peu chaque jour. Lent, mais sans risque.", image: 2, profil: "R", gagne: "vivres", condition: null,
            ok: "En trois semaines, tu as un sac de pain sec." }
        ]
      },
      {
        titre: "Le complice",
        texte: "Marius, ancien pêcheur, veut partir avec toi.",
        question: "Avec qui pars-tu ?",
        choix: [
          { titre: "Partir avec Marius", texte: "Il connaît la mer. Mais à deux, on se voit plus.", image: 3, profil: "M", gagne: "complice", condition: null,
            ok: "Vous partirez ensemble." },
          { titre: "Partir seul", texte: "Personne ne pourra te trahir.", image: 4, profil: "R", gagne: null, condition: null,
            ok: "Marius n'insiste pas." }
        ]
      },
      {
        titre: "Le moment est venu",
        texte: "La nuit tombe. Tu es caché derrière la chapelle.",
        question: "Par où pars-tu ?",
        choix: [
          { titre: "Le chemin des falaises", texte: "Discret, mais il finit sur une falaise.", image: 5, profil: "A", gagne: null, condition: "corde",
            ok: "Avec ta corde, tu descends jusqu'à la plage.",
            rate: "Sans corde, tu glisses. La sentinelle t'entend." },
          { titre: "Le bord de mer", texte: "Dans l'ombre des rochers. Il faut faire vite.", image: 6, profil: "M", gagne: null, condition: null,
            ok: "Le bruit des vagues te cache." }
        ]
      },
      {
        titre: "L'alerte",
        texte: "Ton absence est découverte. On te cherche partout.",
        question: "Où te caches-tu ?",
        choix: [
          { titre: "À la ferme Nord", texte: "Loin du camp. Il faudra attendre sans bouger.", image: 7, profil: "R", gagne: null, condition: null,
            ok: "Caché dans l'étable, tu passes la nuit." },
          { titre: "Dans les rochers", texte: "Bonne cachette, mais la marée monte vite.", image: 8, profil: "M", gagne: null, condition: "complice",
            ok: "Marius connaît la marée. Vous restez au sec.",
            rate: "Seul, la marée te chasse. Une patrouille te voit." }
        ]
      },
      {
        titre: "Quitter l'île",
        texte: "Les recherches s'éloignent. Seule la mer peut t'emmener.",
        question: "Comment pars-tu ?",
        choix: [
          { titre: "Construire un radeau", texte: "Des planches… et de quoi les attacher.", image: 9, profil: "A", gagne: null, condition: "corde",
            ok: "Ta corde tient les planches. Tu rames vers Nouméa.",
            rate: "Sans corde, le radeau se défait. On te repêche." },
          { titre: "Se cacher dans un navire", texte: "Un navire part pour l'Australie. Le voyage sera long.", image: 10, profil: "R", gagne: null, condition: "vivres",
            ok: "Grâce à ton pain, tu tiens jusqu'à Sydney.",
            rate: "La faim te fait sortir. Le capitaine te livre." }
        ]
      }
    ]
  },

  /* ------------------------------------------------------ */
  {
    id: "h2",
    titre: "L'atelier",
    intro: "Île Nou, 1885. Tu es cordonnier au bagne. Un navire anglais va bientôt passer près de l'île : c'est ta chance.",
    decors: { plan: "h2-plan", fuite: "h2-fuite" },
    etapes: [
      {
        titre: "Ce qu'il te faut",
        texte: "À l'atelier, tu peux préparer ta fuite.",
        question: "Que prépares-tu ?",
        choix: [
          { titre: "Coudre une outre", texte: "Un sac en cuir gonflé d'air, pour flotter.", image: 11, profil: "M", gagne: "outre", condition: null,
            ok: "Tu la couds en cachette." },
          { titre: "Voler un uniforme", texte: "Une tenue de surveillant, pour passer inaperçu.", image: 12, profil: "R", gagne: "uniforme", condition: null,
            ok: "Tu caches la veste sous des tissus." }
        ]
      },
      {
        titre: "Le moment",
        texte: "Le navire arrive dans trois jours.",
        question: "Quand pars-tu ?",
        choix: [
          { titre: "Une nuit sans lune", texte: "Personne ne te verra… toi non plus.", image: 13, profil: "A", gagne: "nuit", condition: null,
            ok: "Tu attends la nuit la plus noire." },
          { titre: "Pendant la messe", texte: "Le dimanche, le camp est presque vide.", image: 14, profil: "R", gagne: null, condition: null,
            ok: "Tu fais semblant d'être malade." }
        ]
      },
      {
        titre: "Sortir du camp",
        texte: "D'abord, il faut sortir de l'enceinte.",
        question: "Par où passes-tu ?",
        choix: [
          { titre: "Par le poste de garde", texte: "Facile… si tu ressembles à un surveillant.", image: 15, profil: "R", gagne: null, condition: "uniforme",
            ok: "En uniforme, la sentinelle te salue.",
            rate: "En tenue de forçat, on t'arrête tout de suite." },
          { titre: "Escalader le mur", texte: "Derrière l'atelier, le mur est bas.", image: 16, profil: "A", gagne: null, condition: null,
            ok: "Tu sautes et tu cours vers la côte." }
        ]
      },
      {
        titre: "Rejoindre la côte",
        texte: "Le navire est au large. Il faut atteindre la côte sans être vu.",
        question: "Quel chemin prends-tu ?",
        choix: [
          { titre: "Par la ferme Nord", texte: "Plus long, mais loin du camp.", image: 7, profil: "R", gagne: null, condition: null,
            ok: "Tu attends dans l'étable, puis tu files à la plage." },
          { titre: "Courir à découvert", texte: "Le plus court. Il faut qu'il fasse très noir.", image: 17, profil: "A", gagne: null, condition: "nuit",
            ok: "Dans le noir, personne ne te voit.",
            rate: "La lune éclaire la plage. On te repère." }
        ]
      },
      {
        titre: "Le navire anglais",
        texte: "Le navire part à l'aube.",
        question: "Comment montes-tu à bord ?",
        choix: [
          { titre: "Nager jusqu'au navire", texte: "Très loin. Il faut de quoi flotter.", image: 18, profil: "M", gagne: null, condition: "outre",
            ok: "Accroché à ton outre, tu atteins le navire.",
            rate: "Sans rien pour flotter, tu t'épuises. On te repêche." },
          { titre: "Monter dans la chaloupe", texte: "Elle livre le navire. Il faut avoir l'air d'un surveillant.", image: 19, profil: "R", gagne: null, condition: "uniforme",
            ok: "En uniforme, personne ne pose de question.",
            rate: "Les marins voient que tu es un forçat." }
        ]
      }
    ]
  },

  /* ------------------------------------------------------ */
  {
    id: "h3",
    titre: "La carrière",
    intro: "Île Nou, 1890. Tu tailles la pierre dans la carrière. Chaque soir, tu regardes passer les barques : l'une d'elles sera ta liberté.",
    decors: { plan: "h3-plan", fuite: "h3-fuite" },
    etapes: [
      {
        titre: "Ce qu'il te faut",
        texte: "Pour partir, il te faut une barque.",
        question: "Que prépares-tu ?",
        choix: [
          { titre: "Cacher un burin", texte: "Un outil peut tout ouvrir. Mais on les compte.", image: 20, profil: "A", gagne: "burin", condition: null,
            ok: "Tu l'enterres sous des pierres." },
          { titre: "Devenir ami d'un pêcheur", texte: "Il vend son poisson au camp. Il pourrait t'aider.", image: 21, profil: "R", gagne: "pecheur", condition: null,
            ok: "Il accepte de t'aider, une seule fois." }
        ]
      },
      {
        titre: "Le complice",
        texte: "Joseph, ancien marin, veut partir aussi.",
        question: "Avec qui pars-tu ?",
        choix: [
          { titre: "Partir avec Joseph", texte: "Il connaît la mer. Mais à deux, on se voit plus.", image: 22, profil: "M", gagne: "complice", condition: null,
            ok: "Vous partirez ensemble." },
          { titre: "Partir seul", texte: "Moins tu en dis, mieux c'est.", image: 23, profil: "R", gagne: null, condition: null,
            ok: "Joseph n'insiste pas." }
        ]
      },
      {
        titre: "Sortir du camp",
        texte: "La nuit tombe. Tu ne peux pas passer par la porte.",
        question: "Par où passes-tu ?",
        choix: [
          { titre: "Creuser sous la clôture", texte: "La terre est molle. Avec un outil, ça ira vite.", image: 24, profil: "A", gagne: null, condition: "burin",
            ok: "Tu creuses et tu te glisses dehors.",
            rate: "À mains nues, tu n'avances pas. La ronde te trouve." },
          { titre: "Passer par la plage", texte: "À marée basse, par les rochers.", image: 8, profil: "M", gagne: null, condition: null,
            ok: "Dans l'eau jusqu'aux genoux, personne ne te voit." }
        ]
      },
      {
        titre: "Attendre",
        texte: "La barque passera avant l'aube.",
        question: "Où attends-tu ?",
        choix: [
          { titre: "Dans la carrière", texte: "La nuit, personne n'y va.", image: 25, profil: "R", gagne: null, condition: null,
            ok: "Tu attends dans un creux de roche." },
          { titre: "Nager jusqu'à la pointe", texte: "Plus près, mais le courant est fort.", image: 17, profil: "M", gagne: null, condition: "complice",
            ok: "Joseph connaît les courants. Vous y arrivez.",
            rate: "Seul, le courant t'épuise. Une patrouille t'attend." }
        ]
      },
      {
        titre: "La barque",
        texte: "L'aube approche. C'est maintenant ou jamais.",
        question: "Quelle barque prends-tu ?",
        choix: [
          { titre: "Voler une barque", texte: "Elle est attachée par une chaîne.", image: 26, profil: "A", gagne: null, condition: "burin",
            ok: "Ton burin casse la chaîne. Tu rames au large.",
            rate: "Sans outil, la chaîne tient. La sentinelle t'entend." },
          { titre: "La barque du pêcheur", texte: "Il passe chaque matin. S'il tient parole…", image: 27, profil: "R", gagne: null, condition: "pecheur",
            ok: "Il te cache sous ses filets.",
            rate: "Personne ne s'arrête pour toi. On te trouve." }
        ]
      }
    ]
  }
];

/* ---------- Les fins ---------- */
const FINS = {
  M: {
    image: "marin",
    titre: "Évadé comme un marin",
    texte: "Tu as fait confiance à la mer.",
    vrai: "En 1874, Henri Rochefort et cinq communards s'évadent. Un navire anglais, le <i>P.C.E.</i>, les emmène en Australie."
  },
  R: {
    image: "ruse",
    titre: "Évadé comme un rusé",
    texte: "Tu as préparé ton coup et attendu le bon moment.",
    vrai: "En 1878, l'ancien forçat Henri Baret obtient le droit de partir un temps à Sydney. Il ne revient jamais."
  },
  A: {
    image: "audacieux",
    titre: "Évadé comme un audacieux",
    texte: "Tu as pris des risques, et la chance t'a suivi.",
    vrai: "Des centaines de forçats ont tenté de rejoindre le Queensland, à 1 200 km, sur des radeaux ou des navires volés. Beaucoup sont morts en mer."
  },
  repris: {
    image: "repris",
    titre: "Repris !",
    texte: "On te ramène au bagne, les fers aux pieds.",
    vrai: "Même en Australie, on n'était pas à l'abri. En 1887, douze évadés arrêtés dans le Queensland sont renvoyés à Nouméa."
  }
};

const NOMS_PROFILS = { M: "Marin", R: "Rusé", A: "Audacieux" };
