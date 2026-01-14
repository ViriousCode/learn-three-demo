varying float vHeight;
varying float vHeatInfluence;

void main() {
    // 基础颜色 (深蓝)
    vec3 baseColor = vec3(0.0, 0.05, 0.2);
    // 热力颜色 (亮红)
    vec3 hotColor = vec3(1.0, 0.0, 0.0);
    // 中间色 (青色/紫色)
    vec3 midColor = vec3(0.0, 1.0, 1.0);

    // 根据热力影响进行多级插值
    vec3 finalColor;
    if(vHeatInfluence < 0.5) {
        finalColor = mix(baseColor, midColor, vHeatInfluence * 2.0);
    } else {
        finalColor = mix(midColor, hotColor, (vHeatInfluence - 0.5) * 2.0);
    }

    // 还可以结合一点高度亮暗变化，增加立体感
    finalColor += vHeight * 0.1;

    gl_FragColor = vec4(finalColor, 1.0);
}