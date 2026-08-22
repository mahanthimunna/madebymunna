(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;

  // Fast, cinematic reveal without locking the visitor behind a long intro.
  const revealPage = () => {
    document.getElementById('loader')?.classList.add('fade-out');
    body.classList.add('page-ready');
  };
  window.addEventListener('load', () => setTimeout(revealPage, 420), { once: true });
  setTimeout(revealPage, 1200);

  // Scroll progress.
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  updateProgress();
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);

  // Editorial reveal.
  const revealNodes = document.querySelectorAll('.project-link, .systems-title, .systems-subtitle, .games-title, .games-subtitle, .contact-inner, .project-video-section, .project-accordion-section');
  revealNodes.forEach(el => el.classList.add('reveal-target'));
  if ('IntersectionObserver' in window && !reducedMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -8% 0px' });
    revealNodes.forEach(el => io.observe(el));
  } else {
    revealNodes.forEach(el => el.classList.add('is-visible'));
  }

  // Desktop cursor orbit.
  if (!reducedMotion && matchMedia('(pointer:fine)').matches) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor-orbit';
    document.body.appendChild(cursor);
    let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    const cursorTick = () => {
      x += (tx - x) * .18; y += (ty - y) * .18;
      cursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      requestAnimationFrame(cursorTick);
    };
    cursorTick();
    document.querySelectorAll('a, button, .accordion-image').forEach(el => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-active'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
    });
  }

  // 3D card tilt, deliberately subtle so text remains readable.
  if (!reducedMotion && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(1100px) rotateX(${-py * 4.5}deg) rotateY(${px * 6}deg) translateZ(0)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // Project-page background parallax.
  if (body.classList.contains('project-page') && !reducedMotion) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        body.style.setProperty('--hero-shift', `${Math.min(scrollY * .045, 34)}px`);
        ticking = false;
      });
    }, { passive: true });
  }

  // Active nav state on the homepage.
  const sections = ['about','projects','systems','contact'].map(id => document.getElementById(id)).filter(Boolean);
  const navAnchors = [...document.querySelectorAll('.nav-links a')];
  if (sections.length && 'IntersectionObserver' in window) {
    const nio = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(a => {
          const href = a.getAttribute('href') || '';
          a.classList.toggle('is-active', href.endsWith(`#${entry.target.id}`));
        });
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    sections.forEach(s => nio.observe(s));
  }

  // Image lightbox for blueprint / environment documentation.
  const zoomImages = document.querySelectorAll('.accordion-image');
  if (zoomImages.length) {
    const lb = document.createElement('div');
    lb.className = 'media-lightbox';
    lb.setAttribute('role','dialog');
    lb.setAttribute('aria-modal','true');
    lb.setAttribute('aria-label','Expanded project image');
    lb.innerHTML = '<button type="button" aria-label="Close expanded image">×</button><img alt="">';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img');
    const close = () => { lb.classList.remove('is-open'); body.style.overflow = ''; setTimeout(() => { lbImg.src = ''; }, 260); };
    zoomImages.forEach(img => img.addEventListener('click', () => {
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || 'Project image';
      lb.classList.add('is-open');
      body.style.overflow = 'hidden';
    }));
    lb.querySelector('button').addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('is-open')) close(); });
  }

  // WebGL / Three.js ambient sculpture. Falls back cleanly if CDN/WebGL is unavailable.
  // Native WebGL ambient sculpture: no framework or build step required.
  function initWebGL() {
    if (reducedMotion) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'world-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
      premultipliedAlpha: true
    });
    if (!gl) {
      canvas.remove();
      return;
    }

    const vertexShaderSource = `
      attribute vec3 a_position;
      uniform float u_time;
      uniform float u_aspect;
      uniform float u_scale;
      uniform float u_scroll;
      uniform float u_phase;
      uniform float u_pointSize;
      uniform vec3 u_offset;
      uniform vec2 u_pointer;

      void main() {
        vec3 p = a_position * u_scale;

        float ay = u_time * 0.13 + u_pointer.x * 0.28 + u_phase;
        float ax = u_time * 0.075 - u_pointer.y * 0.18 + u_phase * 0.42;
        float az = u_time * 0.028 + u_phase * 0.16;

        mat3 ry = mat3(
          cos(ay), 0.0, sin(ay),
          0.0, 1.0, 0.0,
          -sin(ay), 0.0, cos(ay)
        );
        mat3 rx = mat3(
          1.0, 0.0, 0.0,
          0.0, cos(ax), -sin(ax),
          0.0, sin(ax), cos(ax)
        );
        mat3 rz = mat3(
          cos(az), -sin(az), 0.0,
          sin(az), cos(az), 0.0,
          0.0, 0.0, 1.0
        );

        p = rz * rx * ry * p;
        p += u_offset;
        p.y -= u_scroll * 0.55;

        float depth = max(2.4, 8.5 - p.z);
        vec2 projected = p.xy / depth * 4.5;
        gl_Position = vec4(projected.x / u_aspect, projected.y, 0.0, 1.0);
        gl_PointSize = u_pointSize * (8.5 / depth);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec3 u_color;
      uniform float u_alpha;
      uniform float u_points;

      void main() {
        float a = u_alpha;
        if (u_points > 0.5) {
          vec2 d = gl_PointCoord - vec2(0.5);
          float r = dot(d, d);
          if (r > 0.25) discard;
          a *= smoothstep(0.25, 0.02, r);
        }
        gl_FragColor = vec4(u_color, a);
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('WebGL shader compile failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, vertexShaderSource);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) {
      canvas.remove();
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('WebGL program link failed:', gl.getProgramInfoLog(program));
      canvas.remove();
      return;
    }
    gl.useProgram(program);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    const uniforms = {};
    ['u_time','u_aspect','u_scale','u_scroll','u_phase','u_pointSize','u_offset','u_pointer','u_color','u_alpha','u_points']
      .forEach(name => uniforms[name] = gl.getUniformLocation(program, name));

    const makeBuffer = (positions) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
      return { buffer, count: positions.length / 3 };
    };

    const knot = [];
    for (let i = 0; i <= 720; i++) {
      const t = (i / 720) * Math.PI * 2;
      const r = 1.0 + 0.28 * Math.cos(3 * t);
      knot.push(
        r * Math.cos(2 * t),
        r * Math.sin(2 * t),
        0.28 * Math.sin(3 * t)
      );
    }

    const orbitalRing = [];
    for (let i = 0; i <= 360; i++) {
      const t = (i / 360) * Math.PI * 2;
      orbitalRing.push(Math.cos(t), Math.sin(t) * 0.72, Math.sin(t * 2.0) * 0.1);
    }

    const cloud = [];
    const cloudCount = innerWidth < 700 ? 180 : 420;
    for (let i = 0; i < cloudCount; i++) {
      cloud.push(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8 - 1.5
      );
    }

    const objects = [
      {
        ...makeBuffer(knot),
        mode: gl.LINE_STRIP,
        offset: body.classList.contains('project-page') ? [3.6, .6, -1.7] : [3.7, 1.2, -1.2],
        scale: body.classList.contains('project-page') ? 1.45 : 1.72,
        color: [0.45, 0.43, 1.0],
        alpha: body.classList.contains('project-page') ? .18 : .34,
        phase: .2,
        pointSize: 1,
        points: 0
      },
      {
        ...makeBuffer(orbitalRing),
        mode: gl.LINE_STRIP,
        offset: [-4.0, -2.0, -2.4],
        scale: 1.35,
        color: [0.84, 1.0, 0.32],
        alpha: body.classList.contains('project-page') ? .08 : .18,
        phase: 1.8,
        pointSize: 1,
        points: 0
      },
      {
        ...makeBuffer(cloud),
        mode: gl.POINTS,
        offset: [0, 0, -2.0],
        scale: 1.0,
        color: [0.73, 0.76, 1.0],
        alpha: body.classList.contains('project-page') ? .13 : .34,
        phase: 0,
        pointSize: innerWidth < 700 ? 2.0 : 2.35,
        points: 1
      }
    ];

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    const pointer = { x: 0, y: 0 };
    addEventListener('pointermove', e => {
      pointer.x = (e.clientX / innerWidth - .5) * 2;
      pointer.y = (e.clientY / innerHeight - .5) * 2;
    }, { passive: true });

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(innerWidth * dpr));
      const h = Math.max(1, Math.floor(innerHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${innerWidth}px`;
        canvas.style.height = `${innerHeight}px`;
      }
      gl.viewport(0, 0, w, h);
    };
    resize();
    addEventListener('resize', resize);

    const start = performance.now();
    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

    const frame = (now) => {
      requestAnimationFrame(frame);
      if (!visible) return;
      resize();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(uniforms.u_time, (now - start) / 1000);
      gl.uniform1f(uniforms.u_aspect, innerWidth / Math.max(innerHeight, 1));
      gl.uniform1f(uniforms.u_scroll, scrollY / Math.max(document.documentElement.scrollHeight, 1));
      gl.uniform2f(uniforms.u_pointer, pointer.x, pointer.y);

      for (const obj of objects) {
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.buffer);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uniforms.u_scale, obj.scale);
        gl.uniform1f(uniforms.u_phase, obj.phase);
        gl.uniform1f(uniforms.u_pointSize, obj.pointSize);
        gl.uniform3f(uniforms.u_offset, obj.offset[0], obj.offset[1], obj.offset[2]);
        gl.uniform3f(uniforms.u_color, obj.color[0], obj.color[1], obj.color[2]);
        gl.uniform1f(uniforms.u_alpha, obj.alpha);
        gl.uniform1f(uniforms.u_points, obj.points);
        gl.drawArrays(obj.mode, 0, obj.count);
      }
    };
    requestAnimationFrame(frame);
  }

  try { initWebGL(); } catch (e) { document.getElementById('world-canvas')?.remove(); }
})();
