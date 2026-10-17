/* HyperFrames wireframe-portal-title, Apache-2.0. Six original shader bodies;
   defined inverse smoothstep replaces two undefined descending calls.
   See production-wireframe-provenance.json. */
(() => {
  'use strict';
  function create(THREE,W,H,colors) {
    if(THREE?.REVISION!=='185'||![W,H].every(v=>Number.isInteger(v)&&v>0&&v<=4096))
      throw new Error('Pinned portal shader runtime and bounded dimensions required');
    if(!colors||!['surface','foreground'].every(k=>typeof colors[k]==='string'&&/^#[0-9a-f]{6}$/i.test(colors[k])))
      throw new Error('Approved portal palette required');
    const P={...window.ShortCreatorWireframeMotion.parameters,gridLineColor:colors.foreground,portalStartColor:colors.surface};
      const PortalCompositeShader = {
        uniforms: {
          tDiffuse: { value: null },
          uPortalRadius: { value: 0.0 },
          uPortalCenter: { value: new THREE.Vector2(0.5, 0.5) },
          uStarburstPoints: { value: P.starburstPoints },
          uChromaticStrength: { value: P.portalChromatic },
          uEdgeBlur: { value: P.portalEdgeBlur },
          uIrregularity: { value: P.portalIrregularity },
          uStartColor: { value: new THREE.Color(P.portalStartColor) },
          uPortalProgress: { value: 0.0 },
          uTime: { value: 0 },
          uOuterBlur: { value: 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uPortalRadius;
          uniform vec2 uPortalCenter;
          uniform int uStarburstPoints;
          uniform float uChromaticStrength;
          uniform float uEdgeBlur;
          uniform float uIrregularity;
          uniform vec3 uStartColor;
          uniform float uPortalProgress;
          uniform float uTime;
          uniform float uOuterBlur;
          varying vec2 vUv;

          float hash(float n) { return fract(sin(n) * 43758.5453); }

          void main() {
            vec2 uv = vUv;
            vec2 center = uPortalCenter;
            vec2 delta = uv - center;
            float dist = length(delta);
            float angle = atan(delta.y, delta.x);

            float points = float(uStarburstPoints);
            float spikeLength = 0.2 * uPortalRadius;
            float valleyDepth = 0.08 * uPortalRadius;
            float baseR = uPortalRadius - valleyDepth;

            float seed = floor(uTime * 0.4) * 7.13;

            // Low-frequency undulation: the base ellipse itself wobbles.
            float wob = sin(angle * 2.0 + seed * 1.7)
                      * 0.45 + sin(angle * 3.0 - seed * 2.3 + 1.9) * 0.33
                      + sin(angle * 5.0 + seed * 0.9 + 4.2) * 0.22;
            baseR *= 1.0 + wob * 0.16 * uIrregularity;

            // Warp the angle before segmenting: spikes cluster and gap
            // instead of sitting on an even sunburst lattice.
            float aw = angle
                     + (sin(angle * 3.0 + seed + 0.7) * 0.55
                      + sin(angle * 5.0 - seed * 1.3 + 2.3) * 0.35)
                       * 0.45 * uIrregularity;

            float segAngle = 6.28318 / points;
            float localAngle = mod(aw + 3.14159, segAngle);
            float segIndex = floor((aw + 3.14159) / segAngle);

            float t = localAngle / segAngle;

            // Per-spike character: off-centre tips, fat-to-needle sharpness,
            // broad length spread with occasional dominant spikes.
            float h1 = hash(segIndex * 17.3 + seed);
            float h2 = hash(segIndex * 31.7 + seed + 5.1);
            float h3 = hash(segIndex * 47.9 + seed + 9.7);
            float tip = mix(0.5, mix(0.2, 0.8, h2), min(uIrregularity, 1.0));
            float spike = t < tip ? t / max(tip, 1e-3)
                                  : (1.0 - t) / max(1.0 - tip, 1e-3);
            spike = pow(clamp(spike, 0.0, 1.0),
                        mix(1.0, mix(0.55, 3.2, h3), min(uIrregularity, 1.0)));
            float lenVar = mix(0.35, 1.15, h1) + pow(h2, 6.0) * 1.8;
            float spikeScale = mix(1.0, lenVar, min(uIrregularity, 1.5));

            float thisSpike = spike * spikeLength * spikeScale;
            float starShape = baseR + thisSpike;

            float feather = max(0.002, uEdgeBlur);
            float mask = (1.0 - smoothstep(starShape - feather, starShape + feather, dist));

            if (mask < 0.001) {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
              return;
            }

            float edgeDist = abs(dist - starShape);
            float edgeFactor = (1.0 - smoothstep(0.0, feather * 3.0, edgeDist)) * uChromaticStrength;
            vec2 chrDir = normalize(delta + 0.001) * edgeFactor;

            float r = texture2D(tDiffuse, uv + chrDir).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - chrDir).b;
            vec3 sceneColor = vec3(r, g, b);

            gl_FragColor = vec4(sceneColor, mask);
          }
        `,
      };

      const TransitionFXShader = {
        uniforms: {
          tDiffuse: { value: null },
          uTransAmount: { value: 0.0 },
          uChromatic: { value: P.transChromatic },
          uZoomBlur: { value: P.transZoomBlur },
          uDistortion: { value: P.transDistortion },
          uBrightness: { value: P.transBrightness },
          uContrast: { value: P.transContrast },
          uSaturation: { value: P.transSaturation },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uTransAmount;
          uniform float uChromatic;
          uniform float uZoomBlur;
          uniform float uDistortion;
          uniform float uBrightness;
          uniform float uContrast;
          uniform float uSaturation;
          varying vec2 vUv;

          void main() {
            if (uTransAmount < 0.001) {
              gl_FragColor = texture2D(tDiffuse, vUv);
              return;
            }

            vec2 uv = vUv;
            vec2 center = uv - 0.5;
            float dist = length(center);

            vec2 distortedUV = uv + center * dist * dist * uDistortion * uTransAmount;
            distortedUV = clamp(distortedUV, 0.0, 1.0);

            vec3 color = vec3(0.0);
            float totalWeight = 0.0;
            float blurAmount = uZoomBlur * uTransAmount * 0.1;
            for (int i = 0; i < 10; i++) {
              float t = float(i) / 9.0;
              float weight = 1.0 - t * 0.6;
              vec2 sampleUV = clamp(distortedUV + center * blurAmount * t, 0.0, 1.0);
              color += texture2D(tDiffuse, sampleUV).rgb * weight;
              totalWeight += weight;
            }
            color /= totalWeight;

            float caAmount = uChromatic * uTransAmount;
            vec2 caDir = normalize(center + 0.001) * caAmount;
            color.r = mix(color.r, texture2D(tDiffuse, clamp(distortedUV + caDir, 0.0, 1.0)).r, uTransAmount);
            color.b = mix(color.b, texture2D(tDiffuse, clamp(distortedUV - caDir, 0.0, 1.0)).b, uTransAmount);

            float brightness = mix(1.0, uBrightness, uTransAmount);
            color *= brightness;

            float contrast = mix(1.0, uContrast, uTransAmount);
            color = (color - 0.5) * contrast + 0.5;

            float saturation = mix(1.0, uSaturation, uTransAmount);
            float lum = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(vec3(lum), color, saturation);

            gl_FragColor = vec4(clamp(color, 0.0, 1.0), texture2D(tDiffuse, uv).a);
          }
        `,
      };

      const GlitchShader = {
        uniforms: {
          tDiffuse: { value: null },
          uTime: { value: 0 },
          uShakePower: { value: 0.0 },
          uShakeRate: { value: 0.0 },
          uShakeSpeed: { value: P.glitchSpeed },
          uShakeBlockSize: { value: P.glitchBlockSize },
          uShakeColorRate: { value: 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uTime;
          uniform float uShakePower;
          uniform float uShakeRate;
          uniform float uShakeSpeed;
          uniform float uShakeBlockSize;
          uniform float uShakeColorRate;
          varying vec2 vUv;

          float random(float seed) {
            return fract(543.2543 * sin(dot(vec2(seed, seed), vec2(3525.46, -54.3415))));
          }

          void main() {
            float enable_shift = float(
              random(trunc(uTime * uShakeSpeed)) < uShakeRate
            );

            vec2 fixed_uv = vUv;
            fixed_uv.x += (
              random(
                (trunc(vUv.y * uShakeBlockSize) / uShakeBlockSize) + uTime
              ) - 0.5
            ) * uShakePower * enable_shift;

            vec4 pixel_color = texture2D(tDiffuse, fixed_uv);
            pixel_color.r = mix(
              pixel_color.r,
              texture2D(tDiffuse, fixed_uv + vec2(uShakeColorRate, 0.0)).r,
              enable_shift
            );
            pixel_color.b = mix(
              pixel_color.b,
              texture2D(tDiffuse, fixed_uv + vec2(-uShakeColorRate, 0.0)).b,
              enable_shift
            );

            gl_FragColor = pixel_color;
          }
        `,
      };

      const EdgeBlurShader = {
        uniforms: {
          tDiffuse: { value: null },
          uDirection: { value: new THREE.Vector2(1, 0) },
          uBlurAmount: { value: 0.0 },
          uSpread: { value: P.edgeBlurSpread },
          uResolution: { value: new THREE.Vector2(W, H) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2 uDirection;
          uniform float uBlurAmount;
          uniform float uSpread;
          uniform vec2 uResolution;
          varying vec2 vUv;

          void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            float blurStart = (1.0 - uSpread) * 0.5;
            float edgeFactor = smoothstep(blurStart, blurStart + 0.3, dist);
            float radius = edgeFactor * uBlurAmount;

            if (radius < 0.5) {
              gl_FragColor = texture2D(tDiffuse, vUv);
              return;
            }

            vec2 texelSize = 1.0 / uResolution;
            vec2 step = uDirection * texelSize * radius;

            vec4 result = vec4(0.0);
            result += texture2D(tDiffuse, vUv - step * 6.0) * 0.002;
            result += texture2D(tDiffuse, vUv - step * 5.0) * 0.009;
            result += texture2D(tDiffuse, vUv - step * 4.0) * 0.028;
            result += texture2D(tDiffuse, vUv - step * 3.0) * 0.066;
            result += texture2D(tDiffuse, vUv - step * 2.0) * 0.121;
            result += texture2D(tDiffuse, vUv - step * 1.0) * 0.175;
            result += texture2D(tDiffuse, vUv)               * 0.198;
            result += texture2D(tDiffuse, vUv + step * 1.0) * 0.175;
            result += texture2D(tDiffuse, vUv + step * 2.0) * 0.121;
            result += texture2D(tDiffuse, vUv + step * 3.0) * 0.066;
            result += texture2D(tDiffuse, vUv + step * 4.0) * 0.028;
            result += texture2D(tDiffuse, vUv + step * 5.0) * 0.009;
            result += texture2D(tDiffuse, vUv + step * 6.0) * 0.002;

            gl_FragColor = result;
          }
        `,
      };

      const PostFXShader = {
        uniforms: {
          tDiffuse: { value: null },
          uVignetteIntensity: { value: 0.0 },
          uChromaticAberration: { value: 0.0 },
          uScanlineIntensity: { value: 0.0 },
          uTime: { value: 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uVignetteIntensity;
          uniform float uChromaticAberration;
          uniform float uScanlineIntensity;
          uniform float uTime;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;
            vec2 center = uv - 0.5;
            float dist = length(center);
            float dist2 = dot(center, center);

            float edgeFactor = smoothstep(0.2, 0.6, dist);
            float caStrength = uChromaticAberration * edgeFactor;
            vec2 caDir = normalize(center + 0.001) * caStrength;
            vec3 color;
            color.r = texture2D(tDiffuse, clamp(uv + caDir, 0.0, 1.0)).r;
            color.g = texture2D(tDiffuse, uv).g;
            color.b = texture2D(tDiffuse, clamp(uv - caDir, 0.0, 1.0)).b;

            float scanline = sin(uv.y * 800.0 + uTime * 2.0) * 0.5 + 0.5;
            scanline = pow(scanline, 8.0) * uScanlineIntensity;
            color -= scanline * 0.08;
            float noiseLine = fract(sin(floor(uv.y * 400.0 + uTime * 5.0) * 43758.5453)) * uScanlineIntensity * 0.03;
            color += noiseLine;

            float vignette = 1.0 - dist2 * uVignetteIntensity;
            vignette = smoothstep(0.0, 0.5, clamp(vignette, 0.0, 1.0));
            color *= vignette;

            gl_FragColor = vec4(color, texture2D(tDiffuse, uv).a);
          }
        `,
      };

      const GridLineShader = {
        uniforms: {
          uColor: { value: new THREE.Color(P.gridLineColor) },
          uOpacity: { value: P.gridOpacity },
          uFadeStart: { value: P.gridFadeStart },
          uFadeEnd: { value: P.gridFadeEnd },
          uCameraPos: { value: new THREE.Vector3() },
          uTime: { value: 0.0 },
          uGlowSpeed: { value: P.gridGlowSpeed },
          uGlowIntensity: { value: P.gridGlowIntensity },
        },
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uFadeStart;
          uniform float uFadeEnd;
          uniform vec3 uCameraPos;
          uniform float uTime;
          uniform float uGlowSpeed;
          uniform float uGlowIntensity;
          varying vec3 vWorldPos;

          float hash(float n) { return fract(sin(n) * 43758.5453); }

          void main() {
            float dist = distance(vWorldPos, uCameraPos);
            float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);
            if (fade < 0.01) discard;

            float dotGlow = 0.0;
            float dotRadius = 0.4;

            for (int d = 0; d < 5; d++) {
              float di = float(d);
              float seedX = hash(floor(vWorldPos.y * 10.0) * 137.0 + floor(vWorldPos.z * 10.0) * 311.0 + di * 73.0);
              float dotPosX = mod(uTime * uGlowSpeed * (0.5 + seedX * 2.0) + seedX * 200.0, 300.0) - 150.0;
              dotGlow += exp(-pow((vWorldPos.x - dotPosX) / dotRadius, 2.0)) * 0.5;

              float seedY = hash(floor(vWorldPos.x * 10.0) * 173.0 + floor(vWorldPos.z * 10.0) * 271.0 + di * 91.0);
              float dotPosY = mod(uTime * uGlowSpeed * (0.5 + seedY * 2.0) + seedY * 200.0, 300.0) - 150.0;
              dotGlow += exp(-pow((vWorldPos.y - dotPosY) / dotRadius, 2.0)) * 0.5;

              float seedZ = hash(floor(vWorldPos.x * 10.0) * 251.0 + floor(vWorldPos.y * 10.0) * 197.0 + di * 59.0);
              float dotPosZ = mod(uTime * uGlowSpeed * (0.5 + seedZ * 2.0) + seedZ * 200.0, 300.0) - 150.0;
              dotGlow += exp(-pow((vWorldPos.z - dotPosZ) / dotRadius, 2.0)) * 0.5;
            }

            dotGlow *= uGlowIntensity;

            float finalAlpha = (uOpacity + dotGlow) * fade;
            vec3 finalColor = uColor * (1.0 + dotGlow * 3.0);

            gl_FragColor = vec4(finalColor, min(finalAlpha, 1.0));
          }
        `,
      };


    return {PortalCompositeShader,TransitionFXShader,GlitchShader,EdgeBlurShader,PostFXShader,GridLineShader};
  }
  window.ShortCreatorWireframeShaders=Object.freeze({create});
})();
