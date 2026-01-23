import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";

// Add the user's access token from environment variables
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;

// Initialize the viewer
const viewer = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
});

// Camera FlyTo removed to allow zooming to assets
// Weather initialization will be handled at the end of the file

// Load Custom Ion Assets
const assets = [
    { id: 4371213, name: 'Jogging Track' },
    { id: 4371161, name: 'Kung Fu Statue' },
    { id: 4371077, name: 'Boulevard' }
];

// Load all assets
Promise.all(assets.map(async (asset) => {
    try {
        const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(asset.id);
        // Monitor for tile loading errors
        tileset.tileFailed.addEventListener((error) => {
            console.warn(`Tile failed to load in ${asset.name}:`, error);
        });
        viewer.scene.primitives.add(tileset);
        console.log(`Loaded ${asset.name}`);
        return tileset;
    } catch (error) {
        console.error(`Failed to load ${asset.name}:`, error);
        return null;
    }
})).then((tilesets) => {
    // Zoom to the first successfully loaded tileset to ensure visibility
    const validTilesets = tilesets.filter(t => t !== null);
    if (validTilesets.length > 0) {
        viewer.zoomTo(validTilesets[0]);
    }
});

// OSM Buildings commented out to focus on custom assets
// Cesium.createOsmBuildingsAsync().then(function (buildingTileset) {
//     viewer.scene.primitives.add(buildingTileset);
// });

// --- Weather System ---

// Pre-loaded image elements
let rainImageElement = null;
let snowImageElement = null;

// Create particle textures using canvas
function createParticleTextureUrl(width, height, color) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    return canvas.toDataURL();
}

// Create actual image elements from canvas and wait for load
function createParticleImage(width, height, color) {
    return new Promise((resolve) => {
        const dataUrl = createParticleTextureUrl(width, height, color);
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = dataUrl;
    });
}

// Initialize particle images
async function initParticleImages() {
    rainImageElement = await createParticleImage(5, 15, 'rgba(100, 180, 255, 0.8)');
    snowImageElement = await createParticleImage(8, 8, 'rgba(255, 255, 255, 0.9)');
    console.log('Particle images loaded');
}

// Initialize images on startup
// Initialize images on startup
await initParticleImages();

let currentSystem = null;

function createRainSystem() {
    if (!rainImageElement) {
        console.error('Rain image not loaded yet!');
        return null;
    }

    const system = new Cesium.ParticleSystem({
        image: rainImageElement,
        startColor: Cesium.Color.CYAN.withAlpha(0.6),
        endColor: Cesium.Color.CYAN.withAlpha(0.1),
        startScale: 1.0,
        endScale: 0.5,
        minimumParticleLife: 0.5,
        maximumParticleLife: 1.5,
        minimumSpeed: 50.0,
        maximumSpeed: 100.0,
        imageSize: new Cesium.Cartesian2(5.0, 15.0),
        emissionRate: 5000.0,
        lifetime: 10.0,
        emitter: new Cesium.SphereEmitter(200.0),
        modelMatrix: Cesium.Matrix4.IDENTITY,
        updateCallback: (particle, dt) => {
            if (!particle) return;
            particle.velocity.z -= 300.0 * dt;
        }
    });
    console.log('Rain created with loaded Image element');
    return system;
}

function createSnowSystem() {
    if (!snowImageElement) {
        console.error('Snow image not loaded yet!');
        return null;
    }

    const system = new Cesium.ParticleSystem({
        image: snowImageElement,
        startColor: Cesium.Color.WHITE.withAlpha(0.8),
        endColor: Cesium.Color.WHITE.withAlpha(0.1),
        startScale: 1.0,
        endScale: 0.5,
        minimumParticleLife: 1.0,
        maximumParticleLife: 3.0,
        minimumSpeed: 5.0,
        maximumSpeed: 15.0,
        imageSize: new Cesium.Cartesian2(5.0, 5.0),
        emissionRate: 3000.0,
        lifetime: 10.0,
        emitter: new Cesium.SphereEmitter(200.0),
        modelMatrix: Cesium.Matrix4.IDENTITY,
        updateCallback: (particle, dt) => {
            if (!particle) return;
            particle.velocity.z -= 20.0 * dt;
        }
    });
    console.log('Snow created with loaded Image element');
    return system;
}

// Function to update particle system position to follow camera
// Function to update particle system position to follow camera
function updateParticleSystem(scene, time) {
    if (!currentSystem) return;

    const cameraPosition = scene.camera.position;
    const range = 100.0;
    const heightOffset = 50.0; // Raise the emitter above the camera

    // Calculate position: camera + (forward * range) + (up * height)
    const forward = Cesium.Cartesian3.multiplyByScalar(scene.camera.direction, range, new Cesium.Cartesian3());
    const up = Cesium.Cartesian3.multiplyByScalar(scene.camera.up, heightOffset, new Cesium.Cartesian3());

    let position = Cesium.Cartesian3.add(cameraPosition, forward, new Cesium.Cartesian3());
    position = Cesium.Cartesian3.add(position, up, position);

    // Position particle system at camera location
    currentSystem.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
}

// Make sure the clock is ticking for particles to animate
viewer.clock.shouldAnimate = true;

// Helper function to set initial modelMatrix based on camera
function setInitialSystemPosition(system) {
    // Position particle system at camera location
    system.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(viewer.camera.positionWC);
    console.log('Position set at camera');
}

viewer.scene.preUpdate.addEventListener(updateParticleSystem);

// Exported functions for UI
window.setWeather = (type) => {
    console.log('setWeather called with type:', type);

    // Remove existing
    if (currentSystem) {
        console.log('Removing existing system');
        viewer.scene.primitives.remove(currentSystem);
        currentSystem = null;
    }

    if (type === 'rain') {
        console.log('Creating rain system...');
        currentSystem = createRainSystem();
        setInitialSystemPosition(currentSystem);
        console.log('Adding rain to primitives...');
        viewer.scene.primitives.add(currentSystem);
        console.log('Rain activated. Show:', currentSystem.show);
    } else if (type === 'snow') {
        console.log('Creating snow system...');
        currentSystem = createSnowSystem();
        setInitialSystemPosition(currentSystem);
        console.log('Adding snow to primitives...');
        viewer.scene.primitives.add(currentSystem);
        console.log('Snow activated. Show:', currentSystem.show);
    } else if (type === 'clear') {
        console.log('Weather cleared');
    }

    // Reset intensity slider to default if new system created
    const slider = document.getElementById('intensity');
    if (currentSystem && slider) {
        currentSystem.emissionRate = parseFloat(slider.value);
    }
};

window.setIntensity = (value) => {
    if (currentSystem) {
        currentSystem.emissionRate = parseFloat(value);
    }
};

// Removed - weather now initializes after camera flies to destination

// Set up button event listeners
document.getElementById('rainBtn').addEventListener('click', () => window.setWeather('rain'));
document.getElementById('snowBtn').addEventListener('click', () => window.setWeather('snow'));
document.getElementById('clearBtn').addEventListener('click', () => window.setWeather('clear'));

// Initialize weather and UI at startup
window.setWeather('rain');
const slider = document.getElementById('intensity');
if (slider) window.setIntensity(slider.value);
