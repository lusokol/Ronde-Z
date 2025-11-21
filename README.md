# 🔄 Gestionnaire de Rondes - Optimisation de Trajet

Un outil web moderne et intuitif pour optimiser vos rondes de travail (patrouilles, inspections, livraisons, etc.). L'application calcule automatiquement le meilleur ordre de passage pour minimiser votre temps de trajet.

## 🎯 Fonctionnalités

- ✅ **Interface moderne et responsive** - Fonctionne sur ordinateur, tablette et mobile
- ✅ **Optimisation automatique** - Calcule l'ordre optimal de passage des points (algorithme TSP)
- ✅ **Calcul précis** - Utilise les données réelles de distance et temps de trajet
- ✅ **Gestion du temps sur place** - Prend en compte le temps passé à chaque point
- ✅ **Export des résultats** - Imprimez ou exportez votre itinéraire en fichier texte
- ✅ **Sauvegarde automatique** - Vos données sont conservées dans le navigateur
- ✅ **Utilisation gratuite** - Powered by OpenRouteService API

## 📋 Prérequis

### Obtenir une clé API OpenRouteService (GRATUIT)

L'application utilise l'API OpenRouteService pour calculer les distances et temps de trajet. Vous devez obtenir une clé API gratuite :

1. **Créez un compte** sur [https://openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)

2. **Confirmez votre email** - Vérifiez votre boîte de réception et confirmez votre adresse email

3. **Connectez-vous** et accédez à votre tableau de bord

4. **Créez un token API** :
   - Cliquez sur "Request a Token"
   - Donnez un nom à votre token (ex: "Gestionnaire de Rondes")
   - Cliquez sur "CREATE TOKEN"

5. **Copiez votre clé API** - Elle ressemble à : `5b3ce3597851110001cf6248xxxxxxxxxxxxx`

### Limites du plan gratuit

- ✅ 2000 requêtes par jour
- ✅ 40 requêtes par minute
- ✅ Suffisant pour un usage professionnel normal

## 🚀 Installation et lancement

### Option 1 : Ouverture directe (Recommandé)

1. **Téléchargez** tous les fichiers du projet :
   ```
   index.html
   style.css
   script.js
   README.md
   ```

2. **Double-cliquez** sur `index.html`

3. Le site s'ouvrira dans votre navigateur par défaut

### Option 2 : Serveur local (pour développement)

Si vous avez Python installé :

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Puis ouvrez [http://localhost:8000](http://localhost:8000) dans votre navigateur.

Avec Node.js et npx :

```bash
npx http-server
```

## 📖 Guide d'utilisation

### 1️⃣ Configuration initiale

1. **Entrez votre clé API** dans le champ jaune en haut de page
2. La clé sera **automatiquement sauvegardée** dans votre navigateur
3. Vous n'aurez plus à la rentrer lors de vos prochaines visites

### 2️⃣ Définir votre ronde

1. **Point de départ/arrivée** : Entrez l'adresse de votre base ou point de départ
   - Exemple : "123 Rue de la République, Lyon"

2. **Ajoutez des points** : Cliquez sur "➕ Ajouter un point"
   - **Adresse** : Entrez l'adresse complète du point à visiter
   - **Temps sur place** : Indiquez combien de minutes vous passez à cet endroit
   - Exemple : 15 minutes pour une inspection

3. **Supprimez des points** : Cliquez sur le bouton rouge ✕ à droite du point

### 3️⃣ Générer l'itinéraire optimal

1. Cliquez sur **"🚀 Générer la ronde optimale"**

2. L'application va :
   - 📍 Géolocaliser toutes vos adresses
   - 🧮 Calculer les distances entre tous les points
   - 🎯 Trouver l'ordre optimal de passage
   - ⏱️ Estimer le temps total de votre ronde

3. Les résultats s'affichent dans la colonne de droite

### 4️⃣ Comprendre les résultats

#### Statistiques globales
- **⏱️ Temps total** : Durée totale de la ronde (trajet + temps sur place)
- **🚗 Distance totale** : Kilomètres totaux à parcourir

#### Résumé détaillé
- **Temps de trajet** : Temps passé en déplacement
- **Temps sur place** : Temps cumulé sur tous les points
- **Nombre d'arrêts** : Nombre de points à visiter

#### Itinéraire étape par étape

Chaque étape affiche :
- 📍 **Numéro de l'étape**
- 📌 **De** : Point de départ de cette portion
- 📌 **Vers** : Point d'arrivée de cette portion
- 🚗 **Distance** : En kilomètres
- ⏱️ **Temps de trajet** : En minutes
- 📍 **Temps sur place** : Si applicable

### 5️⃣ Exporter vos résultats

Deux options disponibles :

1. **🖨️ Imprimer** : Créez un PDF ou imprimez directement
2. **📄 Exporter en texte** : Téléchargez un fichier .txt avec tous les détails

## 💡 Conseils d'utilisation

### Pour des adresses précises

- ✅ **Utilisez des adresses complètes** : "123 Avenue Victor Hugo, 69002 Lyon"
- ✅ **Incluez le code postal** quand possible
- ✅ **Évitez les abréviations** : "Avenue" au lieu de "Av."
- ❌ **Évitez les descriptions vagues** : "près de la gare"

### Pour optimiser vos rondes

- 🔄 **Testez plusieurs configurations** - Ajoutez/retirez des points pour voir l'impact
- ⏰ **Ajustez les temps sur place** - Soyez réaliste pour avoir une estimation précise
- 📱 **Sauvegardez l'export** - Gardez une copie de votre itinéraire pour référence
- 🗺️ **Vérifiez sur une carte** - Confirmez que l'itinéraire proposé est pratique

### Pour de meilleures performances

- ⚡ **Limitez à 15-20 points** - Au-delà, les calculs peuvent être longs
- 🌐 **Connexion internet requise** - L'app a besoin d'accéder à l'API
- 🔐 **Protégez votre clé API** - Ne la partagez pas publiquement

## 🛠️ Technologies utilisées

- **HTML5** - Structure de la page
- **CSS3** + **Tailwind CSS** - Design moderne et responsive
- **JavaScript (Vanilla)** - Logique applicative
- **OpenRouteService API** - Géocodage et calcul de distances
- **Algorithme TSP** - Optimisation nearest neighbor pour le calcul d'itinéraire

## 📁 Structure du projet

```
ronde-z/
│
├── index.html          # Page principale de l'application
├── style.css           # Styles personnalisés et animations
├── script.js           # Logique JavaScript et algorithmes
└── README.md           # Documentation (ce fichier)
```

## ⚙️ Fonctionnement technique

### Algorithme d'optimisation

L'application utilise l'algorithme du **plus proche voisin** (Nearest Neighbor) pour résoudre le problème du voyageur de commerce (TSP) :

1. Commence au point de départ
2. Cherche le point le plus proche non visité
3. Se déplace vers ce point
4. Répète jusqu'à avoir visité tous les points
5. Retourne au point de départ

⚠️ **Note** : Cet algorithme donne une solution rapide et efficace, mais pas nécessairement optimale à 100%. Pour 95% des cas d'usage, la solution est excellente.

### Flux de données

```
1. Utilisateur entre les adresses
   ↓
2. Géocodage (adresse → coordonnées GPS)
   ↓
3. Calcul de la matrice de distances (OpenRouteService Matrix API)
   ↓
4. Optimisation TSP (algorithme nearest neighbor)
   ↓
5. Calcul des temps et distances totaux
   ↓
6. Affichage des résultats formatés
```

### Stockage local

L'application utilise `localStorage` pour sauvegarder :
- ✅ Votre clé API (chiffrée dans le navigateur)
- ✅ Les points de votre dernière ronde

Ces données restent **uniquement sur votre ordinateur** et ne sont jamais envoyées ailleurs.

## 🔒 Sécurité et confidentialité

- 🔐 **Clé API stockée localement** - Jamais envoyée à un serveur tiers
- 🏠 **Données privées** - Vos adresses ne sont partagées qu'avec OpenRouteService
- 🌐 **Connexion HTTPS** - Toutes les requêtes API sont chiffrées
- 💾 **Pas de serveur backend** - Application 100% côté client

## ❓ Dépannage

### "Erreur de géocodage pour [adresse]"

**Causes possibles** :
- Adresse trop vague ou incorrecte
- Faute de frappe dans l'adresse
- Adresse inexistante

**Solutions** :
- Vérifiez l'orthographe
- Ajoutez plus de détails (code postal, ville)
- Testez l'adresse sur Google Maps d'abord

### "Veuillez entrer votre clé API"

**Cause** : La clé API n'est pas configurée

**Solution** : Entrez votre clé API OpenRouteService dans le champ jaune en haut de page

### "Erreur API : [message]"

**Causes possibles** :
- Clé API invalide ou expirée
- Quota d'utilisation dépassé (2000 requêtes/jour)
- Problème de connexion internet

**Solutions** :
- Vérifiez que votre clé API est correcte
- Attendez quelques minutes si le quota est dépassé
- Vérifiez votre connexion internet

### Résultats incohérents

**Cause** : Adresses ambiguës (ex: "Main Street" existe dans plusieurs villes)

**Solution** : Soyez plus précis dans vos adresses (incluez ville et code postal)

### L'application est lente

**Causes possibles** :
- Trop de points (>20)
- Connexion internet lente

**Solutions** :
- Réduisez le nombre de points
- Divisez en plusieurs rondes
- Vérifiez votre connexion

## 📞 Support et questions

### Problèmes avec l'API OpenRouteService
Consultez la documentation officielle : [https://openrouteservice.org/dev/#/api-docs](https://openrouteservice.org/dev/#/api-docs)

### Bugs ou suggestions
Ouvrez une issue sur le dépôt GitHub du projet

## 📄 Licence

Ce projet est fourni "tel quel" à des fins d'utilisation professionnelle.

## 🙏 Remerciements

- **OpenRouteService** - Pour l'API de géocodage et de calcul d'itinéraire
- **Tailwind CSS** - Pour le framework CSS
- **Communauté open source** - Pour les algorithmes et inspirations

---

**Développé avec ❤️ pour optimiser vos rondes de travail**

*Dernière mise à jour : Novembre 2025*
