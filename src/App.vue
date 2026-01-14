<script setup lang="ts">
// import threeMap from './components/three/threeMap.vue'
// import TDT from '@/components/TDT.vue'
import ThreeMaterialEffect from './components/Three/ThreeMaterialEffect.vue'
import Grass from './components/Three/Grass.vue'
import Heatmap from './components/Three/Heatmap.vue'
import AMap from './components/AMap.vue';
const tdtApiKey = '644d5e38224b17230f0d6f93069cd8da'
const AMapKey = '542f62bf5450811afb69970f149a8bc2	'
</script>

<template>
  <!-- <threeMap class="three" /> -->
  <!-- <TDT class="tdt" :apiKey="tdtApiKey" /> -->
  <!-- <a-map class="amap" :apiKey="AMapKey" /> -->
  <ThreeMaterialEffect class="three" />
  <!-- <Grass class="three" /> -->
  <!-- <Heatmap class="three" /> -->
</template>

<style scoped>
.three {
  pointer-events: all;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100vw;
  height: 100vh;
}

.tdt {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100vw;
  height: 100vh;
}
</style>
