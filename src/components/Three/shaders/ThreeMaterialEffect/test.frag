uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

vec2 random2(vec2 st) {
    st = vec2(dot(st, vec2(127.1, 311.7)),
              dot(st, vec2(269.5, 183.3)));
    return fract(sin(st) * 43758.5453123);
}

float random(float seed) {
    return fract(sin(seed) * 43758.5453);
}

float noiseTime(vec2 st, float time) {
    vec2 pos = vec2(st.x, st.y + time);
    return fract(sin(dot(pos, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 palette(float d){
	return mix(vec3(0./255.,103./255.,183./255.),vec3(43./255.,207./255.,1.),d);
}

float range(float x, float min, float max) {
    return min + x * (max - min);
}

void main() {
    float gridNum = 5.0;

    vec2 st = vUv * gridNum;
    vec2 ipos = floor(st); // 整数部分：每个格子的唯一 ID (0,0), (0,1), (1,0)
    vec2 fpos = fract(st); // 小数部分：每个格子的内部坐标 (0.0~1.0)
    float l = length(fract(st)-0.5-vec2(sin(uTime*ipos.x)*0.5,cos(uTime*ipos.y)*0.5));
    l = smoothstep(0., 1., l);

    vec3 mixColor = vec3(1.0, 1.0, 1.0);

    float minDist = 1.0;
    for(int y = -1; y <= 1; y++){
        for(int x = -1; x <= 1; x++){
            vec2 neighbor = vec2(float(x),float(y));
            // 获取邻居格子的随机点位置
            vec2 point = random2(ipos + neighbor); 

            point = 0.5 + 0.5*sin(uTime + 7.*point);
            
            // 计算当前像素到该点的距离
            // neighbor + point 得到点在当前局部空间的位置
            vec2 diff = neighbor + point - fpos;
            float dist = length(diff);

            // 保留最小值
            minDist = min(minDist, dist);
            mixColor = mix(vec3(ipos.x/gridNum, ipos.y/gridNum, 1.0),mixColor, minDist);
            float t = range(tan(uTime*.2), 0.1, 0.9);
            mixColor = palette(minDist*(max(ipos.x+ipos.y,0.5))/(gridNum-1.)*t);
        }
    }

    vec3 color = vec3(minDist)*mixColor;
    // // 定位到第 2 行，第 2 列的格子 (索引从 0 开始，即 ipos 为 1.0, 1.0)
    // if (ipos.x == 1.0 && ipos.y == 1.0) {
    //     color = vec3(1.0, 0.0, 0.0); // 只有中间的格子变红
    // }
    // gl_FragColor = vec4(color, 1.0);
    gl_FragColor = vec4(mixColor, 1.0);
}