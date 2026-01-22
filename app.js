// AYTO Solver - Are You The One? VIP Staffel 5
// Constraint-based exact probability calculator

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION & CONSTANTS
    // ============================================

    const CONFIG = {
        INITIAL_PRIZE: 200000,
        SOLVER_TIME_LIMIT: 5000, // 5 seconds
        STORAGE_KEY: 'ayto_solver_state',
        VERSION: '1.0'
    };

    const DEFAULT_MALES = [
        'Calvin O.', 'Calvin S.', 'Jonny', 'Kevin', 'Leandro',
        'Lennert', 'Nico', 'Olli', 'Rob', 'Sidar', 'Xander'
    ];

    const DEFAULT_FEMALES = [
        'Antonia', 'Ariel', 'Beverly', 'Elli', 'Hati',
        'Henna', 'Joanna', 'Nelly', 'Sandra Janina', 'Viki'
    ];

    const DEFAULT_INACTIVE = [
        { name: 'Jimi Blue', gender: 'male' }
    ];

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    let state = {
        candidates: {
            males: [...DEFAULT_MALES],
            females: [...DEFAULT_FEMALES],
            inactive: [...DEFAULT_INACTIVE]
        },
        truthBooth: [], // { id, episode, male, female, result: 'perfect'|'no'|'sold'|null, soldAmount? }
        matchingNights: [], // { id, episode, pairs: [{male, female}], lights }
        deductions: [], // { id, episode, reason, amount }
        solverResult: null // { solutionsCount, pairFrequencies, runtime, error? }
    };

    let nextId = 1;

    function generateId() {
        return nextId++;
    }

    function getState() {
        return state;
    }

    function setState(newState) {
        state = newState;
        saveToStorage();
        render();
    }

    // ============================================
    // PERSISTENCE
    // ============================================

    function saveToStorage() {
        try {
            const data = {
                version: CONFIG.VERSION,
                nextId: nextId,
                state: state
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            showError('Speichern fehlgeschlagen: ' + e.message);
        }
    }

    function loadFromStorage() {
        try {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                state = data.state;
                nextId = data.nextId || 1;
                return true;
            }
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
        }
        return false;
    }

    // ============================================
    // IMPORT / EXPORT
    // ============================================

    function exportData() {
        const data = {
            version: CONFIG.VERSION,
            exportDate: new Date().toISOString(),
            candidates: state.candidates,
            truthBooth: state.truthBooth,
            matchingNights: state.matchingNights,
            deductions: state.deductions
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = 'ayto-solver-' + date + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);

                // Basic validation
                if (!data.candidates || !data.candidates.males || !data.candidates.females) {
                    throw new Error('Ungueltige Datei: candidates fehlt');
                }

                state.candidates = data.candidates;
                state.truthBooth = data.truthBooth || [];
                state.matchingNights = data.matchingNights || [];
                state.deductions = data.deductions || [];
                state.solverResult = null;

                // Recalculate nextId
                const allIds = [
                    ...state.truthBooth.map(t => t.id),
                    ...state.matchingNights.map(n => n.id),
                    ...state.deductions.map(d => d.id)
                ].filter(id => typeof id === 'number');
                nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;

                saveToStorage();
                render();
                hideError();
                showStatus('Import erfolgreich!', 'success');
            } catch (err) {
                showError('Import fehlgeschlagen: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function getPrizePool() {
        const totalDeductions = state.deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
        return CONFIG.INITIAL_PRIZE - totalDeductions;
    }

    function formatCurrency(amount) {
        return amount.toLocaleString('de-DE') + ' EUR';
    }

    function getActiveMales() {
        const perfectMatchMales = state.truthBooth
            .filter(t => t.result === 'perfect')
            .map(t => t.male);
        return state.candidates.males.filter(m => !perfectMatchMales.includes(m));
    }

    function getActiveFemales() {
        const perfectMatchFemales = state.truthBooth
            .filter(t => t.result === 'perfect')
            .map(t => t.female);
        return state.candidates.females.filter(f => !perfectMatchFemales.includes(f));
    }

    function getPerfectMatches() {
        return state.truthBooth.filter(t => t.result === 'perfect');
    }

    function getNoMatches() {
        return state.truthBooth.filter(t => t.result === 'no');
    }

    function validateNight(night) {
        const males = state.candidates.males;
        const females = state.candidates.females;
        const errors = [];

        if (!night.pairs || night.pairs.length === 0) {
            errors.push('Keine Paare definiert');
            return { valid: false, errors };
        }

        const usedMales = new Set();
        const usedFemales = new Set();

        for (const pair of night.pairs) {
            if (!pair.male || !pair.female) {
                errors.push('Unvollstaendiges Paar');
                continue;
            }
            if (!males.includes(pair.male)) {
                errors.push('Unbekannter Mann: ' + pair.male);
            }
            if (!females.includes(pair.female)) {
                errors.push('Unbekannte Frau: ' + pair.female);
            }
            if (usedMales.has(pair.male)) {
                errors.push('Mann doppelt: ' + pair.male);
            }
            if (usedFemales.has(pair.female)) {
                errors.push('Frau doppelt: ' + pair.female);
            }
            usedMales.add(pair.male);
            usedFemales.add(pair.female);
        }

        // Check if bijection (all males and females used exactly once)
        const isBijection = usedMales.size === males.length &&
                           usedFemales.size === females.length &&
                           usedMales.size === usedFemales.size;

        if (!isBijection && errors.length === 0) {
            errors.push('Keine vollstaendige Bijektion (' + usedMales.size + '/' + males.length + ' Maenner, ' + usedFemales.size + '/' + females.length + ' Frauen)');
        }

        if (typeof night.lights !== 'number' || night.lights < 0) {
            errors.push('Ungueltige Lichter-Anzahl');
        }

        return { valid: errors.length === 0 && isBijection, errors };
    }

    // ============================================
    // CONSTRAINT SOLVER
    // ============================================

    function solve() {
        const startTime = performance.now();

        const males = state.candidates.males;
        const females = state.candidates.females;

        // Check if males and females count match
        if (males.length !== females.length) {
            return {
                solutionsCount: 0,
                pairFrequencies: {},
                runtime: performance.now() - startTime,
                error: 'Anzahl Maenner (' + males.length + ') != Anzahl Frauen (' + females.length + ')'
            };
        }

        const n = males.length;
        if (n === 0) {
            return {
                solutionsCount: 0,
                pairFrequencies: {},
                runtime: performance.now() - startTime,
                error: 'Keine Teilnehmer vorhanden'
            };
        }

        // Build domain for each male (which females they can be matched with)
        // Start with all females, then remove based on constraints
        const perfectMatches = getPerfectMatches();
        const noMatches = getNoMatches();

        // Create initial domains
        const domains = {};
        for (const male of males) {
            domains[male] = new Set(females);
        }

        // Apply Perfect Match constraints (reduce to single option)
        for (const pm of perfectMatches) {
            if (males.includes(pm.male) && females.includes(pm.female)) {
                // This male can only match this female
                domains[pm.male] = new Set([pm.female]);
                // This female can only match this male
                for (const m of males) {
                    if (m !== pm.male) {
                        domains[m].delete(pm.female);
                    }
                }
            }
        }

        // Apply No Match constraints
        for (const nm of noMatches) {
            if (males.includes(nm.male) && domains[nm.male]) {
                domains[nm.male].delete(nm.female);
            }
        }

        // Check for empty domains (unsolvable)
        for (const male of males) {
            if (domains[male].size === 0) {
                return {
                    solutionsCount: 0,
                    pairFrequencies: {},
                    runtime: performance.now() - startTime,
                    error: 'Keine moegliche Partnerin fuer ' + male
                };
            }
        }

        // Get valid nights (bijections only)
        const validNights = state.matchingNights.filter(night => {
            const validation = validateNight(night);
            return validation.valid;
        });

        // Convert nights to lookup format for faster checking
        const nightConstraints = validNights.map(night => {
            const pairSet = new Set();
            for (const pair of night.pairs) {
                pairSet.add(pair.male + '|' + pair.female);
            }
            return {
                pairSet: pairSet,
                lights: night.lights
            };
        });

        // Frequency counter for pair probabilities
        const pairFrequencies = {};
        for (const male of males) {
            pairFrequencies[male] = {};
            for (const female of females) {
                pairFrequencies[male][female] = 0;
            }
        }

        let solutionsCount = 0;
        let timedOut = false;

        // Backtracking solver with MRV heuristic
        function backtrack(assignment, usedFemales, maleIndex, maleOrder) {
            // Check timeout
            if (performance.now() - startTime > CONFIG.SOLVER_TIME_LIMIT) {
                timedOut = true;
                return;
            }

            // All males assigned - check night constraints
            if (maleIndex === maleOrder.length) {
                // Verify all night constraints
                for (const nc of nightConstraints) {
                    let matches = 0;
                    for (const male of males) {
                        const pairKey = male + '|' + assignment[male];
                        if (nc.pairSet.has(pairKey)) {
                            matches++;
                        }
                    }
                    if (matches !== nc.lights) {
                        return; // This assignment doesn't satisfy this night
                    }
                }

                // Valid solution found
                solutionsCount++;
                for (const male of males) {
                    pairFrequencies[male][assignment[male]]++;
                }
                return;
            }

            const currentMale = maleOrder[maleIndex];
            const domain = domains[currentMale];

            // Early pruning: check if night constraints can still be satisfied
            // For each night, calculate min and max possible matches
            for (const nc of nightConstraints) {
                let currentMatches = 0;
                let potentialMax = 0;

                for (let i = 0; i < maleOrder.length; i++) {
                    const m = maleOrder[i];
                    const nightPairForMale = Array.from(nc.pairSet).find(p => p.startsWith(m + '|'));

                    if (i < maleIndex) {
                        // Already assigned
                        const pairKey = m + '|' + assignment[m];
                        if (nc.pairSet.has(pairKey)) {
                            currentMatches++;
                        }
                        potentialMax += nc.pairSet.has(pairKey) ? 1 : 0;
                    } else {
                        // Not yet assigned - check if the night pair is still possible
                        if (nightPairForMale) {
                            const female = nightPairForMale.split('|')[1];
                            if (domains[m].has(female) && !usedFemales.has(female)) {
                                potentialMax++;
                            }
                        }
                    }
                }

                // If we already have too many matches, prune
                if (currentMatches > nc.lights) {
                    return;
                }
                // If we can't possibly reach enough matches, prune
                if (potentialMax < nc.lights) {
                    return;
                }
            }

            // Try each female in domain
            for (const female of domain) {
                if (usedFemales.has(female)) continue;

                assignment[currentMale] = female;
                usedFemales.add(female);

                backtrack(assignment, usedFemales, maleIndex + 1, maleOrder);

                if (timedOut) return;

                usedFemales.delete(female);
                delete assignment[currentMale];
            }
        }

        // Sort males by domain size (MRV - Minimum Remaining Values)
        const maleOrder = [...males].sort((a, b) => domains[a].size - domains[b].size);

        // Start backtracking
        backtrack({}, new Set(), 0, maleOrder);

        const runtime = performance.now() - startTime;

        if (timedOut) {
            return {
                solutionsCount: solutionsCount,
                pairFrequencies: pairFrequencies,
                runtime: runtime,
                error: 'Zeitlimit ueberschritten (' + Math.round(runtime) + 'ms). ' + solutionsCount + ' Loesungen gefunden. Mehr Constraints hinzufuegen.'
            };
        }

        return {
            solutionsCount: solutionsCount,
            pairFrequencies: pairFrequencies,
            runtime: runtime,
            error: solutionsCount === 0 ? 'Keine Loesung gefunden - widersprüchliche Constraints?' : null
        };
    }

    // ============================================
    // UI RENDERING
    // ============================================

    function render() {
        renderPrize();
        renderDeductions();
        renderCandidates();
        renderMatchbox();
        renderNights();
        renderPerfectMatches();
        renderProbabilities();
        updateBadges();
    }

    function renderPrize() {
        const prizeDisplay = document.getElementById('prize-display');
        const prize = getPrizePool();
        prizeDisplay.textContent = formatCurrency(prize);
        prizeDisplay.style.color = prize < 100000 ? 'var(--warning)' : 'var(--success)';
    }

    function renderDeductions() {
        const list = document.getElementById('deductions-list');
        list.innerHTML = '';

        for (const d of state.deductions) {
            const li = document.createElement('li');
            li.innerHTML = '\
                <span class="item-info">\
                    <strong>-' + formatCurrency(d.amount) + '</strong>\
                    <span class="item-meta">' + escapeHtml(d.reason || 'Kein Grund') + '</span>\
                </span>\
                <button class="btn btn-remove" data-id="' + d.id + '" data-type="deduction">x</button>\
            ';
            list.appendChild(li);
        }
    }

    function renderCandidates() {
        document.getElementById('males-textarea').value = state.candidates.males.join('\n');
        document.getElementById('females-textarea').value = state.candidates.females.join('\n');
        document.getElementById('inactive-textarea').value = state.candidates.inactive
            .map(i => i.name + ',' + i.gender)
            .join('\n');

        // Update all selects
        updateCandidateSelects();
    }

    function updateCandidateSelects() {
        const maleSelects = document.querySelectorAll('select[data-type="male"]');
        const femaleSelects = document.querySelectorAll('select[data-type="female"]');

        const maleOptions = '<option value="">Mann waehlen...</option>' +
            state.candidates.males.map(m => '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>').join('');

        const femaleOptions = '<option value="">Frau waehlen...</option>' +
            state.candidates.females.map(f => '<option value="' + escapeHtml(f) + '">' + escapeHtml(f) + '</option>').join('');

        maleSelects.forEach(s => {
            const currentVal = s.value;
            s.innerHTML = maleOptions;
            s.value = currentVal;
        });

        femaleSelects.forEach(s => {
            const currentVal = s.value;
            s.innerHTML = femaleOptions;
            s.value = currentVal;
        });

        // Also update matchbox selects
        const matchboxMale = document.getElementById('matchbox-male');
        const matchboxFemale = document.getElementById('matchbox-female');
        if (matchboxMale) matchboxMale.innerHTML = maleOptions;
        if (matchboxFemale) matchboxFemale.innerHTML = femaleOptions;
    }

    function renderMatchbox() {
        const list = document.getElementById('matchbox-list');
        list.innerHTML = '';

        const sortedTruth = [...state.truthBooth].sort((a, b) => (a.episode || 0) - (b.episode || 0));

        for (const t of sortedTruth) {
            const statusIcon = t.result === 'perfect' ? '<span class="status-icon status-perfect">&#10003;</span>' :
                              t.result === 'no' ? '<span class="status-icon status-no">&#10007;</span>' :
                              t.result === 'sold' ? '<span class="status-icon status-sold">&#128566;</span>' :
                              '<span class="status-icon">?</span>';

            const soldInfo = t.result === 'sold' && t.soldAmount ? ' (' + formatCurrency(t.soldAmount) + ')' : '';

            const li = document.createElement('li');
            li.innerHTML = '\
                ' + statusIcon + '\
                <span class="item-info">\
                    <strong>' + escapeHtml(t.male) + ' & ' + escapeHtml(t.female) + '</strong>\
                    <span class="item-meta">Episode ' + (t.episode || '?') + soldInfo + '</span>\
                </span>\
                <button class="btn btn-remove" data-id="' + t.id + '" data-type="truthBooth">x</button>\
            ';
            list.appendChild(li);
        }
    }

    function renderNights() {
        const container = document.getElementById('nights-list');
        container.innerHTML = '';

        const sortedNights = [...state.matchingNights].sort((a, b) => (a.episode || 0) - (b.episode || 0));

        for (const night of sortedNights) {
            const validation = validateNight(night);
            const card = document.createElement('div');
            card.className = 'night-card';
            card.dataset.id = night.id;

            let pairsHtml = '';
            const numPairs = Math.max(night.pairs.length, 1);

            for (let i = 0; i < numPairs; i++) {
                const pair = night.pairs[i] || { male: '', female: '' };
                pairsHtml += '\
                    <div class="night-pair" data-index="' + i + '">\
                        <select data-type="male" data-night="' + night.id + '" data-index="' + i + '">\
                            <option value="">Mann...</option>\
                            ' + state.candidates.males.map(m =>
                                '<option value="' + escapeHtml(m) + '"' + (pair.male === m ? ' selected' : '') + '>' + escapeHtml(m) + '</option>'
                            ).join('') + '\
                        </select>\
                        <select data-type="female" data-night="' + night.id + '" data-index="' + i + '">\
                            <option value="">Frau...</option>\
                            ' + state.candidates.females.map(f =>
                                '<option value="' + escapeHtml(f) + '"' + (pair.female === f ? ' selected' : '') + '>' + escapeHtml(f) + '</option>'
                            ).join('') + '\
                        </select>\
                        <button class="btn btn-remove-pair" data-night="' + night.id + '" data-index="' + i + '">x</button>\
                    </div>\
                ';
            }

            const lightsDisplay = Array(night.lights || 0).fill('<span style="color: var(--warning);">&#128161;</span>').join('');

            card.innerHTML = '\
                <div class="night-header">\
                    <h3>Episode ' + (night.episode || '?') + '</h3>\
                    <div class="night-lights">\
                        <input type="number" value="' + (night.lights || 0) + '" min="0" max="' + state.candidates.males.length + '" \
                               data-night="' + night.id + '" data-field="lights">\
                        <span class="night-lights-display">' + lightsDisplay + '</span>\
                    </div>\
                    <button class="btn btn-remove btn-small" data-id="' + night.id + '" data-type="night">x</button>\
                </div>\
                ' + (!validation.valid ? '<div class="night-warning">&#9888; ' + validation.errors.join(', ') + '</div>' : '') + '\
                <div class="night-pairs">' + pairsHtml + '</div>\
                <div class="night-actions">\
                    <button class="btn btn-small btn-secondary" data-action="add-pair" data-night="' + night.id + '">+ Paar</button>\
                </div>\
            ';

            container.appendChild(card);
        }
    }

    function renderPerfectMatches() {
        const list = document.getElementById('perfect-list');
        const perfectMatches = getPerfectMatches();

        list.innerHTML = perfectMatches.length === 0
            ? '<li style="color: var(--text-muted);">Noch keine Perfect Matches bestaetigt</li>'
            : '';

        for (const pm of perfectMatches) {
            const li = document.createElement('li');
            li.innerHTML = '\
                <span class="status-icon status-perfect">&#10003;</span>\
                <span class="item-info">\
                    <strong>' + escapeHtml(pm.male) + ' & ' + escapeHtml(pm.female) + '</strong>\
                </span>\
            ';
            list.appendChild(li);
        }
    }

    function renderProbabilities() {
        const container = document.getElementById('probabilities-content');
        const result = state.solverResult;

        if (!result) {
            container.innerHTML = '<p class="hint">Druecke "Wahrscheinlichkeiten berechnen" um die Analyse zu starten.</p>';
            return;
        }

        if (result.error && result.solutionsCount === 0) {
            container.innerHTML = '<p class="hint" style="color: var(--danger);">' + escapeHtml(result.error) + '</p>';
            return;
        }

        // Build sorted list of probabilities
        const probabilities = [];
        const perfectMatches = getPerfectMatches();
        const perfectPairs = new Set(perfectMatches.map(pm => pm.male + '|' + pm.female));

        for (const male of state.candidates.males) {
            for (const female of state.candidates.females) {
                // Skip perfect matches (they're shown separately)
                if (perfectPairs.has(male + '|' + female)) continue;

                const freq = result.pairFrequencies[male]?.[female] || 0;
                const prob = result.solutionsCount > 0 ? freq / result.solutionsCount : 0;

                if (prob > 0) {
                    probabilities.push({ male, female, prob, freq });
                }
            }
        }

        // Sort by probability descending
        probabilities.sort((a, b) => b.prob - a.prob);

        if (probabilities.length === 0) {
            container.innerHTML = '<p class="hint">Keine Wahrscheinlichkeiten zu berechnen (alle Perfect Matches bekannt oder keine Loesung)</p>';
            return;
        }

        let html = '';
        for (const p of probabilities) {
            const percent = (p.prob * 100).toFixed(1);
            const barClass = p.prob >= 0.5 ? 'high' : p.prob >= 0.2 ? 'medium' : 'low';

            html += '\
                <div class="probability-item">\
                    <div class="pair-names">\
                        <span class="male">' + escapeHtml(p.male) + '</span>\
                        <span class="female">' + escapeHtml(p.female) + '</span>\
                    </div>\
                    <div class="probability-bar-container">\
                        <div class="probability-bar ' + barClass + '" style="width: ' + percent + '%"></div>\
                    </div>\
                    <span class="probability-value">' + percent + '%</span>\
                </div>\
            ';
        }

        container.innerHTML = html;
    }

    function updateBadges() {
        document.getElementById('matchbox-count').textContent = state.truthBooth.length;
        document.getElementById('nights-count').textContent = state.matchingNights.length;
        document.getElementById('perfect-count').textContent = getPerfectMatches().length;
    }

    function showStatus(message, type) {
        const status = document.getElementById('solver-status');
        status.textContent = message;
        status.className = 'solver-status ' + (type || '');
    }

    function showError(message) {
        const errorBox = document.getElementById('error-box');
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
    }

    function hideError() {
        const errorBox = document.getElementById('error-box');
        errorBox.classList.add('hidden');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    function setupEventListeners() {
        // Toggle sections
        document.querySelectorAll('.section-header[data-toggle]').forEach(header => {
            header.addEventListener('click', function() {
                const targetId = this.dataset.toggle;
                const content = document.getElementById(targetId);
                const icon = this.querySelector('.toggle-icon');

                if (content.classList.contains('collapsed')) {
                    content.classList.remove('collapsed');
                    icon.textContent = '-';
                } else {
                    content.classList.add('collapsed');
                    icon.textContent = '+';
                }
            });
        });

        // Export
        document.getElementById('btn-export').addEventListener('click', exportData);

        // Import
        document.getElementById('btn-import').addEventListener('click', function() {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                importData(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Add deduction
        document.getElementById('btn-add-deduction').addEventListener('click', function() {
            const amount = parseInt(document.getElementById('deduction-amount').value) || 0;
            const reason = document.getElementById('deduction-reason').value.trim();

            if (amount <= 0) {
                showError('Bitte einen gueltigen Betrag eingeben');
                return;
            }

            state.deductions.push({
                id: generateId(),
                amount: amount,
                reason: reason
            });

            document.getElementById('deduction-amount').value = '';
            document.getElementById('deduction-reason').value = '';

            saveToStorage();
            render();
            hideError();
        });

        // Save candidates
        document.getElementById('btn-save-candidates').addEventListener('click', function() {
            const malesText = document.getElementById('males-textarea').value;
            const femalesText = document.getElementById('females-textarea').value;
            const inactiveText = document.getElementById('inactive-textarea').value;

            const males = malesText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            const females = femalesText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            const inactive = inactiveText.split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(line => {
                    const parts = line.split(',');
                    return {
                        name: parts[0].trim(),
                        gender: (parts[1] || 'male').trim()
                    };
                });

            state.candidates = { males, females, inactive };
            state.solverResult = null;

            saveToStorage();
            render();
            showStatus('Teilnehmer gespeichert', 'success');
        });

        // Activate candidate (from inactive)
        document.getElementById('btn-activate-candidate').addEventListener('click', function() {
            if (state.candidates.inactive.length === 0) {
                showError('Keine inaktiven Teilnehmer vorhanden');
                return;
            }

            showModal(
                'Nachzuegler aktivieren',
                '<p>Waehle einen Nachzuegler zum Aktivieren:</p>\
                <select id="modal-inactive-select">\
                    ' + state.candidates.inactive.map((p, i) =>
                        '<option value="' + i + '">' + escapeHtml(p.name) + ' (' + p.gender + ')</option>'
                    ).join('') + '\
                </select>',
                function() {
                    const idx = parseInt(document.getElementById('modal-inactive-select').value);
                    const person = state.candidates.inactive[idx];

                    if (person.gender === 'male') {
                        state.candidates.males.push(person.name);
                    } else {
                        state.candidates.females.push(person.name);
                    }

                    state.candidates.inactive.splice(idx, 1);
                    state.solverResult = null;

                    saveToStorage();
                    render();
                    hideModal();
                }
            );
        });

        // Matchbox result change (show/hide sold amount)
        document.getElementById('matchbox-result').addEventListener('change', function() {
            const soldInput = document.getElementById('matchbox-sold-amount');
            if (this.value === 'sold') {
                soldInput.classList.remove('hidden');
            } else {
                soldInput.classList.add('hidden');
            }
        });

        // Add matchbox entry
        document.getElementById('btn-add-matchbox').addEventListener('click', function() {
            const male = document.getElementById('matchbox-male').value;
            const female = document.getElementById('matchbox-female').value;
            const result = document.getElementById('matchbox-result').value;
            const episode = parseInt(document.getElementById('matchbox-episode').value) || 1;
            const soldAmount = parseInt(document.getElementById('matchbox-sold-amount').value) || 0;

            if (!male || !female) {
                showError('Bitte Mann und Frau auswaehlen');
                return;
            }
            if (!result) {
                showError('Bitte Ergebnis auswaehlen');
                return;
            }

            const entry = {
                id: generateId(),
                episode: episode,
                male: male,
                female: female,
                result: result
            };

            if (result === 'sold' && soldAmount > 0) {
                entry.soldAmount = soldAmount;
                // Also add as deduction
                state.deductions.push({
                    id: generateId(),
                    amount: soldAmount,
                    reason: 'Matchbox verkauft (Ep. ' + episode + ')'
                });
            }

            state.truthBooth.push(entry);
            state.solverResult = null;

            // Reset form
            document.getElementById('matchbox-male').value = '';
            document.getElementById('matchbox-female').value = '';
            document.getElementById('matchbox-result').value = '';
            document.getElementById('matchbox-episode').value = '';
            document.getElementById('matchbox-sold-amount').value = '';
            document.getElementById('matchbox-sold-amount').classList.add('hidden');

            saveToStorage();
            render();
            hideError();
        });

        // Add night
        document.getElementById('btn-add-night').addEventListener('click', function() {
            const episode = state.matchingNights.length + 1;

            state.matchingNights.push({
                id: generateId(),
                episode: episode,
                pairs: state.candidates.males.map((m, i) => ({
                    male: '',
                    female: ''
                })),
                lights: 0
            });

            saveToStorage();
            render();
        });

        // Solve button
        document.getElementById('btn-solve').addEventListener('click', function() {
            const btn = this;
            btn.disabled = true;
            showStatus('Berechne...', 'running');

            document.getElementById('solver-stats').classList.add('hidden');

            // Use setTimeout to allow UI to update
            setTimeout(function() {
                try {
                    const result = solve();
                    state.solverResult = result;

                    saveToStorage();
                    render();

                    if (result.error) {
                        showStatus(result.error, 'error');
                    } else {
                        showStatus('Berechnung abgeschlossen', 'success');
                    }

                    document.getElementById('stat-solutions').textContent = result.solutionsCount.toLocaleString() + ' Loesungen';
                    document.getElementById('stat-time').textContent = Math.round(result.runtime) + 'ms';
                    document.getElementById('solver-stats').classList.remove('hidden');
                } catch (e) {
                    console.error('Solver error:', e);
                    showStatus('Fehler: ' + e.message, 'error');
                    showError('Solver-Fehler: ' + e.message);
                }

                btn.disabled = false;
            }, 50);
        });

        // Reset button
        document.getElementById('btn-reset').addEventListener('click', function() {
            showModal(
                'Alle Daten zuruecksetzen?',
                '<p>Dies loescht alle eingegebenen Daten und setzt die App auf den Ausgangszustand zurueck.</p>',
                function() {
                    state = {
                        candidates: {
                            males: [...DEFAULT_MALES],
                            females: [...DEFAULT_FEMALES],
                            inactive: [...DEFAULT_INACTIVE]
                        },
                        truthBooth: [],
                        matchingNights: [],
                        deductions: [],
                        solverResult: null
                    };
                    nextId = 1;

                    saveToStorage();
                    render();
                    hideModal();
                    showStatus('Daten zurueckgesetzt', 'success');
                }
            );
        });

        // Delegated events for dynamic elements
        document.addEventListener('click', function(e) {
            // Remove buttons
            if (e.target.matches('.btn-remove[data-type]')) {
                const id = parseInt(e.target.dataset.id);
                const type = e.target.dataset.type;

                if (type === 'deduction') {
                    state.deductions = state.deductions.filter(d => d.id !== id);
                } else if (type === 'truthBooth') {
                    state.truthBooth = state.truthBooth.filter(t => t.id !== id);
                    state.solverResult = null;
                } else if (type === 'night') {
                    state.matchingNights = state.matchingNights.filter(n => n.id !== id);
                    state.solverResult = null;
                }

                saveToStorage();
                render();
            }

            // Add pair to night
            if (e.target.matches('[data-action="add-pair"]')) {
                const nightId = parseInt(e.target.dataset.night);
                const night = state.matchingNights.find(n => n.id === nightId);
                if (night) {
                    night.pairs.push({ male: '', female: '' });
                    saveToStorage();
                    render();
                }
            }

            // Remove pair from night
            if (e.target.matches('.btn-remove-pair')) {
                const nightId = parseInt(e.target.dataset.night);
                const index = parseInt(e.target.dataset.index);
                const night = state.matchingNights.find(n => n.id === nightId);
                if (night && night.pairs.length > 1) {
                    night.pairs.splice(index, 1);
                    state.solverResult = null;
                    saveToStorage();
                    render();
                }
            }
        });

        // Delegated change events for night inputs
        document.addEventListener('change', function(e) {
            // Night pair select
            if (e.target.matches('.night-pair select')) {
                const nightId = parseInt(e.target.dataset.night);
                const index = parseInt(e.target.dataset.index);
                const type = e.target.dataset.type;
                const value = e.target.value;

                const night = state.matchingNights.find(n => n.id === nightId);
                if (night && night.pairs[index]) {
                    night.pairs[index][type] = value;
                    state.solverResult = null;
                    saveToStorage();
                    render();
                }
            }

            // Night lights input
            if (e.target.matches('[data-field="lights"]')) {
                const nightId = parseInt(e.target.dataset.night);
                const value = parseInt(e.target.value) || 0;

                const night = state.matchingNights.find(n => n.id === nightId);
                if (night) {
                    night.lights = Math.max(0, Math.min(value, state.candidates.males.length));
                    state.solverResult = null;
                    saveToStorage();
                    render();
                }
            }
        });
    }

    // ============================================
    // MODAL
    // ============================================

    function showModal(title, content, onConfirm) {
        const overlay = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');

        body.innerHTML = '<h3>' + title + '</h3>' + content;
        overlay.classList.remove('hidden');

        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        // Remove old listeners
        const newConfirm = confirmBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newConfirm.addEventListener('click', onConfirm);
        newCancel.addEventListener('click', hideModal);
    }

    function hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    // ============================================
    // GLOBAL ERROR HANDLER
    // ============================================

    window.onerror = function(msg, url, line, col, error) {
        console.error('Global error:', msg, url, line, col, error);
        showError('JavaScript-Fehler: ' + msg + ' (Zeile ' + line + ')');
        return false;
    };

    window.onunhandledrejection = function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showError('Async-Fehler: ' + (event.reason?.message || event.reason));
    };

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        try {
            // Try to load saved state
            if (!loadFromStorage()) {
                // Use defaults
                saveToStorage();
            }

            setupEventListeners();
            render();

            console.log('AYTO Solver initialized');
        } catch (e) {
            console.error('Initialization error:', e);
            showError('Initialisierungsfehler: ' + e.message);
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
