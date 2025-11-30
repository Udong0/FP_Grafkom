import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { startChanting, stopChanting, handleDrawing, isGameActive } from "./game.js";

// --- VARIABEL GLOBAL ---
let camera, scene, renderer, controls;
let moveForward = false, moveBackward = false;
let moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

// Konfigurasi Player
const PLAYER_HEIGHT = 1.7;
const MOVEMENT_SPEED = 50.0; // Kecepatan yang sudah diperbaiki

const textureLoader = new THREE.TextureLoader();
let raycaster;
const interactableObjects = [];

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);
  scene.fog = new THREE.Fog(0xf5f5dc, 0, 40);

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
  createWallTitle();
  setupControls();
  setupPopupEvents();
  setupGameEvents(); // Setup event khusus game

  window.addEventListener("resize", onWindowResize);
  
  // Event Mouse Global
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", () => { isDrawing = false; });
}


function createEnvironment() {

    // Contoh singkat pemanggilan agar tidak lupa:
    const roomGeo = new THREE.BoxGeometry(25, 10, 25);
    const roomMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, side: THREE.BackSide });
    const room = new THREE.Mesh(roomGeo, roomMat); room.position.y = 5; scene.add(room);
    
    // Panggil batik
    createBatikDisplay(0, -6, "info-parang", "assets/Parangbatik.jpg"); 
    createBatikDisplay(-6, -2, "info-kawung", "assets/kawungbatik.jpg");
    createBatikDisplay(6, -2, "info-megamendung", "assets/batikmegamendung.jpg");
}

// --- CONTROLS & EVENTS ---

function setupControls() {
  controls = new PointerLockControls(camera, document.body);
  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", () => {
    if (!isGameActive()) controls.lock();
  });

  controls.addEventListener("lock", () => {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", () => {
    const popup = document.getElementById("popup-overlay");
    // Cek isGameActive dari game.js
    if (popup.style.display === "none" && !isGameActive()) {
      blocker.style.display = "flex";
      instructions.style.display = "";
    }
  });

  scene.add(controls.getObject());
  document.addEventListener("keydown", (e) => onKeyChange(e, true));
  document.addEventListener("keyup", (e) => onKeyChange(e, false));
}

// Setup Event Tombol UI Game
function setupGameEvents() {
    // Tombol Mulai (di Popup)
    document.getElementById("start-game-btn").addEventListener("click", () => {
        if (selectedBatikObject) {
            // Panggil fungsi dari game.js
            startChanting(selectedBatikObject, camera, controls);
        }
    });

    // Tombol Selesai (di UI Bawah)
    document.getElementById("finish-chanting-btn").addEventListener("click", () => {
        stopChanting(PLAYER_HEIGHT);
    });
}

// Logic Mouse Interaksi
let isDrawing = false;
let selectedBatikObject = null;

function onMouseDown(event) {
    // 1. Jika Game Aktif -> Gambar
    if (isGameActive()) {
        isDrawing = true;
        handleDrawing(event, window.innerWidth, window.innerHeight);
    } 
    // 2. Jika Tidak -> Cek Klik Batik (Popup)
    else if (controls.isLocked) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(interactableObjects);
        if (intersects.length > 0 && intersects[0].object.userData.isBatik) {
            showPopup(intersects[0].object);
        }
    }
}

function onMouseMove(event) {
    // Panggil logic gambar dari game.js
    if (isGameActive() && isDrawing) {
        handleDrawing(event, window.innerWidth, window.innerHeight);
    }
}

function showPopup(object) {
  controls.unlock();
  selectedBatikObject = object;
  const userData = object.userData;
  const sourceContent = document.getElementById(userData.contentId);
  if (sourceContent) {
    document.getElementById("popup-title").innerText = sourceContent.querySelector(".data-title").innerText;
    document.getElementById("popup-desc").innerHTML = sourceContent.querySelector(".data-desc").innerHTML;
    document.getElementById("popup-img").src = userData.imgSrc;
    document.getElementById("popup-overlay").style.display = "flex";
  }
}

function setupPopupEvents() {
  document.getElementById("close-btn").addEventListener("click", () => {
    document.getElementById("popup-overlay").style.display = "none";
    controls.lock();
  });
}

function animate() {
    requestAnimationFrame(animate);
    // ... logic waktu ...
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls.isLocked && !isGameActive()) {
        // ... logic gerakan WASD sama ...
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