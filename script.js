// Gestionnaire de Rondes - Script Principal
// ==========================================

// Configuration et initialisation
const API_KEY_STORAGE = 'ors_api_key';
const POINTS_STORAGE = 'ronde_points';
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

// ==========================================
// Initialisation au chargement de la page
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Charger la clé API sauvegardée
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

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
});

// ==========================================
// Gestion du formulaire et des points
// ==========================================

function addPoint() {
    pointsCounter++;
    const pointDiv = document.createElement('div');
    pointDiv.className = 'point-item border border-gray-200 rounded-lg p-4 bg-gray-50';
    pointDiv.dataset.id = pointsCounter;

    pointDiv.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-semibold">
                ${pointsCounter}
            </div>
            <div class="flex-1 space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <input type="text"
                           class="point-address w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                           placeholder="Ex: 456 Avenue des Champs, Lyon"
                           required>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Temps sur place (minutes)</label>
                    <input type="number"
                           class="point-time w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                           min="0"
                           value="10"
                           required>
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
        const time = pointEl.querySelector('.point-time').value;
        if (address) {
            points.push({ address, time });
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
                addPoint();
                const lastPoint = pointsList.lastElementChild;
                lastPoint.querySelector('.point-address').value = point.address;
                lastPoint.querySelector('.point-time').value = point.time;
            });
        } catch (e) {
            console.error('Erreur lors du chargement des points:', e);
        }
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
        const time = parseInt(pointEl.querySelector('.point-time').value);

        if (address) {
            points.push({
                address,
                timeOnSite: time
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

        // Optimiser la route (TSP)
        const optimizedRoute = optimizeTSP(distanceMatrix, points.length);

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
// Algorithme d'optimisation TSP
// ==========================================

function optimizeTSP(matrix, numPoints) {
    // Algorithme du plus proche voisin (Nearest Neighbor)
    // Point 0 = départ/arrivée
    // Points 1 à numPoints = points à visiter

    const distances = matrix.distances;
    const visited = new Set([0]); // Commence au point de départ
    const route = [0];
    let current = 0;

    // Visiter tous les points (sauf le point de départ)
    while (visited.size <= numPoints) {
        let nearest = -1;
        let minDist = Infinity;

        // Trouver le point le plus proche non visité
        for (let i = 1; i <= numPoints; i++) {
            if (!visited.has(i) && distances[current][i] < minDist) {
                minDist = distances[current][i];
                nearest = i;
            }
        }

        if (nearest !== -1) {
            visited.add(nearest);
            route.push(nearest);
            current = nearest;
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

    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];

        const distance = matrix.distances[from][to];
        const duration = matrix.durations[from][to] / 60; // Convertir en minutes

        totalDistance += distance;
        totalTravelTime += duration;

        let fromAddress, toAddress, onSiteTime = 0;

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
        }

        steps.push({
            stepNumber: i + 1,
            from: fromAddress,
            to: toAddress,
            distance: distance.toFixed(2),
            travelTime: duration.toFixed(0),
            onSiteTime: onSiteTime,
            coordinates: {
                from: coordinates[from],
                to: coordinates[to]
            }
        });
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
