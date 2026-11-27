/* ==========================================================================
   Tá na Mão LP v2 · Ember field (hero background)
   Raw WebGL fragment shader: domain-warped fbm "heat" in brand colors with a
   pointer-reactive glow. Renders at reduced resolution, pauses off-screen and
   when the tab is hidden. Reduced motion → one static frame.
   ========================================================================== */
(function () {
  'use strict';

  var FRAG = [
    'precision mediump float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    'uniform float uHeat;',
    'float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }',
    'float fbm(vec2 p){ float v=0.0; float a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);',
    '  for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; } return v; }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes.xy;',
    '  vec2 p = uv; p.x *= uRes.x / uRes.y;',
    '  float t = uTime * 0.045;',
    '  vec2 q = vec2(fbm(p*1.6 + vec2(0.0, -t*2.0)), fbm(p*1.6 + vec2(5.2, 1.3) - t));',
    '  vec2 r = vec2(fbm(p*1.4 + 3.0*q + vec2(1.7, 9.2) + t*0.7), fbm(p*1.4 + 3.0*q + vec2(8.3, 2.8) - t*0.5));',
    '  float f = fbm(p*1.2 + 2.6*r);',
    '  vec2 m = uMouse; m.x *= uRes.x / uRes.y;',
    '  float d = distance(p, m);',
    '  float glow = smoothstep(0.75, 0.0, d) * uHeat;',
    '  float rightBias = smoothstep(0.1, 1.0, uv.x) * 0.55 + 0.25;',
    '  float heat = clamp(f*f*1.9*rightBias + glow*0.55*f + glow*0.12, 0.0, 1.0);',
    '  vec3 c0 = vec3(0.039, 0.035, 0.031);',
    '  vec3 c1 = vec3(0.23, 0.07, 0.01);',
    '  vec3 c2 = vec3(0.86, 0.33, 0.0);',
    '  vec3 c3 = vec3(1.0, 0.70, 0.30);',
    '  vec3 col = mix(c0, c1, smoothstep(0.05, 0.45, heat));',
    '  col = mix(col, c2, smoothstep(0.42, 0.78, heat));',
    '  col = mix(col, c3, smoothstep(0.80, 1.0, heat) * 0.7);',
    '  float vig = smoothstep(1.25, 0.25, distance(uv, vec2(0.62, 0.5)));',
    '  col *= mix(0.35, 1.0, vig);',
    '  col *= smoothstep(0.0, 0.35, uv.y) * 0.6 + 0.4;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');

  var VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[Tá na Mão] ember shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function init(canvas, EF) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) return;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uMouse = gl.getUniformLocation(prog, 'uMouse');
    var uHeat = gl.getUniformLocation(prog, 'uHeat');

    var SCALE = 0.55;
    var mouse = { x: 0.72, y: 0.55, tx: 0.72, ty: 0.55, heat: 0.35, th: 0.35 };
    var running = false;
    var visible = true;
    var start = performance.now();
    var raf = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr * SCALE));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr * SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function draw(now) {
      resize();
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      mouse.heat += (mouse.th - mouse.heat) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000 + 20.0);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uHeat, mouse.heat);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(now) {
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    function play() {
      if (running || !visible || document.hidden || !EF.motionOK()) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }
    function pause() {
      running = false;
      cancelAnimationFrame(raf);
    }

    var hero = canvas.parentElement;
    if (EF.finePointer()) {
      hero.addEventListener('pointermove', function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.tx = (e.clientX - r.left) / r.width;
        mouse.ty = 1 - (e.clientY - r.top) / r.height;
        mouse.th = 1;
      });
      hero.addEventListener('pointerleave', function () { mouse.th = 0.35; });
    }

    window.addEventListener('resize', function () { if (!running) draw(performance.now()); });
    document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });
    EF.inView(hero, function () { visible = true; play(); }, function () { visible = false; pause(); });

    draw(performance.now());
    canvas.classList.add('is-on');
    play();
  }

  if (window.EF) window.EF.use('[data-ember]', init, { idle: true });
})();
