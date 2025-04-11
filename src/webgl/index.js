import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  DirectionalLight,
  Plane,
  Vector3,
  SphereGeometry,
  TorusGeometry,
  ConeGeometry,
  MeshBasicMaterial,
  DoubleSide,
  Color,
  AnimationMixer,
  Clock,
  Euler
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { gsap } from "gsap";

import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js";

import CustomToonMaterial from "./toon/material";

import { lerp } from "../tools/lerp";
import Mouse from "../tools/Mouse";

export default class WebGL {
  constructor() {
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);

    this.clock = 0;
    this.animationSpeed = 0.003;

    this.threeClock = new Clock();

    this.mixer = null;

    this.enableClipping = true;
    this.planeDistance = 0.6;

    this.inTransition = false;
    this.transitionDuration = 0.85;

    this.elasticPhysics = {
      stiffness: 0.05,
      damping: 0.03,
      mass: 0.2,
      duration: 2.5
    };

    this.rotationLimits = {
      x: { min: -30, max: 30 },
      y: { min: -45, max: 45 }
    };

    this.clippingAnimation = {
      speedX: 1.2,
      speedY: 1.3,
      speedZ: 1.3,
      offsetX: 0,
      offsetY: -1,
      offsetZ: 2
    };

    this.colors = {
      background: "#8EF9F3",
      outlineColor: "#4BC0D9",
      outlineAlpha: 0.1,
      clippingBoxColor: "#4BC0D9",
      clippingPlanesOpacity: 1,
      lightIntensity: 1,
      modelBaseColor: "#DCDC6A",
      modelShadeColor: "#E5ECF4"
    };

    this.clippingHelper = {
      shape: 'cone',
      wireframe: true,
      scale: {
        x: 5,
        y: 5,
        z: 1.2 - 0.0001
      }
    };

    this.cursorFollow = {
      enabled: true,
      smoothing: 0.05,
      maxAngle: 25,
      invertX: false,
      invertY: false,
      rotationOffsetY: 0,
      rotationOffsetX: 0
    };

    this.modelRotation = {
      initial: new Euler(0, 0, 0),
      target: new Euler(0, 0, 0),
      current: new Euler(0, 0, 0)
    };
  }

  getSize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.ratio = this.width / this.height;
  }

  createRenderer() {
    this.renderer = new WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      stencil: false,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: false
    });

    this.renderer.setClearColor(new Color(this.colors.background));

    this.renderer.localClippingEnabled = true;
  }

  prepare(canvas) {
    this.canvas = canvas;

    Mouse.init();

    this.getSize();
    this.createRenderer();
    this.init();
    this.bind();
    this.resize();
  }

  bind() {
    window.addEventListener("resize", this.resize);
    gsap.ticker.add(this.render);
  }

  handleClick() {}

  initDragControls() {
    this.isDragging = false;
    this.dragStartPosition = { x: 0, y: 0 };
    this.modelStartRotation = { x: 0, y: 0 };
    this.dragDelta = { x: 0, y: 0 };

    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this));
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  onMouseDown(event) {
    this.isDragging = true;
    this.dragStartPosition = {
      x: event.clientX,
      y: event.clientY
    };

    if (this.model) {
      this.modelStartRotation = {
        x: this.model.rotation.x,
        y: this.model.rotation.y
      };

      gsap.killTweensOf(this.model.rotation);
    }
  }

  onMouseMove(event) {
    if (!this.isDragging || !this.model) return;

    this.dragDelta = {
      x: (event.clientX - this.dragStartPosition.x) / this.width * 2,
      y: (event.clientY - this.dragStartPosition.y) / this.height * 2
    };

    let rawRotationX = this.modelStartRotation.x + this.dragDelta.y * Math.PI;
    let rawRotationY = this.modelStartRotation.y + this.dragDelta.x * Math.PI;

    const xMin = this.rotationLimits.x.min * Math.PI / 180;
    const xMax = this.rotationLimits.x.max * Math.PI / 180;
    const yMin = this.rotationLimits.y.min * Math.PI / 180;
    const yMax = this.rotationLimits.y.max * Math.PI / 180;

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    const progressiveZonePercent = 0.3;

    const xMinProgZone = xMin + xRange * progressiveZonePercent;
    const xMaxProgZone = xMax - xRange * progressiveZonePercent;
    const yMinProgZone = yMin + yRange * progressiveZonePercent;
    const yMaxProgZone = yMax - yRange * progressiveZonePercent;

    let newRotationX = rawRotationX;
    let newRotationY = rawRotationY;

    if (rawRotationX < xMinProgZone) {
      const beyondDist = xMinProgZone - rawRotationX;
      const maxAllowedBeyond = (xMinProgZone - xMin) * 1.2;
      const resistanceFactor = Math.pow(beyondDist / maxAllowedBeyond, 3);
      const minAllowed = xMinProgZone - maxAllowedBeyond;
      newRotationX = Math.max(minAllowed, rawRotationX);
    }
    else if (rawRotationX > xMaxProgZone) {
      const beyondDist = rawRotationX - xMaxProgZone;
      const maxAllowedBeyond = (xMax - xMaxProgZone) * 1.2;
      const resistanceFactor = Math.pow(beyondDist / maxAllowedBeyond, 3);
      const maxAllowed = xMaxProgZone + maxAllowedBeyond;
      newRotationX = Math.min(maxAllowed, rawRotationX);
    }

    if (rawRotationY < yMinProgZone) {
      const beyondDist = yMinProgZone - rawRotationY;
      const maxAllowedBeyond = (yMinProgZone - yMin) * 1.2;
      const resistanceFactor = Math.pow(beyondDist / maxAllowedBeyond, 3);
      const minAllowed = yMinProgZone - maxAllowedBeyond;
      newRotationY = Math.max(minAllowed, rawRotationY);
    }
    else if (rawRotationY > yMaxProgZone) {
      const beyondDist = rawRotationY - yMaxProgZone;
      const maxAllowedBeyond = (yMax - yMaxProgZone) * 1.2;
      const resistanceFactor = Math.pow(beyondDist / maxAllowedBeyond, 3);
      const maxAllowed = yMaxProgZone + maxAllowedBeyond;
      newRotationY = Math.min(maxAllowed, rawRotationY);
    }

    this.beyondLimitX = 0;
    this.beyondLimitY = 0;

    if (rawRotationX < xMinProgZone) {
      this.beyondLimitX = (xMinProgZone - rawRotationX) / (xMinProgZone - xMin);
    } else if (rawRotationX > xMaxProgZone) {
      this.beyondLimitX = (rawRotationX - xMaxProgZone) / (xMax - xMaxProgZone);
    }

    if (rawRotationY < yMinProgZone) {
      this.beyondLimitY = (yMinProgZone - rawRotationY) / (yMinProgZone - yMin);
    } else if (rawRotationY > yMaxProgZone) {
      this.beyondLimitY = (rawRotationY - yMaxProgZone) / (yMax - yMaxProgZone);
    }

    this.model.rotation.x = newRotationX;
    this.model.rotation.y = newRotationY;

    this.modelRotation.current.x = newRotationX;
    this.modelRotation.current.y = newRotationY;
  }

  onMouseUp() {
    if (!this.isDragging || !this.model) return;

    this.isDragging = false;

    this.applyElasticRebound();
  }

  onTouchStart(event) {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.dragStartPosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };

      if (this.model) {
        this.modelStartRotation = {
          x: this.model.rotation.x,
          y: this.model.rotation.y
        };

        gsap.killTweensOf(this.model.rotation);
      }
    }
  }

  onTouchMove(event) {
    if (!this.isDragging || !this.model || event.touches.length !== 1) return;

    event.preventDefault();

    this.dragDelta = {
      x: (event.touches[0].clientX - this.dragStartPosition.x) / this.width * 2,
      y: (event.touches[0].clientY - this.dragStartPosition.y) / this.height * 2
    };

    let rawRotationX = this.modelStartRotation.x + this.dragDelta.y * Math.PI;
    let rawRotationY = this.modelStartRotation.y + this.dragDelta.x * Math.PI;

    const xMin = this.rotationLimits.x.min * Math.PI / 180;
    const xMax = this.rotationLimits.x.max * Math.PI / 180;
    const yMin = this.rotationLimits.y.min * Math.PI / 180;
    const yMax = this.rotationLimits.y.max * Math.PI / 180;

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    const progressiveZonePercent = 0.3;

    const xMinProgZone = xMin + xRange * progressiveZonePercent;
    const xMaxProgZone = xMax - xRange * progressiveZonePercent;
    const yMinProgZone = yMin + yRange * progressiveZonePercent;
    const yMaxProgZone = yMax - yRange * progressiveZonePercent;

    let newRotationX = rawRotationX;
    let newRotationY = rawRotationY;

    if (rawRotationX < xMinProgZone) {
      const beyondDist = xMinProgZone - rawRotationX;
      const maxAllowedBeyond = (xMinProgZone - xMin) * 1.2;
      const resistanceFactor = Math.pow(beyondDist / maxAllowedBeyond, 3);
      const minAllowed = xMinProgZone - maxAllowedBeyond;
      newRotationX = Math.max(minAllowed, rawRotationX);
    }
    else if (rawRotationX > xMaxProgZone) {
      const beyondDist = rawRotationX - xMaxProgZone;
      const maxAllowedBeyond = (xMax - xMaxProgZone) * 1.2;
      const resistanceFactor = Math.pow(beyondDist / maxAllowedBeyond, 3);
      const maxAllowed = xMaxProgZone + maxAllowedBeyond;
      newRotationX = Math.min(maxAllowed, rawRotationX);
    }

    if (rawRotationY < yMinProgZone) {
      const beyondDist = yMinProgZone - rawRotationY;
      const maxAllowedBeyond = (yMinProgZone - yMin) * 1.2;
      const resistanceFactor = Math.pow(beyondDist / maxAllowedBeyond, 3);
      const minAllowed = yMinProgZone - maxAllowedBeyond;
      newRotationY = Math.max(minAllowed, rawRotationY);
    }
    else if (rawRotationY > yMaxProgZone) {
      const beyondDist = rawRotationY - yMaxProgZone;
      const maxAllowedBeyond = (yMax - yMaxProgZone) * 1.2;
      const resistanceFactor = Math.pow(beyondDist / maxAllowedBeyond, 3);
      const maxAllowed = yMaxProgZone + maxAllowedBeyond;
      newRotationY = Math.min(maxAllowed, rawRotationY);
    }

    this.beyondLimitX = 0;
    this.beyondLimitY = 0;

    if (rawRotationX < xMinProgZone) {
      this.beyondLimitX = (xMinProgZone - rawRotationX) / (xMinProgZone - xMin);
    } else if (rawRotationX > xMaxProgZone) {
      this.beyondLimitX = (rawRotationX - xMaxProgZone) / (xMax - xMaxProgZone);
    }

    if (rawRotationY < yMinProgZone) {
      this.beyondLimitY = (yMinProgZone - rawRotationY) / (yMinProgZone - yMin);
    } else if (rawRotationY > yMaxProgZone) {
      this.beyondLimitY = (rawRotationY - yMaxProgZone) / (yMax - yMaxProgZone);
    }

    this.model.rotation.x = newRotationX;
    this.model.rotation.y = newRotationY;

    this.modelRotation.current.x = newRotationX;
    this.modelRotation.current.y = newRotationY;
  }

  onTouchEnd(event) {
    if (!this.isDragging || !this.model) return;

    this.isDragging = false;

    this.applyElasticRebound();
  }

  applyElasticRebound() {
    const targetRotation = {
      x: this.modelRotation.initial.x,
      y: this.modelRotation.initial.y
    };

    this.modelRotation.current.x = this.model.rotation.x;
    this.modelRotation.current.y = this.model.rotation.y;

    const magneticForceStrength = 0.6;

    const xMin = this.rotationLimits.x.min * Math.PI / 180;
    const xMax = this.rotationLimits.x.max * Math.PI / 180;
    const yMin = this.rotationLimits.y.min * Math.PI / 180;
    const yMax = this.rotationLimits.y.max * Math.PI / 180;

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    const beyondLimitFactor = Math.max(
      Math.min(1, (this.beyondLimitX || 0) / (xRange * 0.5)),
      Math.min(1, (this.beyondLimitY || 0) / (yRange * 0.5))
    );

    const distanceX = Math.abs(this.model.rotation.x - targetRotation.x);
    const distanceY = Math.abs(this.model.rotation.y - targetRotation.y);
    const totalDistance = distanceX + distanceY;

    const extraSpringiness = beyondLimitFactor * magneticForceStrength;

    const dynamicDuration = this.elasticPhysics.duration *
      (1 + totalDistance * (1.0 + extraSpringiness * 0.5));

    const elasticStrength = 0.95 + (extraSpringiness * 0.15);
    const elasticBounciness = Math.max(0.15, 0.3 - (extraSpringiness * 0.2));

    gsap.to(this.model.rotation, {
      x: targetRotation.x,
      y: targetRotation.y,
      duration: dynamicDuration,
      ease: `elastic.out(${elasticStrength}, ${elasticBounciness})`,
      onUpdate: () => {
        this.modelRotation.current.x = this.model.rotation.x;
        this.modelRotation.current.y = this.model.rotation.y;
      }
    });

    this.beyondLimitX = 0;
    this.beyondLimitY = 0;
  }

  initClippingPlanes() {
    this.planeA = new Plane(new Vector3(1, 0, 0), this.planeDistance);
    this.planeB = new Plane(new Vector3(-1, 0, 0), this.planeDistance);

    this.planeDirection = new Vector3(1, 0, 0);

    this.createClippingHelper();

    this.clippingHelperMesh.position.set(0, 0, 0);

    this.scene.add(this.clippingHelperMesh);

    this.renderer.localClippingEnabled = true;
    this.renderer.clippingPlanes = [this.planeA, this.planeB];
  }

  createClippingHelper() {
    const material = new MeshBasicMaterial({
      transparent: true,
      opacity: this.colors.clippingPlanesOpacity,
      depthWrite: false,
      side: DoubleSide,
      color: new Color(this.colors.clippingBoxColor),
      wireframe: this.clippingHelper.wireframe
    });

    let geometry;

    switch (this.clippingHelper.shape) {
      case 'sphere':
        const radius = Math.max(
          this.clippingHelper.scale.x,
          this.clippingHelper.scale.y,
          this.clippingHelper.scale.z
        ) / 2;
        geometry = new SphereGeometry(radius, 32, 16);
        break;

      case 'torus':
        const torusRadius = Math.max(this.clippingHelper.scale.x, this.clippingHelper.scale.y) / 2;
        const tubeRadius = this.clippingHelper.scale.z / 2;
        geometry = new TorusGeometry(torusRadius, tubeRadius, 16, 32);
        break;

      case 'cone':
        const coneRadius = this.clippingHelper.scale.x / 2;
        const coneHeight = this.clippingHelper.scale.y;
        geometry = new ConeGeometry(coneRadius, coneHeight, 32);
        break;

      default:
        geometry = new SphereGeometry(
          this.clippingHelper.scale.x,
          this.clippingHelper.scale.y,
          this.clippingHelper.scale.z
        );
        break;
    }

    if (!this.clippingHelperMesh) {
      this.clippingHelperMesh = new Mesh(geometry, material);
    } else {
      const oldRotation = this.clippingHelperMesh.rotation.clone();
      const oldPosition = this.clippingHelperMesh.position.clone();
      const oldScale = this.clippingHelperMesh.scale.clone();

      const oldMesh = this.clippingHelperMesh;

      const newMesh = new Mesh(geometry, material);
      newMesh.position.copy(oldPosition);
      newMesh.rotation.copy(oldRotation);
      newMesh.scale.copy(oldScale);

      this.clippingHelperMesh = newMesh;

      if (!this.inTransition) {
        this.scene.add(this.clippingHelperMesh);

        this.scene.remove(oldMesh);

        if (oldMesh.geometry) {
          oldMesh.geometry.dispose();
        }
      }
    }
  }

  init() {
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(36, this.ratio, 0.1, 1000);
    this.camera.position.set(0, 0, 10);

    this.material = new CustomToonMaterial({
      baseColor: this.colors.modelBaseColor,
      shadeColor: this.colors.modelShadeColor
    });

    this.initClippingPlanes();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      'head.glb',
      (gltf) => {
        this.model = gltf.scene;

        this.model.traverse((child) => {
          if (child instanceof Mesh) {
            child.material = this.material;

            child.material.clippingPlanes = [this.planeA, this.planeB];
            child.material.clipIntersection = false;
            child.material.clipShadows = true;
            child.material.needsUpdate = true;
          }
        });

        if (this.model) {
          this.modelRotation.initial = new Euler().copy(this.model.rotation);
          this.modelRotation.current = new Euler().copy(this.model.rotation);
          this.modelRotation.target = new Euler().copy(this.model.rotation);

          this.model.scale.set(1, 1, 1);
        }

        this.scene.add(this.model);

        if (gltf.animations && gltf.animations.length > 0) {
          this.animations = gltf.animations;
          this.mixer = new AnimationMixer(this.model);

          const action = this.mixer.clipAction(this.animations[0]);
          action.play();
        }
      },
      (xhr) => {},
      (error) => {
        console.error('An error happened while loading the model', error);
      }
    );

    this.directionalLight = new DirectionalLight(
      this.colors.directionalLight,
      this.colors.lightIntensity
    );
    this.directionalLight.position.set(10, 15, 3);
    this.scene.add(this.directionalLight);

    this.effect = new OutlineEffect(this.renderer, {
      defaultThickness: 0.003,
      defaultColor: [this.colors.outlineColor],
      defaultAlpha: this.colors.outlineAlpha,
    });

    this.initDragControls();
  }

  updateClippingHelperShape(shapeConfig) {
    this.inTransition = true;

    this.clippingHelper = { ...this.clippingHelper, ...shapeConfig };

    const oldMesh = this.clippingHelperMesh;

    this.createClippingHelper();

    this.scene.add(this.clippingHelperMesh);

    if (oldMesh) {
      this.scene.remove(oldMesh);

      if (oldMesh.geometry) {
        oldMesh.geometry.dispose();
      }

      if (oldMesh.material) {
        if (Array.isArray(oldMesh.material)) {
          oldMesh.material.forEach(material => material.dispose());
        } else {
          oldMesh.material.dispose();
        }
      }
    }

    this.inTransition = false;

    return this.clippingHelperMesh;
  }

  updateCursorFollowSettings(settings) {
    this.cursorFollow = { ...this.cursorFollow, ...settings };
  }

  updateModelRotation() {
    if (!this.model || !this.cursorFollow.enabled || this.isDragging) return;

    const xFactor = this.cursorFollow.invertX ? -1 : 1;
    const yFactor = this.cursorFollow.invertY ? -1 : 1;

    const rotX = Mouse.positionFromCenter.y * this.cursorFollow.maxAngle * yFactor * Math.PI / 180;
    const rotY = Mouse.positionFromCenter.x * this.cursorFollow.maxAngle * xFactor * Math.PI / 180;

    const offsetX = this.cursorFollow.rotationOffsetX * Math.PI / 180;
    const offsetY = this.cursorFollow.rotationOffsetY * Math.PI / 180;

    const xMin = this.rotationLimits.x.min * Math.PI / 180;
    const xMax = this.rotationLimits.x.max * Math.PI / 180;
    const yMin = this.rotationLimits.y.min * Math.PI / 180;
    const yMax = this.rotationLimits.y.max * Math.PI / 180;

    let targetX = this.modelRotation.initial.x + rotX + offsetX;
    let targetY = this.modelRotation.initial.y + rotY + offsetY;

    targetX = Math.max(xMin, Math.min(xMax, targetX));
    targetY = Math.max(yMin, Math.min(yMax, targetY));

    this.modelRotation.target.x = targetX;
    this.modelRotation.target.y = targetY;

    this.modelRotation.current.x = lerp(
      this.modelRotation.current.x,
      this.modelRotation.target.x,
      this.cursorFollow.smoothing
    );

    this.modelRotation.current.y = lerp(
      this.modelRotation.current.y,
      this.modelRotation.target.y,
      this.cursorFollow.smoothing
    );

    if (this.model) {
      this.model.rotation.x = this.modelRotation.current.x;
      this.model.rotation.y = this.modelRotation.current.y;
    }
  }

  updateRotationLimits(limits) {
    if (limits.x) {
      if (limits.x.min !== undefined) this.rotationLimits.x.min = limits.x.min;
      if (limits.x.max !== undefined) this.rotationLimits.x.max = limits.x.max;
    }

    if (limits.y) {
      if (limits.y.min !== undefined) this.rotationLimits.y.min = limits.y.min;
      if (limits.y.max !== undefined) this.rotationLimits.y.max = limits.y.max;
    }
  }

  updateElasticPhysics(physics) {
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    if (physics.stiffness !== undefined) {
      this.elasticPhysics.stiffness = clamp(physics.stiffness, 0.1, 1.0);
    }

    if (physics.damping !== undefined) {
      this.elasticPhysics.damping = clamp(physics.damping, 0.1, 1.0);
    }

    if (physics.mass !== undefined) {
      this.elasticPhysics.mass = clamp(physics.mass, 0.5, 5.0);
    }

    if (physics.duration !== undefined) {
      this.elasticPhysics.duration = clamp(physics.duration, 0.5, 3.0);
    }
  }

  updateClippingPlanes() {
    this.clock += this.animationSpeed;

    if (!this.enableClipping) {
      this.renderer.clippingPlanes = [];
      if (this.clippingHelperMesh) {
        this.clippingHelperMesh.visible = false;
      }
      return;
    }

    if (this.clippingHelperMesh) {
      this.clippingHelperMesh.visible = true;
    }

    const t = this.clock * 0.5;
    const { speedX, speedY, speedZ, offsetX, offsetY, offsetZ } = this.clippingAnimation;

    this.planeDirection.set(
      Math.sin(speedX * t + offsetX),
      Math.sin(speedY * t + offsetY),
      Math.cos(speedZ * t + offsetZ)
    );
    this.planeDirection.normalize();

    this.planeA.normal.copy(this.planeDirection);
    this.planeA.constant = this.planeDistance;

    this.planeB.normal.copy(this.planeDirection).negate();
    this.planeB.constant = this.planeDistance;

    if (this.clippingHelperMesh) {
      this.clippingHelperMesh.lookAt(
        this.planeDirection.x * 10,
        this.planeDirection.y * 10,
        this.planeDirection.z * 10
      );
    }

    this.renderer.clippingPlanes = [this.planeA, this.planeB];
  }

  updateColors(colorConfig) {
    this.colors = { ...this.colors, ...colorConfig };

    this.renderer.setClearColor(new Color(this.colors.background));

    if (this.effect) {
      this.effect.setParameters({
        defaultColor: [this.colors.outlineColor],
        defaultAlpha: this.colors.outlineAlpha
      });
    }

    if (this.clippingHelperMesh && this.clippingHelperMesh.material) {
      this.clippingHelperMesh.material.color = new Color(this.colors.clippingBoxColor);
      this.clippingHelperMesh.material.opacity = this.colors.clippingPlanesOpacity;
    }

    if (this.directionalLight) {
      this.directionalLight.color = new Color(this.colors.directionalLight);
      this.directionalLight.intensity = this.colors.lightIntensity;
    }

    this.updateModelColors();
  }

  updateModelColors() {
    if (this.material && this.material.updateColors) {
      this.material.updateColors({
        baseColor: this.colors.modelBaseColor,
        shadeColor: this.colors.modelShadeColor
      });
    }
  }

  render() {
    const delta = this.threeClock.getDelta();

    if (this.mixer) {
      this.mixer.update(delta);
    }

    this.directionalLight.position.x = lerp(
      this.directionalLight.position.x,
      Mouse.positionFromCenter.x * 15,
      0.1
    );
    this.directionalLight.position.y = lerp(
      this.directionalLight.position.y,
      Mouse.positionFromCenter.y * 5,
      0.1
    );

    if (!this.isDragging) {
      this.updateModelRotation();
    }

    this.updateClippingPlanes();

    this.effect.render(this.scene, this.camera);
  }

  resize() {
    this.getSize();

    this.renderer.setSize(this.width, this.height);

    this.camera.aspect = this.ratio;
    this.camera.updateProjectionMatrix();
  }
}