<script lang="ts" setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useVideoRecorder } from '@/utils/recording/useVideoRecorder';
import GUI from 'lil-gui'
import {
  testVertexShader,
  testFragmentShader,
  circleFragmentShader,
  circleVertexShader,
  noiseTestFragmentShader,
  fs1,
  fs2,
  fs3,
  fs4,
  fs5,
  fs6,
  fs7,
  fs8,
  fs9,
  fs10,
  fs11,
  fs12
} from './shaders'

const scene = shallowRef()
const camera = shallowRef()
const renderer = shallowRef()
const orbitControls = shallowRef()
const testGeometry = shallowRef()
const testCube = shallowRef()
const testMaterial = shallowRef()

const clock = new THREE.Clock()
let mousePosition = { x: 0.5, y: 0.5 }
const customUniforms = {
  uTime: { value: 0 }, // 必须：用于驱动动画
  uFrame: { value: 0 },
  uColor: { value: new THREE.Color(0x00aaff) }, // 可选：传入颜色
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, // 添加分辨率
  uMouse: { value: new THREE.Vector2(mousePosition.x, mousePosition.y) },
};

// 在窗口大小改变时更新分辨率
function handleResize() {
  customUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  // 更新相机和渲染器尺寸...
}

const init = () => {
  scene.value = new THREE.Scene()
  // scene.value.background = new THREE.Color('rgb(128,128,128)')
  scene.value.background = new THREE.Color('rgb(0,0,0)')
  camera.value = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.value.position.z = 5
  renderer.value = new THREE.WebGLRenderer({ antialias: true })
  renderer.value.setSize(window.innerWidth, window.innerHeight);
  orbitControls.value = new OrbitControls(camera.value, renderer.value.domElement)
  document.body.appendChild(renderer.value.domElement);
}

const initCube = () => {
  testGeometry.value = new THREE.BoxGeometry()
  if (import.meta.hot) {
    import.meta.hot.accept('./shaders/ThreeMaterialEffect/test.frag', (newModule) => {
      // 当 fragment shader 改变时，只更新材质的代码，不刷新页面
      testMaterial.value.fragmentShader = newModule!.default;
      testMaterial.value.needsUpdate = true;
      console.log('Shader HMR Success!');
    });
  }
  for (let i = 0; i < 1; i++) {
    // for (let i = 0; i < 12; i++) {
    const material = new THREE.ShaderMaterial({
      uniforms: customUniforms,
      // 顶点着色器：处理形状
      vertexShader: testVertexShader,
      // 片元着色器：处理颜色
      // fragmentShader: eval(`fs${i + 1}`),
      // fragmentShader: fs1,
      fragmentShader: noiseTestFragmentShader,
      // 开启透明（如果需要）
      transparent: true,
      side: THREE.DoubleSide
    });
    testMaterial.value = material
    const cube = new THREE.Mesh(testGeometry.value, material)
    // cube.position.x = (i % 5) * 1.5 - 2.5
    // cube.position.y = Math.floor(i / 5) * 1.5 - 2.5
    scene.value.add(cube)
  }
}

let points
const initCircle = () => {
  const numStars = 20000; // 星星数量
  const positions = new Float32Array(numStars * 3);
  const colors = new Float32Array(numStars * 3);
  const sizes = new Float32Array(numStars); // 用于控制粒子大小
  const geometry = new THREE.BufferGeometry();
  for (let i = 0; i < numStars; i++) {
    // 随机分布在球体内部，避免中心太密集
    const r = Math.random() * 5 + 1; // 半径
    const theta = Math.random() * Math.PI * 2; // 角度1
    const phi = Math.random() * Math.PI; // 角度2
    // 球坐标转笛卡尔坐标
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi) * Math.random() * 0.1;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    // 随机颜色 (白色到浅蓝)
    colors[i * 3] = 0.5 + Math.random() * 0.5;
    colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
    colors[i * 3 + 2] = 1.0;
    // 随机大小
    sizes[i] = Math.random() * 0.5 + 0.1;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 4)); // 传递给顶点着色器
  const material = new THREE.ShaderMaterial({
    uniforms: customUniforms,
    // 顶点着色器：处理形状
    vertexShader: circleVertexShader,
    // 片元着色器：处理颜色
    // fragmentShader: eval(`fs${i + 1}`),
    // fragmentShader: fs1,
    fragmentShader: circleFragmentShader,
    // 开启透明（如果需要）
    transparent: true,
    side: THREE.DoubleSide
  });
  points = new THREE.Points(geometry, material);
  scene.value.add(points);
}

const { isRecording, startRecording, stopRecording, captureFrame, recordingProgress } = useVideoRecorder()

const animate = () => {
  requestAnimationFrame(animate)
  if (isRecording.value) {
    customUniforms.uTime.value += 1 / 60
    customUniforms.uFrame.value += 1
  } else {
    customUniforms.uTime.value = clock.getElapsedTime()
  }
  renderer.value.render(scene.value, camera.value)
  // 渲染完成后立即捕获
  if (isRecording.value) {
    captureFrame(renderer.value.domElement)
  }
}

onMounted(() => {
  init()
  requestAnimationFrame(animate)
  initCube()
  // initCircle()
  window.addEventListener('resize', handleResize)
  window.addEventListener('click', (event) => {
    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;
  });
})
onBeforeUnmount(() => {
  renderer.value.dispose()
  scene.value.dispose()
  renderer.value.domElement.remove()
})

// 触发录制
const handleRecord = () => {
  if (!isRecording.value) {
    startRecording({
      width: window.innerWidth,
      height: window.innerHeight,
      fps: 60
    }, guiRecordingParams.durationInSeconds) // 录制 5 秒
  }
}
// gui
const gui = new GUI()
const guiRecordingParams = {
  startRecording: handleRecord,
  durationInSeconds: 5,
}
const fsObj = {
  fs1,
  fs2,
  fs3,
  fs4,
  fs5,
  fs6,
  fs7,
  fs8,
  fs9,
  fs10,
  fs11,
  fs12,
}
const changeFS = (fs: string) => {
  if (testMaterial.value) {
    //@ts-ignore
    testMaterial.value.fragmentShader = fsObj[fs]
    testMaterial.value.needsUpdate = true
  }
}
const guiShaderParams: Record<string, (fs: string) => void> = {
}
const recording = gui.addFolder('录制')
recording.add(guiRecordingParams, 'durationInSeconds', 1, 60, 1).name('录制时长(s)')
recording.add(guiRecordingParams, 'startRecording').name('开始录制')
const shader = gui.addFolder('Shader')
for (let i = 1; i <= 12; i++) {
  const name = 'changeFS' + i
  guiShaderParams[name] = () => changeFS(`fs${i}`)
  shader.add(guiShaderParams, name).name(`着色器${i}`)
}

</script>