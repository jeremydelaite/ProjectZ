# ProjectZ — Carnet de bord

> Journal de développement. Une entrée par session de travail : ce qui a été fait,
> les commits, et où reprendre.
---

## Vue d'ensemble

**ProjectZ** : jeu de tir en vue isométrique dans un navigateur (Phaser + TypeScript + Vite).
Un soldat repousse des vagues de zombies dans un village des Ardennes, hiver 1944.
Boucle : tuer → gagner des points → acheter (armes, zones) → survivre aux manches suivantes.

**Lancer le jeu** : `npm install` puis `npm run dev`
**Contrôles** : ZQSD bouger · souris viser · clic tirer · R recharger · E déblayer

### Architecture actuelle

```
src/
├── config/
│   ├── game.config.ts      # Config Phaser (1280×720, arcade physics)
│   ├── map.config.ts       # Géométrie de la map : murs, vitraux, débris, spawns
│   └── zombies.config.ts   # Stats Fantassin, points, formules de scaling
├── entities/
│   ├── Player.ts           # ZQSD, visée souris, tir, PV, rechargement
│   ├── Bullet.ts           # Projectile simple
│   └── Zombie.ts           # Fantassin : poursuite (A* + ligne de vue), attaque
├── systems/
│   ├── RoundManager.ts     # Cycle manche → accalmie → manche suivante
│   └── Pathfinding.ts      # A* sur grille 32 px + ligne de vue
├── world/
│   └── VillageMap.ts       # Construction de la map (placeholder rectangles)
└── scenes/
    ├── BootScene.ts
    └── GameScene.ts        # Orchestration : collisions, HUD, interactions
```

---

## Journal

### Session 1 — Fondations (commits `21f5cfc`, `439a6ed`)
- Setup Phaser + Vite + TypeScript
- **Joueur** : déplacement ZQSD (AZERTY), rotation vers la souris, tir au clic,
  PV avec barre de vie, game over

### Session 2 — Le Fantassin et les manches (11-12/06/2026)

**Zombie Fantassin** (`f155d78`) — le zombie de base, conforme à l'issue #4 :
- 50 PV (manche 1), vitesse 60 (joueur : 200), 20 dégâts au contact (cooldown 1 s)
- Points style COD : 10 par balle qui touche, 50 par kill
- Visuel placeholder feldgrau + casque + yeux rouges

**Système de manches** (`ffa1f4d`) :
- `nbZombies = 0.15·m² + 4·m + 6` (manche 1 ≈ 10, manche 10 ≈ 61)
- PV : +10 %/manche jusqu'à la 10, puis ×1,05 exponentiel (rend l'amélioration
  d'armes obligatoire à terme)
- Accalmie de 5 s entre les manches, annonce « MANCHE X », plafond 24 zombies à l'écran

**Rechargement** (`c3365be`) :
- Réserve illimitée, chargeur 8 balles, recharge 1,5 s (auto à vide ou touche R)
- Barre de progression sous le joueur, HUD munitions

### Session 3 — La map et l'église de départ (12/06/2026)

**Map village v1** (`faed46e`) : 2560×1440 avec scrolling, enceinte percée de
4 brèches, maisons en ruine, place du marché, carcasse de char, barricades.

**Église de départ + pathfinding A*** (`d87101a`) :
- Le joueur démarre devant l'autel ; l'église est la salle de départ style COD Zombies
- **3 vitraux brisés** : les zombies entrent par là, le joueur ne passe pas,
  les balles passent (on tire à travers)
- **2 sorties bloquées par des débris** déblayables à la touche E pour **750 pts**
  chacune : porte principale (sud → place du marché) et mur effondré (est)
- **Pathfinding A*** sur grille 32 px : chasse directe à vue, sinon contournement
  propre des murs (fini le frottement) ; déblayer un passage l'ouvre aussi aux zombies

**Église ×1,5 + rythme de début** (`977dca3`) :
- Intérieur agrandi à 900×660, 4 colonnes en carré pour les trains de zombies
- Cadence de spawn progressive : 2,8 s entre zombies en manche 1, −0,3 s par
  manche, plancher 1 s (manche 7+)

**IA, perforation et lisibilité** (`05f61f2`) :
- **Anti-coincement v2** : la ligne de vue devient « épaisse » (3 rayons sur la
  largeur du corps) — un zombie ne fonce en ligne droite que si tout son corps
  passe sans accrocher un coin. Bloqué contre un mur → recalcul de chemin
  immédiat. Corps physique réduit à 24 px.
- **Balles perforantes** : une balle traverse jusqu'à 3 zombies — 100 % de
  dégâts sur le 1er, 75 % sur le 2e, 50 % sur le 3e (réglable dans `Bullet.ts`).
  Récompense les alignements de trains.
- **Compteur de manche** : « Manche X — N restants » en haut à droite
  (« accalmie » entre les manches).

**Correctif majeur : hitbox centrées + séparation douce** :
- Les corps physiques des Containers Phaser étaient ancrés sur l'origine au lieu
  d'être centrés → hitbox décalées d'une demi-largeur en bas-à-droite (visible
  en debug). C'était LA cause des frottements et des zombies enfoncés dans les
  murs. Corrigé avec `setOffset(-w/2, -h/2)` sur joueur et zombies.
- Collisions zombie-zombie remplacées par une séparation douce : ils se
  contournent au lieu de se bloquer mutuellement dans les vitraux.
- Le jitter de spawn est revalidé contre la grille : plus de spawn dans un mur.

**IA v3 — décisions de design actées avec Jerem** :
- **Convergence pure style COD** (pas d'encerclement) : tous les zombies visent
  exactement le joueur → les trains restent un outil de jeu (synergie perforation).
- **Joueur inaccessible → détour le plus court** : si la cellule du joueur est
  « bloquée » (collé à un mur/débris), l'A* vise la cellule libre la plus proche.
  S'il n'existe AUCUN chemin, le zombie s'arrête et retente (il ne presse plus
  jamais un obstacle). C'était la cause des tas de zombies contre les débris.
- Virages lissés (plus de demi-tours secs), repath si le joueur s'est déplacé
  de +64 px, détecteur d'enlisement (bloqué ~600 ms → chemin jeté, recalcul,
  impulsion latérale pour se décoller).

### Session 4 — Étape 5 : le système d'armes

**Décisions de design actées avec Jerem** :
- Pas de wall-buy à la COD ni de caisse mystère (jamais) → **emplacements
  thématiques** : chaque arme a SA place dans le village, achat à la touche E
- Passage en vue isométrique : reporté à la phase direction artistique (la
  logique top-down actuelle reste valable, l'iso est une couche de rendu)

**Système d'armes** (`src/config/weapons.config.ts`, refonte `Player.ts`) :
- 2 armes max : MAS 1935A (toujours sur soi) + une arme principale — touche
  **A** pour changer, achat = remplace l'arme principale
- Semi-auto (un clic = un tir) vs full-auto (clic maintenu) selon l'arme
- Portée par arme (durée de vie des balles), gerbe de plombs pour le fusil

| Arme | Dégâts | Chargeur | Prix | Emplacement |
|---|---|---|---|---|
| MAS 1935A | 15 | 8 | départ | — |
| Double canon | 8×10 (gerbe) | 2 | 750 | la ferme (maison SO) |
| MAS 40 | 50 | 10 | 1 200 | église, près de l'autel |
| MAS 38 | 20 (full auto) | 32 | 1 500 | maison barricadée est |
| FM 24/29 | 40 (full auto) | 25 | 3 000 | carcasse de char |

- Caisses en bois visibles sur la map, prompt « E — Acheter », interaction
  unifiée avec les débris ; HUD : nom de l'arme + munitions

**Raffinements (retours de test)** :
- **Vitesse selon l'arme portée** : pistolet 100 %, double canon/MAS 38 95 %,
  MAS 40 92 %, FM 24/29 80 % — sortir le pistolet pour fuir devient un réflexe
- **Règles d'achat** : l'achat échange l'arme TENUE. Le MAS 1935A n'est pas
  échangeable → si on le tient avec une principale déjà sur soi, l'achat est
  bloqué avec un message explicite (« passe sur ton arme principale (A) »)
- **Catégorie affichée partout** (armes peu connues du grand public) :
  « MAS 38 — Mitraillette », « FM 24/29 — Fusil-mitrailleur »… dans les prompts
  d'achat et le HUD

**Économie de munitions** :
- Le pistolet garde sa réserve illimitée (arme de secours) ; les armes achetées
  ont une **réserve limitée** : double canon 10 chargeurs, MAS 40 6, MAS 38 4,
  FM 24/29 4 — réglable dans `weapons.config.ts`
- **Recharge automatique** dès que le chargeur tombe à 0 (si réserve dispo)
- La caisse d'une arme possédée vend la **recharge complète : 500 pts** ;
  « munitions pleines » si rien à racheter — HUD : `8/8 | ∞` ou `12/32 | 96`

---

## État actuel — où on en est

✅ Joueur complet (déplacement, tir, PV, rechargement)
✅ Fantassin avec pathfinding A*
✅ Manches avec scaling (zombies + PV) et cadence progressive
✅ Map village + grande église de départ, vitraux, 2 sorties à déblayer (750 pts)
✅ Points, kills, HUD, game over avec score

**Décision en cours** : on garde UNIQUEMENT le Fantassin pour l'instant.
Coureur, Pionnier et Gazé viendront plus tard.

## Prochaines étapes

1. Équilibrage en jeu (armes, prix, cadences, scaling) au fil des tests
2. Plus tard : autres types de zombies, récompenses de manche (tous les 5 niveaux),
   amélioration d'armes (atelier d'armurier), vue isométrique + vrais assets
   graphiques (chantier DA)
4. revoir les collisions des zombies.

## Points de réglage rapides

| Quoi | Où |
|---|---|
| Stats Fantassin, points, scaling, cadence spawn | `src/config/zombies.config.ts` |
| Géométrie map, prix des débris, spawns | `src/config/map.config.ts` |
| Stats et prix des 5 armes | `src/config/weapons.config.ts` |
| Emplacements des caisses d'armes | `src/config/map.config.ts` |
| Durée d'accalmie, plafond simultané | `src/config/zombies.config.ts` |
