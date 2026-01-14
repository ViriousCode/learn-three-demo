<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import grassVS from './shaders/Grass/grass.vert';
import grassFS from './shaders/Grass/grass.frag';

// --- 变量与类型定义 ---
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let gui: GUI;
let instancedGrass: THREE.InstancedMesh | null = null;
let ground: THREE.Mesh | null = null;

const uTime = { value: 0 };

// 1. 控制参数：将覆盖范围与地面大小统一为 'size'
const params = {
  count: 100000,
  size: 100,            // 覆盖范围与地面大小共用此值
  colorBase: '#2c8019',
  colorTip: '#66cc47',
  windStrength: 0.3,
  windDirectionX: 1.0,
  windDirectionZ: 0.5
};

const init = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0.1, 0.1, 0.15); // 深色背景便于观察

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 40, 60);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  // --- 添加 OrbitControls ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 2. 初始化地面
  const groundGeo = new THREE.PlaneGeometry(1, 1);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.scale.set(params.size, params.size, 1);
  scene.add(ground);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 5);
  scene.add(light, new THREE.AmbientLight(0xffffff, 0.5));

  // 3. 初次生成草地
  updateGrass();

  // 4. GUI 控制
  gui = new GUI();

  const folder = gui.addFolder('全局控制');
  // 调整大小时，同时更新地面 scale 并重建草地位置
  folder.add(params, 'size', 10, 500).name('地面与覆盖范围').onChange((v: number) => {
    if (ground) ground.scale.set(v, v, 1);
  }).onFinishChange(updateGrass);

  folder.add(params, 'count', 1000, 500000, 1000).name('草叶数量').onFinishChange(updateGrass);

  const styleFolder = gui.addFolder('风力与颜色');
  styleFolder.addColor(params, 'colorBase').name('根部颜色').onChange((v: string) => {
    if (instancedGrass) (instancedGrass.material as THREE.ShaderMaterial).uniforms.uColorBase.value.set(v);
  });
  styleFolder.addColor(params, 'colorTip').name('尖端颜色').onChange((v: string) => {
    if (instancedGrass) (instancedGrass.material as THREE.ShaderMaterial).uniforms.uColorTip.value.set(v);
  });
  styleFolder.add(params, 'windStrength', 0, 1.5).name('风力强度').onChange((v: number) => {
    if (instancedGrass) (instancedGrass.material as THREE.ShaderMaterial).uniforms.uWindStrength.value = v;
  });
  styleFolder.add(params, 'windDirectionX', -1, 1).name('风向 X');
  styleFolder.add(params, 'windDirectionZ', -1, 1).name('风向 Z');

  window.addEventListener('resize', onWindowResize);
  animate();
};

function updateGrass() {
  if (instancedGrass) {
    scene.remove(instancedGrass);
    instancedGrass.geometry.dispose();
    (instancedGrass.material as THREE.ShaderMaterial).dispose();
  }

  // 每一片草叶的几何体
  const geometry = new THREE.PlaneGeometry(0.15, 1.2, 1, 4);
  geometry.translate(0, 0.6, 0); // 基准点移至底部

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uTime,
      uWindStrength: { value: params.windStrength },
      uWindDirection: { value: new THREE.Vector2(params.windDirectionX, params.windDirectionZ) },
      uColorBase: { value: new THREE.Color(params.colorBase) },
      uColorTip: { value: new THREE.Color(params.colorTip) }
    },
    vertexShader: grassVS,
    fragmentShader: grassFS,
    side: THREE.DoubleSide
  });

  instancedGrass = new THREE.InstancedMesh(geometry, material, params.count);

  const dummy = new THREE.Object3D();
  const randoms = new Float32Array(params.count);

  for (let i = 0; i < params.count; i++) {
    // 使用统一的 params.size 进行分布
    dummy.position.set(
      (Math.random() - 0.5) * params.size,
      0,
      (Math.random() - 0.5) * params.size
    );
    dummy.rotation.y = Math.random() * Math.PI;
    const s = 0.6 + Math.random() * 0.7;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();

    instancedGrass.setMatrixAt(i, dummy.matrix);
    randoms[i] = Math.random();
  }

  instancedGrass.geometry.setAttribute('instanceRandom', new THREE.InstancedBufferAttribute(randoms, 1));
  instancedGrass.instanceMatrix.needsUpdate = true;
  scene.add(instancedGrass);
}

const animate = () => {
  requestAnimationFrame(animate);
  uTime.value += 0.01;

  if (instancedGrass) {
    const mat = instancedGrass.material as THREE.ShaderMaterial;
    mat.uniforms.uWindDirection.value.set(params.windDirectionX, params.windDirectionZ);
  }

  controls.update();
  renderer.render(scene, camera);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

onMounted(init);
onUnmounted(() => {
  if (gui) gui.destroy();
  renderer.dispose();
});
</script>