import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { startChanting, stopChanting, handleDrawing, isGameActive } from "./game.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
const gltfLoader = new GLTFLoader();

// --- VARIABEL UNTUK CANTING STATION ---
let canvas, ctx;
let isPainting = false;
let currentTool = 'brush'; // 'brush', 'eraser', 'stamp'
let currentPattern = null;
let brushColor = '#3d2b1f';
let brushSize = 5;

// --- SETUP LOADER MODEL 3D ---
function load3DModel(path, x, y, z, scale, rotationY) {
    gltfLoader.load(
        path, 
        (gltf) => {
            const model = gltf.scene;
            model.position.set(x, y, z);
            model.scale.set(scale, scale, scale);
            model.rotation.y = rotationY;
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            scene.add(model);
        },
        undefined, 
        (error) => { console.error('Gagal memuat model:', path, error); }
    );
}

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

  createEnvironment(); 
  setupControls();
  setupPopupEvents();
  setupGameEvents();
  setupCantingStationLogic(); // Setup logika Javascript untuk Canvas

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", () => { isDrawing = false; });
}

function createEnvironment() {
    // A. STRUKTUR BANGUNAN
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.1, metalness: 0.0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallGeo = new THREE.BoxGeometry(50, 20, 50);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.BackSide, roughness: 0.9 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 10;
    walls.receiveShadow = true;
    scene.add(walls);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(49.8, 0.5, 49.8), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    plinth.position.y = 0.25;
    scene.add(plinth);

    // B. PENCAHAYAAN
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    createCeilingLamp(10, 10);
    createCeilingLamp(-10, 10);
    createCeilingLamp(10, -10);
    createCeilingLamp(-10, -10);

    // C. PAJANGAN BATIK
    createBatikDisplay(0, 4, -24.5, "info-parang", "assets/Parangbatik.jpg", 0); 
    createBatikDisplay(-12, 4, -24.5, "info-Ceplokbatik", "assets/Ceplokbatik.jpg", 0);
    createBatikDisplay(12, 4, -24.5, "info-Lerengbatik", "assets/Lerengbatik.jpg", 0);
    createBatikDisplay(-24.5, 4, -15, "info-kawung", "assets/kawungbatik.jpg", Math.PI / 2);
    createBatikDisplay(-24.5, 4, -5, "info-Nitikbatik", "assets/Nitikbatik.jpg", Math.PI / 2);
    createBatikDisplay(-24.5, 4, 5, "info-ParangRusakbatik", "assets/ParangRusakbatik.jpg", Math.PI / 2);
    createBatikDisplay(-24.5, 4, 15, "info-SekarJagadbatik", "assets/SekarJagadbatik.jpg", Math.PI / 2);
    createBatikDisplay(24.5, 4, -15, "info-megamendung", "assets/batikmegamendung.jpg", -Math.PI / 2);
    createBatikDisplay(24.5, 4, -5, "info-Semenbatik", "assets/Semenbatik.jpg", -Math.PI / 2);
    createBatikDisplay(24.5, 4, 5, "info-Tambalbatik", "assets/Tambalbatik.jpg", -Math.PI / 2);
    createBatikDisplay(24.5, 4, 15, "info-Truntumbatik", "assets/Truntumbatik.jpg", -Math.PI / 2);

    load3DModel("assets/Manequin_batik.glb", -22, 0, -22, 0.025, Math.PI / 4);

    // D. CANTING STATION (MEJA BARU)
    createCantingTable(0, 0.5, 0); // Posisi di tengah ruangan (0,0,0)
}

function createCantingTable(x, y, z) {
    // Group untuk meja
    const tableGroup = new THREE.Group();
    tableGroup.position.set(x, y, z);

    // Kaki Meja
    const legGeo = new THREE.BoxGeometry(0.2, 1.5, 0.2);
    const legMat = new THREE.MeshStandardMaterial({color: 0x221100});
    
    const leg1 = new THREE.Mesh(legGeo, legMat); leg1.position.set(-1.4, 0.75, -0.9);
    const leg2 = new THREE.Mesh(legGeo, legMat); leg2.position.set(1.4, 0.75, -0.9);
    const leg3 = new THREE.Mesh(legGeo, legMat); leg3.position.set(-1.4, 0.75, 0.9);
    const leg4 = new THREE.Mesh(legGeo, legMat); leg4.position.set(1.4, 0.75, 0.9);
    tableGroup.add(leg1, leg2, leg3, leg4);

    // Alas Meja
    const topGeo = new THREE.BoxGeometry(3.2, 0.1, 2.2);
    const topMat = new THREE.MeshStandardMaterial({color: 0x5c4033});
    const tableTop = new THREE.Mesh(topGeo, topMat);
    tableTop.position.set(0, 1.55, 0);
    tableGroup.add(tableTop);

    // Kain Putih di atas meja
    const clothGeo = new THREE.PlaneGeometry(2.5, 1.5);
    const clothMat = new THREE.MeshStandardMaterial({color: 0xffffff});
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.set(0, 1.56, 0);
    tableGroup.add(cloth);

    // Bikin bisa diklik
    cloth.userData = { isCantingStation: true };
    tableTop.userData = { isCantingStation: true };
    interactableObjects.push(cloth);
    interactableObjects.push(tableTop);

    // Label Floating Text (Opsional, pakai Sprite)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 128;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0,0, 512, 128);
    ctx.font = "bold 40px Arial";
    ctx.fillStyle = "#ffaa00";
    ctx.textAlign = "center";
    ctx.fillText("MEJA CANTING (KLIK)", 256, 80);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 2.5, 0);
    sprite.scale.set(3, 0.75, 1);
    tableGroup.add(sprite);

    scene.add(tableGroup);
}

function createCeilingLamp(x, z) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 18, z); 
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    cord.position.y = 0; 
    lampGroup.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.5, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide }));
    shade.position.y = -2;
    lampGroup.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    bulb.position.y = -2.5;
    lampGroup.add(bulb);
    const light = new THREE.PointLight(0xffaa00, 150, 25); 
    light.position.y = -3;
    light.castShadow = true;
    lampGroup.add(light);
    scene.add(lampGroup);
}

function createBatikDisplay(x, y, z, contentId, imgSrc, rotY) {
    const frameGeo = new THREE.BoxGeometry(4.2, 4.2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 }); 
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    frame.castShadow = true;
    scene.add(frame);

    const tex = textureLoader.load(imgSrc, (texture) => { texture.colorSpace = THREE.SRGBColorSpace; });
    const geo = new THREE.PlaneGeometry(4, 4);
    const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, 0.11); 
    mesh.receiveShadow = true; 
    frame.add(mesh);

    mesh.userData = { isBatik: true, contentId: contentId, imgSrc: imgSrc, originalMat: mat };
    interactableObjects.push(mesh);

    const spotLight = new THREE.SpotLight(0xffffff, 400); 
    spotLight.angle = Math.PI / 6; spotLight.penumbra = 0.5; spotLight.decay = 1.5; spotLight.distance = 50; spotLight.castShadow = true;
    const offsetDistance = 8; const lightHeight = 15;   
    let lightX = x; let lightZ = z;
    if (rotY === 0) lightZ += offsetDistance; else if (rotY === Math.PI/2) lightX += offsetDistance; else if (rotY === -Math.PI/2) lightX -= offsetDistance; 
    spotLight.position.set(lightX, lightHeight, lightZ);
    spotLight.target = mesh; 
    scene.add(spotLight);
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x111111 }));
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
    const cantingUI = document.getElementById("canting-station-ui");
    
    // Hanya tampilkan blocker jika tidak ada UI lain yang terbuka
    if (popup.style.display === "none" && cantingUI.style.display === "none" && !isGameActive()) {
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
        
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            // Jika yang diklik adalah Batik pajangan
            if (obj.userData.isBatik) {
                showPopup(obj);
            }
            // Jika yang diklik adalah Meja Canting
            else if (obj.userData.isCantingStation) {
                showCantingStation();
            }
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

// --- LOGIKA CANTING STATION (Baru) ---
function showCantingStation() {
    controls.unlock();
    document.getElementById("canting-station-ui").style.display = "flex";
}

function setupCantingStationLogic() {
    canvas = document.getElementById('batikCanvas');
    ctx = canvas.getContext('2d');
    
    // Inisialisasi Canvas Putih
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Event Listeners untuk UI
    document.getElementById('close-canting').addEventListener('click', () => {
        document.getElementById("canting-station-ui").style.display = "none";
        controls.lock();
    });

    document.getElementById('brushSize').addEventListener('input', (e) => {
        brushSize = e.target.value;
    });

    // Drawing Logic di Canvas 2D
    canvas.addEventListener('mousedown', startPaint);
    canvas.addEventListener('mousemove', paint);
    canvas.addEventListener('mouseup', () => isPainting = false);
    canvas.addEventListener('mouseleave', () => isPainting = false);

    // Expose fungsi ke window agar bisa dipanggil HTML onclick
    window.setTool = (tool) => {
        currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
        // Hapus seleksi pattern jika ganti ke brush
        if (tool !== 'stamp') {
            document.querySelectorAll('.pattern-grid img').forEach(img => img.classList.remove('selected'));
            currentPattern = null;
        }
    };

    window.setColor = (color) => {
        brushColor = color;
    };

    window.clearCanvas = () => {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    window.selectPattern = (imgElement) => {
        currentTool = 'stamp';
        currentPattern = imgElement;
        
        // Highlight visual
        document.querySelectorAll('.pattern-grid img').forEach(img => img.classList.remove('selected'));
        imgElement.classList.add('selected');
        
        // Update tombol tool
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    };
    
    window.saveBatik = () => {
        const link = document.createElement('a');
        link.download = 'karya-batik-saya.png';
        link.href = canvas.toDataURL();
        link.click();
        alert("Karya batik berhasil disimpan!");
    };
}

function startPaint(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'stamp' && currentPattern) {
        // Logic Tempel Pattern (Stamp)
        const aspect = currentPattern.naturalWidth / currentPattern.naturalHeight;
        const width = 100; // Lebar stamp
        const height = width / aspect;
        
        ctx.drawImage(currentPattern, x - width/2, y - height/2, width, height);
        isPainting = false;
    } else {
        // Logic Gambar Manual
        isPainting = true;
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
}

function paint(e) {
    if (!isPainting || currentTool === 'stamp') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';

    if (currentTool === 'eraser') {
        ctx.strokeStyle = "white";
    } else {
        ctx.strokeStyle = brushColor;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
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