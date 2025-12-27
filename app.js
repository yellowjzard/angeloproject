let playlist = [];

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('results-container');
const tracksBody = document.getElementById('tracks-body');

const camelotWheel = {
    'C Major': '8B', 'C# Major': '3B', 'D Major': '10B', 'D# Major': '5B',
    'E Major': '12B', 'F Major': '7B', 'F# Major': '2B', 'G Major': '9B',
    'G# Major': '4B', 'A Major': '11B', 'A# Major': '6B', 'B Major': '1B',
    'A Minor': '8A', 'A# Minor': '3A', 'B Minor': '10A', 'C Minor': '5A',
    'C# Minor': '12A', 'D Minor': '7A', 'D# Minor': '2A', 'E Minor': '9A',
    'F Minor': '4A', 'F# Minor': '11A', 'G Minor': '6A', 'G# Minor': '1A'
};

// Eventi di caricamento
dropZone.onclick = () => fileInput.click();
fileInput.onchange = (e) => handleFiles(e.target.files);

async function handleFiles(files) {
    if (files.length === 0) return;
    
    loader.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    playlist = [];

    for (let file of files) {
        document.getElementById('loader-text').innerText = `Analizzando: ${file.name.substring(0, 20)}...`;
        const result = await analyzeTrack(file);
        playlist.push(result);
    }

    loader.classList.add('hidden');
    renderTable();
    resultsContainer.classList.remove('hidden');
}

async function analyzeTrack(file) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Calcolo BPM
    const bpm = calculateBPM(audioBuffer);
    
    // Per ora assegniamo una tonalità random per la demo (implementeremo Pitch Detection poi)
    const keys = Object.keys(camelotWheel);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];

    return {
        name: file.name,
        bpm: bpm,
        key: randomKey,
        camelot: camelotWheel[randomKey],
        camelotNumber: parseInt(camelotWheel[randomKey])
    };
}

function calculateBPM(buffer) {
    const data = buffer.getChannelData(0);
    const step = 200;
    let peaks = [];
    let threshold = 0.7;

    for (let i = 0; i < data.length; i += step) {
        if (data[i] > threshold) {
            peaks.push(i);
            i += 10000; // Salta un intervallo per evitare lo stesso picco
        }
    }

    if (peaks.length < 2) return 128; // Valore di fallback

    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i-1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    let bpm = Math.round(60 / (avgInterval / buffer.sampleRate));

    while (bpm < 75) bpm *= 2;
    while (bpm > 185) bpm /= 2;
    return bpm;
}

function renderTable() {
    tracksBody.innerHTML = '';
    playlist.forEach(t => {
        tracksBody.innerHTML += `
            <tr>
                <td>${t.name}</td>
                <td><strong>${t.bpm}</strong></td>
                <td>${t.key}</td>
                <td><span class="camelot-tag">${t.camelot}</span></td>
            </tr>
        `;
    });
}

function sortTracks(type) {
    if (type === 'bpm') playlist.sort((a, b) => a.bpm - b.bpm);
    if (type === 'camelot') playlist.sort((a, b) => a.camelotNumber - b.camelotNumber);
    renderTable();
}
