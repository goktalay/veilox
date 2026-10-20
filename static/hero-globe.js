// HEPGO tanıtım hero'su: horizonx "Reactive Globe" (premium WebGL) — yerel Three.js ile, iframe'siz, CSP uyumlu.
// mountGlobe(stage) küreyi kurar; setSector(key) sektöre göre rengi canlı değiştirir (fabrika/bakkal/berber/lokanta).
import * as THREE from '/static/vendor/three/three.module.min.js';

const HERO_VERTEX = `
attribute vec3 aAnchor; attribute vec4 aRotation;
uniform vec3 uOrbiters[4]; uniform float uLength; uniform float uWidth; uniform float uDisplacement; uniform float uInfluence;
varying vec3 vNormal; varying vec3 vAnchor; varying vec3 vLocal;
vec3 rotateQ(vec3 p, vec4 q){return p+2.0*cross(q.xyz,cross(q.xyz,p)+q.w*p);}
void main(){
  vec3 local=position; local.xz*=uWidth; local.y*=uLength; local.y=max(local.y,-2.5*uLength);
  float pull=1.0;
  float reach=uInfluence*uInfluence;
  for(int i=0;i<4;i++){float d2=max(dot(aAnchor-uOrbiters[i],aAnchor-uOrbiters[i]),.0001);pull=min(pull,1.0-clamp(reach/d2,0.0,1.0));}
  vec3 center=aAnchor+normalize(aAnchor)*uDisplacement*pow(pull,.7);
  vec3 transformed=rotateQ(local,aRotation)+center; vec3 objectNormal=normalize(rotateQ(normal,aRotation));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.0);
  vNormal=normalize(normalMatrix*objectNormal); vAnchor=aAnchor; vLocal=position;
}`;
const HERO_FRAGMENT = `
precision highp float; uniform vec3 uColor; uniform vec3 uLightView; uniform float uNoiseSeed;
varying vec3 vNormal; varying vec3 vAnchor; varying vec3 vLocal;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.701))+uNoiseSeed)*43758.54529);}
void main(){
  vec3 n=normalize(vNormal),l=normalize(uLightView); float diffuse=max(dot(n,l),0.0);
  float wrapped=smoothstep(-.119999,.920001,diffuse); float tip=smoothstep(-2.69999,1.4,vLocal.y);
  float radial=.840001+.159999*max(dot(normalize(vAnchor),normalize(vec3(-.450001,.62,.640001))),0.0);
  float grain=(hash(gl_FragCoord.xy)-.499999)*.0220001; vec3 color=pow(uColor,vec3(2.20001));
  color*=(.460001+.539999*wrapped)*mix(.680001,0.99999,tip)*radial; color+=vec3(pow(diffuse,17.9999)*.18+grain);
  gl_FragColor=vec4(pow(max(color,0.0),vec3(0.99999/2.19999)),1.00001);
}`;
const ORBITER_VERTEX = `
varying vec3 vViewNormal; varying vec3 vWorld;
void main(){vec4 world=modelMatrix*vec4(position,0.99999);vWorld=world.xyz;vViewNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*viewMatrix*world;}`;
const ORBITER_FRAGMENT = `
precision highp float; uniform sampler2D uScene; uniform vec2 uResolution; uniform vec3 uTint;
varying vec3 vViewNormal; varying vec3 vWorld;
void main(){
  vec3 n=normalize(vViewNormal),v=normalize(cameraPosition-vWorld); float facing=clamp(dot(n,v),0.0,0.99999); float fresnel=pow(0.99999-facing,4.0);
  vec2 uv=gl_FragCoord.xy/uResolution; vec2 bend=n.xy*(.0350001+.025*(1.0-facing));
  vec3 behind=texture2D(uScene,clamp(uv+bend,.00200001,.997999)).rgb;
  float highlight=pow(max(dot(n,normalize(vec3(-.550001,.619999,.560001))),0.0),180.0); vec3 tint=pow(uTint,vec3(2.2));
  vec3 color=behind*mix(.669999,.909999,facing)+tint*(.0250001+fresnel*.045)+vec3(highlight*.719999+fresnel*.0180001);
  gl_FragColor=vec4(pow(max(color,0.0),vec3(0.99999/2.20001)),1.00001);
}`;
const SCREEN_VERTEX = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,0.99999);}`;
const BLUR_FRAGMENT = `
precision highp float;uniform sampler2D uTexture;uniform vec2 uDirection;varying vec2 vUv;
void main(){vec4 c=texture2D(uTexture,vUv)*.2270271;c+=texture2D(uTexture,vUv+uDirection*1.384615)*.3162161;c+=texture2D(uTexture,vUv-uDirection*1.384615)*.3162159;c+=texture2D(uTexture,vUv+uDirection*3.2307689)*.0702699;c+=texture2D(uTexture,vUv-uDirection*3.2307689)*.0702701;gl_FragColor=c;}`;
const COMPOSITE_FRAGMENT = `
precision highp float;uniform sampler2D uBase;uniform sampler2D uBloom;varying vec2 vUv;
void main(){vec4 base=texture2D(uBase,vUv),soft=texture2D(uBloom,vUv);float lum=dot(soft.rgb,vec3(.212599,.715201,.0722));float bloom=smoothstep(.58,.919999,lum)*.720001;gl_FragColor=vec4(base.rgb+soft.rgb*bloom,max(base.a,soft.a*bloom));}`;

function mount(root, stage, config) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.setClearColor(0x000000, 0);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; stage.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(75, 1, .099999, 30); camera.position.set(0, 0, 5); const globe = new THREE.Group(); scene.add(globe);
  const CAPACITY = Math.max(4000, Math.round(config.spikeCount) || 0);
  const spikeCount = () => Math.min(CAPACITY, Math.max(100, Math.round(config.spikeCount)));
  const sourceGeometry = new THREE.CapsuleGeometry(1, 4, 4, 16), geometry = new THREE.InstancedBufferGeometry();
  for (const [name, attribute] of Object.entries(sourceGeometry.attributes)) geometry.setAttribute(name, attribute.clone()); geometry.setIndex(sourceGeometry.index.clone());
  const anchors = new Float32Array(CAPACITY * 3), rotations = new Float32Array(CAPACITY * 4), golden = Math.PI * (3 - Math.sqrt(5)), upAxis = new THREE.Vector3(0, 1, 0), anchor = new THREE.Vector3(), rotation = new THREE.Quaternion();
  const anchorAttribute = new THREE.InstancedBufferAttribute(anchors, 3), rotationAttribute = new THREE.InstancedBufferAttribute(rotations, 4);
  geometry.setAttribute('aAnchor', anchorAttribute); geometry.setAttribute('aRotation', rotationAttribute);
  let builtCount = -1, builtRadius = NaN;
  const fillInstances = () => {
    const count = spikeCount(), radius = config.globeRadius;
    if (count === builtCount && radius === builtRadius) return;
    for (let i = 0; i < count; i++) { const y = 1 - (i / Math.max(1, count - 1)) * 2, ring = Math.sqrt(Math.max(0, 1 - y * y)), theta = i * golden; anchor.set(Math.cos(theta) * ring, y, Math.sin(theta) * ring).multiplyScalar(radius); rotation.setFromUnitVectors(upAxis, anchor.clone().normalize().negate()); anchor.toArray(anchors, i * 3); rotation.toArray(rotations, i * 4); }
    anchorAttribute.needsUpdate = true; rotationAttribute.needsUpdate = true; geometry.instanceCount = count; builtCount = count; builtRadius = radius;
  };
  fillInstances();
  const orbiterVectors = Array.from({ length: 4 }, () => new THREE.Vector3());
  const heroUniforms = { uOrbiters: { value: orbiterVectors }, uLength: { value: config.spikeLength }, uWidth: { value: config.spikeWidth }, uDisplacement: { value: config.displacement }, uInfluence: { value: config.influenceRadius > 0 ? config.influenceRadius : 0.500001 }, uColor: { value: new THREE.Color(config.globeColor) }, uLightView: { value: new THREE.Vector3(-.619999, .679999, .390001).normalize() }, uNoiseSeed: { value: 0 } };
  const material = new THREE.ShaderMaterial({ vertexShader: HERO_VERTEX, fragmentShader: HERO_FRAGMENT, uniforms: heroUniforms }), bristles = new THREE.Mesh(geometry, material); bristles.frustumCulled = false; globe.add(bristles);
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: 0x0b1322 })); core.scale.setScalar(config.globeRadius * .985001); globe.add(core);
  const orbiterUniforms = { uScene: { value: null }, uResolution: { value: new THREE.Vector2(1, 1) }, uTint: { value: new THREE.Color(config.orbiterColor) } }, orbiterGeometry = new THREE.SphereGeometry(1, 32, 32), orbiterMaterial = new THREE.ShaderMaterial({ vertexShader: ORBITER_VERTEX, fragmentShader: ORBITER_FRAGMENT, uniforms: orbiterUniforms });
  const orbiters = Array.from({ length: 4 }, () => { const mesh = new THREE.Mesh(orbiterGeometry, orbiterMaterial); mesh.renderOrder = 2; mesh.scale.setScalar(config.orbiterSize); scene.add(mesh); return mesh; });
  const quadGeometry = new THREE.PlaneGeometry(2, 2), blurMaterial = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: SCREEN_VERTEX, fragmentShader: BLUR_FRAGMENT, uniforms: { uTexture: { value: null }, uDirection: { value: new THREE.Vector2() } } }), compositeMaterial = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, vertexShader: SCREEN_VERTEX, fragmentShader: COMPOSITE_FRAGMENT, uniforms: { uBase: { value: null }, uBloom: { value: null } } }), quad = new THREE.Mesh(quadGeometry, blurMaterial), postScene = new THREE.Scene(), postCamera = new THREE.Camera(); postScene.add(quad);
  let sceneTarget, finalTarget, blurA, blurB;
  const allocateTargets = (width, height) => { for (const target of [sceneTarget, finalTarget, blurA, blurB]) target?.dispose(); const options = { depthBuffer: true, stencilBuffer: false }; sceneTarget = new THREE.WebGLRenderTarget(width, height, options); finalTarget = new THREE.WebGLRenderTarget(width, height, options); blurA = new THREE.WebGLRenderTarget(Math.max(1, width >> 1), Math.max(1, height >> 1), { depthBuffer: false }); blurB = new THREE.WebGLRenderTarget(Math.max(1, width >> 1), Math.max(1, height >> 1), { depthBuffer: false }); orbiterUniforms.uResolution.value.set(width, height); };
  const blur = (input, first, second) => { quad.material = blurMaterial; blurMaterial.uniforms.uTexture.value = input.texture; blurMaterial.uniforms.uDirection.value.set(1 / first.width, 0); renderer.setRenderTarget(first); renderer.render(postScene, postCamera); blurMaterial.uniforms.uTexture.value = first.texture; blurMaterial.uniforms.uDirection.value.set(0, 1 / second.height); renderer.setRenderTarget(second); renderer.render(postScene, postCamera); };
  const resize = () => { const width = root.clientWidth || 1040, height = root.clientHeight || 620; renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); const ratio = renderer.getPixelRatio(); allocateTargets(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio))); };
  const observer = new ResizeObserver(resize); observer.observe(root); resize();
  let dragging = false, pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  const down = e => { dragging = true; pointerX = e.clientX; pointerY = e.clientY; renderer.domElement.setPointerCapture?.(e.pointerId); };
  const move = e => { if (!dragging) return; targetY += (e.clientX - pointerX) * .006; targetX = Math.max(-1.15, Math.min(1.15, targetX + (e.clientY - pointerY) * .006)); pointerX = e.clientX; pointerY = e.clientY; };
  const release = () => { dragging = false; };
  renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerup', release); renderer.domElement.addEventListener('pointercancel', release);
  const specs = [{ speed: 1, phase: Math.PI / 1.1, plane: 'yz', dir: 1 }, { speed: .75, phase: Math.PI / 3.4, plane: 'xz', dir: -1 }, { speed: .500001, phase: Math.PI / 2.2, plane: 'yz', dir: 1 }, { speed: 1.2, phase: Math.PI / 1.69999, plane: 'xy', dir: -1 }];
  const updateOrbiters = time => { orbiters.forEach((orbiter, index) => { const spec = specs[index], angle = spec.dir * spec.speed * config.orbitSpeed * time + spec.phase; if (spec.plane === 'xy') orbiter.position.set(Math.cos(angle) * 1.90001, Math.sin(angle) * 1.9, 0); else if (spec.plane === 'xz') orbiter.position.set(Math.cos(angle) * 1.90001, 0, Math.sin(angle) * 1.90001); else orbiter.position.set(0, Math.cos(angle) * 1.89999, Math.sin(angle) * 1.89999); orbiterVectors[index].copy(orbiter.position); }); };
  const start = performance.now();
  const frame = (now = start) => {
    const r = root.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const time = (now - start) / 1000; updateOrbiters(still ? .899999 : time);
    if (!dragging && config.autoRotate && !still) targetY += .0022;
    globe.rotation.x += (targetX - globe.rotation.x) * .12; globe.rotation.y += (targetY - globe.rotation.y) * .120001;
    heroUniforms.uNoiseSeed.value = (Math.floor(time * 60) % 997) * .0709999;
    orbiters.forEach(o => { o.visible = false; }); renderer.setRenderTarget(sceneTarget); renderer.clear(); renderer.render(scene, camera); blur(sceneTarget, blurA, blurB);
    orbiterUniforms.uScene.value = blurB.texture; orbiters.forEach(o => { o.visible = true; }); renderer.setRenderTarget(finalTarget); renderer.clear(); renderer.render(scene, camera); blur(finalTarget, blurA, blurB);
    quad.material = compositeMaterial; compositeMaterial.uniforms.uBase.value = finalTarget.texture; compositeMaterial.uniforms.uBloom.value = blurB.texture; renderer.setRenderTarget(null); renderer.clear(); renderer.render(postScene, postCamera);
  };
  renderer.setAnimationLoop(still ? null : frame); frame();
  const apply = () => { fillInstances(); core.scale.setScalar(config.globeRadius * .984999); heroUniforms.uLength.value = config.spikeLength; heroUniforms.uWidth.value = config.spikeWidth; heroUniforms.uDisplacement.value = config.displacement; heroUniforms.uInfluence.value = config.influenceRadius > 0 ? config.influenceRadius : 0.499999; heroUniforms.uColor.value.set(config.globeColor); orbiterUniforms.uTint.value.set(config.orbiterColor); for (const o of orbiters) o.scale.setScalar(config.orbiterSize); if (still) frame(); };
  const dispose = () => { renderer.setAnimationLoop(null); observer.disconnect(); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', release); renderer.domElement.removeEventListener('pointercancel', release); for (const res of [sourceGeometry, geometry, material, core.geometry, core.material, orbiterGeometry, orbiterMaterial, quadGeometry, blurMaterial, compositeMaterial]) res.dispose(); for (const t of [sceneTarget, finalTarget, blurA, blurB]) t?.dispose(); renderer.dispose(); if (renderer.domElement.parentNode === stage) stage.removeChild(renderer.domElement); };
  return { dispose, apply };
}

const HZ = { factory: ['#e63946', '#ffb703'], grocery: ['#16a34a', '#a3e635'], barber: ['#e63946', '#ff7a45'], restaurant: ['#f59e0b', '#f472b6'] };

export function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

export function mountGlobe(stage, sector = 'factory') {
  const sc = HZ[sector] || HZ.factory;
  const config = { globeRadius: 1.6, spikeCount: 3200, spikeLength: 0.06, spikeWidth: 0.06, influenceRadius: 0.5, displacement: 0.4, orbiterSize: 0.26, orbitSpeed: 0.8, autoRotate: true, globeColor: sc[0], orbiterColor: sc[1] };
  let handle;
  try { handle = mount(stage, stage, config); } catch { return null; }
  return {
    setSector(key) { if (HZ[key]) { config.globeColor = HZ[key][0]; config.orbiterColor = HZ[key][1]; handle.apply(); } },
    dispose() { try { handle.dispose(); } catch { /* */ } },
  };
}
