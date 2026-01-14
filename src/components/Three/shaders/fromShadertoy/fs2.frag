precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

// 2D 旋转矩阵
vec2 r(vec2 v, float t) {
    float s = sin(t), c = cos(t);
    return mat2(c, -s, s, c) * v;
}

// ACES 调色映射
vec3 a(vec3 c) {
    mat3 m1 = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
    mat3 m2 = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
    vec3 v = m1 * c, a = v * (v + 0.0245786) - 0.000090537, b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return m2 * (a / b);
}

// Xor 的点噪声
float n(vec3 p) {
    const float PHI = 1.618033988;
    const mat3 GOLD = mat3(
        -0.571464913, +0.814921382, +0.096597072,
        -0.278044873, -0.303026659, +0.911518454,
        +0.772087367, +0.494042493, +0.399753815);
    return dot(cos(GOLD * p), sin(PHI * p * GOLD));
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    
    float i = 0.0, s, t = uTime;
    vec3 p, l, b, d;
    
    p.z = t;
    // 计算光线方向
    d = normalize(vec3(uv, 1.5));
    
    // 核心步进循环
    for(int j = 0; j < 10; j++) {
        b = p;
        b.xy = r(sin(b.xy), t * 1.5 + b.z * 3.0);
        
        // 噪声与体积计算
        s = .001 + abs(n(b * 12.0) / 12.0 - n(b)) * .4;
        s = max(s, 2.0 - length(p.xy));
        s += abs(p.y * .75 + sin(p.z + t * .1 + p.x * 1.5)) * .2;
        
        p += d * s;
        // 累积颜色/发光
        l += (1. + sin(i + length(p.xy * .1) + vec3(3, 1.5, 1))) / s;
        i += 1.0;
    }
    
    // 3. 输出结果映射到 gl_FragColor
    vec3 finalColor = a(l * l / 6e2);
    gl_FragColor = vec4(finalColor, 1.0);
}