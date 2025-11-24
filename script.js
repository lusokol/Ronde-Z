// Gestionnaire de Rondes - Script Principal
// ==========================================

// Configuration et initialisation
const API_KEY_DEFAULT = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjIyM2MzN2UyOWQ4ZDRhMDJiMjU5OTI5ZjVjY2QyODI1IiwiaCI6Im11cm11cjY0In0='; // Clé API par défaut
const API_KEY_STORAGE = 'ors_api_key';
const POINTS_STORAGE = 'ronde_points';
const FAVORITES_STORAGE = 'favorite_points';
const COLS_STORAGE = 'cols_data';
const SECTEURS_STORAGE = 'secteurs_data';
let pointsCounter = 0;

// Variables pour la carte
let addressMap = null;
let addressMarker = null;
let geocodeTimeout = null;
let currentGeocodedData = null;

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

document.addEventListener('DOMContentLoaded', async () => {
    // Charger la clé API sauvegardée ou utiliser la clé par défaut
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    } else {
        apiKeyInput.value = API_KEY_DEFAULT;
        localStorage.setItem(API_KEY_STORAGE, API_KEY_DEFAULT);
    }

    // Charger les données depuis data.json si c'est la première visite
    await loadInitialData();

    // Charger les points favoris
    loadFavorites();

    // Charger les points sauvegardés
    loadSavedPoints();

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

    // Événements pour le filtre COL
    const colFilter = document.getElementById('colFilter');
    if (colFilter) {
        colFilter.addEventListener('change', loadFavorites);
    }
});

// ==========================================
// Chargement des données initiales
// ==========================================

async function loadInitialData() {
    try {
        // Vérifier si c'est la première visite ou si on veut forcer le chargement
        const hasLoadedBefore = localStorage.getItem('data_loaded');

        if (!hasLoadedBefore) {
            const response = await fetch('data.json');
            if (response.ok) {
                const data = await response.json();

                // Charger les COLs depuis le fichier JSON
                if (data.cols && data.cols.length > 0) {
                    localStorage.setItem(COLS_STORAGE, JSON.stringify(data.cols));
                }

                // Charger les Secteurs depuis le fichier JSON
                if (data.secteurs && data.secteurs.length > 0) {
                    localStorage.setItem(SECTEURS_STORAGE, JSON.stringify(data.secteurs));
                }

                // Charger les favoris depuis le fichier JSON
                if (data.favorites && data.favorites.length > 0) {
                    localStorage.setItem(FAVORITES_STORAGE, JSON.stringify(data.favorites));
                }

                // Marquer comme chargé
                localStorage.setItem('data_loaded', 'true');
                console.log('Données initiales chargées depuis data.json');
            }
        }
    } catch (error) {
        console.log('Pas de fichier data.json ou erreur de chargement, utilisation des données locales');
    }
}

// ==========================================
// Gestion du formulaire et des points
// ==========================================

function addPoint() {
    // Ouvrir le modal pour ajouter un point
    openAddressModal('add');
}

function addPointToList(pointData = null) {
    pointsCounter++;
    const pointDiv = document.createElement('div');
    pointDiv.className = 'point-item border border-gray-200 rounded-lg p-4 bg-gray-50';
    pointDiv.dataset.id = pointsCounter;

    const address = pointData?.address || '';
    // Gérer l'ancien format (time en minutes) et le nouveau format (timeHours/timeMinutes)
    let timeHours = 0;
    let timeMinutes = 10;

    if (pointData?.timeHours !== undefined && pointData?.timeMinutes !== undefined) {
        timeHours = pointData.timeHours;
        timeMinutes = pointData.timeMinutes;
    } else if (pointData?.time !== undefined) {
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
                            onclick="saveFavoriteFromPoint(this)">
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
                addPointToList(point);
            });
        } catch (e) {
            console.error('Erreur lors du chargement des points:', e);
        }
    }
}

// ==========================================
// Gestion des COLs et Secteurs
// ==========================================

function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCols() {
    const savedCols = localStorage.getItem(COLS_STORAGE);
    try {
        return savedCols ? JSON.parse(savedCols) : [];
    } catch (e) {
        console.error('Erreur lors du chargement des COLs:', e);
        return [];
    }
}

function getSecteurs() {
    const savedSecteurs = localStorage.getItem(SECTEURS_STORAGE);
    try {
        return savedSecteurs ? JSON.parse(savedSecteurs) : [];
    } catch (e) {
        console.error('Erreur lors du chargement des Secteurs:', e);
        return [];
    }
}

function saveCols(cols) {
    localStorage.setItem(COLS_STORAGE, JSON.stringify(cols));
}

function saveSecteurs(secteurs) {
    localStorage.setItem(SECTEURS_STORAGE, JSON.stringify(secteurs));
}

function addCOL(name) {
    const cols = getCols();
    const newCol = {
        id: generateId('col'),
        name: name
    };
    cols.push(newCol);
    saveCols(cols);
    return newCol;
}

function addSecteur(name, colId) {
    const secteurs = getSecteurs();
    const newSecteur = {
        id: generateId('sect'),
        name: name,
        colId: colId
    };
    secteurs.push(newSecteur);
    saveSecteurs(secteurs);
    return newSecteur;
}

function deleteCOL(colId) {
    // Supprimer le COL
    let cols = getCols();
    cols = cols.filter(col => col.id !== colId);
    saveCols(cols);

    // Supprimer tous les secteurs de ce COL
    let secteurs = getSecteurs();
    const secteurIds = secteurs.filter(s => s.colId === colId).map(s => s.id);
    secteurs = secteurs.filter(s => s.colId !== colId);
    saveSecteurs(secteurs);

    // Supprimer tous les favoris de ces secteurs
    let favorites = getFavorites();
    favorites = favorites.filter(fav => !secteurIds.includes(fav.secteurId));
    saveFavoritesData(favorites);
}

function deleteSecteur(secteurId) {
    // Supprimer le secteur
    let secteurs = getSecteurs();
    secteurs = secteurs.filter(s => s.id !== secteurId);
    saveSecteurs(secteurs);

    // Supprimer tous les favoris de ce secteur
    let favorites = getFavorites();
    favorites = favorites.filter(fav => fav.secteurId !== secteurId);
    saveFavoritesData(favorites);
}

function getFavorites() {
    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE);
    try {
        return savedFavorites ? JSON.parse(savedFavorites) : [];
    } catch (e) {
        console.error('Erreur lors du chargement des favoris:', e);
        return [];
    }
}

function saveFavoritesData(favorites) {
    localStorage.setItem(FAVORITES_STORAGE, JSON.stringify(favorites));
}

function getColById(colId) {
    const cols = getCols();
    return cols.find(col => col.id === colId);
}

function getSecteurById(secteurId) {
    const secteurs = getSecteurs();
    return secteurs.find(s => s.id === secteurId);
}

function getSecteursByColId(colId) {
    const secteurs = getSecteurs();
    return secteurs.filter(s => s.colId === colId);
}

function getFavoritesBySecteurId(secteurId) {
    const favorites = getFavorites();
    return favorites.filter(fav => fav.secteurId === secteurId);
}

// ==========================================
// Gestion des points favoris
// ==========================================

function saveFavoriteFromPoint(button) {
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

    // Ouvrir le modal de sélection du secteur
    showSecteurSelectionModal(name, address, time, timeConstraint, constraintTime);
}

function showSecteurSelectionModal(name, address, time, timeConstraint, constraintTime) {
    const cols = getCols();
    const secteurs = getSecteurs();

    if (cols.length === 0) {
        if (confirm('Aucun COL n\'existe. Voulez-vous en créer un maintenant ?')) {
            const colName = prompt('Nom du COL :');
            if (colName && colName.trim()) {
                const newCol = addCOL(colName.trim());
                const secteurName = prompt('Nom du Secteur :');
                if (secteurName && secteurName.trim()) {
                    const newSecteur = addSecteur(secteurName.trim(), newCol.id);
                    completeFavoriteSave(name, address, time, timeConstraint, constraintTime, newSecteur.id);
                    return;
                }
            }
        }
        return;
    }

    // Créer un modal HTML pour la sélection
    let modalHTML = `
        <div id="secteurModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Sélectionner un Secteur</h3>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">COL :</label>
                        <select id="colSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500">
                            <option value="">-- Sélectionner un COL --</option>
                            ${cols.map(col => `<option value="${col.id}">${col.name}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Secteur :</label>
                        <select id="secteurSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" disabled>
                            <option value="">-- Sélectionner d'abord un COL --</option>
                        </select>
                    </div>

                    <div class="flex gap-2 mt-6">
                        <button id="createSecteurBtn" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" disabled>
                            Créer nouveau secteur
                        </button>
                    </div>
                </div>

                <div class="flex gap-3 mt-6">
                    <button id="cancelSecteurBtn" class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                        Annuler
                    </button>
                    <button id="confirmSecteurBtn" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    `;

    // Ajouter le modal au DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // Récupérer les éléments
    const modal = document.getElementById('secteurModal');
    const colSelect = document.getElementById('colSelect');
    const secteurSelect = document.getElementById('secteurSelect');
    const createSecteurBtn = document.getElementById('createSecteurBtn');
    const cancelBtn = document.getElementById('cancelSecteurBtn');
    const confirmBtn = document.getElementById('confirmSecteurBtn');

    // Gérer le changement de COL
    colSelect.addEventListener('change', () => {
        const colId = colSelect.value;
        if (colId) {
            const colSecteurs = getSecteursByColId(colId);
            secteurSelect.disabled = false;
            secteurSelect.innerHTML = '<option value="">-- Sélectionner un Secteur --</option>' +
                colSecteurs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            createSecteurBtn.disabled = false;
        } else {
            secteurSelect.disabled = true;
            secteurSelect.innerHTML = '<option value="">-- Sélectionner d\'abord un COL --</option>';
            createSecteurBtn.disabled = true;
        }
    });

    // Gérer la création d'un nouveau secteur
    createSecteurBtn.addEventListener('click', () => {
        const colId = colSelect.value;
        if (!colId) {
            alert('Veuillez d\'abord sélectionner un COL');
            return;
        }
        const secteurName = prompt('Nom du nouveau Secteur :');
        if (secteurName && secteurName.trim()) {
            const newSecteur = addSecteur(secteurName.trim(), colId);
            // Recharger les secteurs dans le select
            const colSecteurs = getSecteursByColId(colId);
            secteurSelect.innerHTML = '<option value="">-- Sélectionner un Secteur --</option>' +
                colSecteurs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            secteurSelect.value = newSecteur.id;
        }
    });

    // Gérer l'annulation
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });

    // Gérer la confirmation
    confirmBtn.addEventListener('click', () => {
        const secteurId = secteurSelect.value;
        if (!secteurId) {
            alert('Veuillez sélectionner un Secteur');
            return;
        }
        document.body.removeChild(modalContainer);
        completeFavoriteSave(name, address, time, timeConstraint, constraintTime, secteurId);
    });

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modalContainer);
        }
    });
}

function completeFavoriteSave(name, address, time, timeConstraint, constraintTime, secteurId) {
    // Charger les favoris existants
    let favorites = getFavorites();

    // Vérifier si le favori existe déjà
    const existingIndex = favorites.findIndex(fav => fav.name === name);
    const favoriteData = {
        id: existingIndex !== -1 ? favorites[existingIndex].id : generateId('fav'),
        name,
        address,
        time,
        timeConstraint,
        constraintTime,
        secteurId
    };

    if (existingIndex !== -1) {
        if (!confirm(`Un favori avec le nom "${name}" existe déjà. Voulez-vous le remplacer ?`)) {
            return;
        }
        favorites[existingIndex] = favoriteData;
    } else {
        favorites.push(favoriteData);
    }

    // Sauvegarder
    saveFavoritesData(favorites);

    // Recharger l'affichage des favoris
    loadFavorites();

    // Message de confirmation
    showError(`Point "${name}" sauvegardé dans les favoris !`, 'success');
}

function loadFavorites() {
    const cols = getCols();
    const secteurs = getSecteurs();
    const favorites = getFavorites();

    // Mettre à jour le dropdown de filtrage
    const colFilter = document.getElementById('colFilter');
    if (colFilter) {
        const currentFilter = colFilter.value;
        colFilter.innerHTML = '<option value="all">Tous les COLs</option>';
        cols.forEach(col => {
            const option = document.createElement('option');
            option.value = col.id;
            option.textContent = col.name;
            colFilter.appendChild(option);
        });
        // Restaurer le filtre sélectionné
        if (currentFilter) {
            colFilter.value = currentFilter;
        }
    }

    favoritesList.innerHTML = '';

    if (cols.length === 0 && favorites.length === 0) {
        noFavoritesMessage.classList.remove('hidden');
        noFavoritesMessage.textContent = 'Aucun point favori enregistré. Ajoutez des points ci-dessous et cliquez sur "Sauvegarder comme favori"';
    } else {
        noFavoritesMessage.classList.add('hidden');

        // Récupérer le filtre actuel
        const selectedColId = colFilter ? colFilter.value : 'all';

        // Afficher la structure hiérarchique
        cols.forEach(col => {
            // Appliquer le filtre
            if (selectedColId !== 'all' && col.id !== selectedColId) {
                return;
            }
            const colSecteurs = getSecteursByColId(col.id);

            if (colSecteurs.length === 0 && getFavorites().filter(f => {
                const sect = getSecteurById(f.secteurId);
                return sect && sect.colId === col.id;
            }).length === 0) {
                return; // Ignorer les COLs vides
            }

            // Créer le conteneur COL
            const colDiv = document.createElement('div');
            colDiv.className = 'col-span-full mb-4';
            colDiv.innerHTML = `
                <div class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-t-lg flex justify-between items-center cursor-pointer" onclick="toggleCOL('${col.id}')">
                    <div class="flex items-center gap-2">
                        <span id="col-icon-${col.id}" class="text-white">▼</span>
                        <h3 class="font-bold text-sm">${col.name}</h3>
                    </div>
                    <div class="flex gap-2" onclick="event.stopPropagation()">
                        <button onclick="addSecteurToCOL('${col.id}')" class="px-2 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs">
                            + Secteur
                        </button>
                        <button onclick="deleteCOL('${col.id}')" class="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs">
                            Supprimer
                        </button>
                    </div>
                </div>
                <div class="border border-purple-200 rounded-b-lg p-3 bg-purple-50" id="col-${col.id}">
                </div>
            `;
            favoritesList.appendChild(colDiv);

            const colContainer = document.getElementById(`col-${col.id}`);

            // Afficher les secteurs de ce COL
            colSecteurs.forEach(secteur => {
                const secteurFavorites = getFavoritesBySecteurId(secteur.id);

                const secteurDiv = document.createElement('div');
                secteurDiv.className = 'mb-3';
                secteurDiv.innerHTML = `
                    <div class="bg-indigo-100 p-2 rounded-t flex justify-between items-center cursor-pointer" onclick="toggleSecteur('${secteur.id}')">
                        <div class="flex items-center gap-2">
                            <span id="secteur-icon-${secteur.id}" class="text-indigo-900">▼</span>
                            <h4 class="font-semibold text-indigo-900 text-xs">${secteur.name}</h4>
                        </div>
                        <button onclick="event.stopPropagation(); deleteSecteur('${secteur.id}')" class="px-2 py-1 bg-red-400 hover:bg-red-500 text-white rounded text-xs">
                            Supprimer
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-white border border-indigo-100 rounded-b" id="secteur-${secteur.id}">
                    </div>
                `;
                colContainer.appendChild(secteurDiv);

                const secteurContainer = document.getElementById(`secteur-${secteur.id}`);

                // Afficher les favoris de ce secteur
                secteurFavorites.forEach(favorite => {
                    const favoriteCard = document.createElement('div');
                    favoriteCard.className = 'favorite-card border border-indigo-200 rounded-lg p-2 bg-white hover:bg-indigo-50 transition-colors';
                    favoriteCard.dataset.name = favorite.name;
                    favoriteCard.dataset.address = favorite.address;

                    const constraintLabel = {
                        'none': '',
                        'before': `Avant ${favorite.constraintTime}`,
                        'at': `À ${favorite.constraintTime}`,
                        'after': `Après ${favorite.constraintTime}`
                    }[favorite.timeConstraint];

                    // Formater le temps
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
                        <div class="flex justify-between items-start mb-1">
                            <h5 class="font-semibold text-indigo-900 text-xs">${favorite.name}</h5>
                            <button onclick="deleteFavoriteById('${favorite.id}')"
                                    class="text-red-500 hover:text-red-700 text-xs">
                                ✕
                            </button>
                        </div>
                        <p class="text-xs text-gray-600 mb-1 truncate" title="${favorite.address}">${favorite.address}</p>
                        <div class="flex justify-between items-center text-xs mb-2">
                            <span class="text-indigo-700">${timeLabel}</span>
                            ${constraintLabel ? `<span class="text-orange-700 text-xs">${constraintLabel}</span>` : ''}
                        </div>
                        <div class="flex gap-1">
                            <button onclick="useFavoriteById('${favorite.id}')"
                                    class="flex-1 px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-xs">
                                Ajouter
                            </button>
                            <button onclick="useAsStartPoint('${favorite.id}')"
                                    class="flex-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                                    title="Utiliser comme point de départ">
                                Départ
                            </button>
                        </div>
                    `;

                    secteurContainer.appendChild(favoriteCard);
                });
            });
        });
    }
}

function useFavorite(favoriteName) {
    const favorites = getFavorites();
    const favorite = favorites.find(fav => fav.name === favoriteName);
    if (favorite) {
        addPointToList(favorite);
    }
}

function useFavoriteById(favoriteId) {
    const favorites = getFavorites();
    const favorite = favorites.find(fav => fav.id === favoriteId);
    if (favorite) {
        addPointToList(favorite);
    }
}

function useAsStartPoint(favoriteId) {
    const favorites = getFavorites();
    const favorite = favorites.find(fav => fav.id === favoriteId);
    if (favorite) {
        startPointInput.value = favorite.address;
        showError(`Point de départ défini : ${favorite.name}`, 'success');
    }
}

function deleteFavorite(favoriteName) {
    if (!confirm(`Voulez-vous vraiment supprimer le favori "${favoriteName}" ?`)) {
        return;
    }
    let favorites = getFavorites();
    favorites = favorites.filter(fav => fav.name !== favoriteName);
    saveFavoritesData(favorites);
    loadFavorites();
}

function deleteFavoriteById(favoriteId) {
    const favorites = getFavorites();
    const favorite = favorites.find(fav => fav.id === favoriteId);
    if (!favorite) return;

    if (!confirm(`Voulez-vous vraiment supprimer le favori "${favorite.name}" ?`)) {
        return;
    }
    const updatedFavorites = favorites.filter(fav => fav.id !== favoriteId);
    saveFavoritesData(updatedFavorites);
    loadFavorites();
}

function addSecteurToCOL(colId) {
    const secteurName = prompt('Nom du nouveau Secteur :');
    if (secteurName && secteurName.trim()) {
        addSecteur(secteurName.trim(), colId);
        loadFavorites();
    }
}

function createNewCOL() {
    const colName = prompt('Nom du nouveau COL :');
    if (colName && colName.trim()) {
        addCOL(colName.trim());
        loadFavorites();
        showError(`COL "${colName.trim()}" créé avec succès !`, 'success');
    }
}

function toggleCOL(colId) {
    const colContainer = document.getElementById(`col-${colId}`);
    const colIcon = document.getElementById(`col-icon-${colId}`);

    if (colContainer.classList.contains('hidden')) {
        colContainer.classList.remove('hidden');
        colIcon.textContent = '▼';
    } else {
        colContainer.classList.add('hidden');
        colIcon.textContent = '▶';
    }
}

function toggleSecteur(secteurId) {
    const secteurContainer = document.getElementById(`secteur-${secteurId}`);
    const secteurIcon = document.getElementById(`secteur-icon-${secteurId}`);

    if (secteurContainer.classList.contains('hidden')) {
        secteurContainer.classList.remove('hidden');
        secteurIcon.textContent = '▼';
    } else {
        secteurContainer.classList.add('hidden');
        secteurIcon.textContent = '▶';
    }
}

// ==========================================
// Gestion du modal d'ajout d'adresse avec carte
// ==========================================

function openAddressModal(mode = 'add', pointData = null) {
    const modal = document.getElementById('addressModal');
    const modalAddress = document.getElementById('modalAddress');
    const modalPointName = document.getElementById('modalPointName');
    const modalTimeHours = document.getElementById('modalTimeHours');
    const modalTimeMinutes = document.getElementById('modalTimeMinutes');
    const modalTimeConstraint = document.getElementById('modalTimeConstraint');
    const modalConstraintTime = document.getElementById('modalConstraintTime');
    const modalConstraintTimeContainer = document.getElementById('modalConstraintTimeContainer');
    const geocodeStatus = document.getElementById('geocodeStatus');

    // Réinitialiser le formulaire
    if (pointData) {
        modalPointName.value = pointData.name || '';
        modalAddress.value = pointData.address || '';
        modalTimeHours.value = pointData.timeHours || 0;
        modalTimeMinutes.value = pointData.timeMinutes || 10;
        modalTimeConstraint.value = pointData.timeConstraint || 'none';
        modalConstraintTime.value = pointData.constraintTime || '09:00';
    } else {
        modalPointName.value = '';
        modalAddress.value = '';
        modalTimeHours.value = 0;
        modalTimeMinutes.value = 10;
        modalTimeConstraint.value = 'none';
        modalConstraintTime.value = '09:00';
    }

    // Afficher/masquer le champ de contrainte horaire
    if (modalTimeConstraint.value === 'none') {
        modalConstraintTimeContainer.classList.add('hidden');
    } else {
        modalConstraintTimeContainer.classList.remove('hidden');
    }

    // Réinitialiser le statut de géocodage
    geocodeStatus.innerHTML = '<span class="text-gray-500">En attente de l\'adresse...</span>';
    currentGeocodedData = null;

    // Afficher le modal
    modal.classList.remove('hidden');

    // Initialiser la carte
    setTimeout(() => {
        initializeMap();
        // Si on a déjà une adresse, la géocoder
        if (modalAddress.value.trim()) {
            geocodeAddressForMap(modalAddress.value.trim());
        }
    }, 100);

    // Événements
    modalAddress.removeEventListener('input', handleAddressInput);
    modalAddress.addEventListener('input', handleAddressInput);

    modalTimeConstraint.removeEventListener('change', handleConstraintChange);
    modalTimeConstraint.addEventListener('change', handleConstraintChange);

    const closeBtn = document.getElementById('closeAddressModal');
    const cancelBtn = document.getElementById('cancelAddressModal');
    const confirmBtn = document.getElementById('confirmAddressModal');

    closeBtn.onclick = closeAddressModal;
    cancelBtn.onclick = closeAddressModal;
    confirmBtn.onclick = () => confirmAddressModal(mode);

    // Stocker le mode pour plus tard
    modal.dataset.mode = mode;
}

function initializeMap() {
    const mapContainer = document.getElementById('addressMap');

    // Détruire la carte existante si elle existe
    if (addressMap) {
        addressMap.remove();
        addressMap = null;
        addressMarker = null;
    }

    // Créer une nouvelle carte centrée sur la France
    addressMap = L.map('addressMap').setView([46.603354, 1.888334], 6);

    // Ajouter le layer de tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(addressMap);

    // Forcer un refresh de la carte
    setTimeout(() => {
        addressMap.invalidateSize();
    }, 100);
}

function handleAddressInput(e) {
    const address = e.target.value.trim();

    // Annuler le timeout précédent
    if (geocodeTimeout) {
        clearTimeout(geocodeTimeout);
    }

    if (address.length < 3) {
        document.getElementById('geocodeStatus').innerHTML = '<span class="text-gray-500">Tapez au moins 3 caractères...</span>';
        currentGeocodedData = null;
        return;
    }

    // Afficher un message de chargement
    document.getElementById('geocodeStatus').innerHTML = '<span class="text-blue-500">🔍 Recherche en cours...</span>';

    // Attendre 800ms avant de géocoder (debounce)
    geocodeTimeout = setTimeout(() => {
        geocodeAddressForMap(address);
    }, 800);
}

function handleConstraintChange(e) {
    const modalConstraintTimeContainer = document.getElementById('modalConstraintTimeContainer');
    if (e.target.value === 'none') {
        modalConstraintTimeContainer.classList.add('hidden');
    } else {
        modalConstraintTimeContainer.classList.remove('hidden');
    }
}

async function geocodeAddressForMap(address) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        document.getElementById('geocodeStatus').innerHTML = '<span class="text-red-500">⚠️ Clé API manquante</span>';
        return;
    }

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
            throw new Error('Erreur de géocodage');
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            const foundAddress = data.features[0].properties.label;

            // Sauvegarder les données géocodées
            currentGeocodedData = { lon, lat, address: foundAddress };

            // Mettre à jour la carte
            if (addressMap) {
                // Supprimer le marqueur précédent
                if (addressMarker) {
                    addressMap.removeLayer(addressMarker);
                }

                // Ajouter un nouveau marqueur
                addressMarker = L.marker([lat, lon]).addTo(addressMap);
                addressMarker.bindPopup(`<b>${foundAddress}</b>`).openPopup();

                // Centrer la carte sur le marqueur
                addressMap.setView([lat, lon], 15);
            }

            // Afficher le statut de succès
            document.getElementById('geocodeStatus').innerHTML = `<span class="text-green-600">✓ Adresse trouvée : ${foundAddress}</span>`;
        } else {
            document.getElementById('geocodeStatus').innerHTML = '<span class="text-orange-500">⚠️ Adresse non trouvée</span>';
            currentGeocodedData = null;
        }
    } catch (error) {
        console.error('Erreur de géocodage:', error);
        document.getElementById('geocodeStatus').innerHTML = '<span class="text-red-500">⚠️ Erreur de géocodage</span>';
        currentGeocodedData = null;
    }
}

function closeAddressModal() {
    const modal = document.getElementById('addressModal');
    modal.classList.add('hidden');

    // Détruire la carte
    if (addressMap) {
        addressMap.remove();
        addressMap = null;
        addressMarker = null;
    }

    // Annuler le timeout de géocodage
    if (geocodeTimeout) {
        clearTimeout(geocodeTimeout);
    }
}

function confirmAddressModal(mode) {
    const modalAddress = document.getElementById('modalAddress');
    const modalPointName = document.getElementById('modalPointName');
    const modalTimeHours = document.getElementById('modalTimeHours');
    const modalTimeMinutes = document.getElementById('modalTimeMinutes');
    const modalTimeConstraint = document.getElementById('modalTimeConstraint');
    const modalConstraintTime = document.getElementById('modalConstraintTime');

    const address = modalAddress.value.trim();

    if (!address) {
        showError('Veuillez entrer une adresse.');
        return;
    }

    // Préparer les données du point
    const pointData = {
        name: modalPointName.value.trim(),
        address: address,
        timeHours: parseInt(modalTimeHours.value) || 0,
        timeMinutes: parseInt(modalTimeMinutes.value) || 10,
        time: (parseInt(modalTimeHours.value) || 0) * 60 + (parseInt(modalTimeMinutes.value) || 10),
        timeConstraint: modalTimeConstraint.value,
        constraintTime: modalConstraintTime.value
    };

    if (mode === 'add') {
        // Ajouter le point à la liste
        addPointToList(pointData);
        showError('Point ajouté avec succès !', 'success');
    } else if (mode === 'favorite') {
        // Ouvrir le modal de sélection du secteur pour sauvegarder comme favori
        closeAddressModal();
        showSecteurSelectionModal(
            pointData.name,
            pointData.address,
            pointData.time,
            pointData.timeConstraint,
            pointData.constraintTime
        );
        return;
    }

    // Fermer le modal
    closeAddressModal();
}

// Trier les favoris
function sortFavorites(favorites, sortType) {
    const sorted = [...favorites];

    switch(sortType) {
        case 'name-asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'address-asc':
            sorted.sort((a, b) => a.address.localeCompare(b.address));
            break;
        case 'address-desc':
            sorted.sort((a, b) => b.address.localeCompare(a.address));
            break;
        case 'time-asc':
            sorted.sort((a, b) => (a.time || 0) - (b.time || 0));
            break;
        case 'time-desc':
            sorted.sort((a, b) => (b.time || 0) - (a.time || 0));
            break;
        default:
            sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
}

// Filtrer les favoris
function filterFavorites() {
    const searchTerm = favoritesSearchInput.value.toLowerCase();
    const favoriteCards = favoritesList.querySelectorAll('.favorite-card');

    let visibleCount = 0;
    favoriteCards.forEach(card => {
        const name = card.querySelector('h4').textContent.toLowerCase();
        const address = card.querySelector('p').textContent.toLowerCase();

        if (name.includes(searchTerm) || address.includes(searchTerm)) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Afficher le message si aucun résultat
    if (visibleCount === 0 && favoriteCards.length > 0) {
        noFavoritesMessage.textContent = `Aucun favori trouvé pour "${favoritesSearchInput.value}"`;
        noFavoritesMessage.classList.remove('hidden');
    } else if (favoriteCards.length === 0) {
        noFavoritesMessage.textContent = 'Aucun point favori enregistré. Ajoutez des points ci-dessous et cliquez sur "⭐ Sauvegarder comme favori"';
        noFavoritesMessage.classList.remove('hidden');
    } else {
        noFavoritesMessage.classList.add('hidden');
    }
}

// ==========================================
// Export / Import des données
// ==========================================

function exportData() {
    const data = {
        cols: getCols(),
        secteurs: getSecteurs(),
        favorites: getFavorites(),
        points: JSON.parse(localStorage.getItem(POINTS_STORAGE) || '[]'),
        exportDate: new Date().toISOString(),
        version: '2.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ronde-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showError('Données exportées avec succès !', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Valider les données
            if (!data.favorites || !Array.isArray(data.favorites)) {
                throw new Error('Format de fichier invalide');
            }

            // Construire le message de confirmation
            let confirmMsg = `Voulez-vous vraiment importer ces données ?\n\n`;
            if (data.cols) confirmMsg += `${data.cols.length} COL(s)\n`;
            if (data.secteurs) confirmMsg += `${data.secteurs.length} Secteur(s)\n`;
            confirmMsg += `${data.favorites.length} Adresse(s)\n\n`;
            confirmMsg += `Cela écrasera vos données actuelles.`;

            // Demander confirmation
            if (!confirm(confirmMsg)) {
                return;
            }

            // Importer les données
            if (data.cols) {
                localStorage.setItem(COLS_STORAGE, JSON.stringify(data.cols));
            }
            if (data.secteurs) {
                localStorage.setItem(SECTEURS_STORAGE, JSON.stringify(data.secteurs));
            }
            localStorage.setItem(FAVORITES_STORAGE, JSON.stringify(data.favorites));
            if (data.points) {
                localStorage.setItem(POINTS_STORAGE, JSON.stringify(data.points));
            }

            // Recharger l'affichage
            loadFavorites();
            showError('Données importées avec succès !', 'success');

        } catch (error) {
            showError(`Erreur lors de l'import: ${error.message}`);
        }
    };
    reader.readAsText(file);

    // Réinitialiser l'input pour permettre d'importer le même fichier à nouveau
    event.target.value = '';
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

    // Récupérer le mode d'optimisation
    const optimizationMode = document.getElementById('optimizationMode').value;

    // Afficher le chargement
    showLoading();

    try {
        // Géocoder toutes les adresses
        const allAddresses = [startPoint, ...points.map(p => p.address)];
        const coordinates = await geocodeAddresses(allAddresses, apiKey);

        // Créer la matrice de distances
        const distanceMatrix = await getDistanceMatrix(coordinates, apiKey);

        // Optimiser la route (TSP) avec contraintes horaires
        const optimizedRoute = optimizeTSP(distanceMatrix, points.length, points, optimizationMode);

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

function optimizeTSP(matrix, numPoints, points, optimizationMode = 'time') {
    // Algorithme du plus proche voisin modifié avec contraintes horaires
    // Point 0 = départ/arrivée
    // Points 1 à numPoints = points à visiter

    const distances = matrix.distances;
    const durations = matrix.durations; // en secondes

    // Choisir la métrique selon le mode d'optimisation
    // Pour le temps: utiliser durations (secondes)
    // Pour la distance: utiliser distances (km)
    const metric = (optimizationMode === 'time') ? durations : distances;

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

            // Score = métrique choisie (temps ou distance) + pénalité contrainte
            const score = metric[current][i] + constraintPenalty;

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

    // Appliquer l'optimisation 2-opt pour améliorer la route
    const improvedRoute = improve2opt(route, metric);

    return improvedRoute;
}

// ==========================================
// Algorithme 2-opt pour amélioration locale
// ==========================================

function improve2opt(route, metric) {
    // L'algorithme 2-opt améliore la route en inversant des segments
    // jusqu'à ce qu'aucune amélioration ne soit possible

    let improved = true;
    let bestRoute = [...route];

    while (improved) {
        improved = false;

        // Essayer toutes les paires de segments possibles
        for (let i = 1; i < bestRoute.length - 2; i++) {
            for (let j = i + 1; j < bestRoute.length - 1; j++) {
                // Calculer la distance actuelle
                const currentDist =
                    metric[bestRoute[i - 1]][bestRoute[i]] +
                    metric[bestRoute[j]][bestRoute[j + 1]];

                // Calculer la distance après inversion
                const newDist =
                    metric[bestRoute[i - 1]][bestRoute[j]] +
                    metric[bestRoute[i]][bestRoute[j + 1]];

                // Si l'inversion améliore la route
                if (newDist < currentDist) {
                    // Inverser le segment entre i et j
                    const newRoute = [
                        ...bestRoute.slice(0, i),
                        ...bestRoute.slice(i, j + 1).reverse(),
                        ...bestRoute.slice(j + 1)
                    ];
                    bestRoute = newRoute;
                    improved = true;
                }
            }
        }
    }

    return bestRoute;
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

function showError(message, type = 'error') {
    const messageIcon = document.getElementById('messageIcon');
    const iconPath = document.getElementById('iconPath');
    const messageTitle = document.getElementById('messageTitle');
    const closeBtn = document.getElementById('closeError');

    errorMessage.textContent = message;

    if (type === 'success') {
        messageIcon.classList.remove('text-red-500');
        messageIcon.classList.add('text-green-500');
        iconPath.setAttribute('d', 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z');
        messageTitle.textContent = 'Succès';
        closeBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
        closeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
    } else {
        messageIcon.classList.remove('text-green-500');
        messageIcon.classList.add('text-red-500');
        iconPath.setAttribute('d', 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
        messageTitle.textContent = 'Erreur';
        closeBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
        closeBtn.classList.add('bg-red-500', 'hover:bg-red-600');
    }

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

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Fonction pour retirer les émojis et caractères spéciaux
    function removeEmojis(text) {
        return text
            // Retirer tous les émojis et symboles Unicode
            .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
            .replace(/[\u{2600}-\u{27BF}]/gu, '')
            .replace(/[\u{2300}-\u{23FF}]/gu, '')
            .replace(/[\u{2B00}-\u{2BFF}]/gu, '')
            .replace(/[\u{25A0}-\u{25FF}]/gu, '')
            // Retirer les caractères de contrôle
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            // Ne garder que les caractères alphanumériques, espaces et ponctuation de base
            .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, '')
            // Retirer les espaces multiples
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Couleurs
    const primaryColor = [99, 102, 241]; // Indigo
    const secondaryColor = [75, 85, 99]; // Gris foncé
    const accentColor = [16, 185, 129]; // Vert

    // En-tête
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('ITINERAIRE DE RONDE OPTIMISE', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Genere le ${new Date().toLocaleString('fr-FR')}`, 105, 25, { align: 'center' });

    // Statistiques globales
    const stats = resultsContainer.querySelectorAll('.stat-card');
    if (stats.length >= 2) {
        const totalTime = removeEmojis(stats[0].querySelector('.stat-value').textContent.trim());
        const totalDistance = removeEmojis(stats[1].querySelector('.stat-value').textContent.trim());

        let y = 50;

        // Carte Temps Total
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(15, y, 85, 25, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(totalTime, 57.5, y + 10, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Temps total', 57.5, y + 18, { align: 'center' });

        // Carte Distance Totale
        doc.setFillColor(99, 102, 241);
        doc.roundedRect(110, y, 85, 25, 3, 3, 'F');
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(totalDistance, 152.5, y + 10, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Distance totale', 152.5, y + 18, { align: 'center' });
    }

    // Résumé
    const summary = resultsContainer.querySelector('.bg-blue-50');
    if (summary) {
        let y = 85;
        doc.setFillColor(239, 246, 255);
        doc.rect(15, y, 180, 30, 'F');

        doc.setTextColor(...secondaryColor);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('RESUME', 20, y + 8);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const summaryTexts = summary.querySelectorAll('p');
        summaryTexts.forEach((p, index) => {
            doc.text(removeEmojis(p.textContent.trim()), 20, y + 16 + (index * 6));
        });
    }

    // Itinéraire détaillé
    let y = 125;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('ITINERAIRE DETAILLE', 15, y);

    y += 8;

    const steps = resultsContainer.querySelectorAll('.result-card');
    steps.forEach((step, index) => {
        // Vérifier si on doit ajouter une nouvelle page
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        const stepNumber = removeEmojis(step.querySelector('.step-badge').textContent);
        const fromEl = step.querySelectorAll('.font-medium')[0];
        const toEl = step.querySelectorAll('.font-medium')[1];
        const from = fromEl ? removeEmojis(fromEl.textContent) : '';
        const to = toEl ? removeEmojis(toEl.textContent) : '';

        // Fond de l'étape
        const isLastStep = index === steps.length - 1;
        doc.setFillColor(isLastStep ? 220 : 243, isLastStep ? 252 : 244, isLastStep ? 231 : 246);
        doc.roundedRect(15, y, 180, 30, 2, 2, 'F');

        // Numéro d'étape
        doc.setFillColor(...primaryColor);
        doc.circle(22, y + 7, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(stepNumber, 22, y + 9, { align: 'center' });

        // De / Vers
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('De:', 30, y + 7);
        doc.setFont(undefined, 'bold');
        doc.text(from.substring(0, 60), 40, y + 7);

        doc.setFont(undefined, 'normal');
        doc.text('Vers:', 30, y + 14);
        doc.setFont(undefined, 'bold');
        doc.text(to.substring(0, 60), 40, y + 14);

        // Informations (distance, temps, etc.)
        const badges = step.querySelectorAll('.px-3');
        let infoY = y + 22;
        let infoX = 30;

        badges.forEach((badge, badgeIndex) => {
            const text = removeEmojis(badge.textContent.trim());
            if (text && badgeIndex < 4) {
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');

                // Choisir la couleur selon le type d'info
                if (text.includes('km')) {
                    doc.setTextColor(37, 99, 235); // Bleu
                } else if (text.includes('min')) {
                    doc.setTextColor(147, 51, 234); // Violet
                } else if (text.includes('sur place')) {
                    doc.setTextColor(234, 88, 12); // Orange
                } else {
                    doc.setTextColor(22, 163, 74); // Vert
                }

                doc.text(text, infoX, infoY);
                infoX += 45;
            }
        });

        y += 35;
    });

    // Pied de page sur chaque page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...primaryColor);
        doc.rect(0, 287, 210, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Page ${i} / ${pageCount}`, 105, 293, { align: 'center' });
        doc.text('Gestionnaire de Rondes', 15, 293);
    }

    return doc;
}

function printResults() {
    const doc = generatePDF();

    // Ouvrir le PDF dans un nouvel onglet pour impression
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl);

    if (printWindow) {
        printWindow.addEventListener('load', () => {
            printWindow.print();
        });
    }
}

function exportToText() {
    const doc = generatePDF();

    // Télécharger le PDF
    doc.save(`ronde-${new Date().toISOString().split('T')[0]}.pdf`);
}
