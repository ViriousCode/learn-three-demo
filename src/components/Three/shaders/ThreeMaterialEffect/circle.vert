attribute float size; // 每个粒子自己的大小
attribute vec3 color; // 每个粒子自己的颜色

uniform float uTime;
uniform float uPixelRatio;
uniform float uSize; // 基础大小

varying vec3 vColor; // 传递颜色给片元着色器

void main() {
    vColor = color; // 将颜色传递给片元着色器

    // 原始位置
    vec3 newPosition = position;

    // 旋转动画 - 围绕Y轴旋转
    // 获取与中心的距离，距离中心越远转的越快 (或者反之)
    float dist = length(position.xy); 
    float angle = uTime * 0.01 + dist * 0.005; // 旋转角度，受时间影响，也受距离影响

    // 简单的2D旋转 (只影响X和Y，Z不变，形成平面旋转)
    newPosition.x = position.x * cos(angle) - position.y * sin(angle);
    newPosition.y = position.x * sin(angle) + position.y * cos(angle);

    // 或者更复杂的螺旋旋转 (影响所有轴)
    float rotationSpeed = 0.1 + dist * 0.05; // 距离越远转速越快
    float currentAngle = uTime * rotationSpeed;
    float cosAngle = cos(currentAngle);
    float sinAngle = sin(currentAngle);

    // // 简单的Z轴旋转矩阵
    newPosition.x = position.x * cosAngle - position.y * sinAngle;
    newPosition.y = position.x * sinAngle + position.y * cosAngle;

    // 计算最终裁剪空间位置
    vec4 modelViewPosition = modelViewMatrix * vec4(newPosition, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    // 设置粒子大小 (乘以像素比确保在不同DPI屏幕上大小一致)
    gl_PointSize = uSize * size * (1.0 / -modelViewPosition.z); // 距离越远越小
    // gl_PointSize = uSize * size * uPixelRatio; // 固定大小，或者加上透视效果
}