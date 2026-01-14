uniform vec3 uColorBase;
uniform vec3 uColorTip;

varying float vHeight;

void main() {
    // 归一化高度插值（假设草高约1.2）
    float h = clamp(vHeight / 1.2, 0.0, 1.0);
    
    // 颜色插值
    vec3 color = mix(uColorBase, uColorTip, h);
    
    // 底部遮蔽阴影
    color *= mix(0.3, 1.0, h);
    
    gl_FragColor = vec4(color, 1.0);
}