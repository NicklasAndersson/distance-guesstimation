// ── Data Model ──────────────────────────────────────────────────────────────

const DEFAULT_CARD_DATA = {
    cordLength: 600,
    distances: [100, 200, 300, 400, 500, 600],
    things: []
};

// Legacy image map – used when a thing has no uploaded imageDataUrl
const LEGACY_IMAGES = {
    'soldier':  'helfigur-bw.png',
    'imf':      'imf-bw.jpg',
    'v70':      'volvo-v70-e.jpg',
};

const IMAGE_MAX_BYTES = 200 * 1024; // 200 KB warning threshold

let cardData = structuredClone(DEFAULT_CARD_DATA);
let selectedThingId = null;

// ── Undo / Redo ─────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];

function pushUndo() {
    undoStack.push(JSON.stringify(cardData));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(cardData));
    cardData = JSON.parse(undoStack.pop());
    afterDataChange(false);
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(cardData));
    cardData = JSON.parse(redoStack.pop());
    afterDataChange(false);
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

// ── Conversions ─────────────────────────────────────────────────────────────

const MILS_PER_MOA = 0.29089;   // 1 MOA ≈ 0.29089 mil

function milsToMoa(mils) { return mils / MILS_PER_MOA; }
function moaToMils(moa)  { return moa * MILS_PER_MOA; }

// ── Scaling Formula ─────────────────────────────────────────────────────────

function calcToPaperLength(thingLengthMeter, distanceMeter, cordLengthMM) {
    return (thingLengthMeter / distanceMeter) * cordLengthMM;
}

// ── Rendering ───────────────────────────────────────────────────────────────

function renderCard() {
    const sheet = document.querySelector('.sheet');
    // Remove all existing cards (original + clones)
    sheet.querySelectorAll('.card').forEach(c => c.remove());

    // Build the single card
    const card = document.createElement('div');
    card.classList.add('card');

    // Top text
    const topText = document.createElement('p');
    topText.classList.add('top-text');
    const distStr = cardData.distances.join(', ');
    topText.textContent = `Snöre: ${cardData.cordLength / 10}cm | Avstånd: ${distStr}m`;
    card.appendChild(topText);

    // Ruler
    const ruler = document.createElement('div');
    ruler.classList.add('ruler');
    for (let i = 0; i < 5; i++) {
        const cm = document.createElement('div');
        cm.classList.add('cm');
        if (i === 4) cm.classList.add('last-cm');
        ruler.appendChild(cm);
    }
    card.appendChild(ruler);

    // Subcards for each thing
    for (const thing of cardData.things) {
        const subcard = document.createElement('div');
        subcard.classList.add('subcard');
        subcard.dataset.thingId = thing.id;

        // Position offsets
        subcard.style.left = thing.offsetX + 'mm';
        subcard.style.top  = thing.offsetY + 'mm';

        if (thing.type === 'milCircle') {
            // ── Mil Circle ──────────────────────────────────
            const paperDiameterMM = (thing.milDiameter / 1000) * cardData.cordLength;

            const label = document.createElement('p');
            const moaVal = round3(milsToMoa(thing.milDiameter));
            label.textContent = `${thing.name} (${thing.milDiameter} mil / ${moaVal} MOA)`;
            subcard.appendChild(label);

            const circle = document.createElement('div');
            circle.classList.add('mil-circle');
            circle.style.width  = paperDiameterMM + 'mm';
            circle.style.height = paperDiameterMM + 'mm';
            subcard.appendChild(circle);

            // Crosshair lines inside circle
            const hLine = document.createElement('div');
            hLine.classList.add('mil-crosshair-h');
            circle.appendChild(hLine);
            const vLine = document.createElement('div');
            vLine.classList.add('mil-crosshair-v');
            circle.appendChild(vLine);

        } else {
            // ── Regular object ───────────────────────────────
            const label = document.createElement('p');
            label.textContent = `${thing.name} (h=${thing.height}m b=${thing.width}m)`;
            subcard.appendChild(label);

            // Scaled frames for each distance
            for (let i = 0; i < cardData.distances.length; i++) {
                const dist = cardData.distances[i];
                const frame = document.createElement('div');
                frame.classList.add('frame');
                frame.style.width  = calcToPaperLength(thing.width,  dist, cardData.cordLength) + 'mm';
                frame.style.height = calcToPaperLength(thing.height, dist, cardData.cordLength) + 'mm';

                // First frame gets background image
                if (i === 0) {
                    const imgUrl = thing.imageDataUrl || (LEGACY_IMAGES[thing.id] ? LEGACY_IMAGES[thing.id] : '');
                    if (imgUrl) {
                        frame.style.backgroundImage  = `url("${imgUrl}")`;
                        frame.style.backgroundSize   = '100% 100%';
                        frame.style.backgroundRepeat = 'no-repeat';
                    }
                }

                subcard.appendChild(frame);
            }
        }

        card.appendChild(subcard);
    }

    sheet.appendChild(card);
    attachDragHandlers(card);

    // Highlight selected
    if (selectedThingId) {
        const sel = card.querySelector(`.subcard[data-thing-id="${selectedThingId}"]`);
        if (sel) sel.classList.add('selected');
    }

    // Clone ×3
    for (let i = 0; i < 3; i++) {
        const clone = card.cloneNode(true);
        // Remove 'selected' class on clones (they're print-only copies)
        clone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        sheet.appendChild(clone);
    }

    updateUndoRedoButtons();
}

// ── Drag-to-Reposition ──────────────────────────────────────────────────────

function attachDragHandlers(card) {
    const subcards = card.querySelectorAll('.subcard');
    let dragging = null; // { thingId, startX, startY, origOffsetX, origOffsetY }

    subcards.forEach(sc => {
        sc.addEventListener('pointerdown', e => {
            e.preventDefault();
            const thingId = sc.dataset.thingId;
            const thing = cardData.things.find(t => t.id === thingId);
            if (!thing) return;

            // Select this thing
            selectThing(thingId);

            // Start drag
            dragging = {
                thingId,
                startX: e.clientX,
                startY: e.clientY,
                origOffsetX: thing.offsetX,
                origOffsetY: thing.offsetY,
            };

            pushUndo();
            sc.setPointerCapture(e.pointerId);
        });

        sc.addEventListener('pointermove', e => {
            if (!dragging || dragging.thingId !== sc.dataset.thingId) return;
            e.preventDefault();

            const pxPerMm = getPxPerMm(card);
            const dx = (e.clientX - dragging.startX) / pxPerMm;
            const dy = (e.clientY - dragging.startY) / pxPerMm;

            const thing = cardData.things.find(t => t.id === dragging.thingId);
            if (!thing) return;

            // Clamp within card bounds (allow overshoot so objects can be partially outside)
            thing.offsetX = clamp(dragging.origOffsetX + dx, -20, 115);
            thing.offsetY = clamp(dragging.origOffsetY + dy, -20, 60);

            // Live preview on this subcard only (don't full re-render during drag)
            sc.style.left = thing.offsetX + 'mm';
            sc.style.top  = thing.offsetY + 'mm';

            // Update sidebar fields
            populateThingFields(thing);
        });

        sc.addEventListener('pointerup', e => {
            if (!dragging || dragging.thingId !== sc.dataset.thingId) return;
            dragging = null;
            sc.releasePointerCapture(e.pointerId);
            renderCard();
            autoSave();
        });
    });
}

function getPxPerMm(card) {
    const rect = card.getBoundingClientRect();
    return rect.width / 120; // card is 120mm wide
}

function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}

// ── Editor Panel Logic ──────────────────────────────────────────────────────

function selectThing(thingId) {
    selectedThingId = thingId;
    const thing = cardData.things.find(t => t.id === thingId);

    // Update selector
    const sel = document.getElementById('thing-select');
    if (sel) sel.value = thingId;

    // Update fields
    if (thing) populateThingFields(thing);

    // Update visual highlight
    document.querySelectorAll('.sheet > .card:first-of-type .subcard').forEach(sc => {
        sc.classList.toggle('selected', sc.dataset.thingId === thingId);
    });
}

function populateThingFields(thing) {
    const isMil = thing.type === 'milCircle';

    setVal('thing-name',    thing.name);
    setVal('thing-offsetX', Math.round(thing.offsetX * 10) / 10);
    setVal('thing-offsetY', Math.round(thing.offsetY * 10) / 10);

    // Show/hide fields based on type
    toggleFieldVisibility('thing-height',      !isMil);
    toggleFieldVisibility('thing-width',       !isMil);
    toggleFieldVisibility('thing-milDiameter', isMil);
    toggleFieldVisibility('thing-moaDiameter', isMil);
    toggleFieldVisibility('thing-image',       !isMil);
    toggleFieldVisibility('clear-image-btn',   !isMil);

    if (isMil) {
        setVal('thing-milDiameter', round3(thing.milDiameter));
        setVal('thing-moaDiameter', round3(milsToMoa(thing.milDiameter)));
    } else {
        setVal('thing-height', thing.height);
        setVal('thing-width',  thing.width);
    }
}

function toggleFieldVisibility(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    // Hide the label too (previous sibling if it's a <label>)
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL') {
        prev.style.display = visible ? '' : 'none';
    }
    el.style.display = visible ? '' : 'none';
}

function round3(v) { return Math.round(v * 1000) / 1000; }

function populateGlobalFields() {
    setVal('cord-length', cardData.cordLength);
    setVal('distances',   cardData.distances.join(', '));
}

function populateThingSelect() {
    const sel = document.getElementById('thing-select');
    if (!sel) return;
    sel.innerHTML = '';
    for (const thing of cardData.things) {
        const opt = document.createElement('option');
        opt.value = thing.id;
        const prefix = thing.type === 'milCircle' ? '⊕ ' : '';
        opt.textContent = prefix + thing.name;
        sel.appendChild(opt);
    }
    if (selectedThingId) sel.value = selectedThingId;
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function getNumVal(id) {
    return parseFloat(getVal(id)) || 0;
}

function getSelectedThing() {
    return cardData.things.find(t => t.id === selectedThingId);
}

// ── Editor Event Wiring ─────────────────────────────────────────────────────

function wireEditor() {
    // Global fields
    on('cord-length', 'input', () => {
        pushUndo();
        cardData.cordLength = getNumVal('cord-length');
        renderCard();
        autoSave();
    });

    on('distances', 'change', () => {
        pushUndo();
        const raw = getVal('distances');
        const parsed = raw.split(/[,;\s]+/).map(Number).filter(n => n > 0);
        if (parsed.length > 0) {
            cardData.distances = parsed;
            renderCard();
            autoSave();
        }
    });

    // Thing selector
    on('thing-select', 'change', () => {
        selectThing(getVal('thing-select'));
    });

    // Thing property fields
    const thingFields = ['thing-name', 'thing-height', 'thing-width', 'thing-milDiameter', 'thing-moaDiameter', 'thing-offsetX', 'thing-offsetY'];
    for (const field of thingFields) {
        on(field, 'change', () => {
            const thing = getSelectedThing();
            if (!thing) return;
            pushUndo();
            thing.name    = getVal('thing-name');
            thing.offsetX = getNumVal('thing-offsetX');
            thing.offsetY = getNumVal('thing-offsetY');
            if (thing.type === 'milCircle') {
                if (field === 'thing-moaDiameter') {
                    // MOA changed → convert to mils
                    thing.milDiameter = round3(moaToMils(getNumVal('thing-moaDiameter')));
                    setVal('thing-milDiameter', round3(thing.milDiameter));
                } else {
                    // Mils changed → update MOA
                    thing.milDiameter = getNumVal('thing-milDiameter');
                    setVal('thing-moaDiameter', round3(milsToMoa(thing.milDiameter)));
                }
            } else {
                thing.height  = getNumVal('thing-height');
                thing.width   = getNumVal('thing-width');
            }
            populateThingSelect();
            renderCard();
            autoSave();
        });
    }

    // Image upload
    on('thing-image', 'change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const thing = getSelectedThing();
        if (!thing) return;

        if (file.size > IMAGE_MAX_BYTES) {
            if (!confirm(
                `Bilden är ${(file.size / 1024).toFixed(0)} KB, vilket överstiger gränsen ` +
                `på ${IMAGE_MAX_BYTES / 1024} KB.\nBilden kommer att skalas ner automatiskt. Fortsätt?`
            )) {
                e.target.value = '';
                return;
            }
            // Resize via off-screen canvas
            resizeImage(file, 800, 800, (dataUrl) => {
                pushUndo();
                thing.imageDataUrl = dataUrl;
                renderCard();
                autoSave();
            });
        } else {
            const reader = new FileReader();
            reader.onload = () => {
                pushUndo();
                thing.imageDataUrl = reader.result;
                renderCard();
                autoSave();
            };
            reader.readAsDataURL(file);
        }
    });

    // Clear image
    on('clear-image-btn', 'click', () => {
        const thing = getSelectedThing();
        if (!thing) return;
        pushUndo();
        thing.imageDataUrl = '';
        document.getElementById('thing-image').value = '';
        renderCard();
        autoSave();
    });

    // Add thing
    on('add-thing-btn', 'click', () => {
        pushUndo();
        const id = 'thing_' + Date.now();
        cardData.things.push({
            id,
            name: 'Nytt objekt',
            height: 1.8,
            width: 1.0,
            imageDataUrl: '',
            offsetX: 0,
            offsetY: 0,
        });
        selectedThingId = id;
        populateThingSelect();
        selectThing(id);
        renderCard();
        autoSave();
    });

    // Add mil circle
    on('add-circle-btn', 'click', () => {
        pushUndo();
        const id = 'circle_' + Date.now();
        cardData.things.push({
            id,
            type: 'milCircle',
            name: 'Ny cirkel',
            milDiameter: 5,
            offsetX: 0,
            offsetY: 0,
        });
        selectedThingId = id;
        populateThingSelect();
        selectThing(id);
        renderCard();
        autoSave();
    });

    // Delete thing
    on('delete-thing-btn', 'click', () => {
        if (cardData.things.length === 0) return;
        const thing = getSelectedThing();
        if (!thing) return;
        if (!confirm(`Ta bort "${thing.name}"?`)) return;
        pushUndo();
        cardData.things = cardData.things.filter(t => t.id !== thing.id);
        selectedThingId = cardData.things[0]?.id || null;
        populateThingSelect();
        if (selectedThingId) selectThing(selectedThingId);
        renderCard();
        autoSave();
    });

    // Save / Load / Export / Import
    on('save-btn', 'click', () => saveToStorage());
    on('load-btn', 'click', () => { loadFromStorage(); afterDataChange(true); });

    on('export-btn', 'click', exportJSON);
    on('import-file', 'change', importJSON);

    // Undo / Redo
    on('undo-btn', 'click', undo);
    on('redo-btn', 'click', redo);

    // Reset to defaults
    on('reset-btn', 'click', () => {
        if (!confirm('Återställ alla ändringar till standardvärdena?')) return;
        pushUndo();
        cardData = structuredClone(DEFAULT_CARD_DATA);
        afterDataChange(true);
    });

    // Print mode
    on('print-mode-btn', 'click', () => {
        document.body.classList.add('print-mode');
    });

    on('exit-print-mode-btn', 'click', () => {
        document.body.classList.remove('print-mode');
    });

    on('print-now-btn', 'click', () => {
        window.print();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        // Escape exits print mode
        if (e.key === 'Escape' && document.body.classList.contains('print-mode')) {
            document.body.classList.remove('print-mode');
            return;
        }
        // Don't trigger shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey)  { e.preventDefault(); redo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y')                { e.preventDefault(); redo(); }
    });
}

function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// ── Image Resizing ──────────────────────────────────────────────────────────

function resizeImage(file, maxW, maxH, callback) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
            const scale = Math.min(maxW / w, maxH / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(url);
        callback(dataUrl);
    };
    img.src = url;
}

// ── Persistence ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cardData';

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cardData));
    } catch (e) {
        alert('Kunde inte spara – localStorage kan vara fullt.\n\n' + e.message);
    }
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.things) && parsed.things.length > 0) {
                cardData = parsed;
                return true;
            }
        }
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
    }
    return false;
}

function autoSave() {
    saveToStorage();
}

function afterDataChange(resetSelection) {
    if (resetSelection || !cardData.things.find(t => t.id === selectedThingId)) {
        selectedThingId = cardData.things[0]?.id || null;
    }
    populateGlobalFields();
    populateThingSelect();
    if (selectedThingId) selectThing(selectedThingId);
    renderCard();
    autoSave();
}

// ── JSON Export / Import ────────────────────────────────────────────────────

function exportJSON() {
    const json = JSON.stringify(cardData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            if (!parsed || !Array.isArray(parsed.things)) {
                alert('Ogiltig JSON-fil – saknar "things"-array.');
                return;
            }
            // Validate each thing has required fields
            for (const t of parsed.things) {
                if (!t.id || !t.name) {
                    alert(`Ogiltigt objekt: "${t.name || t.id || '?'}" – saknar id/namn.`);
                    return;
                }
                if (t.type === 'milCircle') {
                    if (typeof t.milDiameter !== 'number' || t.milDiameter <= 0) {
                        alert(`Ogiltigt milcirkel-objekt: "${t.name}" – saknar giltig milDiameter.`);
                        return;
                    }
                } else {
                    if (typeof t.height !== 'number' || typeof t.width !== 'number') {
                        alert(`Ogiltigt objekt: "${t.name}" – saknar höjd/bredd.`);
                        return;
                    }
                }
                // Ensure offset fields exist
                t.offsetX = t.offsetX || 0;
                t.offsetY = t.offsetY || 0;
                t.imageDataUrl = t.imageDataUrl || '';
            }
            pushUndo();
            cardData = parsed;
            afterDataChange(true);
        } catch (err) {
            alert('Kunde inte läsa JSON-filen.\n\n' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // allow re-importing same file
}

// ── Init ────────────────────────────────────────────────────────────────────

window.onload = async function () {
    const hadLocalData = loadFromStorage();

    // If no localStorage data, try loading card.json as seed
    if (!hadLocalData) {
        try {
            const resp = await fetch('card.json');
            if (resp.ok) {
                const json = await resp.json();
                if (json && Array.isArray(json.things)) {
                    cardData = json;
                }
            }
        } catch (_) { /* no card.json available – start empty */ }
    }

    selectedThingId = cardData.things[0]?.id || null;
    populateGlobalFields();
    populateThingSelect();
    if (selectedThingId) selectThing(selectedThingId);
    wireEditor();
    renderCard();
};

