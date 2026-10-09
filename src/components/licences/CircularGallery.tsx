"use client";

// Adapted from React Bits CircularGallery (reactbits.dev, MIT + Commons Clause). Changes: no window listeners, page-scroll progress via
// `progressRef`, container-scoped drag, onActiveChange, cardSize, wobble, rAF paused off-screen, GL context
// released, and for Licences:
//  - No font loader of its own: the caller passes a canvas font string built from the page's font family, and
//    we only wait for document.fonts.load() on it.
//  - Titles are rasterised at 3x so the Panchang captions stay sharp after the plane scales them up.
//  - dpr capped at 1.75 (site WebGL rule). The canvas is decorative: aria-hidden, not focusable; the real,
//    keyboard-reachable licence list is HTML next to it.
//  - No `any`, no autoBind; latest onActiveChange is kept in a ref updated in an effect (not during render).
//  - Items can be canvases (the licence cards are drawn at runtime): no image encode/decode round trip, and the
//    doubled wrap-around copies share one texture per card, so each card is uploaded to the GPU once.
//  - The loop skips the GL render while the arc is at rest (the rAF itself keeps running, and is cheap).

import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef } from "react";

type GL = Renderer["gl"];

export type GalleryItem = { image: string | HTMLCanvasElement; text: string };

/** One GPU texture per source image, shared by every card that shows it. `size` is mutated in place once known. */
type CardTexture = { texture: Texture; size: [number, number] };

const TITLE_RES = 3;

function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

function getFontSize(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 26;
}

async function resolveFont(font: string): Promise<string> {
  if (document.fonts?.load) {
    try {
      await document.fonts.load(font);
    } catch {
      // fall back to whatever the browser has; the caption still renders
    }
  }
  return font;
}

function createTextTexture(gl: GL, text: string, font: string, color: string): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get 2d context");

  const size = getFontSize(font);
  const hiFont = font.replace(/(\d+(?:\.\d+)?)px/, `${size * TITLE_RES}px`);
  context.font = hiFont;
  const textWidth = Math.ceil(context.measureText(text).width);
  const textHeight = Math.ceil(size * TITLE_RES * 1.2);
  const pad = 10 * TITLE_RES;

  canvas.width = textWidth + pad * 2;
  canvas.height = textHeight + pad * 2;

  context.font = hiFont;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  mesh: Mesh;
  aspect: number;

  constructor({ gl, plane, text, textColor, font }: { gl: GL; plane: Mesh; text: string; textColor: string; font: string }) {
    const { texture, width, height } = createTextTexture(gl, text, font, textColor);
    const geometry = new Plane(gl);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(gl, { geometry, program });
    this.aspect = width / height;
    this.mesh.setParent(plane);
    this.fit(plane);
  }

  /**
   * The caption is a child of the card plane, so it inherits the plane's non-uniform scale.
   * Divide that back out (upstream skipped this, which squeezed the lettering to the card's aspect).
   */
  fit(plane: Mesh) {
    const h = 0.15;
    const sx = plane.scale.x || 1;
    const sy = plane.scale.y || 1;
    this.mesh.scale.set(h * this.aspect * (sy / sx), h, 1);
    this.mesh.position.y = -0.5 - h * 0.5 - 0.05 / sy;
  }
}

interface ScreenSize {
  width: number;
  height: number;
}

interface MediaProps {
  geometry: Plane;
  gl: GL;
  card: CardTexture;
  index: number;
  length: number;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: ScreenSize;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  cardSize: [number, number];
  wobble: number;
}

class Media {
  extra = 0;
  geometry: Plane;
  gl: GL;
  card: CardTexture;
  index: number;
  length: number;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: ScreenSize;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  cardSize: [number, number];
  wobble: number;
  program!: Program;
  plane!: Mesh;
  title!: Title;
  scale!: number;
  padding!: number;
  width!: number;
  widthTotal!: number;
  x!: number;
  speed = 0;
  isBefore = false;
  isAfter = false;

  constructor(props: MediaProps) {
    this.geometry = props.geometry;
    this.gl = props.gl;
    this.card = props.card;
    this.index = props.index;
    this.length = props.length;
    this.scene = props.scene;
    this.screen = props.screen;
    this.text = props.text;
    this.viewport = props.viewport;
    this.bend = props.bend;
    this.textColor = props.textColor;
    this.borderRadius = props.borderRadius;
    this.font = props.font;
    this.cardSize = props.cardSize;
    this.wobble = props.wobble;
    this.createShader();
    this.createMesh();
    this.title = new Title({ gl: this.gl, plane: this.plane, text: this.text, textColor: this.textColor, font: this.font });
    this.onResize();
  }

  createShader() {
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        uniform float uWobble;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          // flat card at rest; scroll speed flexes it like a sheet of card stock
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (uWobble + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.002, 0.002, d);
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: this.card.texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: this.card.size },
        uSpeed: { value: 0 },
        uWobble: { value: this.wobble },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });
  }

  createMesh() {
    this.plane = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.plane.setParent(this.scene);
  }

  update(scroll: { current: number; last: number }, direction: "right" | "left") {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    // clamp the flex: a long jump (anchor link, resumed tab) must read as card stock bending, not a flag in a gale
    this.program.uniforms.uSpeed.value = Math.max(-0.1, Math.min(0.1, this.speed));

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen?: ScreenSize; viewport?: ScreenSize } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    const [cardW, cardH] = this.cardSize;
    this.scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (cardH * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (cardW * this.scale)) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.title?.fit(this.plane);
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

interface AppConfig {
  items: GalleryItem[];
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  scrollSpeed: number;
  scrollEase: number;
  progressRef?: { current: number | null };
  onActiveChange?: (index: number) => void;
  cardSize: [number, number];
  wobble: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

class App {
  container: HTMLElement;
  scrollSpeed: number;
  scroll: { ease: number; current: number; target: number; last: number };
  renderer!: Renderer;
  gl!: GL;
  camera!: Camera;
  scene!: Transform;
  planeGeometry!: Plane;
  medias: Media[] = [];
  screen!: ScreenSize;
  viewport!: ScreenSize;
  raf = 0;

  progressRef?: { current: number | null };
  onActiveChange?: (index: number) => void;
  itemCount = 1;
  dragOffset = 0;
  dragStart = 0;
  pointerId: number | null = null;
  activeIndex = -1;
  visible = true;
  /** Something changed that the scroll state does not capture (resize, a texture arriving): render next frame. */
  dirty = true;
  /** An idle wobble animates every frame, so the at-rest skip is off. */
  alwaysRender = false;
  ro?: ResizeObserver;
  io?: IntersectionObserver;
  isDown = false;
  start = 0;

  constructor(container: HTMLElement, config: AppConfig) {
    this.container = container;
    this.scrollSpeed = config.scrollSpeed;
    this.scroll = { ease: config.scrollEase, current: 0, target: 0, last: 0 };
    this.progressRef = config.progressRef;
    this.onActiveChange = config.onActiveChange;
    this.alwaysRender = config.wobble > 0;
    this.update = this.update.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.createRenderer();
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
    this.scene = new Transform();
    this.onResize();
    this.planeGeometry = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 });
    this.createMedias(config);
    // start already positioned at the current progress (no lerp-in from card 0 when mounted mid-page)
    this.scroll.current = this.scroll.last = this.baseScroll() + this.dragOffset;
    this.update();
    this.addEventListeners();
  }

  createRenderer() {
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 1.75) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    const canvas = this.gl.canvas as HTMLCanvasElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    this.container.appendChild(canvas);
  }

  createMedias(config: AppConfig) {
    const items = config.items;
    this.itemCount = Math.max(1, items.length);
    // doubled so the wrap-around never shows a gap
    const doubled = items.concat(items);
    const cards = new Map<GalleryItem["image"], CardTexture>();
    const cardFor = (image: GalleryItem["image"]): CardTexture => {
      let card = cards.get(image);
      if (card) return card;
      const texture = new Texture(this.gl, { generateMipmaps: true });
      card = { texture, size: [0, 0] };
      const ready = card;
      if (typeof image === "string") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = image;
        img.onload = () => {
          texture.image = img;
          ready.size[0] = img.naturalWidth;
          ready.size[1] = img.naturalHeight;
          this.dirty = true;
        };
      } else {
        texture.image = image;
        card.size[0] = image.width;
        card.size[1] = image.height;
      }
      cards.set(image, card);
      return card;
    };
    this.medias = doubled.map(
      (data, index) =>
        new Media({
          geometry: this.planeGeometry,
          gl: this.gl,
          card: cardFor(data.image),
          index,
          length: doubled.length,
          scene: this.scene,
          screen: this.screen,
          text: data.text,
          viewport: this.viewport,
          bend: config.bend,
          textColor: config.textColor,
          borderRadius: config.borderRadius,
          font: config.font,
          cardSize: config.cardSize,
          wobble: config.wobble,
        }),
    );
  }

  cardWidth(): number {
    return this.medias[0]?.width ?? 0;
  }

  /** Scroll position the page progress asks for: p = 0 centres card 0, p = 1 centres the last card. */
  baseScroll(): number {
    const p = this.progressRef?.current;
    if (p == null) return 0;
    return clamp01(p) * this.cardWidth() * (this.itemCount - 1);
  }

  onPointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.isDown = true;
    this.pointerId = e.pointerId;
    this.start = e.clientX;
    this.dragStart = this.dragOffset;
    try {
      this.container.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
  }

  onPointerMove(e: PointerEvent) {
    if (!this.isDown || e.pointerId !== this.pointerId) return;
    this.dragOffset = this.dragStart + (this.start - e.clientX) * (this.scrollSpeed * 0.025);
  }

  onPointerUp(e: PointerEvent) {
    if (!this.isDown || e.pointerId !== this.pointerId) return;
    this.isDown = false;
    this.pointerId = null;
    try {
      if (this.container.hasPointerCapture(e.pointerId)) this.container.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    this.snap();
  }

  /** After a drag, settle the nearest card in the centre (the page scroll carries on from there). */
  snap() {
    const w = this.cardWidth();
    if (!w) return;
    const base = this.baseScroll();
    this.dragOffset = Math.round((base + this.dragOffset) / w) * w - base;
  }

  onResize() {
    this.screen = { width: this.container.clientWidth || 1, height: this.container.clientHeight || 1 };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    this.medias.forEach((media) => media.onResize({ screen: this.screen, viewport: this.viewport }));
    this.dirty = true;
  }

  update() {
    if (!this.visible) {
      this.raf = 0;
      return;
    }
    this.scroll.target = this.baseScroll() + this.dragOffset;
    const atRest = Math.abs(this.scroll.target - this.scroll.current) < 0.0005 && this.scroll.current === this.scroll.last;
    if (atRest && !this.dirty && !this.isDown && !this.alwaysRender) {
      // nothing moves (the wobble is 0 and the cards are flat at rest): skip the GL work this frame
      this.raf = window.requestAnimationFrame(this.update);
      return;
    }
    this.dirty = false;
    this.scroll.current = atRest ? this.scroll.target : lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias.forEach((media) => media.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;

    const w = this.cardWidth();
    if (w > 0 && Number.isFinite(this.scroll.current) && this.onActiveChange) {
      const n = this.itemCount;
      const idx = ((Math.round(this.scroll.current / w) % n) + n) % n;
      if (idx !== this.activeIndex) {
        this.activeIndex = idx;
        this.onActiveChange(idx);
      }
    }

    this.raf = window.requestAnimationFrame(this.update);
  }

  addEventListeners() {
    // nothing on window: the page scroll drives the arc through progressRef; drag is scoped to the container
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(this.container);
    this.io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible && !this.raf) this.raf = window.requestAnimationFrame(this.update);
      },
      { rootMargin: "120px 0px" },
    );
    this.io.observe(this.container);
    this.container.addEventListener("pointerdown", this.onPointerDown);
    this.container.addEventListener("pointermove", this.onPointerMove);
    this.container.addEventListener("pointerup", this.onPointerUp);
    this.container.addEventListener("pointercancel", this.onPointerUp);
  }

  destroy() {
    window.cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
    this.io?.disconnect();
    this.container.removeEventListener("pointerdown", this.onPointerDown);
    this.container.removeEventListener("pointermove", this.onPointerMove);
    this.container.removeEventListener("pointerup", this.onPointerUp);
    this.container.removeEventListener("pointercancel", this.onPointerUp);
    const canvas = this.renderer?.gl?.canvas as HTMLCanvasElement | undefined;
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    // free the GL context (StrictMode mounts twice in dev; browsers cap live contexts at ~16)
    this.renderer?.gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

export interface CircularGalleryProps {
  /** Must be referentially stable, or the whole WebGL app is rebuilt. */
  items: GalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  /** Canvas font shorthand with a real, loaded family, e.g. `600 26px <next/font family>`. */
  font: string;
  scrollSpeed?: number;
  scrollEase?: number;
  /** 0..1 written by ScrollTrigger. A ref, so scrolling never re-renders React. */
  progressRef?: { current: number | null };
  /** Fires when the centred card changes (index into `items`). */
  onActiveChange?: (index: number) => void;
  /** Card proportions in design px (licence cards are drawn at 700 x 900). */
  cardSize?: [number, number];
  /** Idle vertex wobble; 0 = flat at rest. */
  wobble?: number;
  className?: string;
}

export default function CircularGallery({
  items,
  bend = 2,
  textColor = "#f5eedd",
  borderRadius = 0.03,
  font,
  scrollSpeed = 2,
  scrollEase = 0.12,
  progressRef,
  onActiveChange,
  cardSize,
  wobble = 0,
  className = "",
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onActiveRef = useRef(onActiveChange);
  useEffect(() => {
    onActiveRef.current = onActiveChange;
  }, [onActiveChange]);
  const cardW = cardSize?.[0] ?? 700;
  const cardH = cardSize?.[1] ?? 900;

  useEffect(() => {
    if (!containerRef.current) return;
    let app: App | undefined;
    let alive = true;
    resolveFont(font).then((resolvedFont) => {
      if (!alive || !containerRef.current) return;
      app = new App(containerRef.current, {
        items,
        bend,
        textColor,
        borderRadius,
        font: resolvedFont,
        scrollSpeed,
        scrollEase,
        progressRef,
        onActiveChange: (i) => onActiveRef.current?.(i),
        cardSize: [cardW, cardH],
        wobble,
      });
    });
    return () => {
      alive = false;
      app?.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, progressRef, cardW, cardH, wobble]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`h-full w-full cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing ${className}`}
    />
  );
}
