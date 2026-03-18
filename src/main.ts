import { 
    bootstrapCameraKit, 
    Transform2D, 
    createMediaStreamSource 
} from "@snap/camera-kit";
import type { CameraKit, CameraKitSession, Lens } from "@snap/camera-kit";

// --- CONFIGURATION ---
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzcxMjM1MTAxLCJzdWIiOiJlZTQ3ODJmNy1kYzc4LTRhMTMtYjkzYi03MzkzMTY2NmI2MTN-UFJPRFVDVElPTn4xMGNjNzliZi1lOGNlLTQ3MWMtYWU5ZS05MzlmMjY2MTJhZGEifQ.mAsyTbRtq05hZ7L3QmugETkMnbUG9pPsWQHLtl1p0eg';
const GROUP_ID = '9a8a3471-077b-419f-bcfe-3f9d241030d4';

// Contraintes de capture caméra (HD 720p équilibré)
const CAMERA_CONSTRAINTS = {
    video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30 }
    }
};

let session: CameraKitSession;
let cameraKit: CameraKit;

/**
 * PROFILER : Analyse en temps réel pour détecter les goulots d'étranglement
 */
function startPerformanceProfiler(session: CameraKitSession) {
    const measurement = session.metrics.beginMeasurement();
    setInterval(() => {
        const stats = measurement.measure();
        if (!stats) return;

        const totalTime = stats.lensFrameProcessingTimeMsAvg;
        const fps = Math.round(stats.avgFps);
        const stability = stats.lensFrameProcessingTimeMsStd;

        console.groupCollapsed(`📊 Stats Perf: ${fps} FPS`);
        console.table({
            "Latence (ms)": totalTime.toFixed(2),
            "Instabilité (ms)": stability.toFixed(2),
            "Charge": totalTime > 20 ? "ÉLEVÉE ⚠️" : "OK ✅"
        });
        console.groupEnd();
    }, 5000);
}

/**
 * OPTIMISATION : Calcule la meilleure résolution de rendu selon l'écran
 */
function updateOptimizedSize(source: any) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // On limite le calcul interne à 720 pixels max (le sweet spot performance)
    const MAX_RENDER_RES = 1080; 
    const scale = Math.min(MAX_RENDER_RES / Math.max(w, h), 1);
    
    const targetW = Math.floor(w * scale);
    const targetH = Math.floor(h * scale);

    source.setRenderSize(targetW, targetH);
}

/**
 * UI : Génération du carrousel de Lenses
 */
function createLensElement(lens: Lens, onClick: () => void) {
    const div = document.createElement('div');
    div.className = 'lens-item';
    div.style.cssText = "cursor:pointer; margin:10px; transition: transform 0.2s;";
    
    const icon = lens.iconUrl || '';
    div.innerHTML = `<img src="${icon}" style="width:70px; height:70px; border-radius:50%; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3)">`;
    
    div.addEventListener('mouseenter', () => div.style.transform = "scale(1.1)");
    div.addEventListener('mouseleave', () => div.style.transform = "scale(1)");
    div.addEventListener('click', onClick);
    return div;
}

async function loadLenses(groupId: string) {
    const carousel = document.getElementById("lens-carousel");
    if (!carousel) return;
    
    try {
        const { lenses } = await cameraKit.lensRepository.loadLensGroups([groupId]);
        carousel.innerHTML = "";
        lenses.forEach(lens => {
            carousel.appendChild(createLensElement(lens, () => session.applyLens(lens)));
        });
    } catch (err) {
        console.error("Erreur chargement Lenses:", err);
    }
}

/**
 * INITIALISATION PRINCIPALE
 */
async function init() {
    try {
        // 1. Initialisation SDK
        cameraKit = await bootstrapCameraKit({ apiToken: API_TOKEN });
        session = await cameraKit.createSession();

        // 2. Capture Caméra avec les nouvelles contraintes HD
        const mediaStream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
        const source = createMediaStreamSource(mediaStream);
        await session.setSource(source);
        
        // 3. Configuration visuelle
        source.setTransform(Transform2D.MirrorX);
        updateOptimizedSize(source);

        // 4. Injection du Canvas dans le DOM avec style "Fullscreen Cover"
        const placeholder = document.getElementById("canvas-output");
        if (placeholder) {
            const canvas = session.output.live;
            canvas.style.width = "100vw";
            canvas.style.height = "100vh";
            canvas.style.objectFit = "cover"; // Évite les bandes noires
            canvas.style.display = "block";
            placeholder.replaceWith(canvas);
        }

        // 5. Démarrage des outils et du rendu
        startPerformanceProfiler(session);
        await loadLenses(GROUP_ID);
        session.play("live");

        // 6. Gestionnaire de redimensionnement "debounced" (plus fluide)
        let resizeTimeout: any;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => updateOptimizedSize(source), 250);
        });

    } catch (e) {
        console.error("Erreur fatale lors de l'initialisation:", e);
        if (e.name === 'NotAllowedError') {
            alert("Accès caméra refusé. Veuillez autoriser la caméra pour tester les filtres.");
        }
    }
}

// Lancement au chargement de la page
window.addEventListener("load", init);