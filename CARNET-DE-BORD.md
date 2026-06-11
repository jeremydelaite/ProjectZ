# ProjectZ — Carnet de bord

> Journal de développement. Une entrée par session de travail : ce qui a été fait,
> les commits, et où reprendre. Specs détaillées dans les issues GitHub et les
> docs du projet Claude (mini-GDD, zombies & manches, armes).

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

1. **Étape 5 — Les armes**
   - Transformer l'arme codée en dur en vrai système d'armes : le pistolet devient
     officiellement le **MAS 1935A** (stats déjà conformes : 15 dégâts, chargeur 8)
   - Puis le **système d'achat** (specs issue #3) : double canon 750 pts,
     MAS 40 1 200, MAS 38 1 500, FM 24/29 3 000 — 2 armes max sur soi
2. Équilibrage en jeu (prix des débris, cadences, scaling) au fil des tests
3. Plus tard : autres types de zombies, récompenses de manche (tous les 5 niveaux),
   amélioration d'armes (atelier d'armurier), vrais assets graphiques

## Points de réglage rapides

| Quoi | Où |
|---|---|
| Stats Fantassin, points, scaling, cadence spawn | `src/config/zombies.config.ts` |
| Géométrie map, prix des débris, spawns | `src/config/map.config.ts` |
| Stats du pistolet (dégâts, chargeur, recharge) | `src/entities/Player.ts` |
| Durée d'accalmie, plafond simultané | `src/config/zombies.config.ts` |
