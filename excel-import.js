// ==========================================
// Gestion de l'import Excel/CSV
// ==========================================

function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });

            // Prendre la première feuille
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // Convertir en JSON
            excelData = XLSX.utils.sheet_to_json(firstSheet);

            if (excelData.length === 0) {
                showError('Le fichier Excel est vide ou ne contient pas de données');
                return;
            }

            // Extraire les colonnes
            excelColumns = Object.keys(excelData[0]);

            // Afficher le modal de mapping
            showExcelImportModal();

        } catch (error) {
            console.error('Erreur lors de la lecture du fichier:', error);
            showError('Erreur lors de la lecture du fichier Excel. Vérifiez le format.');
        }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }

    // Réinitialiser l'input pour permettre de réimporter le même fichier
    event.target.value = '';
}

function showExcelImportModal() {
    const modal = document.getElementById('excelImportModal');
    const addressColumn = document.getElementById('excelAddressColumn');
    const commentColumn = document.getElementById('excelCommentColumn');

    // Remplir les options de colonnes
    addressColumn.innerHTML = '<option value="">-- Sélectionner --</option>' +
        excelColumns.map(col => `<option value="${col}">${col}</option>`).join('');

    commentColumn.innerHTML = '<option value="">-- Aucune --</option>' +
        excelColumns.map(col => `<option value="${col}">${col}</option>`).join('');

    // Auto-sélectionner si possible
    const addressKeywords = ['adresse', 'address', 'lieu', 'location'];
    const commentKeywords = ['commentaire', 'comment', 'note', 'remarque'];

    for (const col of excelColumns) {
        const colLower = col.toLowerCase();
        if (addressKeywords.some(keyword => colLower.includes(keyword))) {
            addressColumn.value = col;
        }
        if (commentKeywords.some(keyword => colLower.includes(keyword))) {
            commentColumn.value = col;
        }
    }

    // Afficher le modal et l'étape de mapping
    modal.classList.remove('hidden');
    showMappingStep();
}

function showMappingStep() {
    document.getElementById('excelMappingStep').classList.remove('hidden');
    document.getElementById('excelPreviewStep').classList.add('hidden');
}

async function processExcelMapping() {
    const addressColumn = document.getElementById('excelAddressColumn').value;
    const commentColumn = document.getElementById('excelCommentColumn').value;

    if (!addressColumn) {
        showError('Veuillez sélectionner la colonne contenant les adresses');
        return;
    }

    // Préparer les adresses
    excelParsedAddresses = excelData.map((row, index) => ({
        index: index,
        address: row[addressColumn]?.toString().trim() || '',
        comment: commentColumn ? (row[commentColumn]?.toString().trim() || '') : '',
        geocoded: false,
        coordinates: null
    })).filter(item => item.address);

    if (excelParsedAddresses.length === 0) {
        showError('Aucune adresse trouvée dans la colonne sélectionnée');
        return;
    }

    // Passer à l'étape de prévisualisation
    showPreviewStep();
}

async function showPreviewStep() {
    document.getElementById('excelMappingStep').classList.add('hidden');
    document.getElementById('excelPreviewStep').classList.remove('hidden');

    // Mettre à jour le compteur
    document.getElementById('excelAddressCount').textContent = excelParsedAddresses.length;

    // Afficher la liste des adresses
    displayExcelAddressList();

    // Initialiser la carte de prévisualisation
    initExcelPreviewMap();

    // Géocoder toutes les adresses
    await geocodeExcelAddresses();
}

function displayExcelAddressList() {
    const listContainer = document.getElementById('excelAddressList');
    listContainer.innerHTML = '';

    excelParsedAddresses.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'border border-gray-200 rounded-lg p-3 bg-white';
        div.innerHTML = `
            <div class="flex items-start gap-2">
                <span class="font-bold text-indigo-600">${idx + 1}.</span>
                <div class="flex-1">
                    <input type="text"
                           class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                           value="${item.address}"
                           onchange="updateExcelAddress(${idx}, this.value)">
                    ${item.comment ? `<p class="text-xs text-gray-600 mt-1">💬 ${item.comment}</p>` : ''}
                    <div class="mt-1 text-xs">
                        <span id="excel-status-${idx}" class="text-gray-500">En attente...</span>
                    </div>
                </div>
            </div>
        `;
        listContainer.appendChild(div);
    });
}

function updateExcelAddress(index, newAddress) {
    excelParsedAddresses[index].address = newAddress.trim();
    excelParsedAddresses[index].geocoded = false;
    excelParsedAddresses[index].coordinates = null;

    // Re-géocoder cette adresse
    geocodeSingleExcelAddress(index);
}

let excelPreviewMap = null;
let excelMarkers = [];

function initExcelPreviewMap() {
    const mapContainer = document.getElementById('excelPreviewMap');

    // Détruire la carte existante si elle existe
    if (excelPreviewMap) {
        excelPreviewMap.remove();
        excelPreviewMap = null;
        excelMarkers = [];
    }

    // Créer une nouvelle carte centrée sur la France
    excelPreviewMap = L.map('excelPreviewMap').setView([46.603354, 1.888334], 6);

    // Ajouter le layer de tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(excelPreviewMap);

    // Forcer un refresh de la carte
    setTimeout(() => {
        excelPreviewMap.invalidateSize();
    }, 100);
}

async function geocodeExcelAddresses() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showError('Veuillez entrer votre clé API OpenRouteService');
        return;
    }

    for (let i = 0; i < excelParsedAddresses.length; i++) {
        await geocodeSingleExcelAddress(i);
        // Petit délai pour ne pas surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

async function geocodeSingleExcelAddress(index) {
    const item = excelParsedAddresses[index];
    const apiKey = apiKeyInput.value.trim();
    const statusEl = document.getElementById(`excel-status-${index}`);

    if (statusEl) {
        statusEl.innerHTML = '<span class="text-blue-500">🔍 Recherche...</span>';
    }

    try {
        const response = await fetch(
            `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(item.address)}&size=1`,
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
            item.coordinates = { lon, lat };
            item.geocoded = true;

            if (statusEl) {
                statusEl.innerHTML = '<span class="text-green-600">✓ Trouvée</span>';
            }

            // Ajouter un marqueur sur la carte
            addExcelMarker(index, lat, lon, item.address);
        } else {
            if (statusEl) {
                statusEl.innerHTML = '<span class="text-orange-500">⚠️ Non trouvée</span>';
            }
        }
    } catch (error) {
        console.error('Erreur de géocodage pour:', item.address, error);
        if (statusEl) {
            statusEl.innerHTML = '<span class="text-red-500">⚠️ Erreur</span>';
        }
    }
}

function addExcelMarker(index, lat, lon, address) {
    if (!excelPreviewMap) return;

    const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="relative">
            <div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">
                ${index + 1}
            </div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    const marker = L.marker([lat, lon], { icon: markerIcon })
        .addTo(excelPreviewMap)
        .bindPopup(`<b>${index + 1}. ${address}</b>`);

    excelMarkers.push(marker);

    // Ajuster la vue de la carte pour inclure tous les marqueurs
    if (excelMarkers.length > 0) {
        const bounds = excelMarkers.map(m => m.getLatLng());
        excelPreviewMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

function confirmExcelImport() {
    // Filtrer les adresses géocodées avec succès
    const validAddresses = excelParsedAddresses.filter(item => item.geocoded);

    if (validAddresses.length === 0) {
        showError('Aucune adresse n\'a pu être géocodée. Vérifiez les adresses et réessayez.');
        return;
    }

    // Demander confirmation
    const message = `Vous allez importer ${validAddresses.length} point(s) sur ${excelParsedAddresses.length}.\n\n` +
        `Les points existants dans la ronde seront supprimés.\n\nConfirmer l'import ?`;

    if (!confirm(message)) {
        return;
    }

    // Supprimer tous les points existants
    pointsList.innerHTML = '';
    pointsCounter = 0;

    // Ajouter les nouveaux points
    validAddresses.forEach(item => {
        addPointToList({
            address: item.address,
            comment: item.comment,
            timeHours: 0,
            timeMinutes: 10,
            timeConstraint: 'none',
            constraintTime: '09:00'
        });
    });

    // Fermer le modal
    closeExcelImportModal();

    // Message de succès
    showError(`${validAddresses.length} point(s) importé(s) avec succès !`, 'success');
}

function closeExcelImportModal() {
    const modal = document.getElementById('excelImportModal');
    modal.classList.add('hidden');

    // Nettoyer
    excelData = null;
    excelColumns = [];
    excelParsedAddresses = [];

    if (excelPreviewMap) {
        excelPreviewMap.remove();
        excelPreviewMap = null;
        excelMarkers = [];
    }

    // Cacher les étapes
    document.getElementById('excelMappingStep').classList.add('hidden');
    document.getElementById('excelPreviewStep').classList.add('hidden');
}
