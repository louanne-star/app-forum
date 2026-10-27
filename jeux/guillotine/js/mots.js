/* ==========================================================
   Banque de mots du Pendu du Bagne
   - mot  : écrit AVEC ses accents (c'est ce qui s'affiche)
   - def  : description affichée sur le pop-up de victoire
   La saisie ignore les accents : taper E révèle aussi É, È, Ê.
   ========================================================== */
const MOTS = [
  { mot: "BAGNE", def: "Lieu où les condamnés purgeaient leur peine en travaillant, souvent dans des conditions très dures." },
  { mot: "FORÇAT", def: "Nom donné à un condamné envoyé au bagne pour y effectuer des travaux forcés." },
  { mot: "BAGNARD", def: "Autre nom pour désigner un forçat, un homme condamné au bagne." },
  { mot: "PÉNITENCIER", def: "Bâtiment ou ensemble de bâtiments où logeaient et travaillaient les forçats." },
  { mot: "TRANSPORTATION", def: "Peine qui consistait à envoyer un condamné purger sa peine dans une colonie, loin de la France." },
  { mot: "DÉPORTÉ", def: "Condamné politique envoyé en exil dans une colonie, par distinction avec les condamnés de droit commun." },
  { mot: "RELÉGUÉ", def: "Récidiviste condamné à rester dans la colonie à vie, même après avoir fini sa peine." },
  { mot: "COMMUNARD", def: "Partisan de la Commune de Paris, dont beaucoup furent envoyés au bagne de Nouvelle-Calédonie." },
  { mot: "MATRICULE", def: "Numéro attribué à chaque forçat pour l'identifier, à la place de son nom." },
  { mot: "GEÔLIER", def: "Personne chargée de surveiller les prisonniers et de garder les lieux de détention." },
  { mot: "SURVEILLANT", def: "Agent chargé d'encadrer et de surveiller les forçats dans leur quotidien." },
  { mot: "ÉVASION", def: "Fuite d'un forçat hors du bagne, sévèrement punie quand elle échouait." },
  { mot: "CELLULE", def: "Petite pièce fermée où un forçat pouvait être enfermé seul, souvent en punition." },
  { mot: "CHAÎNE", def: "Objet utilisé pour entraver les forçats et limiter leurs mouvements." },
  { mot: "BOULET", def: "Lourde boule de métal attachée à la cheville d'un forçat pour l'empêcher de s'enfuir." },
  { mot: "CORVÉE", def: "Travail imposé aux forçats, souvent pénible et obligatoire." },
  { mot: "ATELIER", def: "Lieu où les forçats fabriquaient des objets ou exerçaient un métier manuel." },
  { mot: "BRIQUETERIE", def: "Lieu où les forçats fabriquaient des briques, un des travaux imposés au bagne." },
  { mot: "BOULANGERIE", def: "Bâtiment où le pain était fabriqué pour nourrir la population du bagne." },
  { mot: "CHAPELLE", def: "Lieu de culte présent dans l'enceinte du bagne, pour les offices religieux." },
  { mot: "INFIRMERIE", def: "Lieu où les forçats malades ou blessés étaient soignés." },
  { mot: "GAMELLE", def: "Récipient utilisé par les forçats pour recevoir et manger leur ration." },
  { mot: "LIBÉRÉ", def: "Forçat ayant terminé sa peine, mais devant parfois rester dans la colonie." },
  { mot: "CONCESSION", def: "Terrain accordé à un ancien forçat libéré pour qu'il puisse s'y installer." },
  { mot: "RÉCIDIVISTE", def: "Condamné ayant déjà commis un délit ou un crime avant celui qui l'envoie au bagne." },
  { mot: "PONTON", def: "Ancien navire désarmé utilisé comme prison flottante pour les condamnés." },
  { mot: "CACHOT", def: "Cellule sombre et isolée utilisée pour punir sévèrement un forçat." },
  { mot: "NOUVILLE", def: "Presqu'île de Nouméa où se trouvait le bagne de l'Île Nou." },
  { mot: "GRACIATION", def: "Décision qui annule ou réduit la peine d'un condamné avant son terme." }
];
