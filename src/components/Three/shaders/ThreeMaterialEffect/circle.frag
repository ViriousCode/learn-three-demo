varying vec3 vColor;

void main() {
    // 制作圆形粒子 (或模糊效果)
    float distanceToCenter = length(gl_PointCoord - 0.5); // 0.0 到 0.5
    float alpha = 1.0 - distanceToCenter * 2.0; // 中心最亮，边缘渐隐
    alpha = pow(alpha, 2.0); // 使渐变更平滑

    gl_FragColor = vec4(vColor, alpha); // 使用顶点颜色，并加入透明度
}