uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;
uniform vec2 uMouse;

// Shader by Frostbyte
// Licensed under CC BY-NC-SA 4.0

// ACES tonemap http://www.oscars.org/science-technology/sci-tech-projects/aces
vec4 aces(vec3 c){mat3 m1=mat3(0.59719,0.07600,0.02840,0.35458,0.90834,0.13383,0.04823,0.01566,0.83777);mat3 m2=mat3(1.60475,-0.10208,-0.00327,-0.53108,1.10813,-0.07276,-0.07367,-0.00605,1.07602);vec3 v=m1*c,a=v*(v+0.0245786)-0.000090537,b=v*(0.983729*v+0.4329510)+0.238081;return vec4(m2*(a/b),1.);}

//2d rotation matrix
mat2 r(float t){float s=sin(t),c=cos(t);return mat2(c,-s,s,c);}

//Noise Gradient 3d from IQ: https://www.shadertoy.com/view/Xsl3Dl
// 0: cubic
// 1: quintic
#define INTERPOLANT 0

vec3 hash( vec3 p ) // replace this by something better
{
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( in vec3 p )
{
    vec3 i = floor( p );
    vec3 f = fract( p );

    #if INTERPOLANT==1
    // quintic interpolant
    vec3 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    #else
    // cubic interpolant
    vec3 u = f*f*(3.0-2.0*f);
    #endif    

    return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}

void main() {
    vec2 R=uResolution.xy,u=vUv-0.5;
    vec4 col;
    float d,s,_,i,t=uTime; 
    vec3 p;      
    for (i=0.; i < 80.0; i++) {
        s = 0.0005 + abs(s) * 0.5;
        d += s;
        gl_FragColor += (.5+sin(d*.1-vec4(1.2,.2,.1,1)-.9))/s ;
        p = vec3(u * d * 2.0, d + t * 1.25);
        p.xy *= r(-t*.1-p.z*.4);
        s = abs(sin(p.z*.1 + (p.y+t*.1)+t) * .02);
        float density = abs(noise(vec3(p.xy,uTime*.1))*.76923);
        s += density;
        float clear = length(p.xy) -(1.5);
        s = max(-clear*.6, s);
    }
    gl_FragColor = aces(gl_FragColor.rgb * gl_FragColor.rgb / 1e7);
}
