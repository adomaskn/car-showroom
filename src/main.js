import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const supportedLangs = ['en', 'lt'];
const params = new URLSearchParams(window.location.search);
const requestedLang = (params.get('lang') || 'en').toLowerCase();
let currentLang = supportedLangs.includes(requestedLang) ? requestedLang : 'en';

const i18n = {
  en: {
    title: 'Car Showroom',
    home: 'Home',
    toggleAriaLabel: 'Switch language',
    loading: 'Loading 3D showroom...',
    checkpoint2: (path) => `Checkpoint 2/4: Scene ready. Looking for ${path}...`,
    checkpoint3Success: 'Checkpoint 3/4: Car model loaded on rotating platform.',
    checkpoint3Fail: (path) => `Checkpoint 3/4 failed: could not load ${path}`,
    checkpoint4: 'Checkpoint 4/4: Renderer running.'
  },
  lt: {
    title: 'Automobiliu Ekspozicija',
    home: 'Pradzia',
    toggleAriaLabel: 'Pakeisti kalba',
    loading: 'Kraunama 3D automobiliu ekspozicija...',
    checkpoint2: (path) => `Patikros taskas 2/4: Scena parengta. Ieskoma ${path}...`,
    checkpoint3Success: 'Patikros taskas 3/4: Automobilio modelis ikeltas ant besisukancios platformos.',
    checkpoint3Fail: (path) => `Patikros taskas 3/4 nepavyko: nepavyko ikelti ${path}`,
    checkpoint4: 'Patikros taskas 4/4: Atvaizdavimas veikia.'
  }
};

const canvas = document.querySelector('#showroom');
const status = document.querySelector('#status');
const homeLink = document.querySelector('#home-link');
const langToggle = document.querySelector('#lang-toggle');
let statusKey = 'loading';

function getStatusText(lang, key, path) {
  const t = i18n[lang];
  if (key === 'checkpoint2') return t.checkpoint2(path);
  if (key === 'checkpoint3Success') return t.checkpoint3Success;
  if (key === 'checkpoint3Fail') return t.checkpoint3Fail(path);
  if (key === 'checkpoint4') return t.checkpoint4;
  return t.loading;
}

function applyLanguage() {
  const t = i18n[currentLang];
  document.documentElement.lang = currentLang;
  document.title = t.title;

  if (homeLink) {
    const homeUrl = new URL(homeLink.href);
    homeUrl.searchParams.set('lang', currentLang);
    homeLink.href = homeUrl.toString();
    homeLink.textContent = t.home;
  }

  if (langToggle) {
    langToggle.textContent = currentLang === 'en' ? 'LT' : 'EN';
    langToggle.setAttribute('aria-label', t.toggleAriaLabel);
  }
}

function setStatus(nextStatusKey, path) {
  statusKey = nextStatusKey;
  status.textContent = getStatusText(currentLang, statusKey, path);
}

applyLanguage();
setStatus('loading');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0f16');
scene.fog = new THREE.Fog(0x0b0f16, 12, 26);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2.5, 1.2, 4);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);
controls.maxDistance = 9;
controls.minDistance = 2.2;
controls.maxPolarAngle = Math.PI * 0.48;

const hemiLight = new THREE.HemisphereLight(0xdbe8ff, 0x0b1019, 0.55);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff5eb, 1.35);
keyLight.position.set(4.5, 6, 2.8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.left = -5;
keyLight.shadow.camera.right = 5;
keyLight.shadow.camera.top = 5;
keyLight.shadow.camera.bottom = -5;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xa8c4ff, 0.65);
fillLight.position.set(-5, 3.2, -2.2);
scene.add(fillLight);

const rimLight = new THREE.SpotLight(0x9ec6ff, 1.3, 22, Math.PI / 7, 0.45, 1.4);
rimLight.position.set(0, 4.5, -5.8);
rimLight.target.position.set(0, 1, 0);
scene.add(rimLight, rimLight.target);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(10, 80),
  new THREE.MeshStandardMaterial({ color: '#171d28', roughness: 0.92, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(1.9, 2.05, 0.22, 80),
  new THREE.MeshStandardMaterial({
    color: '#2f3644',
    roughness: 0.32,
    metalness: 0.5
  })
);
platform.position.y = 0.11;
platform.receiveShadow = true;
scene.add(platform);

const platformTop = new THREE.Mesh(
  new THREE.CylinderGeometry(1.76, 1.76, 0.03, 80),
  new THREE.MeshStandardMaterial({
    color: '#8d949f',
    roughness: 0.22,
    metalness: 0.78
  })
);
platformTop.position.y = 0.235;
platformTop.receiveShadow = true;
scene.add(platformTop);

const backdrop = new THREE.Mesh(
  new THREE.CylinderGeometry(8, 8, 6, 72, 1, true, Math.PI * 0.2, Math.PI * 0.6),
  new THREE.MeshStandardMaterial({
    color: '#0f1520',
    metalness: 0.25,
    roughness: 0.65,
    side: THREE.BackSide
  })
);
backdrop.position.set(0, 2.8, -3.1);
scene.add(backdrop);

const turntableGroup = new THREE.Group();
turntableGroup.position.y = 0.235;
scene.add(turntableGroup);

const loader = new GLTFLoader();
const modelPath = `${import.meta.env.BASE_URL}models/cars/car.glb`;

setStatus('checkpoint2', modelPath);

loader.load(
  modelPath,
  (gltf) => {
    const model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxAxis = Math.max(size.x, size.y, size.z);
    if (maxAxis > 0) {
      const targetSize = 2.2;
      const scale = targetSize / maxAxis;
      model.scale.setScalar(scale);
      box.setFromObject(model);
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);

    box.setFromObject(model);
    const minY = box.min.y;
    model.position.y -= minY;

    model.position.y += 0.01;
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    turntableGroup.add(model);
    setStatus('checkpoint3Success', modelPath);
  },
  undefined,
  (error) => {
    console.error(error);
    setStatus('checkpoint3Fail', modelPath);
  }
);

if (langToggle) {
  langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'lt' : 'en';
    params.set('lang', currentLang);
    history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    applyLanguage();
    setStatus(statusKey, modelPath);
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function animate() {
  turntableGroup.rotation.y += 0.0035;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
setStatus('checkpoint4', modelPath);
