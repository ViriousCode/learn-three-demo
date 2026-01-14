uniform float uTime;
uniform float uWindStrength;
uniform vec2 uWindDirection; 

attribute float instanceRandom;

varying float vHeight;

void main() {
    vHeight = position.y;
    vec3 vPosition = position;

    // 摆动算法：基于高度和风向
    float timeOffset = uTime * 2.5 + instanceRandom * 12.0;
    float wave = sin(timeOffset) * uWindStrength * vHeight;

    vPosition.x += wave * uWindDirection.x;
    vPosition.z += wave * uWindDirection.y;
    vPosition.y -= abs(wave) * 0.25; // 模拟弯曲时的物理高度下降

    vec4 worldPosition = instanceMatrix * vec4(vPosition, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
}