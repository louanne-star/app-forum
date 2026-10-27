# Forçats'Nou — appli du forum

Le visiteur s'inscrit à l'entrée (prénom, nom, matricule de 4 chiffres), scanne le QR code de chaque activité, puis reçoit son rôle au bagne. L'équipe imprime les cartes en direct et colle l'autocollant du rôle à la sortie.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `config.js` | **Le seul fichier à modifier** : Supabase, activités, rôles, points, code équipe |
| `index.html`, `app.js`, `styles.css` | L'appli (pas besoin d'y toucher) |
| `supabase.sql` | Script qui crée la base |

## Tester tout de suite (mode démo)

Ouvrir `index.html` via un petit serveur local (par ex. l'extension *Live Server* de VS Code). Sans Supabase, l'appli tourne en **mode démo** : les données restent dans le navigateur. Ouvre deux onglets (un visiteur, un `#/equipe`) pour voir la synchro.

## Mise en place pour le forum

1. **Supabase** : créer un nouveau projet → *SQL Editor* → coller `supabase.sql` → *Run*.
2. **config.js** : coller `supabaseUrl` et `supabaseAnonKey` (*Project Settings → API*, clé `anon public`).
3. **Netlify** : glisser le dossier sur app.netlify.com/drop. Mettre l'adresse obtenue dans `baseUrl` (config.js) puis redéployer.
4. **Activités et rôles** : remplir les listes dans `config.js` (les exemples sont à remplacer). Le rôle d'un visiteur = celui qui a le plus de points ; en cas d'égalité, le rôle le plus haut dans la liste gagne.
5. **QR codes** : ouvrir `<adresse>/#/equipe/qr` et imprimer la page (Ctrl/Cmd + P). Un QR pour l'entrée, un par activité.

⚠ Ne change plus l'`id` d'une activité une fois ses QR codes imprimés.

## Le jour J

- **Espace équipe** : `<adresse>/#/equipe` (code dans `config.js`, `codeEquipe`).
  - **Impression** : chaque inscription arrive en direct. Touche le matricule, le prénom ou le nom pour le copier, colle-le dans le template Canva, imprime, puis « Marquer imprimée ».
  - **Sortie** : cherche le visiteur par matricule ou nom. Sa fiche indique son rôle et le repère de l'autocollant. « Carte remise » une fois donnée. Si son téléphone a lâché, « Rendre le verdict » calcule le rôle à sa place.
- **Visiteur qui change de téléphone** : lien « J'ai déjà un dossier » (matricule + nom).
- **Matricule déjà pris** : l'appli demande au visiteur d'en choisir un autre.

## Après le forum

Vider les données : dernière ligne de `supabase.sql` (`truncate …`). La base contient les noms des visiteurs : supprime-les une fois l'événement terminé.

## Sécurité, en clair

Le code équipe protège l'écran, pas la base : quelqu'un de très motivé pourrait lire la liste des prénoms/noms avec la clé publique. C'est acceptable pour une journée de forum, à condition de vider la base ensuite.
