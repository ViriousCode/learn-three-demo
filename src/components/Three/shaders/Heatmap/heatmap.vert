uniform float uTime;
uniform vec2 uMouse;
uniform float uStrength; // 传入的实时强度 (0.0 - 1.0)

varying float vHeight;
varying float vHeatInfluence; // 新增：传递热力影响强度

void main() {
    vec3 vPos = position;

    // 1. 计算距离和热力影响
    float dist = distance(vPos.xy, uMouse);
    float radius = 4.0; 
    float heat = exp(-dist * dist / (2.0 * radius * radius));
    
    // 这里的热力影响受总强度 uStrength 控制
    vHeatInfluence = heat * uStrength;

    // 2. 位移逻辑 (基础波浪 - 凹陷)
    float wave = sin(vPos.x * 0.5 + uTime) * 0.2;
    vPos.z += wave - (vHeatInfluence * 3.0); 

    vHeight = vPos.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
}