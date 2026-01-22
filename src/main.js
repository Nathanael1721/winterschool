import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";

// Add the user's access token from environment variables
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;

// Initialize the viewer
const viewer = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
});

// Fly to the specified location (San Francisco)
viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-122.4175, 37.655, 400),
    orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-15.0),
    }
});

// Add Cesium OSM Buildings
Cesium.createOsmBuildingsAsync().then(function (buildingTileset) {
    viewer.scene.primitives.add(buildingTileset);
});

// Rain Particle System
// Simple white dot image data URI
const rainImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR42mP8//8/AzWgHE404OABA+8C/m/zsKQAAAAASUVORK5CYII=";

const rainSystem = new Cesium.ParticleSystem({
    image: rainImage,
    startColor: new Cesium.Color(0.6, 0.6, 0.7, 0.6), // Light blue-ish gray
    endColor: new Cesium.Color(0.6, 0.6, 0.7, 0.0),   // Fades out
    startScale: 1.0,
    endScale: 0.0,
    minimumParticleLife: 1.5,
    maximumParticleLife: 1.5,
    minimumSpeed: 20.0,
    maximumSpeed: 40.0,
    imageSize: new Cesium.Cartesian2(4, 15), // Stretch to look like drops
    emissionRate: 5000.0, // Heavy rain
    lifetime: 16.0,
    emitter: new Cesium.SphereEmitter(2000.0), // Large area
    modelMatrix: Cesium.Matrix4.IDENTITY,
    updateCallback: (particle, dt) => {
        // Verify particle is not undefined
        if (!particle) return;

        // Simple gravity simulation
        const position = particle.position;
        const gravityVector = Cesium.Cartesian3.normalize(position, new Cesium.Cartesian3());
        Cesium.Cartesian3.multiplyByScalar(gravityVector, -500.0 * dt, gravityVector);
        Cesium.Cartesian3.add(particle.velocity, gravityVector, particle.velocity);
    }
});

// Function to update rain position to follow camera
viewer.scene.preUpdate.addEventListener(function (scene, time) {
    const cameraPosition = scene.camera.position;
    const range = 500.0; // Distance in front of camera

    // Calculate a position in front of the camera
    const offset = Cesium.Cartesian3.multiplyByScalar(scene.camera.direction, range, new Cesium.Cartesian3());
    const position = Cesium.Cartesian3.add(cameraPosition, offset, new Cesium.Cartesian3());

    // Update model matrix to place emitter there
    rainSystem.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
});

viewer.scene.primitives.add(rainSystem);
