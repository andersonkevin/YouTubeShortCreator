/* HyperFrames grade-split-reveal and colorGrading shader operations, Apache-2.0.
   Unused LUT, curves, wheels, secondary grades and media effects are excluded. */
window.ShortCreatorGradeSplitShader=Object.freeze({
  "sources": {
    "registry/components/grade-split-reveal/grade-split-reveal.html": {
      "sha256": "e9e5579d199fb18818c179924e5cb9d32aa1c39d6ce247d818c3033a88844e0a",
      "lines": 446
    },
    "registry/components/grade-split-reveal/registry-item.json": {
      "sha256": "1ff8cdcad5fb6c8748f16a5fa62aa5bba2dc652dacb6f1d9be0f1363d7604b71",
      "lines": 67
    },
    "packages/core/src/colorGrading.ts": {
      "sha256": "803b647b217189fd27a705245e1d1146b2951703226641216f015542b050e55b",
      "lines": 1570
    },
    "packages/core/src/runtime/colorGrading.ts": {
      "sha256": "63aa7aecddac653f3f124466f065a352bec30031552f25b6c1d9e34a0b40be66",
      "lines": 3904
    }
  },
  "parts_sha256": {
    "primary": "a1f4e1ced7aa4f0277bc7dcc8a2c71542211e43ec8a24a2c634588d724160837",
    "grain": "3d99c7eec4f64a15b2860bb5d0d0834521aa7636043a256d4b492401a9f531c8",
    "vignette": "acbe310ba177f4aaa7105fb14e11b5b9c7673a2ab11c96735d10684da0e9fc71",
    "helpers": "6637933d538bf585a9bd166abdd9b50729e2bbf23671f991bd9903ac13099b83"
  },
  "vertex": "attribute vec2 a_pos;\nvarying vec2 v_uv;\nvoid main(){\n  v_uv = a_pos * 0.5 + 0.5;\n  gl_Position = vec4(a_pos, 0.0, 1.0);\n}",
  "fragment": "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 v_uv;\nuniform sampler2D u_source;\nuniform vec2 u_resolution;\nuniform vec2 u_uvScale;\nuniform vec2 u_uvOffset;\nuniform float u_exposure;\nuniform float u_contrast;\nuniform float u_highlights;\nuniform float u_shadows;\nuniform float u_whites;\nuniform float u_blacks;\nuniform float u_temperature;\nuniform float u_tint;\nuniform float u_vibrance;\nuniform float u_saturation;\nuniform float u_vignette;\nuniform float u_vignetteMidpoint;\nuniform float u_vignetteRoundness;\nuniform float u_vignetteFeather;\nuniform float u_grain;\nuniform float u_grainSize;\nuniform float u_grainRoughness;\nuniform float u_grainSeed;\nfloat lumaOf(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }\nfloat grainHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }\nfloat colorSaturation(vec3 c){ return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b); }\nvec3 applyPrimaryGrade(vec3 color){\n  color *= pow(2.0, u_exposure);\n  float y = lumaOf(color);\n  float shadowMask = 1.0 - smoothstep(0.0, 0.65, y);\n  float highlightMask = smoothstep(0.35, 1.0, y);\n  color += u_shadows * 0.35 * shadowMask;\n  color += u_highlights * 0.35 * highlightMask;\n  float blackPoint = clamp(u_blacks * 0.18, -0.18, 0.18);\n  float whitePoint = clamp(1.0 - u_whites * 0.18, 0.82, 1.18);\n  color = (color - blackPoint) / max(whitePoint - blackPoint, 0.2);\n  color.r += u_temperature * 0.08 + u_tint * 0.04;\n  color.b -= u_temperature * 0.08 - u_tint * 0.04;\n  color.g -= u_tint * 0.08;\n  color = (color - 0.5) * max(0.0, 1.0 + u_contrast) + 0.5;\n  float satLuma = lumaOf(color);\n  float currentSat = clamp(colorSaturation(color), 0.0, 1.0);\n  float skinLike = smoothstep(0.02, 0.18, color.r - color.g) * smoothstep(0.0, 0.16, color.g - color.b) * smoothstep(0.18, 0.82, satLuma);\n  float vibranceWeight = (1.0 - currentSat * 0.72) * mix(1.0, 0.55, skinLike);\n  color = mix(vec3(satLuma), color, max(0.0, 1.0 + u_vibrance * vibranceWeight));\n  color = mix(vec3(satLuma), color, max(0.0, 1.0 + u_saturation));\n  return color;\n}\nvoid main(){\n  vec2 uv = (v_uv - u_uvOffset) / u_uvScale;\n  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }\n  vec4 sampleColor = texture2D(u_source, clamp(uv, vec2(0.0), vec2(1.0)));\n  vec3 color = clamp(applyPrimaryGrade(sampleColor.rgb), 0.0, 1.0);\n  float grainAmount = clamp(u_grain, 0.0, 1.0);\n  if (grainAmount > 0.0) {\n    float grainPixelSize = mix(1.0, 6.0, clamp(u_grainSize, 0.0, 1.0));\n    vec2 grainCoord = floor(gl_FragCoord.xy / grainPixelSize) + vec2(u_grainSeed, u_grainSeed * 1.37);\n    float grainBase = grainHash(grainCoord) - grainHash(grainCoord + vec2(19.19, 73.31));\n    float grainFine = grainHash(gl_FragCoord.xy + vec2(u_grainSeed * 2.11, u_grainSeed * 0.71)) - 0.5;\n    float grain = mix(grainBase * 0.7, grainBase + grainFine * 0.35, clamp(u_grainRoughness, 0.0, 1.0));\n    float grainLuma = lumaOf(color);\n    float grainMask = smoothstep(0.02, 0.55, grainLuma) * (1.0 - smoothstep(0.88, 1.0, grainLuma));\n    color += grain * grainAmount * mix(0.025, 0.08, grainMask);\n  }\n  color = clamp(color, 0.0, 1.0);\n  vec2 vignetteAspect = u_resolution.x > u_resolution.y\n    ? vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0)\n    : vec2(1.0, u_resolution.y / max(u_resolution.x, 1.0));\n  vec2 vignetteUv = abs((v_uv - vec2(0.5)) * 2.0) * vignetteAspect;\n  float vignettePower = mix(8.0, 1.8, clamp(u_vignetteRoundness * 0.5 + 0.5, 0.0, 1.0));\n  float vignetteDistance = pow(pow(vignetteUv.x, vignettePower) + pow(vignetteUv.y, vignettePower), 1.0 / vignettePower);\n  float vignetteMidpoint = mix(0.22, 1.08, clamp(u_vignetteMidpoint, 0.0, 1.0));\n  float vignetteFeather = mix(0.08, 0.72, clamp(u_vignetteFeather, 0.0, 1.0));\n  float vignetteMask = smoothstep(vignetteMidpoint, vignetteMidpoint + vignetteFeather, vignetteDistance);\n  color *= 1.0 - vignetteMask * clamp(u_vignette, 0.0, 1.0) * 0.75;\n  gl_FragColor = vec4(clamp(color, 0.0, 1.0), sampleColor.a);\n}"
});
