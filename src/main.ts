import { 
    bootstrapCameraKit, 
    Transform2D, 
    createMediaStreamSource 
} from "@snap/camera-kit";
import type { CameraKit, CameraKitSession, Lens } from "@snap/camera-kit";

const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzcxMjM1MTAxLCJzdWIiOiJlZTQ3ODJmNy1kYzc4LTRhMTMtYjkzYi03MzkzMTY2NmI2MTN-UFJPRFVDVElPTn4xMGNjNzliZi1lOGNlLTQ3MWMtYWU5ZS05MzlmMjY2MTJhZGEifQ.mAsyTbRtq05hZ7L3QmugETkMnbUG9pPsWQHLtl1p0eg';
const GROUP_ID = '9a8a3471-077b-419f-bcfe-3f9d241030d4';

let session: CameraKitSession;
let cameraKit: CameraKit;

/**
 * PROFILER ANALYTIQUE : Décompose la consommation par type d'élément
 */
function startPerformanceProfiler(session: CameraKitSession) {
    const measurement = session.metrics.beginMeasurement();

    setInterval(() => {
        const stats = measurement.measure();
        if (!stats) return;

        // Extraction des données de ton interface ComputedFrameMetrics
        const totalTime = stats.lensFrameProcessingTimeMsAvg;
        const fps = Math.round(stats.avgFps);
        const stability = stats.lensFrameProcessingTimeMsStd; // Écart-type (instabilité)

        console.group(`📊 Diagnostic Performance (${fps} FPS)`);
        
        console.table({
            "Moyenne Globale (ms)": totalTime.toFixed(2),
            "Instabilité (ms)": stability.toFixed(2),
            "Frames traitées": stats.lensFrameProcessingN
        });

        // --- DÉTECTION DU COUPABLE PAR CATÉGORIE ---

        if (stability > 5) {
            console.warn("⚠️ COUPABLE : SCRIPTS JS. Une forte instabilité indique des boucles ou des calculs lourds dans tes scripts Lens Studio.");
        }

        if (totalTime > 25 && stability < 2) {
            console.warn("⚠️ COUPABLE : 3D / SHADERS. Un temps long mais constant indique que le GPU sature sur le rendu des objets ou des effets visuels.");
        }

        if (totalTime > 15) {
            // Rappel de l'erreur "Model conversion not supported" vue dans ta console
            console.info("💡 COUPABLE POTENTIEL : IA / TRACKING. Si tu utilises la segmentation ou le face-mask, le CPU est surchargé car l'accélération matérielle est désactivée.");
        }

        console.groupEnd();
    }, 3000);
}

/**
 * RÉSOLUTION : Évite le zoom et réduit la charge de transfert
 */
function updateOptimizedSize(source: any) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // Pour diagnostiquer, on baisse à 540p. 
    // Si tes FPS remontent, c'est que le transfert CPU->GPU était le problème.
    const MAX_RES = 540; 
    const scale = Math.min(MAX_RES / w, MAX_RES / h, 1);
    
    source.setRenderSize(Math.floor(w * scale), Math.floor(h * scale));
}

// --- LOGIQUE UI ---

function createLensElement(lens: Lens, onClick: () => void) {
    const div = document.createElement('div');
    div.className = 'lens-item';
    const icon = lens.iconUrl || '';
    div.innerHTML = `<img src="${icon}" style="width:60px; height:60px; border-radius:50%">`;
    div.addEventListener('click', onClick);
    return div;
}

async function loadLenses(groupId: string) {
    const carousel = document.getElementById("lens-carousel");
    if (!carousel) return;
    const { lenses } = await cameraKit.lensRepository.loadLensGroups([groupId]);
    carousel.innerHTML = "";
    lenses.forEach(lens => {
        carousel.appendChild(createLensElement(lens, () => session.applyLens(lens)));
    });
}

// --- INIT ---

async function init() {
    try {
        cameraKit = await bootstrapCameraKit({ apiToken: API_TOKEN });
        session = await cameraKit.createSession();

        startPerformanceProfiler(session);

        const placeholder = document.getElementById("canvas-output");
        if (placeholder) placeholder.replaceWith(session.output.live);

        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const source = createMediaStreamSource(mediaStream);
        await session.setSource(source);
        
        source.setTransform(Transform2D.MirrorX);
        updateOptimizedSize(source);

        await loadLenses(GROUP_ID);
        session.play("live");

        window.addEventListener("resize", () => updateOptimizedSize(source));

    } catch (e) {
        console.error(e);
    }
}

window.addEventListener("load", init);











// import { 
//     bootstrapCameraKit, 
//     Transform2D, 
//     createMediaStreamSource 
// } from "@snap/camera-kit";
// import type { CameraKit, CameraKitSession, Lens } from "@snap/camera-kit";

// // Configuration
// const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzcxMjM1MTAxLCJzdWIiOiJlZTQ3ODJmNy1kYzc4LTRhMTMtYjkzYi03MzkzMTY2NmI2MTN-U1RBR0lOR35hMjQxOTNjMS1hNmFhLTQxMjktOWI2NS02YjQyNzhiNTMzNzkifQ.LK-oQLS-40TBs0135JbCOoNs_VEk4WgGH3bffT_YBlc';
// const GROUP_ID = '9a8a3471-077b-419f-bcfe-3f9d241030d4';

// let session: CameraKitSession;
// let cameraKit: CameraKit;

// /**
//  * Crée un élément visuel pour le carrousel de Lenses
//  */
// function createLensElement(lens: Lens, onClick: () => void) {
//     const div = document.createElement('div');
//     div.className = 'lens-item';
//     div.id = `lens-${lens.id}`;
//     
//     // Correction de l'erreur : on utilise iconUrl qui est toujours présent
//     const icon = lens.iconUrl || 'https://app.snapchat.com/itpa/images/lens-icon-placeholder.png';
//     
//     div.innerHTML = `<img src="${icon}" alt="${lens.name}">`;
//     
//     div.addEventListener('click', () => {
//         // Gestion visuelle de la sélection
//         document.querySelectorAll('.lens-item').forEach(el => el.classList.remove('active'));
//         div.classList.add('active');
//         
//         // Centrage automatique du filtre cliqué
//         div.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
//         
//         onClick();
//     });
//     
//     return div;
// }

// /**
//  * Charge les filtres et peuple le carrousel
//  */
// async function loadLenses(groupId: string) {
//     const carousel = document.getElementById("lens-carousel");
//     if (!carousel) return;

//     try {
//         const { lenses } = await cameraKit.lensRepository.loadLensGroups([groupId]);
//         carousel.innerHTML = ""; // Vide le "Chargement..."

//         for (const [index, lens] of lenses.entries()) {
//             const lensEl = createLensElement(lens, async () => {
//                 await session.applyLens(lens);
//             });
//             carousel.appendChild(lensEl);

//             // Applique le premier filtre par défaut au démarrage
//             if (index === 0) {
//                 lensEl.classList.add('active');
//                 await session.applyLens(lens);
//             }
//         }
//     } catch (error) {
//         console.error("CameraKit: Erreur de chargement des filtres", error);
//     }
// }

// /**
//  * Initialisation de l'application
//  */
// async function init() {
//     try {
//         // 1. Initialisation SDK
//         cameraKit = await bootstrapCameraKit({ apiToken: API_TOKEN });
//         session = await cameraKit.createSession();

//         // 2. Rendu Vidéo
//         const placeholder = document.getElementById("canvas-output");
//         if (placeholder) {
//             placeholder.replaceWith(session.output.live);
//         }

//         // 3. Accès Caméra
//         const mediaStream = await navigator.mediaDevices.getUserMedia({ 
//             video: { 
//                 width: { ideal: 1280 }, 
//                 height: { ideal: 720 }, 
//                 facingMode: "user" 
//             } 
//         });

//         const source = createMediaStreamSource(mediaStream);
//         await session.setSource(source);
//         
//         // 4. Configuration visuelle
//         source.setTransform(Transform2D.MirrorX);
//         source.setRenderSize(window.innerWidth, window.innerHeight);

//         // 5. Chargement des Lenses dans le carrousel
//         await loadLenses(GROUP_ID);

//         session.play("live");

//         // 6. Gestion du redimensionnement
//         window.addEventListener("resize", () => {
//             source.setRenderSize(window.innerWidth, window.innerHeight);
//         });

//     } catch (error: any) {
//         if (error.name === 'LegalError') {
//             console.warn("L'utilisateur n'a pas accepté les conditions Snap.");
//         } else {
//             console.error("CameraKit: Échec de l'initialisation", error);
//         }
//     }
// }

// window.addEventListener("load", init);