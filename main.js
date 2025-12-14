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

// --- DATA KOLEKSI BATIK (SINKRONISASI DENGAN INDEX.HTML) ---
// Pastikan 'id' di sini sama persis dengan id="info-..." di index.html

const galleryData = {
    // A. DINDING LUAR (UTARA/BELAKANG) - 9 Batik
    outerNorth: [
        { id: "info-parang", img: "assets/Parangbatik.jpg" },
        { id: "info-Ceplokbatik", img: "assets/Ceplokbatik.jpg" },
        { id: "info-Lerengbatik", img: "assets/Lerengbatik.jpg" },
        { id: "info-kawung", img: "assets/kawungbatik.jpg" },
        { id: "info-Nitikbatik", img: "assets/Nitikbatik.jpg" },
        { id: "info-ParangRusakbatik", img: "assets/ParangRusakbatik.jpg" },
        { id: "info-SekarJagadbatik", img: "assets/SekarJagadbatik.jpg" },
        { id: "info-megamendung", img: "assets/batikmegamendung.jpg" },
        { id: "info-Semenbatik", img: "assets/Semenbatik.jpg" },
    ],

    // B. DINDING LUAR (SELATAN/DEPAN) - 9 Batik
    outerSouth: [
        { id: "info-Tambalbatik", img: "assets/Tambalbatik.jpg" },
        { id: "info-Truntumbatik", img: "assets/Truntumbatik.jpg" },
        { id: "info-sidomukti", img: "assets/Sidomuktibatik.jpg" },
        { id: "info-sidoluhur", img: "assets/Sidoluhurbatik.jpg" },
        { id: "info-sidoasih", img: "assets/Sidoasihbatik.jpg" },
        { id: "info-satrio-manah", img: "assets/SatrioManahbatik.jpg" },
        { id: "info-wahyu-tumurun", img: "assets/WahyuTumurunbatik.jpg" },
        { id: "info-grompol", img: "assets/Grompolbatik.png" },
        { id: "info-slobog", img: "assets/Slobogbatik.png" }, // Pastikan gambar ada
    ],

    // C. DINDING LUAR (TIMUR/KANAN) - 9 Batik
    outerEast: [
        { id: "info-pamiluto", img: "assets/Pamilutobatik.png" }, // Pastikan gambar ada
        { id: "info-ciptoning", img: "assets/Ciptoningbatik.jpg" },
        { id: "info-cuwiri", img: "assets/Cuwiribatik.jpg" },
        { id: "info-udan-liris", img: "assets/UdanLirisbatik.jpg" },
        { id: "info-ulamsari-mas", img: "assets/UlamsariMasbatik.jpg" },
        { id: "info-cendrawasih", img: "assets/Cendrawasihbatik.jpg" },
        { id: "info-benang-bintik", img: "assets/BenangBintikbatik.jpg" },
        { id: "info-besurek", img: "assets/Besurekbatik.jpg" },
        { id: "info-tanah-liek", img: "assets/TanahLiekbatik.jpg" },
    ],

    // D. DINDING LUAR (BARAT/KIRI) - 9 Batik
    outerWest: [
        { id: "info-sawat", img: "assets/Sawatbatik.jpg" },
        { id: "info-merak-ngibing", img: "assets/MerakNgibingbatik.jpg" },
        { id: "info-gajah-oling", img: "assets/GajahOlingbatik.jpg" },
        { id: "info-kangkung-setingkes", img: "assets/KangkungSetingkesbatik.jpg" },
        { id: "info-tiga-negeri", img: "assets/TigaNegeribatik.jpg" },
        { id: "info-buketan", img: "assets/Buketanbatik.jpg" },
        { id: "info-djawa-hokokai", img: "assets/DjawaHokokaibatik.jpg" },
        { id: "info-lebak-wangi", img: "assets/LebakWangibatik.jpg" }, // Ganti KujangKijang (jika 404)
        { id: "info-ganasan", img: "assets/Ganasanbatik.jpg" },
    ],

    // E. DINDING DALAM (AREA EKSKLUSIF) - 2 Batik per Sisi
    // Gunakan batik favorit atau ikonik di sini
    innerNorth: [
        { id: "info-paoman", img: "assets/Paomanbatik.jpg" },
        { id: "info-tubo", img: "assets/Tubobatik.jpg" },
    ],
    innerSouth: [
        { id: "info-gedog-tuban", img: "assets/GedogTuban.jpg" },
        { id: "info-simbut", img: "assets/Simbutbatik.jpg" }, // Pastikan ada di assets atau ganti
    ],
    innerEast: [ 
        { id: "info-parang", img: "assets/Parangbatik.jpg" }, // Masterpiece diulang tidak apa-apa
        { id: "info-megamendung", img: "assets/batikmegamendung.jpg" },
    ],
    innerWest: [
        { id: "info-kawung", img: "assets/kawungbatik.jpg" },
        { id: "info-SekarJagadbatik", img: "assets/SekarJagadbatik.jpg" },
    ]
};

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
  // Setup Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010); 
  scene.fog = new THREE.Fog(0x101010, 10, 90);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.y = PLAYER_HEIGHT;
  camera.position.z = 25;

  // --- PERBAIKAN UTAMA DI SINI ---
  renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      // INI KUNCINYA: Mengaktifkan perhitungan kedalaman logaritmik
      // Mencegah flickering pada objek yang jauh atau luas
      logarithmicDepthBuffer: true 
  });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; 
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft Shadow
  renderer.outputColorSpace = THREE.SRGBColorSpace; 
  document.body.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();

  createEnvironment(); 
  setupControls();
  setupPopupEvents();
  setupGameEvents();
  setupCantingStationLogic();

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", () => { isDrawing = false; });
}

function createInnerWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.5 });
    
    // Dimensi Ruang Dalam
    const wallHeight = 12;
    const thickness = 1; 
    const radius = 12; // Jarak dinding dari titik pusat (0,0)
    const doorGap = 4; // Setengah lebar pintu (Total lebar pintu = 8)

    // Fungsi membuat 1 blok dinding
    function createWallBlock(x, z, sizeX, sizeZ) {
        const geo = new THREE.BoxGeometry(sizeX, wallHeight, sizeZ);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(x, wallHeight / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }

    // --- MEMBUAT 4 SUDUT "L" ---
    
    // Sudut 1: Kanan Atas (Timur Laut) -> Pintu di Utara & Timur
    // Dinding Utara-Kanan
    createWallBlock(radius/2 + doorGap/2, -radius, radius - doorGap, thickness);
    // Dinding Timur-Atas
    createWallBlock(radius, -radius/2 - doorGap/2, thickness, radius - doorGap);

    // Sudut 2: Kanan Bawah (Tenggara) -> Pintu di Timur & Selatan
    // Dinding Selatan-Kanan
    createWallBlock(radius/2 + doorGap/2, radius, radius - doorGap, thickness);
    // Dinding Timur-Bawah
    createWallBlock(radius, radius/2 + doorGap/2, thickness, radius - doorGap);

    // Sudut 3: Kiri Bawah (Barat Daya) -> Pintu di Selatan & Barat
    // Dinding Selatan-Kiri
    createWallBlock(-radius/2 - doorGap/2, radius, radius - doorGap, thickness);
    // Dinding Barat-Bawah
    createWallBlock(-radius, radius/2 + doorGap/2, thickness, radius - doorGap);

    // Sudut 4: Kiri Atas (Barat Laut) -> Pintu di Barat & Utara
    // Dinding Utara-Kiri
    createWallBlock(-radius/2 - doorGap/2, -radius, radius - doorGap, thickness);
    // Dinding Barat-Atas
    createWallBlock(-radius, -radius/2 - doorGap/2, thickness, radius - doorGap);
}

function createEnvironment() {
    // --- 1. LANTAI (SOLUSI STABIL) ---
    const roomSize = 82;
    const floorGeo = new THREE.BoxGeometry(roomSize, 2, roomSize);
    
    // GANTI KE LAMBERT MATERIAL
    // Material ini tidak memantulkan cahaya aneh (specular) penyebab flickering
    const floorMat = new THREE.MeshLambertMaterial({ 
        color: 0x3d2b1f 
    });
    
    const floor = new THREE.Mesh(floorGeo, floorMat);
    
    // TURUNKAN SEDIKIT (-1.05)
    // Agar permukaan atasnya ada di y=-0.05, tidak menabrak tembok/meja di y=0
    floor.position.y = -1.05; 
    
    floor.receiveShadow = true; 
    scene.add(floor);

    // --- DINDING UTAMA ---
    const wallGeo = new THREE.BoxGeometry(roomSize, 20, roomSize);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.BackSide });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 10;
    walls.receiveShadow = true;
    scene.add(walls);

    // --- 2. STRUKTUR DALAM ---
    createInnerWalls(); 

    // --- 3. MEJA CANTING ---
    createCantingTable(0, 0.5, 0);

    // --- 4. PENCAHAYAAN (DIRECTIONAL LIGHT + BIAS BESAR) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffaa00, 1.5);
    dirLight.position.set(0, 50, 0);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;

    // Optimasi Shadow Camera
    const d = 50; 
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 100;

    // RESOLUSI & BIAS (Bias diperbesar sedikit)
    dirLight.shadow.mapSize.width = 2048; // Cukup 2048 agar ringan
    dirLight.shadow.mapSize.height = 2048;
    
    // Bias dinaikkan agar bayangan tidak menempel terlalu ketat ke lantai (penyebab garis)
    dirLight.shadow.bias = -0.001; 
    dirLight.shadow.normalBias = 0.0; // Nol-kan normalBias untuk Lambert Material
    
    scene.add(dirLight);
    scene.add(dirLight.target);

    // Lampu Pemanis Sudut
    function addCornerLight(x, z) {
        const l = new THREE.PointLight(0xffffff, 80, 40);
        l.position.set(x, 15, z);
        scene.add(l);
    }
    addCornerLight(25, 25); addCornerLight(-25, 25);
    addCornerLight(25, -25); addCornerLight(-25, -25);

    // --- 5. PAJANGAN BATIK (Sama seperti sebelumnya) ---
    // ... (Kode Lantai, Dinding, dan Lampu tetap sama seperti sebelumnya) ...

    // --- 5. PAJANGAN BATIK OTOMATIS (AUTO-LAYOUT) ---
    
    // Konfigurasi Layout
    const height = 4; // Tinggi pemasangan
    
    // A. LOOPING DINDING LUAR (9 Batik per dinding)
    // Mulai dari X/Z -32 sampai 32, dengan jarak antar batik 8 unit
    const startPos = -32; 
    const gap = 8;
    const outerWallPos = 39.5; // Koordinat dinding belakang

    // 1. Dinding Utara (Belakang) - Menghadap Selatan (Rot 0)
    galleryData.outerNorth.forEach((item, index) => {
        createBatikDisplay(startPos + (index * gap), height, -outerWallPos, item.id, item.img, 0);
    });

    // 2. Dinding Selatan (Depan) - Menghadap Utara (Rot PI)
    galleryData.outerSouth.forEach((item, index) => {
        // Kita balik urutannya agar urut dari kiri ke kanan saat dilihat player
        createBatikDisplay(startPos + (index * gap), height, outerWallPos, item.id, item.img, Math.PI);
    });

    // 3. Dinding Timur (Kanan) - Menghadap Barat (Rot -PI/2)
    galleryData.outerEast.forEach((item, index) => {
        createBatikDisplay(outerWallPos, height, startPos + (index * gap), item.id, item.img, -Math.PI/2);
    });

    // 4. Dinding Barat (Kiri) - Menghadap Timur (Rot PI/2)
    galleryData.outerWest.forEach((item, index) => {
        createBatikDisplay(-outerWallPos, height, startPos + (index * gap), item.id, item.img, Math.PI/2);
    });


    // B. LOOPING DINDING DALAM (VIP AREA)
    // Hanya 2 batik per sisi, dipasang di posisi -4 dan +4
    const innerPos = 11.3; 
    
    // Titik tengah tembok ada di koordinat 8.
    // (Pintu ada di 0-4, Tembok ada di 4-12, jadi tengahnya adalah 8)
    const centerPos = 8; 

    // 1. Dalam Utara (Menghadap Meja/Selatan)
    createBatikDisplay(-centerPos, height, -innerPos, galleryData.innerNorth[0].id, galleryData.innerNorth[0].img, 0);
    createBatikDisplay(centerPos, height, -innerPos, galleryData.innerNorth[1].id, galleryData.innerNorth[1].img, 0);

    // 2. Dalam Selatan (Menghadap Meja/Utara)
    createBatikDisplay(-centerPos, height, innerPos, galleryData.innerSouth[0].id, galleryData.innerSouth[0].img, Math.PI);
    createBatikDisplay(centerPos, height, innerPos, galleryData.innerSouth[1].id, galleryData.innerSouth[1].img, Math.PI);

    // 3. Dalam Timur (Menghadap Meja/Barat)
    createBatikDisplay(innerPos, height, -centerPos, galleryData.innerEast[0].id, galleryData.innerEast[0].img, -Math.PI/2);
    createBatikDisplay(innerPos, height, centerPos, galleryData.innerEast[1].id, galleryData.innerEast[1].img, -Math.PI/2);

    // 4. Dalam Barat (Menghadap Meja/Timur)
    createBatikDisplay(-innerPos, height, -centerPos, galleryData.innerWest[0].id, galleryData.innerWest[0].img, Math.PI/2);
    createBatikDisplay(-innerPos, height, centerPos, galleryData.innerWest[1].id, galleryData.innerWest[1].img, Math.PI/2);

    // Manekin tetap di pojok
    load3DModel("assets/Manequin_batik.glb", -22, 0, -22, 0.025, Math.PI / 4);
    

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
    // Frame Batik
    const frameGeo = new THREE.BoxGeometry(4.2, 4.2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 }); 
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    scene.add(frame);

    // Texture Batik
    textureLoader.load(
        imgSrc, 
        (texture) => { 
            texture.colorSpace = THREE.SRGBColorSpace; 
            const geo = new THREE.PlaneGeometry(4, 4);
            // PENTING: DoubleSide agar terlihat dari depan & belakang jika salah putar
            const mat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(0, 0, 0.11); // Geser sedikit dari frame agar tidak flickering
            mesh.receiveShadow = true; 
            
            // Data untuk interaksi klik
            mesh.userData = { isBatik: true, contentId: contentId, imgSrc: imgSrc };
            interactableObjects.push(mesh);
            frame.add(mesh);
        },
        undefined,
        (err) => { console.warn(`Gagal load: ${imgSrc}`); }
    );

    // Lampu Sorot (Tanpa Shadow agar performa ringan & tidak flickering)
    const spotLight = new THREE.SpotLight(0xffffff, 100); 
    spotLight.angle = Math.PI / 6; 
    spotLight.penumbra = 0.5; 
    spotLight.decay = 1.5; 
    spotLight.distance = 40; 
    spotLight.castShadow = false; // MATIKAN SHADOW DI SINI
    
    // Posisi lampu disesuaikan rotasi
    const offsetDistance = 6; 
    let lightX = x, lightZ = z;
    if (Math.abs(rotY) < 0.1) lightZ += offsetDistance; // Menghadap Z Positif
    else if (Math.abs(rotY - Math.PI) < 0.1) lightZ -= offsetDistance; 
    else if (rotY > 0) lightX += offsetDistance; 
    else lightX -= offsetDistance;

    spotLight.position.set(lightX, 10, lightZ);
    spotLight.target = frame; 
    scene.add(spotLight);
    scene.add(spotLight.target);
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

        // --- PERBAIKAN BOUNDARY DISINI ---
        // Ruangan ukuran 82, berarti dinding ada di +/- 41.
        // Kita set batas di 39 agar player berhenti tepat sebelum menabrak tembok.
        const boundary = 39.0; 
        
        const playerPos = controls.getObject().position;

        // Cek Batas (Collision Detection Sederhana)
        if (playerPos.x < -boundary) { playerPos.x = -boundary; velocity.x = 0; }
        if (playerPos.x > boundary) { playerPos.x = boundary; velocity.x = 0; }
        if (playerPos.z < -boundary) { playerPos.z = -boundary; velocity.z = 0; }
        if (playerPos.z > boundary) { playerPos.z = boundary; velocity.z = 0; }
    }
    prevTime = time;
    renderer.render(scene, camera);
}
