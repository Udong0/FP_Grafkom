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
const MOVEMENT_SPEED = 50.0;

const textureLoader = new THREE.TextureLoader();
let raycaster;
const interactableObjects = []; 

init();
animate();

function init() {
  // 1. Setup Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010); 
  scene.fog = new THREE.Fog(0x101010, 0, 60);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.y = PLAYER_HEIGHT;
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; 
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
  renderer.outputColorSpace = THREE.SRGBColorSpace; 
  document.body.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();

  // 2. Setup Environment & Lighting
  createEnvironment(); 
  
  // 3. Setup Controls & Events
  setupControls();
  setupPopupEvents();
  setupGameEvents();

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", () => { isDrawing = false; });
}

function createEnvironment() {
    // --- A. STRUKTUR BANGUNAN ---
    
    // 1. Lantai
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x3d2b1f, 
        roughness: 0.1, 
        metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. Dinding
    const wallGeo = new THREE.BoxGeometry(50, 20, 50);
    const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0xeeeeee, 
        side: THREE.BackSide, 
        roughness: 0.9 
    });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 10;
    walls.receiveShadow = true;
    scene.add(walls);

    // 3. List Bawah
    const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(49.8, 0.5, 49.8),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    plinth.position.y = 0.25;
    scene.add(plinth);

    // --- B. PENCAHAYAAN RUANGAN ---
    
    // Cahaya Ambient Redup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // --- C. LAMPU GANTUNG (Decoration) ---
    createCeilingLamp(10, 10);
    createCeilingLamp(-10, 10);
    createCeilingLamp(10, -10);
    createCeilingLamp(-10, -10);

    // --- D. PAJANGAN BATIK ---
    
    // 1. Belakang (Parang)
    createBatikDisplay(0, 4, -24.5, "info-parang", "assets/Parangbatik.jpg", 0); 
    
    // 2. Kiri (Kawung)
    createBatikDisplay(-24.5, 4, 0, "info-kawung", "assets/kawungbatik.jpg", Math.PI / 2);
    
    // 3. Kanan (Megamendung)
    createBatikDisplay(24.5, 4, 0, "info-megamendung", "assets/batikmegamendung.jpg", -Math.PI / 2);
}

function createCeilingLamp(x, z) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 18, z); 

    // Tali
    const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 4),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    cord.position.y = 0; 
    lampGroup.add(cord);

    // Kap Lampu
    const shade = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 1.5, 32, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide })
    );
    shade.position.y = -2;
    lampGroup.add(shade);

    // Bohlam
    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.4),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 }) 
    );
    bulb.position.y = -2.5;
    lampGroup.add(bulb);

    // Cahaya Point
    const light = new THREE.PointLight(0xffaa00, 150, 25); 
    light.position.y = -3;
    light.castShadow = true;
    lampGroup.add(light);

    scene.add(lampGroup);
}

function createBatikDisplay(x, y, z, contentId, imgSrc, rotY) {
    // 1. Frame Kayu (Parent Utama)
    const frameGeo = new THREE.BoxGeometry(4.2, 4.2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 }); 
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    frame.castShadow = true;
    scene.add(frame);

    // 2. Kain Batik (Child dari Frame)
    const tex = textureLoader.load(imgSrc, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
    });
    const geo = new THREE.PlaneGeometry(4, 4);
    const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    
    // Posisi relatif terhadap frame (sedikit maju)
    mesh.position.set(0, 0, 0.11); 
    mesh.receiveShadow = true; 
    
    // MASUKKAN KE FRAME (Jangan pernah dicabut/di-add ke scene lagi!)
    frame.add(mesh);

    // Setup Data Interaksi
    mesh.userData = { 
        isBatik: true, 
        contentId: contentId, 
        imgSrc: imgSrc, 
        originalMat: mat 
    };
    interactableObjects.push(mesh);

    // --- SPOTLIGHT (LAMPU SOROT) ---
    const spotLight = new THREE.SpotLight(0xffffff, 400); 
    spotLight.angle = Math.PI / 6; 
    spotLight.penumbra = 0.5;      
    spotLight.decay = 1.5;        
    spotLight.distance = 50;
    spotLight.castShadow = true;

    // Hitung posisi lampu sorot
    const offsetDistance = 8; 
    const lightHeight = 15;   
    
    let lightX = x;
    let lightZ = z;

    if (rotY === 0) lightZ += offsetDistance; 
    else if (rotY === Math.PI/2) lightX += offsetDistance; 
    else if (rotY === -Math.PI/2) lightX -= offsetDistance; 

    spotLight.position.set(lightX, lightHeight, lightZ);
    
    // TARGET LOGIC YANG BENAR:
    // Arahkan target ke mesh batik. 
    // JANGAN lakukan scene.add(spotLight.target) karena mesh sudah ada di dalam frame.
    spotLight.target = mesh; 
    
    scene.add(spotLight);
    // Hapus baris scene.add(spotLight.target) yang menyebabkan bug

    // Visual Fisik Lampu Sorot
    const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    fixture.position.set(lightX, lightHeight, lightZ);
    fixture.lookAt(x, y, z); 
    scene.add(fixture);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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
    if (popup.style.display === "none" && !isGameActive()) {
      blocker.style.display = "flex";
      instructions.style.display = "";
    }
  });

  scene.add(controls.getObject());
  document.addEventListener("keydown", (e) => onKeyChange(e, true));
  document.addEventListener("keyup", (e) => onKeyChange(e, false));
}

function onKeyChange(event, isPressed) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = isPressed; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = isPressed; break;
        case 'ArrowDown': case 'KeyS': moveBackward = isPressed; break;
        case 'ArrowRight': case 'KeyD': moveRight = isPressed; break;
    }
}

function setupGameEvents() {
    document.getElementById("start-game-btn").addEventListener("click", () => {
        if (selectedBatikObject) startChanting(selectedBatikObject, camera, controls);
    });
    document.getElementById("finish-chanting-btn").addEventListener("click", () => {
        stopChanting(PLAYER_HEIGHT);
    });
}

// Logic Mouse
let isDrawing = false;
let selectedBatikObject = null;

function onMouseDown(event) {
    if (isGameActive()) {
        isDrawing = true;
        handleDrawing(event, window.innerWidth, window.innerHeight);
    } 
    else if (controls.isLocked) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(interactableObjects);
        if (intersects.length > 0 && intersects[0].object.userData.isBatik) {
            showPopup(intersects[0].object);
        }
    }
}

function onMouseMove(event) {
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

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls.isLocked && !isGameActive()) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * MOVEMENT_SPEED * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * MOVEMENT_SPEED * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // --- COLLISION LOGIC ---
        const boundary = 24.0; 
        const playerPos = controls.getObject().position;

        if (playerPos.x < -boundary) { playerPos.x = -boundary; velocity.x = 0; }
        if (playerPos.x > boundary) { playerPos.x = boundary; velocity.x = 0; }
        if (playerPos.z < -boundary) { playerPos.z = -boundary; velocity.z = 0; }
        if (playerPos.z > boundary) { playerPos.z = boundary; velocity.z = 0; }
    }
    prevTime = time;
    renderer.render(scene, camera);
}