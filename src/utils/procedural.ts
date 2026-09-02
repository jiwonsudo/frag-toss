import * as THREE from 'three';

/**
 * 에셋 없이 캔버스로 지형 텍스처(알베도 / 노멀 / 러프니스)를 생성.
 * 나중에 실사 PBR 텍스처(ambientCG 등)로 교체하려면 이 함수만 갈아끼우면 됨.
 */

const SIZE = 512;

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number, octaves = 5): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

function mix(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface GroundTextures {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

export function makeGroundTextures(repeat = 60): GroundTextures {
  const soil = [58, 47, 33];
  const dryGrass = [124, 116, 74];
  const grass = [78, 92, 52];
  const patch = [150, 140, 92];

  const height = new Float32Array(SIZE * SIZE);
  const albedo = document.createElement('canvas');
  albedo.width = albedo.height = SIZE;
  const actx = albedo.getContext('2d')!;
  const aimg = actx.createImageData(SIZE, SIZE);

  const rough = document.createElement('canvas');
  rough.width = rough.height = SIZE;
  const rctx = rough.getContext('2d')!;
  const rimg = rctx.createImageData(SIZE, SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const nx = (x / SIZE) * 8;
      const ny = (y / SIZE) * 8;

      const big = fbm(nx, ny, 5);
      const detail = fbm(nx * 6 + 20, ny * 6 + 20, 4);
      const h = big * 0.7 + detail * 0.3;
      height[i] = h;

      // 색 혼합: 저지대=흙, 중간=풀, 밝은 노이즈=마른 풀/흙 패치
      let col = mix(soil, grass, THREE.MathUtils.clamp(big * 1.6, 0, 1));
      col = mix(col, dryGrass, THREE.MathUtils.clamp(detail * 1.4, 0, 1));
      if (big > 0.62) col = mix(col, patch, (big - 0.62) * 2.4);
      const grain = 0.86 + hash(x * 3.1, y * 7.7) * 0.28;

      const p = i * 4;
      aimg.data[p] = THREE.MathUtils.clamp(col[0] * grain, 0, 255);
      aimg.data[p + 1] = THREE.MathUtils.clamp(col[1] * grain, 0, 255);
      aimg.data[p + 2] = THREE.MathUtils.clamp(col[2] * grain, 0, 255);
      aimg.data[p + 3] = 255;

      const r = 235 - detail * 60 + hash(x * 1.7, y * 2.3) * 12;
      rimg.data[p] = rimg.data[p + 1] = rimg.data[p + 2] = THREE.MathUtils.clamp(r, 0, 255);
      rimg.data[p + 3] = 255;
    }
  }
  actx.putImageData(aimg, 0, 0);
  rctx.putImageData(rimg, 0, 0);

  // 노멀맵: 높이장의 기울기에서 계산
  const normal = document.createElement('canvas');
  normal.width = normal.height = SIZE;
  const nctx = normal.getContext('2d')!;
  const nimg = nctx.createImageData(SIZE, SIZE);
  const strength = 2.2;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const l = height[y * SIZE + ((x - 1 + SIZE) % SIZE)];
      const r = height[y * SIZE + ((x + 1) % SIZE)];
      const u = height[((y - 1 + SIZE) % SIZE) * SIZE + x];
      const d = height[((y + 1) % SIZE) * SIZE + x];
      const nvec = new THREE.Vector3((l - r) * strength, (u - d) * strength, 1).normalize();
      const p = (y * SIZE + x) * 4;
      nimg.data[p] = (nvec.x * 0.5 + 0.5) * 255;
      nimg.data[p + 1] = (nvec.y * 0.5 + 0.5) * 255;
      nimg.data[p + 2] = (nvec.z * 0.5 + 0.5) * 255;
      nimg.data[p + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);

  const mk = (canvas: HTMLCanvasElement, srgb: boolean): THREE.Texture => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.anisotropy = 8;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  return {
    map: mk(albedo, true),
    normalMap: mk(normal, false),
    roughnessMap: mk(rough, false)
  };
}

export interface WallTextures {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

/**
 * 배그 건물풍 콘크리트/벽돌 텍스처. 알베도엔 벽돌 줄눈 + 얼룩,
 * 노멀엔 줄눈 홈, 러프니스엔 물때. 데미지 상태는 Wall 쪽에서 크랙 오버레이로 처리.
 */
export function makeWallTextures(): WallTextures {
  const S = 512;
  const brickH = 40; // 벽돌 한 장 높이(px)
  const brickW = 96;
  const mortar = 6;

  const alb = document.createElement('canvas');
  alb.width = alb.height = S;
  const a = alb.getContext('2d')!;
  const nrm = document.createElement('canvas');
  nrm.width = nrm.height = S;
  const n = nrm.getContext('2d')!;
  const rgh = document.createElement('canvas');
  rgh.width = rgh.height = S;
  const r = rgh.getContext('2d')!;

  // 바탕 콘크리트
  a.fillStyle = '#8d8b83';
  a.fillRect(0, 0, S, S);
  n.fillStyle = '#8080ff';
  n.fillRect(0, 0, S, S);
  r.fillStyle = '#b8b8b8';
  r.fillRect(0, 0, S, S);

  // 얼룩/때 (fbm 기반 노이즈)
  const ai = a.getImageData(0, 0, S, S);
  const ri = r.getImageData(0, 0, S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x / S) * 5;
      const ny = (y / S) * 5;
      const stain = fbm(nx, ny, 5);
      const grain = 0.9 + hash(x * 2.7, y * 1.3) * 0.2;
      const dark = 1 - stain * 0.35;
      const p = (y * S + x) * 4;
      ai.data[p] = THREE.MathUtils.clamp(0x8d * dark * grain, 0, 255);
      ai.data[p + 1] = THREE.MathUtils.clamp(0x8b * dark * grain, 0, 255);
      ai.data[p + 2] = THREE.MathUtils.clamp(0x83 * dark * grain, 0, 255);
      const rr = 210 - stain * 90 + hash(x * 1.1, y * 3.9) * 20;
      ri.data[p] = ri.data[p + 1] = ri.data[p + 2] = THREE.MathUtils.clamp(rr, 0, 255);
    }
  }
  a.putImageData(ai, 0, 0);
  r.putImageData(ri, 0, 0);

  // 벽돌 줄눈: 알베도엔 어두운 선, 노멀엔 파인 홈
  a.strokeStyle = 'rgba(40,36,32,0.55)';
  a.lineWidth = mortar;
  n.lineWidth = mortar;
  for (let row = 0, y = 0; y < S + brickH; y += brickH, row++) {
    n.strokeStyle = '#8080ff';
    a.beginPath();
    a.moveTo(0, y);
    a.lineTo(S, y);
    a.stroke();
    // 홈: 위쪽은 밝게(법선 +Y), 아래쪽은 어둡게
    n.strokeStyle = 'rgba(128,170,255,1)';
    n.beginPath();
    n.moveTo(0, y - 1);
    n.lineTo(S, y - 1);
    n.stroke();
    n.strokeStyle = 'rgba(128,90,255,1)';
    n.beginPath();
    n.moveTo(0, y + 1);
    n.lineTo(S, y + 1);
    n.stroke();

    const off = row % 2 ? brickW / 2 : 0;
    for (let x = -off; x < S + brickW; x += brickW) {
      a.beginPath();
      a.moveTo(x, y);
      a.lineTo(x, y + brickH);
      a.stroke();
      n.strokeStyle = 'rgba(160,128,255,1)';
      n.beginPath();
      n.moveTo(x, y);
      n.lineTo(x, y + brickH);
      n.stroke();
    }
  }

  const mk = (c: HTMLCanvasElement, srgb: boolean): THREE.Texture => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: mk(alb, true), normalMap: mk(nrm, false), roughnessMap: mk(rgh, false) };
}

/** 데미지용 균열 텍스처 (투명 배경 + 검은 금). */
export function makeCrackTexture(): THREE.Texture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(10,8,6,0.85)';
  g.lineCap = 'round';
  const branch = (x: number, y: number, ang: number, len: number, w: number): void => {
    if (len < 4 || w < 0.4) return;
    const nx = x + Math.cos(ang) * len;
    const ny = y + Math.sin(ang) * len;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(nx, ny);
    g.stroke();
    branch(nx, ny, ang + (Math.random() - 0.5) * 1.1, len * 0.7, w * 0.7);
    if (Math.random() < 0.6) branch(nx, ny, ang + (Math.random() - 0.5) * 1.6, len * 0.55, w * 0.5);
  };
  for (let i = 0; i < 3; i++) {
    branch(S / 2 + (Math.random() - 0.5) * 40, S / 2 + (Math.random() - 0.5) * 40, Math.random() * 6.28, 30, 4);
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}
