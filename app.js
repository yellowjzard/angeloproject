let playlist = [];

// Elementi DOM
const fileInput = document.getElementById('file-input');
const folderInput = document.getElementById('folder-input');
const folderBtn = document.getElementById('folder-btn');
const dropZone = document.getElementById('drop-zone');
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('results-container');
const tracksBody = document.getElementById('tracks-body');

// Mappa Camelot Wheel
const camelotWheel = {
    'C Major': '8B', 'C# Major': '3B', 'D Major': '10B', 'D# Major': '5B',
    'E Major': '12B', 'F Major': '7B', 'F# Major': '2B', 'G Major': '9B',
    'G# Major': '4B', 'A Major': '11B', 'A# Major': '6B', 'B Major': '1B',
    'A Minor': '8A', 'A# Minor': '3A', 'B Minor': '10A', 'C Minor': '5A',
    'C# Minor': '12A', 'D Minor': '7A', 'D# Minor': '2A', 'E Minor': '9A',
    'F Minor': '4A', 'F# Minor': '11A', 'G Minor': '6A', 'G# Minor': '1A'
};

// --- EVENTI ---
dropZone.onclick = () => fileInput.click();
folderBtn.onclick = () => folderInput.click();

fileInput.onchange = (e) => handleFiles(e.target.files);
folderInput.onchange = (e) => handleFiles(e.target.files);

// --- GESTIONE FILE ---
async function handleFiles(files) {
    if (files.length === 0) return;
    
    loader.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    
    // Resetta playlist ad ogni nuovo caricamento (rimuovi questa riga se vuoi aggiungere in coda)
    playlist = []; 

    // Filtra solo file audio
    let audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
        alert("Nessun file audio trovato nella selezione.");
        loader.classList.add('hidden');
        return;
    }

    for (let i = 0; i < audioFiles.length; i++) {
        let file = audioFiles[i];
        document.getElementById('loader-text').innerText = `Analizzando ${i+1}/${audioFiles.length}: ${file.name}`;
        try {
            const result = await analyzeTrack(file);
            playlist.push(result);
        } catch (err) {
            console.error("Errore analisi file:", file.name, err);
        }
    }

    loader.classList.add('hidden');
    renderTable();
    resultsContainer.classList.remove('hidden');
}

// --- ANALISI (BPM + KEY SIMULATA) ---
async function analyzeTrack(file) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Calcolo BPM
    const bpm = calculateBPM(audioBuffer);
    
    // NOTA: Assegnazione Key Casuale (Demo). 
    // In un'app reale qui useresti una libreria FFT per Pitch Detection.
    const keys = Object.keys(camelotWheel);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const camelotCode = camelotWheel[randomKey];

    // Parsing Camelot (es. "8B" diventa numero 8 e lettera B)
    const match = camelotCode.match(/(\d+)([AB])/);

    return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace(/\.[^/.]+$/, ""), // Rimuove estensione
        bpm: bpm,
        key: randomKey,
        camelot: camelotCode,
        camNum: parseInt(match[1]),
        camChar: match[2]
    };
}

function calculateBPM(buffer) {
    const data = buffer.getChannelData(0);
    const step = 500; // Ottimizzazione: salta campioni per velocità
    let peaks = [];
    let threshold = 0.65;

    for (let i = 0; i < data.length; i += step) {
        if (data[i] > threshold) {
            peaks.push(i);
            i += 10000; 
        }
    }

    if (peaks.length < 2) return 128; // Fallback

    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i-1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    let bpm = Math.round(60 / (avgInterval / buffer.sampleRate));

    // Normalizzazione BPM nel range tipico DJ (70-180)
    while (bpm < 70) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    return bpm;
}

// --- RENDERING TABELLA ---
function renderTable() {
    tracksBody.innerHTML = '';
    playlist.forEach((t, index) => {
        tracksBody.innerHTML += `
            <tr class="track-row">
                <td>${index + 1}</td>
                <td>${t.name}</td>
                <td><strong>${t.bpm}</strong></td>
                <td>${t.key}</td>
                <td><span class="camelot-tag">${t.camelot}</span></td>
            </tr>
        `;
    });
}

// --- ORDINAMENTO CLASSICO ---
function sortTracks(type) {
    if (type === 'bpm') playlist.sort((a, b) => a.bpm - b.bpm);
    if (type === 'camelot') playlist.sort((a, b) => {
        // Ordina prima per numero, poi per lettera
        if (a.camNum === b.camNum) return a.camChar.localeCompare(b.camChar);
        return a.camNum - b.camNum;
    });
    renderTable();
}

// --- ALGORITMO SMART MIX (IL CUORE DELL'APP) ---
function smartMix() {
    if (playlist.length < 2) return;

    // 1. Ordina inizialmente per BPM per trovare il punto di partenza più lento
    playlist.sort((a, b) => a.bpm - b.bpm);
    
    let sortedList = [playlist.shift()]; // Prendi la prima traccia (la più lenta)
    let pool = [...playlist]; // Il resto delle tracce disponibili

    // 2. Cicla finché ci sono tracce nel pool
    while (pool.length > 0) {
        let current = sortedList[sortedList.length - 1]; // L'ultima traccia aggiunta
        let bestMatchIndex = -1;
        let bestScore = -Infinity;

        for (let i = 0; i < pool.length; i++) {
            let candidate = pool[i];
            let score = calculateMixScore(current, candidate);
            
            // Logica semplice: se il punteggio è migliore, diventa il nuovo candidato
            if (score > bestScore) {
                bestScore = score;
                bestMatchIndex = i;
            }
        }

        // Sposta la traccia migliore dal pool alla lista ordinata
        if (bestMatchIndex > -1) {
            sortedList.push(pool[bestMatchIndex]);
            pool.splice(bestMatchIndex, 1);
        } else {
            // Caso raro: se nessuna corrisponde, prendi la prima rimasta
            sortedList.push(pool.shift());
        }
    }

    playlist = sortedList;
    renderTable();
    alert("Set ottimizzato! Le tracce sono ora in ordine di mixaggio. 🎧");
}

// Calcola il punteggio di compatibilità tra due brani
function calculateMixScore(trackA, trackB) {
    let score = 0;

    // A. Compatibilità BPM (massimo 50 punti)
    let bpmDiff = Math.abs(trackA.bpm - trackB.bpm);
    if (bpmDiff <= 2) score += 50;       // Perfetto
    else if (bpmDiff <= 4) score += 40;  // Ottimo
    else if (bpmDiff <= 8) score += 20;  // Mixabile con pitch
    else score -= bpmDiff * 2;           // Troppo distanti, penalità

    // B. Compatibilità Armonica (Camelot) (massimo 40 punti)
    let numDiff = Math.abs(trackA.camNum - trackB.camNum);
    let sameChar = trackA.camChar === trackB.camChar;

    if (trackA.camelot === trackB.camelot) {
        score += 40; // Stessa identica chiave (Power mixing)
    } else if (numDiff === 0 && !sameChar) {
        score += 35; // Cambio modo (es. 8A -> 8B)
    } else if ((numDiff === 1 || numDiff === 11) && sameChar) {
        score += 30; // Adiacente (es. 8A -> 9A) - Mix armonico classico
    } else if (numDiff === 1 && !sameChar) {
        score += 15; // Diagonale (meno sicuro)
    } else {
        score -= 10; // Chiave non armonica
    }

    return score;
}

// --- EXPORT PDF ---
function exportPDF() {
    if (playlist.length === 0) {
        alert("Nessuna traccia da esportare!");
        return;
    }

    // Accesso alla libreria jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Intestazione PDF
    doc.setFillColor(10, 10, 12); // Sfondo scuro per header
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(0, 242, 255); // Colore ciano
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("DJ Analyzer - Set Report", 14, 20);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generato il: ${new Date().toLocaleDateString()} - Tracce: ${playlist.length}`, 14, 30);

    // Preparazione Dati Tabella
    const tableColumn = ["#", "Titolo", "BPM", "Camelot", "Key"];
    const tableRows = [];

    playlist.forEach((t, i) => {
        const trackData = [
            i + 1,
            t.name,
            t.bpm,
            t.camelot,
            t.key
        ];
        tableRows.push(trackData);
    });

    // Generazione Tabella
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'striped',
        headStyles: { 
            fillColor: [112, 0, 255], // Viola secondario
            textColor: [255, 255, 255], 
            fontStyle: 'bold' 
        },
        styles: { 
            fontSize: 10,
            cellPadding: 4 
        },
        alternateRowStyles: { 
            fillColor: [245, 245, 245] 
        }
    });

    // Salvataggio
    doc.save(`DJ_Set_Scaletta_${Date.now()}.pdf`);
}
