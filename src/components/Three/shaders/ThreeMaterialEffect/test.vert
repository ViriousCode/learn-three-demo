varying vec2 vUv; // 把UV坐标传给片元着色器
uniform float uTime;
void main() {
    vUv = uv; 
    // 这是一个最标准的 Three.js 顶点计算公式
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);


    // vec3 vPos = position;
    // // 使用 sin 函数制造波动，uTime 是从 JS 传进来的时间
    // vPos.z += sin(vPos.x * 10.0 + uTime) * 01.1; 
    
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
}
