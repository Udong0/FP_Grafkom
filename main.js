import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// --- VARIABEL GLOBAL ---
let camera, scene, renderer, controls;

// Variabel Gerakan
let moveForward = false, moveBackward = false;
let moveLeft = false, moveRight = false;

// Fisika Sederhana
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

// Konfigurasi Player
const PLAYER_HEIGHT = 1.7;
const MOVEMENT_SPEED = 12.0;

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Interaksi
let raycaster;
const interactableObjects = [];

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);
  scene.fog = new THREE.Fog(0x101010, 0, 35);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.y = PLAYER_HEIGHT;
  camera.position.z = 8;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();

  setupLighting();
  createEnvironment();
  setupControls();
  setupPopupEvents();

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("click", onMouseClick);
}

function createEnvironment() {
  // Ruangan
  const roomGeo = new THREE.BoxGeometry(25, 12, 25);
  const roomMat = new THREE.MeshStandardMaterial({
    color: 0x606060,
    side: THREE.BackSide,
    roughness: 0.8,
  });
  const room = new THREE.Mesh(roomGeo, roomMat);
  room.receiveShadow = true;
  scene.add(room);

  // Lantai
  const grid = new THREE.GridHelper(25, 25, 0x333333, 0x222222);
  scene.add(grid);

  // --- PEMBUATAN BATIK DENGAN ID HTML ---
  // Parameter ke-3 adalah ID dari elemen <div> di index.html yang berisi deskripsinya
  createBatikDisplay(0, -6, "info-parang", "assets/Parangbatik.jpg"); 
  createBatikDisplay(-6, -2, "info-kawung", "assets/kawungbatik.jpg");
  createBatikDisplay(6, -2, "info-megamendung", "assets/batikmegamendung.jpg");
}

function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const mainLight = new THREE.PointLight(0xffffff, 0.5, 30);
  mainLight.position.set(0, 10, 0);
  scene.add(mainLight);
}

// Perhatikan parameter ke-3 sekarang adalah 'htmlId'
function createBatikDisplay(x, z, htmlId, textureFileName) {
  const group = new THREE.Group();

  // Podium
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.6, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
  );
  podium.position.y = 0.3;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  // Gawangan (Tiang)
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

  const palangAtas = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2), woodMat);
  palangAtas.rotation.z = Math.PI / 2;
  palangAtas.position.set(0, 2.3, 0);
  group.add(palangAtas);

  // Kain Batik
  const kainGeo = new THREE.PlaneGeometry(0.9, 1.4);
  const batikTexture = textureLoader.load(textureFileName);
  batikTexture.colorSpace = THREE.SRGBColorSpace;
  batikTexture.wrapS = THREE.RepeatWrapping;
  batikTexture.repeat.x = -1;
  batikTexture.offset.x = 1;

  const kainMat = new THREE.MeshStandardMaterial({
    map: batikTexture,
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 1.0,
    metalness: 0.0
  });

  const kain = new THREE.Mesh(kainGeo, kainMat);
  kain.position.set(0, 1.55, 0);
  kain.castShadow = true;

  // SIMPAN DATA UNTUK POPUP
  // Kita menyimpan htmlId agar nanti bisa dicari elemennya
  kain.userData = { 
    isBatik: true, 
    contentId: htmlId,      // ID div di HTML
    imgSrc: textureFileName // Path gambar
  };
  
  interactableObjects.push(kain);
  group.add(kain);

  // Lampu Sorot
  const spotLight = new THREE.SpotLight(0xffaa00, 15);
  spotLight.position.set(0, 5, 2);
  spotLight.target = kain;
  spotLight.angle = Math.PI / 8;
  spotLight.penumbra = 0.3;
  spotLight.castShadow = true;
  group.add(spotLight);

  group.position.set(x, 0, z);
  group.lookAt(0, 0, 8);

  scene.add(group);
}

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
    const popup = document.getElementById("popup-overlay");
    if (popup.style.display === "none") {
      blocker.style.display = "flex";
      instructions.style.display = "";
    }
  });

  scene.add(controls.getObject());
  document.addEventListener("keydown", (e) => onKeyChange(e, true));
  document.addEventListener("keyup", (e) => onKeyChange(e, false));
}

function onMouseClick() {
  if (controls.isLocked) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactableObjects);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.userData.isBatik) {
        showPopup(object.userData);
      }
    }
  }
}

// FUNGSI MENAMPILKAN POPUP DARI SUMBER HTML
function showPopup(userData) {
  controls.unlock();

  // 1. Ambil elemen sumber dari HTML berdasarkan ID
  const sourceContent = document.getElementById(userData.contentId);

  if (sourceContent) {
    // 2. Ambil data dari sumber
    const titleText = sourceContent.querySelector(".data-title").innerText;
    const descHTML = sourceContent.querySelector(".data-desc").innerHTML;

    // 3. Masukkan ke Popup Overlay
    document.getElementById("popup-title").innerText = titleText;
    document.getElementById("popup-desc").innerHTML = descHTML; // Pakai innerHTML agar list/bold terbaca
    document.getElementById("popup-img").src = userData.imgSrc;

    // 4. Tampilkan
    document.getElementById("popup-overlay").style.display = "flex";
  } else {
    console.error("Data HTML tidak ditemukan untuk ID:", userData.contentId);
  }
}

function setupPopupEvents() {
  document.getElementById("close-btn").addEventListener("click", () => {
    document.getElementById("popup-overlay").style.display = "none";
    controls.lock();
  });
}

function onKeyChange(event, isPressed) {
  switch (event.code) {
    case "KeyW": moveForward = isPressed; break;
    case "KeyA": moveLeft = isPressed; break;
    case "KeyS": moveBackward = isPressed; break;
    case "KeyD": moveRight = isPressed; break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (controls.isLocked) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * MOVEMENT_SPEED * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * MOVEMENT_SPEED * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y = PLAYER_HEIGHT;
  }

  prevTime = time;
  renderer.render(scene, camera);
}