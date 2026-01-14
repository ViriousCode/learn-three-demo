<script lang="ts" setup>
import * as THREE from 'three';
import { onMounted, ref, onUnmounted } from 'vue';
// 导入 OrbitControls
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import heatmapVS from './shaders/Heatmap/heatmap.vert';
import heatmapFS from './shaders/Heatmap/heatmap.frag';

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let mesh: THREE.Mesh;

const uTime = { value: 0 };
const uMouse = { value: new THREE.Vector2(-99, -99) };
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

const init = () => {
  // 1. 场景与相机
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 15, 20);

  // 2. 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // 3. 添加 OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // 开启阻尼效果（丝滑感）
  controls.dampingFactor = 0.05;

  const targetMouse = new THREE.Vector2(-99, -99); // 鼠标实际位置
  const currentMouse = { value: new THREE.Vector2(-99, -99) }; // 传给 Shader 的平滑位置
  const heatStrength = { value: 0.0 }; // 当前凹陷强度 (0 到 1)
  let targetStrength = 0.0
  const uStrength = { value: 0 }

  // 4. 物体与材质
  const geometry = new THREE.PlaneGeometry(30, 30, 128, 128);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uTime,
      uMouse: uMouse,
      uStrength: uStrength
    },
    vertexShader: heatmapVS,
    fragmentShader: heatmapFS,
    side: THREE.DoubleSide,
  });

  mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2; // 水平放置
  scene.add(mesh);
  // 5. 鼠标交互事件
  const onPointerMove = (event: PointerEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      targetMouse.set(point.x, -point.z);
      targetStrength = 1.0;
    } else {
      targetStrength = 0.0;
    }
  };

  window.addEventListener('pointermove', onPointerMove);

  // 6. 动画循环
  const animate = () => {
    requestAnimationFrame(animate);
    uTime.value += 0.02;
    // 平滑位置 Lerp
    uMouse.value.lerp(targetMouse, 0.1);

    // 平滑强度 Lerp (弹性恢复的关键)
    // 0.05 决定了恢复的速度，数值越小越迟钝/丝滑
    uStrength.value += (targetStrength - uStrength.value) * 0.01;

    controls.update();
    renderer.render(scene, camera);
  };

  animate();

  // 处理窗口大小变化
  window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
};

onMounted(init);
</script>