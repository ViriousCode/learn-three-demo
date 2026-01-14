<template>
  <div id="amapContainer"></div>
</template>
<script lang="ts" setup>
import AMapLoader from "@amap/amap-jsapi-loader"
import { onMounted, onUnmounted } from "vue";
// import { createMultiVerticalPlanes } from "./AMap";
// import type AMap from "@types/amap-js-api"
const props = defineProps({
  apiKey: {
    type: String,
    required: true,
  }
})
let map: any = null;

onMounted(() => {
  // @ts-ignore
  window._AMapSecurityConfig = {
    securityJsCode: "eee82cf6505028f4817770ab9d36f173",
  };

  // @ts-ignore
  // window._AMapSecurityConfig = {
  //   securityJsCode: "「你申请的安全密钥」",
  // };
  AMapLoader.load({
    key: props.apiKey, // 申请好的Web端开发者Key，首次调用 load 时必填
    version: "2.0", // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
    plugins: ["AMap.Scale"], //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
  }).then((aMap) => {
    map = new aMap.Map("amapContainer", {
      // 设置地图容器id
      viewMode: "3D", // 是否为3D地图模式
      mapStyle: "amap://styles/grey",
      terrain: true,
      zoom: 18, // 初始化地图级别
      center: [121.83229691, 29.92846566], // 初始化地图中心点位置
    });
    // 执行批量创建
    map.on('complete', () => {
      // createMultiVerticalPlanes(map);
    });
    const polygon = new AMap.Polygon({
      path: [
        [
          121.83229691,
          29.92846566
        ],
        [
          121.84091722,
          29.92777756
        ],
        [
          121.84545423,
          29.92414038
        ],
        [
          121.84375285,
          29.92099459
        ],
        [
          121.84953754,
          29.91666898
        ],
        [
          121.84556766,
          29.91116338
        ],
        [
          121.8524866,
          29.91096675
        ],
        [
          121.85781758,
          29.90939366
        ],
        [
          121.86088006,
          29.9009379
        ],
        [
          121.85316715,
          29.89857802
        ],
        [
          121.85679675,
          29.89661141
        ],
        [
          121.87040778,
          29.89582476
        ],
        [
          121.87755357,
          29.90654238
        ],
        [
          121.88243086,
          29.90388766
        ]
      ],
      fillOpacity: 0,
      strokeColor: "#0033FF",
      strokeOpacity: 1,
      extData: {
        extrusionHeight: 100,
        height: 100
      }
      // extrusionHeight: 100
    })
    map.add(polygon)
  }).catch((e) => {
    console.log(e);
  });
});

onUnmounted(() => {
  map?.destroy();
});
</script>
<style lang="scss" scoped>
#amapContainer {
  width: 100vw;
  height: 100vh;
}
</style>