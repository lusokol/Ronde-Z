// Gestionnaire de Rondes - Script Principal
// ==========================================

// Configuration et initialisation
const API_KEY_DEFAULT = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjIyM2MzN2UyOWQ4ZDRhMDJiMjU5OTI5ZjVjY2QyODI1IiwiaCI6Im11cm11cjY0In0='; // Clé API par défaut
const API_KEY_STORAGE = 'ors_api_key';
const POINTS_STORAGE = 'ronde_points';
const FAVORITES_STORAGE = 'favorite_points';
let pointsCounter = 0;

// Éléments DOM
const apiKeyInput = document.getElementById('apiKey');
const startPointInput = document.getElementById('startPoint');
const pointsList = document.getElementById('pointsList');
const addPointBtn = document.getElementById('addPoint');
const rondeForm = document.getElementById('rondeForm');
const resultsContainer = document.getElementById('resultsContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const closeErrorBtn = document.getElementById('closeError');
const showApiHelpBtn = document.getElementById('showApiHelp');
const apiHelpContent = document.getElementById('apiHelpContent');
const toggleFavoritesBtn = document.getElementById('toggleFavorites');
const favoritesContainer = document.getElementById('favoritesContainer');
const favoritesList = document.getElementById('favoritesList');
const noFavoritesMessage = document.getElementById('noFavoritesMessage');
const favoritesSearchInput = document.getElementById('favoritesSearch');
const favoritesSortSelect = document.getElementById('favoritesSort');

// ==========================================
// Initialisation au chargement de la page
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Charger la clé API sauvegardée ou utiliser la clé par défaut
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    } else {
        apiKeyInput.value = API_KEY_DEFAULT;
        localStorage.setItem(API_KEY_STORAGE, API_KEY_DEFAULT);
    }

    // Charger les points favoris
    loadFavorites();

    // Charger les points sauvegardés
    loadSavedPoints();

    // Ajouter un point par défaut si la liste est vide
    if (pointsList.children.length === 0) {
        addPoint();
        addPoint();
    }

    // Événements
    addPointBtn.addEventListener('click', addPoint);
    rondeForm.addEventListener('submit', handleFormSubmit);
    closeErrorBtn.addEventListener('click', closeErrorModal);
    apiKeyInput.addEventListener('change', saveApiKey);
    showApiHelpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        apiHelpContent.classList.toggle('hidden');
    });
    toggleFavoritesBtn.addEventListener('click', () => {
        favoritesContainer.classList.toggle('hidden');
    });

    // Événements pour les favoris
    if (favoritesSearchInput) {
        favoritesSearchInput.addEventListener('input', filterFavorites);
    }
    if (favoritesSortSelect) {
        favoritesSortSelect.addEventListener('change', loadFavorites);
    }
});

// ==========================================
// Gestion du formulaire et des points
// ==========================================

function addPoint(pointData = null) {
    pointsCounter++;
    const pointDiv = document.createElement('div');
    pointDiv.className = 'point-item border border-gray-200 rounded-lg p-4 bg-gray-50';
    pointDiv.dataset.id = pointsCounter;

    const address = pointData?.address || '';
    // Gérer l'ancien format (time en minutes) et le nouveau format (timeHours/timeMinutes)
    let timeHours = 0;
    let timeMinutes = 10;

    if (pointData?.time !== undefined) {
        const totalMinutes = parseInt(pointData.time);
        timeHours = Math.floor(totalMinutes / 60);
        timeMinutes = totalMinutes % 60;
    }

    const name = pointData?.name || '';
    const timeConstraint = pointData?.timeConstraint || 'none';
    const constraintTime = pointData?.constraintTime || '09:00';

    pointDiv.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-semibold">
                ${pointsCounter}
            </div>
            <div class="flex-1 space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Nom du point (optionnel)</label>
                    <input type="text"
                           class="point-name w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                           placeholder="Ex: Bureau client A"
                           value="${name}">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <input type="text"
                           class="point-address w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                           placeholder="Ex: 456 Avenue des Champs, Lyon"
                           value="${address}"
                           required>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Temps sur place</label>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="flex items-center gap-2">
                            <input type="number"
                                   class="point-time-hours w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                   min="0"
                                   max="23"
                                   value="${timeHours}"
                                   placeholder="0">
                            <span class="text-xs text-gray-500">h</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="number"
                                   class="point-time-minutes w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                   min="0"
                                   max="59"
                                   value="${timeMinutes}"
                                   placeholder="0"
                                   required>
                            <span class="text-xs text-gray-500">min</span>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Contrainte horaire</label>
                    <select class="time-constraint w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            onchange="toggleTimeInput(this)">
                        <option value="none" ${timeConstraint === 'none' ? 'selected' : ''}>Aucune</option>
                        <option value="before" ${timeConstraint === 'before' ? 'selected' : ''}>Avant</option>
                        <option value="at" ${timeConstraint === 'at' ? 'selected' : ''}>À</option>
                        <option value="after" ${timeConstraint === 'after' ? 'selected' : ''}>Après</option>
                    </select>
                </div>
                <div class="constraint-time-container ${timeConstraint === 'none' ? 'hidden' : ''}">
                    <label class="block text-xs font-medium text-gray-600 mb-1">Heure de la contrainte</label>
                    <input type="time"
                           class="constraint-time w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                           value="${constraintTime}">
                </div>
                <div class="flex gap-2">
                    <button type="button"
                            class="save-favorite flex-1 px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-xs font-medium"
                            onclick="saveFavorite(this)">
                        ⭐ Sauvegarder comme favori
                    </button>
                </div>
            </div>
            <button type="button"
                    class="delete-point flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center"
                    onclick="removePoint(this)">
                ✕
            </button>
        </div>
    `;

    pointsList.appendChild(pointDiv);
    savePoints();
}

function toggleTimeInput(selectElement) {
    const pointDiv = selectElement.closest('.point-item');
    const timeContainer = pointDiv.querySelector('.constraint-time-container');

    if (selectElement.value === 'none') {
        timeContainer.classList.add('hidden');
    } else {
        timeContainer.classList.remove('hidden');
    }
}

function removePoint(button) {
    if (pointsList.children.length <= 1) {
        showError('Vous devez avoir au moins un point à visiter.');
        return;
    }
    button.closest('.point-item').remove();
    renumberPoints();
    savePoints();
}

function renumberPoints() {
    const points = pointsList.querySelectorAll('.point-item');
    points.forEach((point, index) => {
        const badge = point.querySelector('.bg-indigo-500');
        if (badge) {
            badge.textContent = index + 1;
        }
    });
}

// ==========================================
// Sauvegarde et chargement
// ==========================================

function saveApiKey() {
    localStorage.setItem(API_KEY_STORAGE, apiKeyInput.value);
}

function savePoints() {
    const points = [];
    const pointElements = pointsList.querySelectorAll('.point-item');

    pointElements.forEach(pointEl => {
        const address = pointEl.querySelector('.point-address').value;
        const timeHours = parseInt(pointEl.querySelector('.point-time-hours')?.value || 0);
        const timeMinutes = parseInt(pointEl.querySelector('.point-time-minutes')?.value || 0);
        const time = timeHours * 60 + timeMinutes;
        const name = pointEl.querySelector('.point-name').value;
        const timeConstraint = pointEl.querySelector('.time-constraint').value;
        const constraintTime = pointEl.querySelector('.constraint-time').value;

        if (address) {
            points.push({ address, time, name, timeConstraint, constraintTime });
        }
    });

    localStorage.setItem(POINTS_STORAGE, JSON.stringify(points));
}

function loadSavedPoints() {
    const savedPoints = localStorage.getItem(POINTS_STORAGE);
    if (savedPoints) {
        try {
            const points = JSON.parse(savedPoints);
            points.forEach(point => {
                addPoint(point);
            });
        } catch (e) {
            console.error('Erreur lors du chargement des points:', e);
        }
    }
}

// ==========================================
// Gestion des points favoris
// ==========================================

function saveFavorite(button) {
    const pointDiv = button.closest('.point-item');
    const name = pointDiv.querySelector('.point-name').value.trim();
    const address = pointDiv.querySelector('.point-address').value.trim();
    const timeHours = parseInt(pointDiv.querySelector('.point-time-hours')?.value || 0);
    const timeMinutes = parseInt(pointDiv.querySelector('.point-time-minutes')?.value || 0);
    const time = timeHours * 60 + timeMinutes;
    const timeConstraint = pointDiv.querySelector('.time-constraint').value;
    const constraintTime = pointDiv.querySelector('.constraint-time').value;

    if (!address) {
        showError('Veuillez entrer une adresse avant de sauvegarder comme favori.');
        return;
    }

    if (!name) {
        showError('Veuillez donner un nom au point avant de le sauvegarder comme favori.');
        return;
    }

    // Charger les favoris existants
    let favorites = [];
    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE);
    if (savedFavorites) {
        try {
            favorites = JSON.parse(savedFavorites);
        } catch (e) {
            console.error('Erreur lors du chargement des favoris:', e);
        }
    }

    // Vérifier si le favori existe déjà
    const existingIndex = favorites.findIndex(fav => fav.name === name);
    if (existingIndex !== -1) {
        if (!confirm(`Un favori avec le nom "${name}" existe déjà. Voulez-vous le remplacer ?`)) {
            return;
        }
        favorites[existingIndex] = { name, address, time, timeConstraint, constraintTime };
    } else {
        favorites.push({ name, address, time, timeConstraint, constraintTime });
    }

    // Sauvegarder
    localStorage.setItem(FAVORITES_STORAGE, JSON.stringify(favorites));

    // Recharger l'affichage des favoris
    loadFavorites();

    // Message de confirmation
    showError(`Point "${name}" sauvegardé dans les favoris !`);
}

function loadFavorites() {
    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE);
    let favorites = [];

    if (savedFavorites) {
        try {
            favorites = JSON.parse(savedFavorites);
        } catch (e) {
            console.error('Erreur lors du chargement des favoris:', e);
        }
    }

    favoritesList.innerHTML = '';

    if (favorites.length === 0) {
        noFavoritesMessage.classList.remove('hidden');
    } else {
        noFavoritesMessage.classList.add('hidden');

        favorites.forEach((favorite, index) => {
            const favoriteCard = document.createElement('div');
            favoriteCard.className = 'favorite-card border border-indigo-200 rounded-lg p-3 bg-indigo-50 hover:bg-indigo-100 transition-colors';

            const constraintLabel = {
                'none': '',
                'before': `⏰ Avant ${favorite.constraintTime}`,
                'at': `⏰ À ${favorite.constraintTime}`,
                'after': `⏰ Après ${favorite.constraintTime}`
            }[favorite.timeConstraint];

            // Formater le temps (convertir minutes en heures + minutes)
            const totalMinutes = parseInt(favorite.time || 0);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            let timeLabel = '';
            if (hours > 0 && minutes > 0) {
                timeLabel = `${hours}h ${minutes}min`;
            } else if (hours > 0) {
                timeLabel = `${hours}h`;
            } else {
                timeLabel = `${minutes}min`;
            }

            favoriteCard.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-indigo-900 text-sm">${favorite.name}</h4>
                    <button onclick="deleteFavorite('${favorite.name}')"
                            class="text-red-500 hover:text-red-700 text-xs">
                        ✕
                    </button>
                </div>
                <p class="text-xs text-gray-600 mb-2">${favorite.address}</p>
                <div class="flex justify-between items-center text-xs">
                    <span class="text-indigo-700">⏱️ ${timeLabel}</span>
                    ${constraintLabel ? `<span class="text-orange-700">${constraintLabel}</span>` : ''}
                </div>
                <button onclick="useFavorite('${favorite.name}')"
                        class="mt-2 w-full px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-xs">
                    ➕ Utiliser
                </button>
            `;

            favoritesList.appendChild(favoriteCard);
        });
    }
}

function useFavorite(favoriteName) {
    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE);
    if (!savedFavorites) return;

    try {
        const favorites = JSON.parse(savedFavorites);
        const favorite = favorites.find(fav => fav.name === favoriteName);

        if (favorite) {
            addPoint(favorite);
        }
    } catch (e) {
        console.error('Erreur lors de l\'utilisation du favori:', e);
    }
}

function deleteFavorite(favoriteName) {
    if (!confirm(`Voulez-vous vraiment supprimer le favori "${favoriteName}" ?`)) {
        return;
    }

    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE);
    if (!savedFavorites) return;

    try {
        let favorites = JSON.parse(savedFavorites);
        favorites = favorites.filter(fav => fav.name !== favoriteName);
        localStorage.setItem(FAVORITES_STORAGE, JSON.stringify(favorites));
        loadFavorites();
    } catch (e) {
        console.error('Erreur lors de la suppression du favori:', e);
    }
}

// ==========================================
// Gestion du formulaire et calcul
// ==========================================

async function handleFormSubmit(e) {
    e.preventDefault();

    // Vérifier la clé API
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showError('Veuillez entrer votre clé API OpenRouteService.');
        return;
    }

    // Récupérer les données
    const startPoint = startPointInput.value.trim();
    const points = [];
    const pointElements = pointsList.querySelectorAll('.point-item');

    pointElements.forEach(pointEl => {
        const address = pointEl.querySelector('.point-address').value.trim();
        const timeHours = parseInt(pointEl.querySelector('.point-time-hours')?.value || 0);
        const timeMinutes = parseInt(pointEl.querySelector('.point-time-minutes')?.value || 0);
        const time = timeHours * 60 + timeMinutes; // Convertir en minutes
        const timeConstraint = pointEl.querySelector('.time-constraint').value;
        const constraintTime = pointEl.querySelector('.constraint-time').value;

        if (address) {
            points.push({
                address,
                timeOnSite: time,
                timeConstraint,
                constraintTime
            });
        }
    });

    if (points.length === 0) {
        showError('Veuillez ajouter au moins un point à visiter.');
        return;
    }

    // Afficher le chargement
    showLoading();

    try {
        // Géocoder toutes les adresses
        const allAddresses = [startPoint, ...points.map(p => p.address)];
        const coordinates = await geocodeAddresses(allAddresses, apiKey);

        // Créer la matrice de distances
        const distanceMatrix = await getDistanceMatrix(coordinates, apiKey);

        // Optimiser la route (TSP) avec contraintes horaires
        const optimizedRoute = optimizeTSP(distanceMatrix, points.length, points);

        // Calculer les détails de la route
        const routeDetails = calculateRouteDetails(
            optimizedRoute,
            distanceMatrix,
            startPoint,
            points,
            coordinates
        );

        // Afficher les résultats
        displayResults(routeDetails);

    } catch (error) {
        console.error('Erreur:', error);
        showError(error.message || 'Une erreur est survenue lors du calcul de la ronde.');
    } finally {
        hideLoading();
    }
}

// ==========================================
// API OpenRouteService
// ==========================================

async function geocodeAddresses(addresses, apiKey) {
    const coordinates = [];

    for (const address of addresses) {
        try {
            const response = await fetch(
                `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address)}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Erreur de géocodage pour "${address}". Vérifiez votre clé API.`);
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const [lon, lat] = data.features[0].geometry.coordinates;
                coordinates.push({ lon, lat, address });
            } else {
                throw new Error(`Impossible de localiser l'adresse: "${address}"`);
            }
        } catch (error) {
            throw new Error(`Erreur pour l'adresse "${address}": ${error.message}`);
        }
    }

    return coordinates;
}

async function getDistanceMatrix(coordinates, apiKey) {
    const locations = coordinates.map(coord => [coord.lon, coord.lat]);

    try {
        const response = await fetch(
            `https://api.openrouteservice.org/v2/matrix/driving-car`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                    'Content-Type': 'application/json',
                    'Authorization': apiKey
                },
                body: JSON.stringify({
                    locations: locations,
                    metrics: ['distance', 'duration'],
                    units: 'km'
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur API: ${errorData.error?.message || 'Impossible de calculer les distances'}`);
        }

        const data = await response.json();
        return {
            distances: data.distances,
            durations: data.durations
        };
    } catch (error) {
        throw new Error(`Erreur lors du calcul des distances: ${error.message}`);
    }
}

// ==========================================
// Algorithme d'optimisation TSP avec contraintes horaires
// ==========================================

function optimizeTSP(matrix, numPoints, points) {
    // Algorithme du plus proche voisin modifié avec contraintes horaires
    // Point 0 = départ/arrivée
    // Points 1 à numPoints = points à visiter

    const distances = matrix.distances;
    const durations = matrix.durations; // en secondes
    const visited = new Set([0]); // Commence au point de départ
    const route = [0];
    let current = 0;
    let currentTime = new Date(); // Heure de départ (maintenant)
    currentTime.setSeconds(0, 0); // Arrondir aux minutes

    // Visiter tous les points (sauf le point de départ)
    while (visited.size <= numPoints) {
        let best = -1;
        let bestScore = Infinity;

        // Évaluer chaque point non visité
        for (let i = 1; i <= numPoints; i++) {
            if (visited.has(i)) continue;

            const point = points[i - 1];
            const travelTime = durations[current][i] / 60; // Convertir en minutes
            const arrivalTime = new Date(currentTime.getTime() + travelTime * 60000);

            // Vérifier les contraintes horaires
            let constraintPenalty = 0;
            if (point.timeConstraint && point.timeConstraint !== 'none') {
                const [constraintHour, constraintMinute] = point.constraintTime.split(':').map(Number);
                const constraintDate = new Date(arrivalTime);
                constraintDate.setHours(constraintHour, constraintMinute, 0, 0);

                if (point.timeConstraint === 'before') {
                    // Doit arriver avant l'heure spécifiée
                    if (arrivalTime > constraintDate) {
                        constraintPenalty = 10000; // Pénalité très élevée si impossible
                    }
                } else if (point.timeConstraint === 'at') {
                    // Doit arriver à l'heure spécifiée (±15 min de tolérance)
                    const diff = Math.abs(arrivalTime - constraintDate) / 60000; // en minutes
                    if (diff > 15) {
                        constraintPenalty = diff * 10; // Pénalité proportionnelle
                    }
                } else if (point.timeConstraint === 'after') {
                    // Doit arriver après l'heure spécifiée
                    if (arrivalTime < constraintDate) {
                        constraintPenalty = 10000; // Pénalité très élevée si impossible
                    }
                }
            }

            // Score = distance + pénalité contrainte
            const score = distances[current][i] + constraintPenalty;

            if (score < bestScore) {
                bestScore = score;
                best = i;
            }
        }

        if (best !== -1) {
            visited.add(best);
            route.push(best);

            // Mettre à jour le temps actuel
            const travelTime = durations[current][best] / 60; // en minutes
            currentTime = new Date(currentTime.getTime() + travelTime * 60000);
            // Ajouter le temps sur place
            const point = points[best - 1];
            currentTime = new Date(currentTime.getTime() + point.timeOnSite * 60000);

            current = best;
        } else {
            break;
        }
    }

    // Retour au point de départ
    route.push(0);

    return route;
}

// ==========================================
// Calcul des détails de la route
// ==========================================

function calculateRouteDetails(route, matrix, startPoint, points, coordinates) {
    const steps = [];
    let totalDistance = 0;
    let totalTravelTime = 0;
    let totalOnSiteTime = 0;
    let currentTime = new Date();
    currentTime.setSeconds(0, 0);

    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];

        const distance = matrix.distances[from][to];
        const duration = matrix.durations[from][to] / 60; // Convertir en minutes

        totalDistance += distance;
        totalTravelTime += duration;

        // Calculer l'heure d'arrivée
        currentTime = new Date(currentTime.getTime() + duration * 60000);

        let fromAddress, toAddress, onSiteTime = 0, pointData = null;

        if (from === 0) {
            fromAddress = startPoint;
        } else {
            fromAddress = points[from - 1].address;
            onSiteTime = points[from - 1].timeOnSite;
            totalOnSiteTime += onSiteTime;
        }

        if (to === 0) {
            toAddress = startPoint;
        } else {
            toAddress = points[to - 1].address;
            pointData = points[to - 1];
        }

        steps.push({
            stepNumber: i + 1,
            from: fromAddress,
            to: toAddress,
            distance: distance.toFixed(2),
            travelTime: duration.toFixed(0),
            onSiteTime: onSiteTime,
            arrivalTime: new Date(currentTime),
            pointData: pointData,
            coordinates: {
                from: coordinates[from],
                to: coordinates[to]
            }
        });

        // Ajouter le temps sur place pour le prochain calcul
        if (to !== 0 && pointData) {
            currentTime = new Date(currentTime.getTime() + pointData.timeOnSite * 60000);
        }
    }

    return {
        steps,
        totalDistance: totalDistance.toFixed(2),
        totalTravelTime: totalTravelTime.toFixed(0),
        totalOnSiteTime,
        totalTime: (totalTravelTime + totalOnSiteTime).toFixed(0)
    };
}

// ==========================================
// Affichage des résultats
// ==========================================

function displayResults(routeDetails) {
    const { steps, totalDistance, totalTravelTime, totalOnSiteTime, totalTime } = routeDetails;

    let html = `
        <!-- Statistiques globales -->
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="stat-card">
                <div class="stat-value">⏱️ ${totalTime}</div>
                <div class="stat-label">minutes au total</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">🚗 ${totalDistance}</div>
                <div class="stat-label">km de trajet</div>
            </div>
        </div>

        <!-- Détails -->
        <div class="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-blue-900 mb-2">📋 Résumé</h3>
            <div class="text-sm text-blue-800 space-y-1">
                <p>🚗 Temps de trajet: <strong>${totalTravelTime} min</strong></p>
                <p>📍 Temps sur place: <strong>${totalOnSiteTime} min</strong></p>
                <p>🎯 Nombre d'arrêts: <strong>${steps.length - 1}</strong></p>
            </div>
        </div>

        <!-- Itinéraire détaillé -->
        <div>
            <h3 class="font-semibold text-gray-800 mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
                Itinéraire optimisé
            </h3>
            <div class="space-y-4">
    `;

    steps.forEach((step, index) => {
        const isLastStep = index === steps.length - 1;
        const isFirstStep = index === 0;

        // Formater l'heure d'arrivée
        const arrivalTimeStr = step.arrivalTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        // Vérifier les contraintes
        let constraintHTML = '';
        let constraintStatus = '';
        if (step.pointData && step.pointData.timeConstraint && step.pointData.timeConstraint !== 'none') {
            const constraint = step.pointData.timeConstraint;
            const constraintTime = step.pointData.constraintTime;
            const [constraintHour, constraintMinute] = constraintTime.split(':').map(Number);
            const constraintDate = new Date(step.arrivalTime);
            constraintDate.setHours(constraintHour, constraintMinute, 0, 0);

            let isRespected = true;
            let constraintLabel = '';

            if (constraint === 'before') {
                constraintLabel = `Avant ${constraintTime}`;
                isRespected = step.arrivalTime <= constraintDate;
            } else if (constraint === 'at') {
                constraintLabel = `À ${constraintTime}`;
                const diff = Math.abs(step.arrivalTime - constraintDate) / 60000;
                isRespected = diff <= 15;
            } else if (constraint === 'after') {
                constraintLabel = `Après ${constraintTime}`;
                isRespected = step.arrivalTime >= constraintDate;
            }

            constraintHTML = `
                <span class="px-3 py-1 ${isRespected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} rounded-full font-medium text-xs">
                    ${isRespected ? '✓' : '⚠️'} ${constraintLabel}
                </span>
            `;
        }

        html += `
            <div class="result-card border-l-4 ${isLastStep ? 'border-green-500' : 'border-indigo-500'} bg-white p-4 rounded-lg shadow-sm">
                <div class="flex items-start gap-3">
                    <div class="step-badge">${step.stepNumber}</div>
                    <div class="flex-1">
                        <div class="mb-2">
                            <div class="text-xs text-gray-500 mb-1">
                                ${isFirstStep ? '🏁 Départ' : isLastStep ? '🏁 Retour' : '📍 Étape'} de:
                            </div>
                            <div class="font-medium text-gray-800">${step.from}</div>
                        </div>
                        <div class="mb-3">
                            <div class="text-xs text-gray-500 mb-1">Vers:</div>
                            <div class="font-medium text-gray-800">${step.to}</div>
                        </div>
                        ${!isLastStep ? `
                            <div class="mb-2 text-sm">
                                <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                                    🕐 Arrivée: ${arrivalTimeStr}
                                </span>
                            </div>
                        ` : ''}
                        <div class="flex flex-wrap gap-2 text-sm">
                            <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                🚗 ${step.distance} km
                            </span>
                            <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                                ⏱️ ${step.travelTime} min
                            </span>
                            ${step.onSiteTime > 0 ? `
                                <span class="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-medium">
                                    📍 ${step.onSiteTime} min sur place
                                </span>
                            ` : ''}
                            ${constraintHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>

        <!-- Bouton d'export -->
        <div class="mt-6 flex gap-3">
            <button onclick="printResults()" class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                🖨️ Imprimer
            </button>
            <button onclick="exportToText()" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                📄 Exporter en texte
            </button>
        </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('fade-in');
}

// ==========================================
// Fonctions utilitaires
// ==========================================

function showLoading() {
    resultsContainer.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.remove('hidden');
}

function closeErrorModal() {
    errorModal.classList.add('hidden');
}

// Fermer la modal en cliquant à l'extérieur
errorModal.addEventListener('click', (e) => {
    if (e.target === errorModal) {
        closeErrorModal();
    }
});

// ==========================================
// Export et impression
// ==========================================

function printResults() {
    window.print();
}

function exportToText() {
    const steps = resultsContainer.querySelectorAll('.result-card');
    let text = '═══════════════════════════════════════════\n';
    text += '       ITINÉRAIRE DE RONDE OPTIMISÉ\n';
    text += '═══════════════════════════════════════════\n\n';

    // Extraire les statistiques
    const stats = resultsContainer.querySelectorAll('.stat-card');
    if (stats.length >= 2) {
        const totalTime = stats[0].querySelector('.stat-value').textContent.trim();
        const totalDistance = stats[1].querySelector('.stat-value').textContent.trim();
        text += `⏱️  Temps total: ${totalTime}\n`;
        text += `🚗 Distance totale: ${totalDistance}\n`;
    }

    text += '\n───────────────────────────────────────────\n';
    text += 'ITINÉRAIRE DÉTAILLÉ\n';
    text += '───────────────────────────────────────────\n\n';

    steps.forEach((step, index) => {
        const stepNumber = step.querySelector('.step-badge').textContent;
        const fromEl = step.querySelectorAll('.font-medium')[0];
        const toEl = step.querySelectorAll('.font-medium')[1];
        const from = fromEl ? fromEl.textContent : '';
        const to = toEl ? toEl.textContent : '';

        const badges = step.querySelectorAll('.px-3');
        const distance = badges[0] ? badges[0].textContent.trim() : '';
        const time = badges[1] ? badges[1].textContent.trim() : '';
        const onSite = badges[2] ? badges[2].textContent.trim() : '';

        text += `Étape ${stepNumber}\n`;
        text += `  De: ${from}\n`;
        text += `  Vers: ${to}\n`;
        text += `  ${distance}\n`;
        text += `  ${time}\n`;
        if (onSite) {
            text += `  ${onSite}\n`;
        }
        text += '\n';
    });

    text += '═══════════════════════════════════════════\n';
    text += `Généré le ${new Date().toLocaleString('fr-FR')}\n`;
    text += '═══════════════════════════════════════════\n';

    // Télécharger le fichier
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ronde-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
