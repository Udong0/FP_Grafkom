import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// --- VARIABEL GLOBAL ---
let camera, scene, renderer, controls;

// Variabel Gerakan
let moveForward = false,
  moveBackward = false;
let moveLeft = false,
  moveRight = false;

// Fisika Sederhana
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

// Konfigurasi Player
const PLAYER_HEIGHT = 1.7;
const MOVEMENT_SPEED = 12.0;

// --- INIT & LOOP UTAMA ---
init();
animate();

function init() {
  // 1. Setup Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);
  scene.fog = new THREE.Fog(0x101010, 0, 35); // Efek kabut

  // 2. Setup Camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.y = PLAYER_HEIGHT;
  camera.position.z = 8; // Posisi awal pemain

  // 3. Setup Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; // Aktifkan bayangan
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // 4. Setup Lighting
  setupLighting();

  // 5. Setup Environment
  createEnvironment();

  // 6. Setup Controls
  setupControls();

  // 7. Handle Resize Window
  window.addEventListener("resize", onWindowResize);
}

// --- FUNGSI LINGKUNGAN ---
function createEnvironment() {
  // A. Ruangan Museum
  const roomGeo = new THREE.BoxGeometry(25, 12, 25);
  const roomMat = new THREE.MeshStandardMaterial({
    color: 0x606060,
    side: THREE.BackSide,
    roughness: 0.8,
  });
  const room = new THREE.Mesh(roomGeo, roomMat);
  room.receiveShadow = true;
  scene.add(room);

  // B. Lantai Grid (Opsional)
  const grid = new THREE.GridHelper(25, 25, 0x333333, 0x222222);
  scene.add(grid);

  // C. Stand Batik (Memanggil fungsi reusable)
  createBatikDisplay(0, -6, "Batik Parang"); // Depan
  createBatikDisplay(-6, -2, "Batik Kawung"); // Kiri
  createBatikDisplay(6, -2, "Batik Megamendung"); // Kanan
}

function setupLighting() {
  // Cahaya dasar
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Lampu ruangan
  const mainLight = new THREE.PointLight(0xffffff, 0.5, 30);
  mainLight.position.set(0, 10, 0);
  scene.add(mainLight);
}

// --- FUNGSI MEMBUAT STAND BATIK (REUSABLE) ---
function createBatikDisplay(x, z, labelName) {
  const group = new THREE.Group();

  // 1. Podium
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.6, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
  );
  podium.position.y = 0.3;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  // 2. Gawangan (Tiang Kayu)
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21 });
  const tiangGeo = new THREE.CylinderGeometry(0.04, 0.04, 2);

  const tiangKiri = new THREE.Mesh(tiangGeo, woodMat);
  tiangKiri.position.set(-0.5, 1.3, 0);
  tiangKiri.castShadow = true;
  group.add(tiangKiri);

  const tiangKanan = new THREE.Mesh(tiangGeo, woodMat);
  tiangKanan.position.set(0.5, 1.3, 0);
  tiangKanan.castShadow = true;
  group.add(tiangKanan);

  const palangAtas = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.2),
    woodMat
  );
  palangAtas.rotation.z = Math.PI / 2;
  palangAtas.position.set(0, 2.3, 0);
  group.add(palangAtas);

  // 3. Kain Batik (Tempat mencanting nanti)
  const kainGeo = new THREE.PlaneGeometry(0.9, 1.4);
  const kainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  const kain = new THREE.Mesh(kainGeo, kainMat);
  kain.position.set(0, 1.55, 0);
  group.add(kain);

  // 4. Spotlight
  const spotLight = new THREE.SpotLight(0xffaa00, 15);
  spotLight.position.set(0, 5, 2);
  spotLight.target = kain;
  spotLight.angle = Math.PI / 8;
  spotLight.penumbra = 0.3;
  spotLight.castShadow = true;
  group.add(spotLight);

  // Posisikan Group
  group.position.set(x, 0, z);
  group.lookAt(0, 0, 8); // Menghadap ke tengah/pemain

  scene.add(group);
}

// --- FUNGSI KONTROL ---
function setupControls() {
  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", () => controls.lock());

  controls.addEventListener("lock", () => {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", () => {
    blocker.style.display = "flex";
    instructions.style.display = "";
  });

  scene.add(controls.getObject());

  document.addEventListener("keydown", (e) => onKeyChange(e, true));
  document.addEventListener("keyup", (e) => onKeyChange(e, false));
}

function onKeyChange(event, isPressed) {
  switch (event.code) {
    case "KeyW":
      moveForward = isPressed;
      break;
    case "KeyA":
      moveLeft = isPressed;
      break;
    case "KeyS":
      moveBackward = isPressed;
      break;
    case "KeyD":
      moveRight = isPressed;
      break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- LOGIKA ANIMASI & UPDATE ---
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (controls.isLocked) {
    // Logika Fisika Gerakan
    velocity.x -= velocity.x * 10.0 * delta; // Friksi
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward)
      velocity.z -= direction.z * MOVEMENT_SPEED * delta;
    if (moveLeft || moveRight)
      velocity.x -= direction.x * MOVEMENT_SPEED * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Batas lantai
    controls.getObject().position.y = PLAYER_HEIGHT;
  }

  prevTime = time;
  renderer.render(scene, camera);
}
