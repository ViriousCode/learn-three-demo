<template>
  <div class="advanced-tianditu-map" :class="{ 'map-3d-mode': viewMode === '3d' }">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="search-box">
        <input v-model="searchKeyword" @keyup.enter="handleSearch" placeholder="搜索地点..." class="search-input" />
        <button @click="handleSearch" class="search-btn">搜索</button>
      </div>

      <div class="tool-buttons">
        <button @click="addMarkerMode = !addMarkerMode" :class="{ active: addMarkerMode }">
          {{ addMarkerMode ? '取消标记' : '添加标记' }}
        </button>
        <button @click="clearAllMarkers">清除标记</button>
        <button @click="switchLayer">切换图层</button>
        <button @click="drawRoute">重新绘制路线</button>
        <button @click="toggleViewMode" :class="{ active: viewMode === '3d' }" class="view-mode-btn">
          {{ viewMode === '2d' ? '🌐 3D视图' : '🗺️ 2D视图' }}
        </button>
      </div>
      
      <!-- 数据字段选择器 -->
      <div class="data-field-selector">
        <label for="dataField">路线颜色依据：</label>
        <select id="dataField" v-model="selectedDataField" @change="onDataFieldChange" class="data-field-select">
          <option v-for="field in availableDataFields" :key="field.value" :value="field.value">
            {{ field.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 地图容器 -->
    <div 
      ref="mapContainer" 
      class="map-container" 
      :class="{ 'map-3d': viewMode === '3d' }"
      @click="addMarkerMode ? handleAddMarker($event) : null"
    >
    </div>

    <!-- 信息窗口 -->
    <div v-if="activeMarker" class="info-window" :style="infoWindowStyle">
      <h4>{{ activeMarker.title || '位置信息' }}</h4>
      <p>经度: {{ activeMarker.lnglat[0].toFixed(6) }}</p>
      <p>纬度: {{ activeMarker.lnglat[1].toFixed(6) }}</p>
      <button @click="removeMarker(activeMarker)" class="close-btn">删除</button>
      <button @click="activeMarker = null" class="close-btn">关闭</button>
    </div>

    <!-- 路线点信息窗口 -->
    <div v-if="activeRoutePoint" class="route-point-info" :style="routePointInfoStyle">
      <h4>路线点信息</h4>
      <p><strong>时间：</strong>{{ formatTime(activeRoutePoint.time) }}</p>
      <p><strong>经度：</strong>{{ activeRoutePoint.lng.toFixed(6) }}</p>
      <p><strong>纬度：</strong>{{ activeRoutePoint.lat.toFixed(6) }}</p>
      <p><strong>{{ getFieldLabel(selectedDataField) }}：</strong>{{ activeRoutePoint.dataValue.toFixed(2) }}</p>
      <button @click="activeRoutePoint = null" class="close-btn">关闭</button>
    </div>

    <!-- 颜色图例 -->
    <div class="color-legend">
      <!-- <div class="legend-header">
        <h4>{{ getFieldLabel(selectedDataField) }} 图例</h4>
      </div> -->
      <div class="legend-content">
        <div class="legend-gradient" :style="legendGradientStyle"></div>
        <!-- <div class="legend-labels">
          <span class="legend-min">{{ formatLegendValue(dataRange.min) }}</span>
          <span class="legend-max">{{ formatLegendValue(dataRange.max) }}</span>
        </div> -->
        <div class="legend-stops" v-if="legendStops.length > 0">
          <div 
            v-for="(stop, index) in legendStops" 
            :key="index" 
            class="legend-stop"
            :style="{ left: `${stop.position}%` }"
          >
            <!-- <div class="stop-line"></div> -->
            <div class="stop-label">{{ formatLegendValue(stop.value) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 时间轴控制面板 -->
    <div class="timeline-panel">
      <div class="timeline-controls">
        <button @click="togglePlay" class="play-btn">
          {{ isPlaying ? '⏸️ 暂停' : '▶️ 播放' }}
        </button>
        <button @click="resetTime" class="reset-btn">重置</button>
        <div class="speed-control">
          <label for="playbackSpeed">倍速：</label>
          <select id="playbackSpeed" v-model.number="playbackSpeed" @change="onSpeedChange" class="speed-select">
            <option :value="0.25">0.25x</option>
            <option :value="0.5">0.5x</option>
            <option :value="1">1x</option>
            <option :value="2">2x</option>
            <option :value="4">4x</option>
            <option :value="8">8x</option>
            <option :value="16">16x</option>
          </select>
        </div>
        <span class="time-display">{{ formatTime(currentTime) }}</span>
      </div>
      <div class="timeline-slider-container">
        <input
          type="range"
          v-model.number="currentTime"
          :min="timeRange[0]"
          :max="timeRange[1]"
          :step="1000"
          @input="onTimeSliderChange"
          class="timeline-slider"
        />
        <div class="timeline-labels">
          <span>{{ formatTime(timeRange[0]) }}</span>
          <span>{{ formatTime(timeRange[1]) }}</span>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <span>中心: {{ currentCenter[0].toFixed(4) }}, {{ currentCenter[1].toFixed(4) }}</span>
      <span>缩放: {{ currentZoom }}</span>
      <span>标记数: {{ markers.length }}</span>
      <span>当前时间: {{ formatTime(currentTime) }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import routeData from './route.json'
// 从route.json数据中计算时间范围
const calculateTimeRange = () => {
  if (!routeData || !routeData.values || routeData.values.length === 0) {
    return [1748999421000, 1749104661000] // 默认值
  }
  const timeIndex = routeData.columns.indexOf('time')
  if (timeIndex < 0) {
    return [1748999421000, 1749104661000] // 默认值
  }
  const times = routeData.values.map(row => row[timeIndex]).filter(t => t != null)
  if (times.length === 0) {
    return [1748999421000, 1749104661000] // 默认值
  }
  return [Math.min(...times), Math.max(...times)]
}
const timeRange = calculateTimeRange()

// 计算初始中心点（基于route.json数据）- 必须在defineProps之前定义
const getDefaultInitialCenter = () => {
  if (!routeData || !routeData.values || routeData.values.length === 0) {
    return [121.95, 29.78] // 默认值
  }
  const lngIndex = routeData.columns.indexOf('longitude')
  const latIndex = routeData.columns.indexOf('latitude')
  if (lngIndex < 0 || latIndex < 0) {
    return [121.95, 29.78] // 默认值
  }
  const lngs = routeData.values.map(row => row[lngIndex]).filter(v => v != null)
  const lats = routeData.values.map(row => row[latIndex]).filter(v => v != null)
  if (lngs.length === 0 || lats.length === 0) {
    return [121.95, 29.78] // 默认值
  }
  return [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2
  ]
}

const props = defineProps({
  apiKey: String,
  initialCenter: {
    type: Array,
    default: () => {
      // 内联计算逻辑，避免引用外部函数
      if (!routeData || !routeData.values || routeData.values.length === 0) {
        return [121.95, 29.78]
      }
      const lngIndex = routeData.columns.indexOf('longitude')
      const latIndex = routeData.columns.indexOf('latitude')
      if (lngIndex < 0 || latIndex < 0) {
        return [121.95, 29.78]
      }
      const lngs = routeData.values.map(row => row[lngIndex]).filter(v => v != null)
      const lats = routeData.values.map(row => row[latIndex]).filter(v => v != null)
      if (lngs.length === 0 || lats.length === 0) {
        return [121.95, 29.78]
      }
      return [
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2
      ]
    }
  }
})

const emit = defineEmits(['marker-added', 'marker-removed', 'search-result'])

// Refs
const mapContainer = ref(null)
const mapInstance = ref(null)
const searchKeyword = ref('')
const addMarkerMode = ref(false)
const activeMarker = ref(null)
const infoWindowPosition = ref({ x: 0, y: 0 })

// 地图状态
const currentZoom = ref(12)
const currentCenter = ref([...props.initialCenter])
const markers = ref([])
const currentLayer = ref('vector')
const routePolylines = ref([])
const routeArrows = ref([])
const routePointMarkers = ref([]) // 路线点标记
const startMarker = ref(null)
const endMarker = ref(null)
const activeRoutePoint = ref(null) // 当前激活的路线点
const routePointInfoPosition = ref({ x: 0, y: 0 })

// 视图模式
const viewMode = ref('2d') // '2d' 或 '3d'

// 数据字段选择
const selectedDataField = ref('盐度') // 默认使用盐度
const availableDataFields = computed(() => {
  if (!routeData || !routeData.columns) return []
  // 排除坐标和时间字段，只返回数据字段
  const excludeFields = ['time', 'longitude', 'latitude']
  return routeData.columns
    .filter(col => !excludeFields.includes(col))
    .map(col => ({
      value: col,
      label: getFieldLabel(col)
    }))
})

// 数据范围（用于图例）
const dataRange = ref({ min: 0, max: 1 })

// 计算图例渐变色
const legendGradientStyle = computed(() => {
  const fieldName = selectedDataField.value
  let colors = []
  
  if (fieldName === 'ph') {
    colors = ['rgb(255, 0, 0)', 'rgb(255, 255, 0)', 'rgb(0, 255, 0)', 'rgb(0, 150, 255)', 'rgb(0, 0, 255)']
  } else if (fieldName === '水温') {
    colors = ['rgb(0, 100, 255)', 'rgb(0, 255, 255)', 'rgb(0, 255, 0)', 'rgb(255, 255, 0)', 'rgb(255, 0, 0)']
  } else if (fieldName === '盐度') {
    colors = ['rgb(0, 100, 255)', 'rgb(0, 255, 0)', 'rgb(255, 255, 0)', 'rgb(255, 135, 0)', 'rgb(255, 0, 0)']
  } else {
    colors = ['rgb(0, 255, 0)', 'rgb(255, 255, 0)', 'rgb(255, 135, 0)', 'rgb(255, 0, 0)']
  }
  
  const gradientStops = colors.map((color, index) => {
    return `${color} ${(index / (colors.length - 1)) * 100}%`
  }).join(', ')
  
  return {
    background: `linear-gradient(to right, ${gradientStops})`
  }
})

// 计算图例刻度点
const legendStops = computed(() => {
  const fieldName = selectedDataField.value
  let colorCount = 4
  
  if (fieldName === 'ph' || fieldName === '水温' || fieldName === '盐度') {
    colorCount = 5
  }
  
  const stops = []
  for (let i = 0; i <= colorCount; i++) {
    const position = (i / colorCount) * 100
    const value = dataRange.value.min + (dataRange.value.max - dataRange.value.min) * (i / colorCount)
    stops.push({ position, value })
  }
  
  return stops
})

// 格式化图例数值
const formatLegendValue = (value) => {
  if (value == null || isNaN(value)) return '0'
  // 根据数值大小决定小数位数
  if (Math.abs(value) >= 100) {
    return value.toFixed(0)
  } else if (Math.abs(value) >= 10) {
    return value.toFixed(1)
  } else {
    return value.toFixed(2)
  }
}

// 获取字段的中文标签
const getFieldLabel = (field) => {
  const labels = {
    'ph': 'pH值',
    '水温': '水温',
    '盐度': '盐度',
    'tvocs': 'TVOCs',
    'pm10': 'PM10',
    'pm2.5': 'PM2.5',
    '风速': '风速',
    '气压': '气压',
    '温度': '温度',
    '湿度': '湿度',
    '风向': '风向'
  }
  return labels[field] || field
}

// 时间轴相关状态
const currentTime = ref(timeRange[0])
const isPlaying = ref(false)
const playInterval = ref(null)
const playSpeed = ref(100) // 播放间隔，每100ms更新一次
const playbackSpeed = ref(1) // 倍速，1x表示正常速度

// Computed
const infoWindowStyle = computed(() => ({
  left: `${infoWindowPosition.value.x}px`,
  top: `${infoWindowPosition.value.y}px`
}))

const routePointInfoStyle = computed(() => ({
  left: `${routePointInfoPosition.value.x}px`,
  top: `${routePointInfoPosition.value.y}px`
}))

// 地图初始化
onMounted(async () => {
  await initMap()
})

onUnmounted(() => {
  if (playInterval.value) {
    clearInterval(playInterval.value)
  }
  if (mapInstance.value) {
    mapInstance.value.destroy()
  }
})
// 加载天地图 API
const loadTianDiAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.T) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${props.apiKey}`
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}
const initMap = async () => {
  await loadTianDiAPI()

  mapInstance.value = new T.Map(mapContainer.value, {
    projection: 'EPSG:4326'
  })

  mapInstance.value.centerAndZoom(
    new T.LngLat(...props.initialCenter),
    currentZoom.value
  )

  // 添加控件
  mapInstance.value.addControl(new T.Control.Zoom())
  mapInstance.value.addControl(new T.Control.Scale())

  // 绑定事件
  bindMapEvents()

  // 绘制路线
  drawRoute()
}

// 存储所有路线点，用于点击检测
const allRoutePoints = ref([])

const bindMapEvents = () => {
  mapInstance.value.addEventListener('click', (e) => {
    // 首先检查是否点击了路线点
    if (checkRoutePointClick(e)) {
      return // 如果点击了路线点，不处理其他点击
    }

    if (!addMarkerMode.value) return

    const lnglat = [e.lnglat.lng, e.lnglat.lat]
    addMarker(...lnglat, `标记点 ${markers.value.length + 1}`)
  })

  mapInstance.value.addEventListener('moveend', () => {
    const center = mapInstance.value.getCenter()
    currentCenter.value = [center.lng, center.lat]
  })

  mapInstance.value.addEventListener('zoomend', () => {
    currentZoom.value = mapInstance.value.getZoom()
  })
}

// 检查是否点击了路线点（支持所有路线点）
const checkRoutePointClick = (e) => {
  if (allRoutePoints.value.length === 0) return false

  const clickLng = e.lnglat.lng
  const clickLat = e.lnglat.lat
  
  // 根据当前缩放级别计算合理的点击范围
  // 缩放级别越高，容差越小（更精确）
  const zoom = mapInstance.value.getZoom()
  // 使用更大的容差范围，让路线更容易点击
  // 在不同缩放级别下，大约对应20-50像素的点击范围
  // 基础容差增大，确保能检测到点击
  const baseTolerance = 0.001 // 基础容差（约100米，增大10倍）
  // 根据缩放级别动态调整，缩放级别越高容差越小
  const zoomFactor = Math.max(0.01, Math.min(2, Math.pow(2, 12 - zoom)))
  const clickTolerance = baseTolerance * zoomFactor
  
  let nearestPoint = null
  let minDistance = Infinity
  
  // 查找最近的路线上点
  allRoutePoints.value.forEach((point) => {
    const dx = point.lng - clickLng
    const dy = point.lat - clickLat
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < minDistance) {
      minDistance = distance
      nearestPoint = point
      console.log(point, 'point', distance, 'distance', clickTolerance, 'clickTolerance')
    }
  })
  
  // 如果找到最近的点且在容差范围内，显示信息
  if (nearestPoint && minDistance < clickTolerance) {
    activeRoutePoint.value = {
      lng: nearestPoint.lng,
      lat: nearestPoint.lat,
      time: nearestPoint.time,
      dataValue: nearestPoint.dataValue,
      allDataValues: nearestPoint.allDataValues
    }
    routePointInfoPosition.value = {
      x: e.containerPoint.x + 10,
      y: e.containerPoint.y - 10
    }
    return true
  }
  
  // 如果直接点击的点不在容差内，检查是否点击在路线段上
  // 遍历所有路线段，检查点击位置是否在某个线段附近
  // 使用更大的容差来检测线段点击
  const segmentTolerance = clickTolerance * 2 // 线段检测使用更大的容差
  for (let i = 0; i < allRoutePoints.value.length - 1; i++) {
    const p1 = allRoutePoints.value[i]
    const p2 = allRoutePoints.value[i + 1]
    
    // 计算点到线段的距离
    const distanceToSegment = pointToLineSegmentDistance(
      clickLng, clickLat,
      p1.lng, p1.lat,
      p2.lng, p2.lat
    )
    
    // 如果点击位置在线段附近，选择该线段上最近的点
    if (distanceToSegment < segmentTolerance) {
      // 选择线段上距离点击位置最近的点
      const distToP1 = Math.sqrt(Math.pow(clickLng - p1.lng, 2) + Math.pow(clickLat - p1.lat, 2))
      const distToP2 = Math.sqrt(Math.pow(clickLng - p2.lng, 2) + Math.pow(clickLat - p2.lat, 2))
      
      const selectedPoint = distToP1 < distToP2 ? p1 : p2
      
      activeRoutePoint.value = {
        lng: selectedPoint.lng,
        lat: selectedPoint.lat,
        time: selectedPoint.time,
        dataValue: selectedPoint.dataValue,
        allDataValues: selectedPoint.allDataValues
      }
      routePointInfoPosition.value = {
        x: e.containerPoint.x + 10,
        y: e.containerPoint.y - 10
      }
      return true
    }
  }
  
  return false
}

// 计算点到线段的距离
const pointToLineSegmentDistance = (px, py, x1, y1, x2, y2) => {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) {
    param = dot / lenSq
  }

  let xx, yy

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = px - xx
  const dy = py - yy
  return Math.sqrt(dx * dx + dy * dy)
}

// 标记点管理
const addMarker = (lng, lat, title = '') => {
  const marker = new T.Marker(new T.LngLat(lng, lat), {
    title: title,
    icon: new T.Icon({
      iconUrl: 'https://api.tianditu.gov.cn/img/marker.png',
      iconSize: new T.Point(25, 34)
    })
  })

  marker.addEventListener('click', (e) => {
    activeMarker.value = {
      id: markers.value.length,
      lnglat: [lng, lat],
      title: title,
      marker: marker
    }
    infoWindowPosition.value = {
      x: e.containerPoint.x,
      y: e.containerPoint.y
    }
  })

  mapInstance.value.addOverLay(marker)
  markers.value.push(marker)

  emit('marker-added', { lng, lat, title, marker })
}

const removeMarker = (markerInfo) => {
  mapInstance.value.removeOverLay(markerInfo.marker)
  markers.value = markers.value.filter(m => m !== markerInfo.marker)
  activeMarker.value = null
  emit('marker-removed', markerInfo)
}

const clearAllMarkers = () => {
  markers.value.forEach(marker => {
    mapInstance.value.removeOverLay(marker)
  })
  markers.value = []
  activeMarker.value = null
}

// 搜索功能
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) return

  try {
    const response = await fetch(
      `https://api.tianditu.gov.cn/geocoder?postStr=` +
      JSON.stringify({
        addr: searchKeyword.value,
        tk: props.apiKey
      })
    )

    const data = await response.json()

    if (data.status === 0 && data.location) {
      const { lon, lat } = data.location
      mapInstance.value.panTo(new T.LngLat(lon, lat))

      emit('search-result', {
        keyword: searchKeyword.value,
        location: [lon, lat],
        address: data.formatted_address
      })
    }
  } catch (error) {
    console.error('搜索失败:', error)
  }
}

// 图层切换
const switchLayer = () => {
  currentLayer.value = currentLayer.value === 'vector' ? 'image' : 'vector'
  const url1 = "http://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=" + props.apiKey
  const url2 = "http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=" + props.apiKey

  // 清除现有图层
  mapInstance.value.clearLayers()

  // 添加新图层
  if (currentLayer.value === 'vector') {
    // 矢量地图
    const normalLayer = new T.TileLayer(url1, {
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7']
    })
    mapInstance.value.addLayer(normalLayer)
  } else {
    // 影像地图
    const imageLayer = new T.TileLayer(url2, {
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7']
    })
    mapInstance.value.addLayer(imageLayer)
  }

  // 重新绘制路线（因为图层被清除了）
  drawRoute()
}

// 获取路线坐标点和数据（支持动态字段选择）
const getRoutePoints = (maxTime = null) => {
  if (!routeData || !routeData.values) return []

  const points = []
  const lngIndex = routeData.columns.indexOf('longitude')
  const latIndex = routeData.columns.indexOf('latitude')
  const dataFieldIndex = routeData.columns.indexOf(selectedDataField.value)
  const timeIndex = routeData.columns.indexOf('time')

  routeData.values.forEach(row => {
    if (lngIndex >= 0 && latIndex >= 0 && row[lngIndex] && row[latIndex]) {
      const time = timeIndex >= 0 ? (row[timeIndex] || 0) : 0
      
      // 如果指定了最大时间，只返回该时间之前的点
      if (maxTime !== null && time > maxTime) {
        return
      }
      
      const dataValue = dataFieldIndex >= 0 ? (row[dataFieldIndex] || 0) : 0
      // 获取所有数据字段的值，以便在点击时显示完整信息
      const allDataValues = {}
      routeData.columns.forEach((col, idx) => {
        if (col !== 'time' && col !== 'longitude' && col !== 'latitude') {
          allDataValues[col] = row[idx] || 0
        }
      })
      
      points.push({
        lng: row[lngIndex],
        lat: row[latIndex],
        dataValue: dataValue, // 使用选择的数据字段值
        allDataValues: allDataValues, // 所有数据字段的值
        time: time
      })
    }
  })

  return points
}

// 颜色插值函数
const interpolateColor = (startColor, endColor, factor) => {
  const result = startColor.slice()
  for (let i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (endColor[i] - startColor[i]))
  }
  return `rgb(${result[0]}, ${result[1]}, ${result[2]})`
}

// 根据数据值获取颜色（通用函数，支持不同数据字段）
const getColorByDataValue = (value, minValue, maxValue, fieldName) => {
  // 根据不同的数据字段使用不同的颜色方案
  let colors
  
  if (fieldName === 'ph') {
    // pH值：酸性（红色）-> 中性（绿色）-> 碱性（蓝色）
    colors = [
      [255, 0, 0],      // 红色 - 酸性
      [255, 255, 0],   // 黄色 - 弱酸性
      [0, 255, 0],     // 绿色 - 中性
      [0, 150, 255],   // 蓝色 - 弱碱性
      [0, 0, 255]      // 深蓝 - 强碱性
    ]
  } else if (fieldName === '水温') {
    // 水温：低温（蓝色）-> 中温（绿色）-> 高温（红色）
    colors = [
      [0, 100, 255],   // 蓝色 - 低温
      [0, 255, 255],   // 青色 - 中低温
      [0, 255, 0],     // 绿色 - 中温
      [255, 255, 0],   // 黄色 - 中高温
      [255, 0, 0]      // 红色 - 高温
    ]
  } else if (fieldName === '盐度') {
    // 盐度：低盐度（蓝色）-> 中盐度（绿色）-> 高盐度（红色）
    colors = [
      [0, 100, 255],   // 蓝色 - 低盐度
      [0, 255, 0],     // 绿色 - 中低盐度
      [255, 255, 0],   // 黄色 - 中盐度
      [255, 135, 0],   // 橙色 - 中高盐度
      [255, 0, 0]      // 红色 - 高盐度
    ]
  } else {
    // 默认颜色方案：低值（绿色）-> 中值（黄色）-> 高值（红色）
    colors = [
      [0, 255, 0],     // 绿色 - 低值
      [255, 255, 0],   // 黄色 - 中值
      [255, 135, 0],   // 橙色 - 中高值
      [255, 0, 0]      // 红色 - 高值
    ]
  }

  // 归一化值到 0-1 范围
  const normalized = (value - minValue) / (maxValue - minValue || 1)

  // 根据颜色数量确定分段
  const segmentCount = colors.length - 1
  const segmentSize = 1 / segmentCount

  // 找到对应的颜色段
  for (let i = 0; i < segmentCount; i++) {
    if (normalized <= (i + 1) * segmentSize) {
      const factor = (normalized - i * segmentSize) / segmentSize
      return interpolateColor(colors[i], colors[i + 1], factor)
    }
  }
  
  // 如果超出范围，返回最后一个颜色
  return `rgb(${colors[colors.length - 1][0]}, ${colors[colors.length - 1][1]}, ${colors[colors.length - 1][2]})`
}

// 绘制路线
const drawRoute = () => {
  if (!mapInstance.value) return

  // 清除之前的路线
  clearRoute()

  // 根据当前时间获取路线点
  const points = getRoutePoints(currentTime.value)
  if (points.length === 0) return

  // 存储所有路线点用于点击检测
  allRoutePoints.value = points

  // 计算选择的数据字段的最小值和最大值
  const dataValues = points.map(p => p.dataValue).filter(v => v != null && !isNaN(v))
  const minValue = dataValues.length > 0 ? Math.min(...dataValues) : 0
  const maxValue = dataValues.length > 0 ? Math.max(...dataValues) : 1
  
  // 更新数据范围用于图例
  dataRange.value = { min: minValue, max: maxValue }

  const totalPoints = points.length
  const segmentSize = Math.max(1, Math.floor(totalPoints / 50)) // 将路线分成约50段以实现渐变

  // 绘制分段路线
  for (let i = 0; i < totalPoints - 1; i += segmentSize) {
    const segmentPoints = []
    const segmentDataValues = []
    const endIndex = Math.min(i + segmentSize + 1, totalPoints)

    for (let j = i; j < endIndex; j++) {
      segmentPoints.push(new T.LngLat(points[j].lng, points[j].lat))
      segmentDataValues.push(points[j].dataValue)
    }

    if (segmentPoints.length < 2) continue

    // 计算当前段的平均数据值
    const avgValue = segmentDataValues.reduce((sum, val) => sum + val, 0) / segmentDataValues.length

    // 根据选择的数据字段值确定颜色
    const color = getColorByDataValue(avgValue, minValue, maxValue, selectedDataField.value)

    // 创建折线，根据视图模式调整样式
    const lineWeight = viewMode.value === '3d' ? 10 : 6
    const lineOpacity = viewMode.value === '3d' ? 1.0 : 0.9
    
    // 3D模式下先添加阴影层（更粗的暗色线条作为底部）
    if (viewMode.value === '3d') {
      const shadowPolyline = new T.Polyline(segmentPoints, {
        color: 'rgba(0, 0, 0, 0.4)',
        weight: lineWeight + 3,
        opacity: 0.5,
        lineJoin: 'round',
        lineCap: 'round'
      })
      mapInstance.value.addOverLay(shadowPolyline)
      routePolylines.value.push(shadowPolyline)
    }
    
    // 主路线
    const polyline = new T.Polyline(segmentPoints, {
      color: color,
      weight: lineWeight,
      opacity: lineOpacity,
      lineJoin: 'round',
      lineCap: 'round'
    })

    mapInstance.value.addOverLay(polyline)
    routePolylines.value.push(polyline)
  }

  // 添加方向箭头（每隔一定距离添加一个）
  const arrowInterval = Math.max(10, Math.floor(totalPoints / 30))
  for (let i = arrowInterval; i < totalPoints - arrowInterval; i += arrowInterval) {
    const point = points[i]
    const nextPoint = points[Math.min(i + arrowInterval, totalPoints - 1)]

    // 计算方向角度
    const dx = nextPoint.lng - point.lng
    const dy = nextPoint.lat - point.lat
    const angle = Math.atan2(dy, dx) * 180 / Math.PI

    // 创建箭头标记（使用SVG图标）
    // const arrowIcon = createArrowIcon(angle)
    // const arrowMarker = new T.Marker(new T.LngLat(point.lng, point.lat), {
    //   icon: arrowIcon
    // })

    // mapInstance.value.addOverLay(arrowMarker)
    // routeArrows.value.push(arrowMarker)
  }
  
  // 注意：所有路线点的点击检测已通过地图的click事件统一处理
  // 无需为每个点单独创建标记，这样可以支持所有点的点击

  // 路线点击检测已通过地图的click事件处理，无需为polyline单独添加事件

  // 添加起点标记（红色图钉）
  if (points.length > 0) {
    const startPoint = points[0]
    if (startMarker.value) {
      // 更新现有标记的位置
      startMarker.value.setLngLat(new T.LngLat(startPoint.lng, startPoint.lat))
    } else {
      // 创建新标记
      const startIcon = createStartMarkerIcon()
      startMarker.value = new T.Marker(new T.LngLat(startPoint.lng, startPoint.lat), {
        icon: startIcon
      })
      mapInstance.value.addOverLay(startMarker.value)
    }
  } else if (startMarker.value) {
    // 如果没有点，移除标记
    mapInstance.value.removeOverLay(startMarker.value)
    startMarker.value = null
  }

  // 添加当前时间点的标记（船图标）- 显示当前位置
  if (points.length > 0) {
    const currentPoint = points[points.length - 1]
    const endIcon = createBoatIcon()
    if (endMarker.value) {
      // 更新现有标记的位置
      endMarker.value.setLngLat(new T.LngLat(currentPoint.lng, currentPoint.lat))
    } else {
      // 创建新标记
      endMarker.value = new T.Marker(new T.LngLat(currentPoint.lng, currentPoint.lat), {
        icon: endIcon
      })
      mapInstance.value.addOverLay(endMarker.value)
    }
  } else if (endMarker.value) {
    // 如果没有点，移除标记
    mapInstance.value.removeOverLay(endMarker.value)
    endMarker.value = null
  }

  // 调整地图视野以包含整条路线
  if (points.length > 0) {
    const bounds = new T.LngLatBounds()
    points.forEach(point => {
      bounds.extend(new T.LngLat(point.lng, point.lat))
    })
    mapInstance.value.fitView([bounds])
  }
}

// 创建可点击的点图标（更大更明显的可点击区域）
const createClickablePointIcon = () => {
  const size = 24 // 增大尺寸以便更容易点击
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  // 绘制一个半透明的圆点，表示可点击
  ctx.fillStyle = 'rgba(74, 144, 226, 0.7)'
  ctx.strokeStyle = 'rgba(74, 144, 226, 1)'
  ctx.lineWidth = 2
  
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  
  // 添加中心点
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 5, 0, Math.PI * 2)
  ctx.fill()
  
  return new T.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: new T.Point(size, size),
    iconAnchor: new T.Point(size / 2, size / 2)
  })
}

// 创建箭头图标
const createArrowIcon = (angle) => {
  const size = 20
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.translate(size / 2, size / 2)
  ctx.rotate((angle + 90) * Math.PI / 180)

  // 绘制白色箭头
  ctx.fillStyle = 'white'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.lineWidth = 1

  ctx.beginPath()
  ctx.moveTo(0, -size / 2 + 2)
  ctx.lineTo(-size / 4, size / 4)
  ctx.lineTo(size / 4, size / 4)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  return new T.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: new T.Point(size, size),
    iconAnchor: new T.Point(size / 2, size / 2)
  })
}

// 创建起点标记图标（红色图钉）
const createStartMarkerIcon = () => {
  const size = 30
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 绘制红色圆形图钉
  ctx.fillStyle = '#FF0000'
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // 添加白色中心点
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 6, 0, Math.PI * 2)
  ctx.fill()

  return new T.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: new T.Point(size, size),
    iconAnchor: new T.Point(size / 2, size / 2)
  })
}

// 创建船图标
const createBoatIcon = () => {
  const size = 40
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // 绘制船体（浅蓝色）
  ctx.fillStyle = '#87CEEB'
  ctx.strokeStyle = '#4682B4'
  ctx.lineWidth = 2

  // 船体形状
  ctx.beginPath()
  ctx.moveTo(size * 0.2, size * 0.7)
  ctx.lineTo(size * 0.8, size * 0.7)
  ctx.lineTo(size * 0.9, size * 0.5)
  ctx.lineTo(size * 0.1, size * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // 绘制船舱（白色）
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.rect(size * 0.35, size * 0.3, size * 0.3, size * 0.2)
  ctx.fill()
  ctx.stroke()

  // 绘制天线
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(size * 0.5, size * 0.3)
  ctx.lineTo(size * 0.5, size * 0.15)
  ctx.stroke()

  // 天线顶部小球
  ctx.fillStyle = '#333333'
  ctx.beginPath()
  ctx.arc(size * 0.5, size * 0.15, 2, 0, Math.PI * 2)
  ctx.fill()

  return new T.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: new T.Point(size, size),
    iconAnchor: new T.Point(size / 2, size / 2)
  })
}

// 清除路线
const clearRoute = () => {
  routePolylines.value.forEach(polyline => {
    mapInstance.value.removeOverLay(polyline)
  })
  routePolylines.value = []

  routeArrows.value.forEach(arrow => {
    mapInstance.value.removeOverLay(arrow)
  })
  routeArrows.value = []

  routePointMarkers.value.forEach(marker => {
    mapInstance.value.removeOverLay(marker)
  })
  routePointMarkers.value = []

  if (startMarker.value) {
    mapInstance.value.removeOverLay(startMarker.value)
    startMarker.value = null
  }

  if (endMarker.value) {
    mapInstance.value.removeOverLay(endMarker.value)
    endMarker.value = null
  }
}

// 添加标记处理
const handleAddMarker = (event) => {
  if (!addMarkerMode.value) return

  const rect = mapContainer.value.getBoundingClientRect()
  const point = new T.Point(
    event.clientX - rect.left,
    event.clientY - rect.top
  )

  const lnglat = mapInstance.value.containerPointToLngLat(point)
  addMarker(lnglat.lng, lnglat.lat, `自定义标记 ${markers.value.length + 1}`)
}

// 时间格式化
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 切换播放/暂停
const togglePlay = () => {
  if (isPlaying.value) {
    // 暂停
    if (playInterval.value) {
      clearInterval(playInterval.value)
      playInterval.value = null
    }
    isPlaying.value = false
  } else {
    // 播放
    isPlaying.value = true
    playInterval.value = setInterval(() => {
      // 根据倍速计算每次增加的时间（毫秒）
      // 1x倍速：每100ms增加1000ms（1秒），即10倍速
      // 2x倍速：每100ms增加2000ms（2秒），即20倍速
      const timeIncrement = 1000 * playbackSpeed.value
      currentTime.value += timeIncrement
      if (currentTime.value >= timeRange[1]) {
        // 到达结束时间，停止播放
        currentTime.value = timeRange[1]
        togglePlay()
      }
      drawRoute()
    }, playSpeed.value)
  }
}

// 重置时间
const resetTime = () => {
  if (playInterval.value) {
    clearInterval(playInterval.value)
    playInterval.value = null
  }
  isPlaying.value = false
  currentTime.value = timeRange[0]
  drawRoute()
}

// 时间轴滑块变化
const onTimeSliderChange = () => {
  // 如果正在播放，先暂停
  if (isPlaying.value) {
    togglePlay()
  }
  drawRoute()
}

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === '2d' ? '3d' : '2d'
  // 重新绘制路线以应用新的样式
  drawRoute()
}

// 数据字段变化处理
const onDataFieldChange = () => {
  // 重新绘制路线以应用新的颜色映射
  drawRoute()
}

// 倍速变化处理
const onSpeedChange = () => {
  // 如果正在播放，需要重启播放以应用新的倍速
  if (isPlaying.value) {
    togglePlay() // 暂停
    setTimeout(() => {
      togglePlay() // 重新开始播放
    }, 50)
  }
}
</script>

<style scoped>
.advanced-tianditu-map {
  position: relative;
  width: 100%;
  height: 600px;
  border: 1px solid #ddd;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  transition: background 0.8s ease-in-out;
}

/* 3D模式下的背景 */
.advanced-tianditu-map.map-3d-mode {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.data-field-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.data-field-selector label {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.data-field-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 120px;
}

.data-field-select:hover {
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

.data-field-select:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

/* 颜色图例样式 */
.color-legend {
  position: absolute;
  top: 10px;
  right: 10px;
  background: white;
  padding: 12px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
}

.legend-header {
  margin-bottom: 10px;
}

.legend-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.legend-content {
  position: relative;
}

.legend-gradient {
  width: 438px;
  height: 13.5px;
  border-radius: 10px;
  border: 1px solid #ddd;
  margin-bottom: 8px;
  position: relative;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
  margin-bottom: 5px;
}

.legend-min,
.legend-max {
  font-weight: 500;
}

.legend-stops {
  position: relative;
  height: 30px;
  margin-top: 5px;
}

.legend-stop {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  text-align: center;
}

.stop-line {
  width: 1px;
  height: 8px;
  background: #666;
  margin: 0 auto 4px;
}

.stop-label {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  font-weight: 500;
}

.search-box {
  display: flex;
  gap: 5px;
}

.search-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 200px;
}

.search-btn,
.tool-buttons button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.search-btn:hover,
.tool-buttons button:hover {
  background: #f5f5f5;
}

.tool-buttons button.active {
  background: #4a90e2;
  color: white;
}

.view-mode-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
  position: relative;
  overflow: hidden;
}

.view-mode-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.view-mode-btn:hover::before {
  width: 300px;
  height: 300px;
}

.view-mode-btn:hover {
  background: linear-gradient(135deg, #5568d3 0%, #653a8f 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.view-mode-btn.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

.view-mode-btn.active:hover {
  background: linear-gradient(135deg, #e084f0 0%, #e5485f 100%);
}

.map-container {
  width: 100%;
  height: 100%;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.8s ease-in-out;
  transform-style: preserve-3d;
  position: relative;
}

/* 3D模式下的地图容器 */
.map-container.map-3d {
  transform: perspective(1500px) rotateX(60deg) scale(1.1) translateZ(0);
  transform-origin: center center;
  transform-style: preserve-3d;
  box-shadow: 
    0 25px 80px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(0, 0, 0, 0.1),
    inset 0 0 120px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  overflow: hidden;
}

/* 3D模式下的视觉增强效果 */
.map-container.map-3d::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.2) 0%,
    transparent 20%,
    transparent 80%,
    rgba(0, 0, 0, 0.3) 100%
  );
  pointer-events: none;
  z-index: 1;
  border-radius: 12px;
}

.map-container.map-3d::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.15) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
  animation: rotateLight 12s linear infinite;
}

@keyframes rotateLight {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.info-window {
  position: absolute;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  min-width: 200px;
}

.route-point-info {
  position: absolute;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1002;
  min-width: 250px;
  max-width: 350px;
  border: 2px solid #4a90e2;
}

.route-point-info h4 {
  margin: 0 0 12px 0;
  color: #4a90e2;
  font-size: 16px;
  border-bottom: 2px solid #4a90e2;
  padding-bottom: 8px;
}

.route-point-info p {
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
}

.route-point-info p strong {
  color: #666;
  margin-right: 5px;
}

.info-window h4 {
  margin: 0 0 10px 0;
}

.close-btn {
  margin-top: 10px;
  margin-right: 10px;
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
}

.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.timeline-panel {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 800px;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.speed-control label {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.speed-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 70px;
}

.speed-select:hover {
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

.speed-select:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.play-btn,
.reset-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #4a90e2;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.play-btn:hover,
.reset-btn:hover {
  background: #357abd;
}

.reset-btn {
  background: #6c757d;
}

.reset-btn:hover {
  background: #5a6268;
}

.time-display {
  margin-left: auto;
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.timeline-slider-container {
  position: relative;
}

.timeline-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4a90e2;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.timeline-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4a90e2;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.timeline-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 11px;
  color: #666;
}
</style>