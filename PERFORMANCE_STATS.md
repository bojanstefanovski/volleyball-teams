# Amélioration de l'algorithme avec les statistiques de performance

## Vue d'ensemble

L'algorithme de génération d'équipes a été amélioré pour intégrer les statistiques de performance historiques des joueurs basées sur leurs victoires et défaites lors des séances précédentes.

## Comment ça fonctionne

### 1. Collecte des statistiques

Une nouvelle query Convex `getPerformanceStats` récupère pour chaque joueur :
- **Winrate** : Pourcentage de victoires (0.0 à 1.0)
- **Matchs joués** : Nombre total de matchs disputés

### 2. Calcul du facteur de performance

Pour chaque joueur ayant joué au moins 3 matchs :
- Le winrate est converti en un facteur de performance
- Un winrate de 50% (0.5) = facteur neutre (0)
- Un winrate de 100% (1.0) = facteur positif maximal (+1)
- Un winrate de 0% (0.0) = facteur négatif maximal (-1)

### 3. Ajustement du score

Le score de base du joueur (calculé à partir de ses compétences) est multiplié par :
```
performanceFactor = 1 + (performanceWeight × performanceBonus)
```

Où :
- `performanceWeight` : Poids configurable (0 à 1, défaut 0.2 = 20%)
- `performanceBonus` : (winrate - 0.5) × 2, qui donne une valeur entre -1 et +1

### 4. Exemple concret

**Joueur A** :
- Score de base : 100
- Winrate : 70% (0.7)
- Performance weight : 0.2 (20%)

Calcul :
- performanceBonus = (0.7 - 0.5) × 2 = 0.4
- performanceFactor = 1 + (0.2 × 0.4) = 1.08
- Score ajusté = 100 × 1.08 = 108

**Joueur B** :
- Score de base : 100
- Winrate : 30% (0.3)
- Performance weight : 0.2 (20%)

Calcul :
- performanceBonus = (0.3 - 0.5) × 2 = -0.4
- performanceFactor = 1 + (0.2 × -0.4) = 0.92
- Score ajusté = 100 × 0.92 = 92

## Configuration

### Dans le générateur d'équipes

Un nouveau contrôle "Poids perf. (0..1)" permet d'ajuster l'influence des statistiques :
- **0** : Ignore complètement les statistiques de performance
- **0.2** (défaut) : Influence modérée (20%)
- **0.5** : Influence forte (50%)
- **1.0** : Influence maximale (100%)

### Dans le classement des joueurs

Le même contrôle "perfWeight (0..1)" est disponible dans l'onglet Admin pour ajuster le classement.

## Avantages

1. **Équilibrage dynamique** : Les joueurs qui gagnent souvent sont considérés plus forts, même si leurs compétences de base sont similaires
2. **Apprentissage continu** : L'algorithme s'améliore au fil des séances
3. **Flexibilité** : Le poids peut être ajusté selon les préférences
4. **Seuil de fiabilité** : Seuls les joueurs avec 3+ matchs sont ajustés, évitant les biais sur petits échantillons

## Limitations

- Les joueurs avec moins de 3 matchs gardent un facteur neutre (0.5)
- Les statistiques sont globales (pas par type de terrain ou adversaire)
- Le système ne distingue pas les victoires faciles des victoires difficiles

## Fichiers modifiés

1. **convex/playerStats.ts** : Nouvelle query `getPerformanceStats`
2. **scripts/voley_teams.ts** : 
   - Ajout du type `PerformanceStats`
   - Modification de `playerVectorStrength` pour intégrer les stats
   - Ajout des paramètres `performanceStats` et `performanceWeight`
3. **components/player-picker/index.tsx** : Intégration des stats dans la génération
4. **components/admin/ranking-list.tsx** : Intégration des stats dans le classement
