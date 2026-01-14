<template>
  <div class="three-map" ref="containerRef"></div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import * as d3 from "d3";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import BLjson from '../北仑区.json';
import { streetList } from '../config.js';

// 定义 emits
const emit = defineEmits(['zoom-change']);

// 模板引用
const containerRef = ref(null);

// 响应式数据
const hoveredMesh = ref(null);
const raycaster = ref(null);
const mouse = ref(new THREE.Vector2());
const meshes = ref([]);
const animatingMeshes = ref(new Map());
const hoveredMeshes = ref(new Set());
const highlightColor = ref('#ff6b6b');
const mouseMoveThrottle = ref(null);
const lastMouseMoveTime = ref(0);
const mouseMoveThrottleDelay = ref(16);
const textureCache = ref(new Map());
const zoomChangeThrottle = ref(null);
const lastZoomChangeTime = ref(0);
const zoomChangeThrottleDelay = ref(100);

// Three.js 对象引用
const scene = ref(null);
const camera = ref(null);
const renderer = ref(null);
const labelRenderer = ref(null);
const controls = ref(null);

// 街道颜色映射
const streetColorMap = {
  '小港街道': {
    color1: 'rgba(60, 134, 228, 1)',   // #3C86E4
    color2: 'rgba(100, 254, 255, 1)',  // #64FEFF
    color3: 'rgba(255, 255, 255, 1)'    // #FFFFFF
  },
  '戚家山街道': {
    color1: 'rgba(60, 134, 228, 1)',
    color2: 'rgba(40, 50, 197, 1)'
  },
  '新碶街道': {
    color1: 'rgba(72, 130, 239, 1)',
    color2: 'rgba(40, 50, 197, 0.67)'
  },
  '霞浦街道': {
    color1: 'rgba(97, 135, 240, 1)',
    color2: 'rgba(40, 50, 197, 1)'
  },
  '大碶街道': {
    color1: 'rgba(85, 128, 233, 1)',
    color2: 'rgba(120, 160, 255, 1)',
    color3: 'rgba(95, 115, 245, 1)'
  },
  '春晓街道': {
    color1: 'rgba(55, 206, 233, 1)',
    color2: 'rgba(23, 168, 192, 1)'
  },
  '梅山街道': {
    color1: 'rgba(22, 122, 222, 1)',
    color2: 'rgba(100, 254, 255, 1)',
    color3: 'rgba(255, 255, 255, 1)'
  },
  '柴桥街道': {
    color1: 'rgba(80, 193, 231, 0.40)',
    color2: 'rgba(255, 255, 255, 0.77)'
  },
  '白峰街道': {
    color1: 'rgba(0, 120, 255, 1)',
    color2: 'rgba(121, 217, 235, 1)',
    color3: 'rgba(255, 246, 213, 1)'
  },
  '大榭街道': {
    color1: 'rgba(17, 106, 185, 1)',
    color2: 'rgba(255, 246, 213, 1)'
  },
  '郭巨街道': {
    color1: 'rgba(60, 134, 228, 1)',
    color2: 'rgba(40, 50, 197, 1)'
  },
};

// 创建渐变纹理（支持多个颜色停止点，带缓存）
const createGradientTexture = (colors, streetName = null, width = 256, height = 256) => {
  // 如果提供了街道名称，尝试从缓存获取
  if (streetName && textureCache.value.has(streetName)) {
    return textureCache.value.get(streetName);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  // 创建线性渐变（从上到下）
  const gradient = context.createLinearGradient(0, 0, 0, height);

  // 根据颜色数量分配停止点
  if (colors.color3) {
    // 三个颜色：均匀分布
    gradient.addColorStop(0, colors.color1);
    gradient.addColorStop(0.5, colors.color2);
    gradient.addColorStop(1, colors.color3);
  } else {
    // 两个颜色：从color1到color2
    gradient.addColorStop(0, colors.color1);
    gradient.addColorStop(1, colors.color2);
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  
  // 如果提供了街道名称，缓存纹理
  if (streetName) {
    textureCache.value.set(streetName, texture);
  }
  
  return texture;
};

// 根据街道名称获取颜色
const getColorForStreet = (streetName) => {
  return streetColorMap[streetName];
};

// 处理缩放变化（带节流）
const onZoomChange = (controls) => {
  const now = performance.now();
  
  // 节流处理，避免过于频繁触发
  if (now - lastZoomChangeTime.value < zoomChangeThrottleDelay.value) {
    if (zoomChangeThrottle.value) {
      cancelAnimationFrame(zoomChangeThrottle.value);
    }
    zoomChangeThrottle.value = requestAnimationFrame(() => {
      processZoomChange(controls);
    });
    return;
  }
  
  lastZoomChangeTime.value = now;
  processZoomChange(controls);
};

// 实际处理缩放变化
const processZoomChange = (controls) => {
  // 计算相机到目标点的距离（缩放级别）
  const distance = camera.value.position.distanceTo(controls.target);
  
  // 触发缩放事件，可以通过emit传递给父组件
  emit('zoom-change', {
    distance: distance,
    zoom: distance, // 可以根据需要转换为zoom值
    camera: camera.value,
    controls: controls
  });
};

const initControls = () => {
  const controlsInstance = new OrbitControls(camera.value, renderer.value.domElement);
  // 启用阻尼效果，使交互更平滑
  controlsInstance.enableDamping = true;
  controlsInstance.dampingFactor = 0.25;

  // 启用交互功能
  controlsInstance.enableZoom = true;      // 允许缩放（鼠标滚轮）
  controlsInstance.enablePan = true;        // 允许平移（右键拖拽或中键拖拽）
  controlsInstance.enableRotate = true;     // 允许旋转（左键拖拽）

  // 监听缩放变化
  controlsInstance.addEventListener('change', () => {
    onZoomChange(controlsInstance);
  });

  return controlsInstance;
};

const initLight = () => {
  // 环境光 - 使用蓝色调，增强整体蓝色/青色氛围
  const ambientLight = new THREE.AmbientLight(0x3C86E4, 0.6);
  scene.value.add(ambientLight);

  // 主方向光 - 从上方照射，增强顶部亮度
  const light = new THREE.DirectionalLight(0x64FEFF, 0.4);
  light.position.set(0, -50, 50);
  light.castShadow = false;
  scene.value.add(light);

  // 补充光源 - 从另一侧照亮，减少阴影，使用蓝色调
  const fillLight = new THREE.DirectionalLight(0x3C86E4, 0.3);
  fillLight.position.set(-30, -20, 20);
  fillLight.castShadow = false;
  scene.value.add(fillLight);
};

let resizeHandler = null;

const initScene = () => {
  const sceneInstance = new THREE.Scene();
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  const cameraInstance = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  // 配置 WebGL 渲染器，启用抗锯齿和其他优化选项
  const rendererInstance = new THREE.WebGLRenderer({
    antialias: true,           // 启用抗锯齿，平滑边缘
    alpha: true,               // 透明背景
    powerPreference: "high-performance", // 高性能模式
    stencil: false,            // 禁用模板缓冲区（如果不需要）
    depth: true                // 启用深度缓冲区
  });

  // 设置渲染器属性
  rendererInstance.setSize(width, height);
  // 限制像素比以提升性能（在移动设备上特别有效）
  rendererInstance.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 最大2倍像素比
  rendererInstance.shadowMap.enabled = false; // 禁用阴影以提升性能

  containerRef.value.appendChild(rendererInstance.domElement);

  // 初始化CSS2DRenderer用于文本标签
  const labelRendererInstance = new CSS2DRenderer();
  labelRendererInstance.setSize(width, height);
  labelRendererInstance.domElement.style.position = 'absolute';
  labelRendererInstance.domElement.style.top = '0';
  labelRendererInstance.domElement.style.pointerEvents = 'none';
  containerRef.value.appendChild(labelRendererInstance.domElement);

  // 保存引用以便后续使用
  scene.value = sceneInstance;
  camera.value = cameraInstance;
  renderer.value = rendererInstance;
  labelRenderer.value = labelRendererInstance;
  controls.value = initControls();

  // 初始化射线检测器
  raycaster.value = new THREE.Raycaster();

  camera.value.position.set(0, -40, 70);
  camera.value.lookAt(0, 0, 0);

  // 添加鼠标移动事件监听
  renderer.value.domElement.addEventListener('mousemove', onMouseMove);
  // 添加鼠标离开事件监听，确保所有mesh都能恢复
  renderer.value.domElement.addEventListener('mouseleave', onMouseLeave);

  // 动画循环
  const animate = () => {
    // 如果启用了阻尼，需要在每一帧更新控制器
    controls.value.update();
    rendererInstance.render(sceneInstance, cameraInstance);
    // labelRendererInstance.render(sceneInstance, cameraInstance);
    requestAnimationFrame(animate);
  };
  animate();

  // 处理窗口大小变化
  resizeHandler = () => {
    const width = containerRef.value.clientWidth;
    const height = containerRef.value.clientHeight;
    cameraInstance.aspect = width / height;
    cameraInstance.updateProjectionMatrix();
    rendererInstance.setSize(width, height);
    if (labelRenderer.value) {
      labelRenderer.value.setSize(width, height);
    }
  };
  window.addEventListener('resize', resizeHandler);
  resizeHandler();
};

const initMap = () => {
  const projection = d3.geoMercator().center([121.831303, 29.90944]).scale(18000).translate([-5, -20]);

  // 性能优化：共享边框材质，减少draw call
  const sharedEdgeMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    linewidth: 5 // 注意：WebGL中linewidth > 1可能不被支持，但保留以兼容
  });

  BLjson.features.forEach((elem, index) => {
    const area = new THREE.Object3D();
    // 每个的 坐标 数组
    const { coordinates } = elem.geometry;
    const streetName = elem.properties.name;
    const color = getColorForStreet(streetName);
    const center = elem.properties.center; // 获取中心坐标，用于创建标签

    const extrudeSettings = {
      depth: 4,
      bevelEnabled: true,
      bevelSegments: 1, // 减少分段数以提升性能
      bevelThickness: 0.2,
      bevelSize: 0.15
    };

    // 用于保存第一个mesh，标签将添加到这个mesh中
    let firstMesh = null;

    // 循环坐标数组
    coordinates.forEach(multiPolygon => {

      multiPolygon.forEach((polygon) => {
        const shape = new THREE.Shape();
        for (let i = 0; i < polygon.length; i++) {
          let [x, y] = projection(polygon[i]);

          if (i === 0) {
            shape.moveTo(x, -y);
          }
          shape.lineTo(x, -y);
        }

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // 计算几何体的边界框，用于UV映射
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox;
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        // 调整UV映射，使整个地块（顶部和侧面）都能正确显示渐变
        // ExtrudeGeometry会自动生成UV，我们需要调整UV以实现渐变效果
        const uvAttribute = geometry.attributes.uv;
        if (uvAttribute) {
          const uvArray = uvAttribute.array;
          const positions = geometry.attributes.position;

          // 找到顶部和底部的Z值
          const minZ = boundingBox.min.z;
          const maxZ = boundingBox.max.z;
          const zRange = maxZ - minZ;

          // 计算X和Y的范围，用于顶部面的UV映射
          const xRange = size.x > 0 ? size.x : 1;
          const yRange = size.y > 0 ? size.y : 1;

          // 优化UV映射计算：批量处理，减少函数调用
          const minX = boundingBox.min.x;
          const minY = boundingBox.min.y;
          const invXRange = xRange > 0 ? 1 / xRange : 0;
          const invYRange = yRange > 0 ? 1 / yRange : 0;
          const invZRange = zRange > 0 ? 1 / zRange : 0;
          const topThreshold = maxZ - 0.01; // 预计算阈值

          // 调整所有面的UV，使渐变占满整个地块
          for (let i = 0; i < positions.count; i++) {
            const idx = i * 2;
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            // 判断是否是顶部面（Z坐标接近最大值）
            if (z >= topThreshold) {
              // 顶部面：基于X和Y坐标计算UV，使渐变占满整个顶部
              uvArray[idx] = (x - minX) * invXRange;
              uvArray[idx + 1] = (y - minY) * invYRange;
            } else if (zRange > 0) {
              // 侧面：V坐标从0（底部）到1（顶部），基于Z坐标
              uvArray[idx + 1] = (z - minZ) * invZRange;
            }
          }
          uvAttribute.needsUpdate = true;
        }

        // 根据街道名称获取对应的渐变颜色配置
        let streetGradientColors = null;
        if (streetColorMap && streetColorMap[streetName]) {
          streetGradientColors = streetColorMap[streetName];
        }
        // 如果没有配置，使用默认渐变（蓝色到青色，与图片一致）
        const defaultColors = {
          color1: 'rgba(60, 134, 228, 1)',   // #3C86E4 蓝色
          color2: 'rgba(100, 254, 255, 1)'    // #64FEFF 青色
        };
        const gradientColors = streetGradientColors || defaultColors;

        // 使用缓存的纹理，相同街道的mesh共享纹理
        let meshTexture;
        try {
          meshTexture = createGradientTexture(gradientColors, streetName);
        } catch (error) {
          console.error('创建渐变纹理失败:', error, streetName, gradientColors);
          // 如果创建失败，使用默认纹理（不缓存默认纹理，避免污染缓存）
          meshTexture = createGradientTexture(defaultColors);
        }

        // 平面部分材质（顶部）- 使用纹理，调整为与图片一致的蓝色/青色效果
        const material = new THREE.MeshStandardMaterial({
          metalness: 0.1,
          roughness: 0.7,
          map: meshTexture, // 使用纹理（图片或渐变）
          color: 0xffffff, // 设置为白色，让纹理颜色完全显示
          emissive: 0x3C86E4, // 添加蓝色自发光，增强蓝色/青色效果
          emissiveIntensity: 0.3, // 适度的自发光强度
        });
        // 拉高部分材质（侧面）- 使用纹理，侧面稍暗以增强3D效果
        // 共享纹理而不是克隆，减少内存占用
        const material1 = new THREE.MeshStandardMaterial({
          metalness: 0.1,
          roughness: 0.8,
          map: meshTexture, // 共享纹理
          color: 0xffffff, // 设置为白色，让纹理颜色完全显示
          emissive: 0x2832C5, // 侧面使用稍深的蓝色自发光
          emissiveIntensity: 0.2, // 侧面自发光稍弱，增强立体感
        });

        const mesh = new THREE.Mesh(geometry, [
          material,
          material1
        ]);

        // 设置高度将区域区分开来
        if (index % 2 === 0) {
          mesh.scale.set(1, 1, 1.2);
        }

        // 禁用阴影以提升性能
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh._color = color;
        mesh._streetName = streetName;

        // 保存原始位置、颜色和纹理，用于hover恢复
        mesh.userData.originalPosition = mesh.position.clone();
        mesh.userData.originalColor = color;
        // 只保存纹理引用，不克隆（因为纹理是共享的）
        if (Array.isArray(mesh.material)) {
          mesh.userData.originalMaps = mesh.material.map(m => m.map || null);
        } else {
          mesh.userData.originalMaps = mesh.material.map ? [mesh.material.map] : [null];
        }

        // 添加白色边框 - 只显示顶部边缘，使用TubeGeometry创建粗边框
        // 创建顶部面的2D形状几何体
        const topShapeGeometry = new THREE.ShapeGeometry(shape);
        // 获取顶部面的边缘
        const topEdges = new THREE.EdgesGeometry(topShapeGeometry);

        // 使用LineSegments创建边框，性能更好，共享材质
        const edgeGroup = new THREE.LineSegments(topEdges, sharedEdgeMaterial);
        // 禁用边框的raycast，使其不参与鼠标检测
        edgeGroup.raycast = () => { };
        
        // 使用scale来增加视觉厚度，而不是使用TubeGeometry（性能更好）
        edgeGroup.scale.set(1.01, 1.01, 1);

        // 计算顶部面的高度（extrude depth），紧贴地块顶部
        const topHeight = extrudeSettings.depth; // 不额外抬高，紧贴地块
        // 将边框提升到顶部位置（相对于mesh的局部坐标系）
        edgeGroup.position.z = topHeight;
        edgeGroup.renderOrder = 1; // 确保边框在mesh之上渲染

        // 将边框添加到mesh，这样它会随mesh一起移动和缩放
        mesh.add(edgeGroup);
        // 保存边框引用和高度信息
        mesh.userData.edgeLines = edgeGroup;
        mesh.userData.topHeight = topHeight;

        // 添加到meshes数组，用于raycasting
        meshes.value.push(mesh);

        area.add(mesh);

        // 保存第一个mesh，标签将添加到这个mesh中
        if (!firstMesh) {
          firstMesh = mesh;
        }

      })

    })

    scene.value.add(area);

    // 延迟创建标签，提升初始加载速度
    // 使用requestIdleCallback在浏览器空闲时创建标签
    if (firstMesh && center && center.length === 2) {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          createStreetLabel(streetName, center, projection, extrudeSettings, color, index, firstMesh);
        }, { timeout: 1000 });
      } else {
        // 降级方案：使用setTimeout
        setTimeout(() => {
          createStreetLabel(streetName, center, projection, extrudeSettings, color, index, firstMesh);
        }, 100);
      }
    }
  });
};

// 创建街道名称标签
const createStreetLabel = (streetName, center, projection, extrudeSettings, color, index, mesh) => {
  // 使用JSON中的center坐标计算位置
  if (!center || center.length !== 2) return;

  const [lng, lat] = center;
  const [x, y] = projection([lng, lat]);

  // 标签位置相对于area的局部坐标
  const centerX = x;
  const centerY = -y; // 注意Y坐标需要取反
  const centerZ = extrudeSettings.depth + 0.2; // 稍微抬高，显示在地块上方

  // 根据地块颜色确定标签背景渐变和三角形颜色
  let backgroundGradient = 'linear-gradient(270deg, rgba(0, 227, 1, 0) 0%, rgba(0, 227, 1, 0.48) 52%, #129212 100%)'; // 默认绿色渐变
  let triangleColor = '#00E301'; // 默认绿色
  const streetConfig = streetList.find(s => s.name === streetName);
  if (streetConfig) {
    const bgType = streetConfig.background.bg;
    if (bgType === 'orange-l') {
      backgroundGradient = 'linear-gradient(270deg, rgba(255, 135, 0, 0) 0%, #FF8700 100%)';
      triangleColor = '#FF8700'; // 橙色
    } else if (bgType === 'yellow-l') {
      backgroundGradient = 'linear-gradient(270deg, rgba(254, 255, 0, 0) 0%, #DD9F00 100%)';
      triangleColor = '#DD9F00'; // 黄色
    }
  }

  // 创建标签容器
  const labelContainer = document.createElement('div');
  labelContainer.className = 'street-label-container';
  labelContainer.style.position = 'relative';
  labelContainer.style.width = '231px';
  labelContainer.style.height = '61.5px';
  labelContainer.style.display = 'flex';
  labelContainer.style.alignItems = 'center';
  labelContainer.style.paddingLeft = '44px';
  labelContainer.style.pointerEvents = 'none';
  labelContainer.style.userSelect = 'none';
  labelContainer.style.boxShadow = '0px 2px 4px 0px #0A3A9C';
  labelContainer.style.background = backgroundGradient; // 使用渐变背景

  // 创建左侧三角形装饰
  const triangle = document.createElement('div');
  triangle.style.position = 'absolute';
  triangle.style.left = '-6px';
  triangle.style.top = '-11px';
  triangle.style.width = '18px';
  triangle.style.height = '62px';
  triangle.style.transform = 'skewX(-10deg)';
  triangle.style.backgroundColor = triangleColor;
  triangle.style.boxShadow = '0px 2px 4px 0px #0A3A9C';
  labelContainer.appendChild(triangle);

  // 创建标签文本元素
  const labelDiv = document.createElement('div');
  labelDiv.className = 'street-label';
  labelDiv.textContent = streetName;
  labelDiv.style.color = '#FFFFFF';
  labelDiv.style.fontSize = '28px';
  labelDiv.style.fontWeight = '600';
  labelDiv.style.fontFamily = 'PingFangSC, PingFang SC, Microsoft YaHei, sans-serif';
  labelDiv.style.lineHeight = '40px';
  labelDiv.style.textAlign = 'left';
  labelDiv.style.fontStyle = 'normal';
  labelDiv.style.whiteSpace = 'nowrap';
  labelDiv.style.textShadow = '0px 2px 4px #0A3A9C';
  labelContainer.appendChild(labelDiv);

  // 创建CSS2D对象
  const label = new CSS2DObject(labelContainer);
  label.position.set(centerX, centerY, centerZ);

  // 添加到mesh对象中，使其随地块一起移动（当mesh在hover时移动，标签也会移动）
  mesh.add(label);
};

const onMouseMove = (event) => {
  if (!raycaster.value || !camera.value || !renderer.value) return;

  // 性能优化：节流鼠标移动事件
  const now = performance.now();
  if (now - lastMouseMoveTime.value < mouseMoveThrottleDelay.value) {
    if (mouseMoveThrottle.value) {
      cancelAnimationFrame(mouseMoveThrottle.value);
    }
    mouseMoveThrottle.value = requestAnimationFrame(() => {
      processMouseMove(event);
    });
    return;
  }
  lastMouseMoveTime.value = now;
  processMouseMove(event);
};

const processMouseMove = (event) => {
  // 计算鼠标在归一化设备坐标中的位置 (-1 到 +1)
  const rect = renderer.value.domElement.getBoundingClientRect();
  mouse.value.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.value.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 更新射线检测器
  raycaster.value.setFromCamera(mouse.value, camera.value);

  // 检测与mesh的交集（不递归检测，因为边框已经禁用了raycast）
  const intersects = raycaster.value.intersectObjects(meshes.value, false);

  // 获取当前应该hover的mesh集合
  const currentHoveredMeshes = new Set();
  if (intersects.length > 0) {
    // 直接使用检测到的mesh（边框已禁用raycast，不会出现在结果中）
    const targetMesh = intersects[0].object;
    if (targetMesh && meshes.value.includes(targetMesh)) {
      currentHoveredMeshes.add(targetMesh);
    }
  }

  // 找出需要恢复的mesh（之前hover但现在不hover的）
  hoveredMeshes.value.forEach(mesh => {
    if (!currentHoveredMeshes.has(mesh)) {
      resetMesh(mesh);
    }
  });

  // 找出需要hover的mesh（新的hover对象）
  currentHoveredMeshes.forEach(mesh => {
    if (!hoveredMeshes.value.has(mesh)) {
      hoverMesh(mesh);
    }
  });

  // 更新hoveredMeshes集合
  hoveredMeshes.value = currentHoveredMeshes;
  hoveredMesh.value = intersects.length > 0 ? intersects[0].object : null;
};

const onMouseLeave = (event) => {
  // 鼠标离开画布时，恢复所有hover的mesh
  hoveredMeshes.value.forEach(mesh => {
    resetMesh(mesh);
  });
  hoveredMeshes.value.clear();
  hoveredMesh.value = null;
};

const hoverMesh = (mesh) => {
  if (!mesh) return;

  // 保存原始位置（如果还没有保存）
  if (!mesh.userData.originalPosition) {
    mesh.userData.originalPosition = mesh.position.clone();
  }
  if (!mesh.userData.originalColor) {
    mesh.userData.originalColor = mesh._color;
  }

  // 如果正在动画，先停止并立即恢复到正确的起始状态
  if (animatingMeshes.value.has(mesh)) {
    animatingMeshes.value.delete(mesh);
    // 如果正在恢复动画，需要先恢复到原始状态
    // 如果正在hover动画，需要先恢复到原始状态再开始新的hover
    if (mesh.userData.originalPosition && mesh.userData.originalColor) {
      // 立即恢复到原始状态，确保从正确的状态开始hover
      forceResetMesh(mesh, mesh.userData.originalPosition, mesh.userData.originalColor);
    }
  }

  // 确保原始数据存在
  if (!mesh.userData.originalPosition) {
    mesh.userData.originalPosition = mesh.position.clone();
  }
  if (!mesh.userData.originalColor) {
    mesh.userData.originalColor = mesh._color || getColorForStreet(mesh._streetName || '');
  }

  // 升起高度（沿Z轴向上移动）
  const liftHeight = 2;
  const targetZ = mesh.userData.originalPosition.z + liftHeight;
  const startZ = mesh.userData.originalPosition.z; // 从原始位置开始，确保一致性
  const startTime = performance.now();
  const duration = 300; // 动画持续时间（毫秒）

  // 改变颜色为高亮色
  const originalColor = mesh.userData.originalColor;

  // 确保从原始颜色开始（避免中间颜色）
  mesh.position.z = startZ; // 先设置到起始位置
  mesh._color = originalColor; // 先设置到起始颜色

  // 颜色插值
  const startColor = new THREE.Color(originalColor);
  const targetColor = new THREE.Color(highlightColor.value);

  // 动画函数
  const animate = (currentTime) => {
    if (!animatingMeshes.value.has(mesh)) return; // 如果动画被取消，停止

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 使用缓动函数（easeOutCubic）
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    // 插值位置
    mesh.position.z = startZ + (targetZ - startZ) * easedProgress;

    // 插值颜色
    const currentColor = startColor.clone().lerp(targetColor, easedProgress);

    // 更新材质颜色（通过emissive实现高亮，保留渐变纹理）
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat, idx) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          // 保持原始颜色和纹理，只通过emissive实现高亮
          mat.emissive.copy(currentColor);
          mat.emissiveIntensity = 0.5 * easedProgress; // 自发光强度也渐变
        }
      });
    } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.emissive.copy(currentColor);
      mesh.material.emissiveIntensity = 0.5 * easedProgress;
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // 动画完成，确保完全到达目标状态
      animatingMeshes.value.delete(mesh);
      mesh.position.z = targetZ; // 确保位置精确

      // 确保颜色完全设置为高亮色（字符串格式）
      const highlightColorStr = typeof highlightColor.value === 'string'
        ? highlightColor.value
        : new THREE.Color(highlightColor.value).getHexString();
      mesh._color = highlightColorStr;

      // 确保材质emissive完全设置（保留渐变纹理）
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive.set(highlightColorStr);
            mat.emissiveIntensity = 0.5;
          }
        });
      } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.emissive.set(highlightColorStr);
        mesh.material.emissiveIntensity = 0.5;
      }
    }
  };

  animatingMeshes.value.set(mesh, animate);
  requestAnimationFrame(animate);
};

const resetMesh = (mesh) => {
  if (!mesh || !mesh.userData || !mesh.userData.originalPosition) {
    return;
  }

  // 如果正在动画，先停止
  if (animatingMeshes.value.has(mesh)) {
    animatingMeshes.value.delete(mesh);
  }

  // 确保mesh有原始数据
  const originalPosition = mesh.userData.originalPosition;
  const originalColor = mesh.userData.originalColor;

  if (!originalPosition || !originalColor) {
    return;
  }

  // 如果已经处于原始状态，不需要动画
  const currentZ = mesh.position.z;
  const targetZ = originalPosition.z;
  const isAtOriginalPosition = Math.abs(currentZ - targetZ) < 0.01;

  // 比较颜色（支持字符串和THREE.Color对象）
  const currentColorStr = typeof mesh._color === 'string' ? mesh._color : new THREE.Color(mesh._color).getHexString();
  const originalColorStr = typeof originalColor === 'string' ? originalColor : new THREE.Color(originalColor).getHexString();
  const isOriginalColor = currentColorStr === originalColorStr;

  if (isAtOriginalPosition && isOriginalColor) {
    // 已经恢复，确保状态完全正确
    forceResetMesh(mesh, originalPosition, originalColor);
    return;
  }

  // 从当前位置开始动画（可能是中间状态）
  const startZ = currentZ;
  const startTime = performance.now();
  const duration = 300; // 动画持续时间（毫秒）

  // 颜色插值 - 从当前颜色恢复到原始颜色
  const currentColorValue = mesh._color || highlightColor.value;
  const startColor = new THREE.Color(currentColorValue);
  const targetColor = new THREE.Color(originalColor);

  // 动画函数
  const animate = (currentTime) => {
    // 检查动画是否被取消
    if (!animatingMeshes.value.has(mesh)) {
      // 动画被中断，立即恢复到原始状态
      forceResetMesh(mesh, originalPosition, originalColor);
      return;
    }

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 使用缓动函数（easeOutCubic）
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    // 插值位置
    mesh.position.z = startZ + (targetZ - startZ) * easedProgress;

    // 插值颜色
    const currentColor = startColor.clone().lerp(targetColor, easedProgress);

    // 更新材质颜色（通过emissive实现，保留渐变纹理）
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          // 保持原始颜色和纹理，只通过emissive实现高亮
          mat.emissive.copy(currentColor);
          mat.emissiveIntensity = 0.5 * (1 - easedProgress); // 自发光强度渐变减少
        }
      });
    } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.emissive.copy(currentColor);
      mesh.material.emissiveIntensity = 0.5 * (1 - easedProgress);
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // 动画完成，确保完全恢复到原始状态
      animatingMeshes.value.delete(mesh);
      forceResetMesh(mesh, originalPosition, originalColor);
    }
  };

  animatingMeshes.value.set(mesh, animate);
  requestAnimationFrame(animate);
};

// 强制恢复mesh到原始状态（不带动画）
const forceResetMesh = (mesh, originalPosition, originalColor) => {
  if (!mesh || !originalPosition || !originalColor) return;

  // 恢复位置
  mesh.position.z = originalPosition.z;

  // 恢复颜色和纹理
  const colorValue = typeof originalColor === 'string' ? originalColor : new THREE.Color(originalColor).getHexString();

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((mat, idx) => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        // 恢复原始颜色（白色，让纹理正常显示）
        mat.color.set(0xffffff);
        // 恢复原始纹理
        if (mesh.userData.originalMaps && mesh.userData.originalMaps[idx]) {
          mat.map = mesh.userData.originalMaps[idx];
        }
        // 清除emissive
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
    mesh.material.color.set(0xffffff);
    // 恢复原始纹理
    if (mesh.userData.originalMaps && mesh.userData.originalMaps[0]) {
      mesh.material.map = mesh.userData.originalMaps[0];
    }
    mesh.material.emissive.set(0x000000);
    mesh.material.emissiveIntensity = 0;
  }

  // 确保_color属性也是字符串格式
  mesh._color = typeof originalColor === 'string' ? originalColor : colorValue;
};

// 强制恢复所有mesh到原始状态（用于清理）
const resetAllMeshes = () => {
  // 停止所有动画
  animatingMeshes.value.clear();

  meshes.value.forEach(mesh => {
    if (mesh && mesh.userData && mesh.userData.originalPosition && mesh.userData.originalColor) {
      forceResetMesh(mesh, mesh.userData.originalPosition, mesh.userData.originalColor);
    }
  });
  hoveredMeshes.value.clear();
  hoveredMesh.value = null;
};

onMounted(() => {
  initScene();
  initMap();
  initLight();
});

onBeforeUnmount(() => {
  // 恢复所有mesh
  resetAllMeshes();

  // 移除事件监听
  if (renderer.value && renderer.value.domElement) {
    renderer.value.domElement.removeEventListener('mousemove', onMouseMove);
    renderer.value.domElement.removeEventListener('mouseleave', onMouseLeave);
  }

  // 移除窗口resize监听
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }

  // 清理Three.js资源
  if (controls.value) {
    controls.value.dispose();
  }
  if (renderer.value) {
    renderer.value.dispose();
  }
});
</script>
<style scoped lang="scss">
.three-map {
  pointer-events: all;
  width: 100%;
  height: 100%;
}
</style>
