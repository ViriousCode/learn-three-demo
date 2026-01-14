// 1. 定义多组带高度的经纬度数组
const multiHeightLngLatList = [
  // 第一组：平面1
  [
    { lng: 116.397428, lat: 39.90923, height: 0 },
    { lng: 116.397828, lat: 39.90943, height: 50 }
  ],
  // 第二组：平面2
  [
    { lng: 116.397928, lat: 39.90953, height: 0 },
    { lng: 116.398328, lat: 39.90973, height: 80 }
  ],
  // 第三组：平面3
  [
    { lng: 116.397028, lat: 39.90893, height: 0 },
    { lng: 116.397428, lat: 39.90913, height: 30 }
  ]
];
// 2. 批量创建垂直平面
export const createMultiVerticalPlanes = (map: AMap.Map) => {
  // @ts-ignore
  const threeLayer = new AMap.ThreeLayer();
  map.add(threeLayer);
  multiHeightLngLatList.forEach((group, index) => {
    const [bottomPoint, topPoint] = group;
    // 复用上面的平面创建逻辑，仅修改颜色区分不同平面
    const centerLng = (bottomPoint.lng + topPoint.lng) / 2;
    const centerLat = (bottomPoint.lat + topPoint.lat) / 2;
    const centerHeight = (bottomPoint.height + topPoint.height) / 2;

    const lngDiff = Math.abs(topPoint.lng - bottomPoint.lng) * 111319;
    const latDiff = Math.abs(topPoint.lat - bottomPoint.lat) * 111319;
    const planeWidth = Math.sqrt(lngDiff ** 2 + latDiff ** 2);
    const planeHeight = Math.abs(topPoint.height - bottomPoint.height);

    // 不同平面用不同颜色
    const colorList = [0x0088ff, 0x00ff88, 0xff8800];
    // @ts-ignore
    const geometry = new AMap.THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
    // @ts-ignore
    const material = new AMap.THREE.MeshBasicMaterial({
      color: colorList[index % colorList.length],
      transparent: true,
      opacity: 0.7,
      // @ts-ignore
      side: AMap.THREE.DoubleSide
    });

    // @ts-ignore
    const planeMesh = new AMap.THREE.Mesh(geometry, material);
    planeMesh.position.set(centerLng, centerLat, centerHeight);
    planeMesh.rotation.x = Math.PI / 2;
    const angle = Math.atan2(topPoint.lng - bottomPoint.lng, topPoint.lat - bottomPoint.lat);
    planeMesh.rotation.z = angle;

    threeLayer.add(planeMesh);
  });
}

export const useThreePlane = () => {
  const geometry = new AMap.THREE.BufferGeometry();
  // create a simple square shape. We duplicate the top left and bottom right
  // vertices because each vertex needs to appear once per triangle.
  const vertices = new Float32Array([
    -1.0, -1.0, 1.0, // v0
    1.0, -1.0, 1.0, // v1
    1.0, 1.0, 1.0, // v2
    1.0, 1.0, 1.0, // v3
    -1.0, 1.0, 1.0, // v4
    -1.0, -1.0, 1.0  // v5
  ]);
  // itemSize = 3 because there are 3 values (components) per vertex
  geometry.setAttribute('position', new AMap.THREE.BufferAttribute(vertices, 3));
  const material = new AMap.THREE.MeshBasicMaterial({ color: 0xff0000 });
  const mesh = new AMap.THREE.Mesh(geometry, material);
};