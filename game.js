import * as THREE from "three";

// --- STATE GAME ---
// Variabel yang hanya dibutuhkan saat mode game aktif
let isChantingMode = false;
let currentChantingObj = null;
let drawContext = null;
let drawTexture = null;
let gameCamera = null;     // Referensi ke kamera utama
let gameControls = null;   // Referensi ke controls utama
const raycaster = new THREE.Raycaster(); // Raycaster khusus game

// --- FUNGSI UTAMA ---

export function startChanting(object, camera, controls) {
  isChantingMode = true;
  currentChantingObj = object;
  gameCamera = camera;
  gameControls = controls;

  // 1. Setup Canvas
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // 2. Load Gambar untuk Jiplakan
  const img = new Image();
  img.src = object.userData.imgSrc;
  img.onload = () => {
    ctx.globalAlpha = 0.4; // Transparan
    ctx.drawImage(img, 0, 0, 512, 512);
    ctx.globalAlpha = 1.0;
    if(drawTexture) drawTexture.needsUpdate = true;
  };
  
  drawContext = ctx;
  drawTexture = new THREE.CanvasTexture(canvas);
  drawTexture.colorSpace = THREE.SRGBColorSpace;
  
  // 3. Ganti Material Kain
  object.material = new THREE.MeshStandardMaterial({
    map: drawTexture, side: THREE.DoubleSide, roughness: 0.8
  });

  // 4. Update UI
  document.getElementById("popup-overlay").style.display = "none";
  document.getElementById("chanting-ui").style.display = "block";
  document.getElementById("crosshair").style.display = "none";
  
  // 5. Unlock Mouse & Pindah Kamera
  controls.unlock();
  
  const targetPos = new THREE.Vector3();
  object.getWorldPosition(targetPos);
  const offset = new THREE.Vector3(0, 0, 1.5);
  offset.applyQuaternion(object.parent.quaternion); // Sesuaikan rotasi
  
  camera.position.copy(targetPos).add(offset);
  camera.position.y = targetPos.y;
  camera.lookAt(targetPos);
}

export function stopChanting(playerHeight) {
  isChantingMode = false;
  
  // Reset Material Asli
  if (currentChantingObj) {
    currentChantingObj.material = currentChantingObj.userData.originalMat;
    currentChantingObj = null;
  }

  // Reset UI
  document.getElementById("chanting-ui").style.display = "none";
  document.getElementById("crosshair").style.display = "block";
  
  // Reset Kamera
  if(gameCamera) {
      gameCamera.position.set(0, playerHeight, 8);
      gameCamera.lookAt(0, playerHeight, 0);
  }
  
  // Kunci Mouse lagi
  if(gameControls) gameControls.lock();
}

// Fungsi Menggambar (Dipanggil saat mouse bergerak)
export function handleDrawing(event, windowWidth, windowHeight) {
  // Cek apakah game aktif dan data lengkap
  if (!isChantingMode || !currentChantingObj || !drawContext || !gameCamera) return;

  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / windowWidth) * 2 - 1;
  mouse.y = -(event.clientY / windowHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, gameCamera);
  const intersects = raycaster.intersectObject(currentChantingObj);

  if (intersects.length > 0) {
    const uv = intersects[0].uv;
    const x = uv.x * 512;
    const y = (1 - uv.y) * 512;

    drawContext.fillStyle = "#4a2c0f"; 
    drawContext.beginPath();
    drawContext.arc(x, y, 4, 0, Math.PI * 2);
    drawContext.fill();

    drawTexture.needsUpdate = true;
  }
}

// Getter untuk mengecek status dari luar
export function isGameActive() {
    return isChantingMode;
}