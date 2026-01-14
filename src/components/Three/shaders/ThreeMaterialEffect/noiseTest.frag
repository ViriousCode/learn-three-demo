uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

// 伪随机函数：输入一个坐标，返回 0-1 之间的值
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

#define OCTAVES 6
float fbm (in vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;
    //
    // Loop of octaves
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 1.936;
        amplitude *= 0.548;
    }
    return value;
}

void main() {
  vec2 uv = vUv*3.;

  vec3 color = vec3(0.0);
  color += fbm(uv+0.1*uTime+fbm(uv-0.1*uTime+fbm(uv+0.1*uTime+fbm(uv-0.1*uTime))));
  // color += fbm(uv)*fbm(uv+0.1*uTime)*fbm(uv+0.1*uTime)*fbm(uv+0.1*uTime);

  vec3 mixColor = vec3(89./255.,178./255.,255./255.);

  color = mix(mixColor, color, 0.5);

  gl_FragColor = vec4(color,1.0);
}