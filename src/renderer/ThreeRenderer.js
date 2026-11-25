import * as THREE from 'three';
import { Renderer } from './Renderer.js';
import { RenderContext } from './RenderContext.js';
import { TILE_TYPE } from '../utils/constants.js';
import { Velocity } from '../components/Velocity.js';
import { Position } from '../components/Position.js';
import { lerp } from '../utils/math.js';
import { eventBus } from '../core/EventBus.js';

export class ThreeRenderer extends Renderer {
  constructor() {
    super();
    this.context = new RenderContext();
    this.canvas = null;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.webgl = null;
    this.world = new THREE.Group();
    this.entityMeshes = new Map();
    this.mapKey = '';
    this.firstPerson = false;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clickHandler = this.onMouseClick.bind(this);
    this.mouseMoveHandler = this.onMouseMove.bind(this);
    this.keyDownHandler = this.onKeyDown.bind(this);
    this.pointerLockHandler = this.onPointerLockChange.bind(this);
    this.crosshair = null;
    this.yaw = 0;
    this.pitch = -0.1;
    this.paused = false;
    this.pausePanel = null;
    this.torchLight = null;
  }

  // Cria um canvas WebGL separado e substitui o Canvas2D existente
  init(canvas) {
    this.canvas = canvas;
    this.crosshair = document.createElement('div');
    this.crosshair.id = 'first-person-crosshair';
    this.crosshair.setAttribute('aria-hidden', 'true');
    this.crosshair.style.cssText = `
      position: fixed; left: 50%; top: 50%; z-index: 1100; display: none;
      width: 14px; height: 14px; transform: translate(-50%, -50%);
      border: 1px solid rgba(235, 230, 215, .8); border-radius: 50%;
      box-shadow: 0 0 5px #000; pointer-events: none;
    `;
    document.body.appendChild(this.crosshair);
    this.createPausePanel();
    this.webgl = new THREE.WebGLRenderer({ canvas, antialias: true });
    canvas.addEventListener('click', this.clickHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('pointerlockchange', this.pointerLockHandler);
    window.addEventListener('keydown', this.keyDownHandler, true);
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.webgl.setSize(canvas.width, canvas.height, false);
    this.scene.background = new THREE.Color('#090909');
    this.scene.fog = new THREE.FogExp2('#090909', 0.024);
    this.scene.add(this.world);
    const ambient = new THREE.HemisphereLight('#d8d4c8', '#050505', 0.62);
    const directional = new THREE.DirectionalLight('#ffffff', 0.35);
    directional.position.set(-12, 24, 10);
    this.scene.add(ambient, directional);
    this.torchLight = new THREE.PointLight('#ffb86b', 12, 12, 2);
    this.scene.add(this.torchLight);

    this.camera = new THREE.PerspectiveCamera(42, canvas.width / canvas.height, 0.1, 500);
    this.camera.position.set(0, 28, 28);
    this.camera.lookAt(0, 0, 0);
  }

  resize(width, height) {
    if (!this.canvas || !this.camera) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.webgl.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  clear() {
    if (!this.webgl) return;
    this.webgl.render(this.scene, this.camera);
  }

  // Reconstrói o mapa somente quando a composição muda
  drawMap(gridMap) {
    const featureState = [...gridMap.features.values()]
      .map(({ x, y, type, state, keyColor, used, activated }) =>
        `${x},${y}:${type}:${state}:${keyColor}:${used}:${activated}`)
      .join('|');
    const key = `${gridMap.seed}:${gridMap.width}:${gridMap.height}:${featureState}`;
    if (key === this.mapKey) return;
    this.mapKey = key;
    while (this.world.children.length) this.world.remove(this.world.children[0]);
    this.entityMeshes.clear();

    const geometryFloor = new THREE.BoxGeometry(0.96, 0.12, 0.96);
    const geometryWall = new THREE.BoxGeometry(0.96, 1.2, 0.96);
    const floorMesh = new THREE.InstancedMesh(
      geometryFloor,
      new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.9 }),
      gridMap.width * gridMap.height
    );
    const wallMesh = new THREE.InstancedMesh(
      geometryWall,
      new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.95 }),
      gridMap.width * gridMap.height
    );
    const matrix = new THREE.Matrix4();
    let floors = 0;
    let walls = 0;

    for (let y = 0; y < gridMap.height; y++) {
      for (let x = 0; x < gridMap.width; x++) {
        const type = gridMap.get(x, y);
        const wx = x - gridMap.width / 2;
        const wz = y - gridMap.height / 2;
        matrix.makeTranslation(wx, type === TILE_TYPE.WALL ? 0.5 : -0.02, wz);
        if (type === TILE_TYPE.WALL) {
          wallMesh.setMatrixAt(walls++, matrix);
        } else {
          floorMesh.setMatrixAt(floors++, matrix);
        }
      }
    }
    floorMesh.count = floors;
    wallMesh.count = walls;
    floorMesh.receiveShadow = true;
    wallMesh.receiveShadow = true;
    this.world.add(floorMesh, wallMesh);

    this.addFeatureModels(gridMap);
    this.webgl.shadowMap.enabled = true;
  }

  // Desenha escadas, portas e recursos como formas low-poly
  addFeatureModels(gridMap) {
    gridMap.features.forEach(feature => {
      if (feature.type === 'secret_door' && feature.state === 'hidden') return;
      const x = feature.x - gridMap.width / 2;
      const z = feature.y - gridMap.height / 2;
      if (feature.type === 'crate' && feature.state === 'destroyed') return;

      const group = new THREE.Group();
      group.position.set(x, 0.04, z);
      group.userData.feature = feature;
      const addPart = (geometry, color, px, py, pz, options = {}) => {
        const material = new THREE.MeshStandardMaterial({
          color,
          roughness: options.roughness ?? 0.72,
          metalness: options.metalness ?? 0,
          emissive: options.emissive || '#000000',
          emissiveIntensity: options.emissiveIntensity || 0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(px, py, pz);
        mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      };

      if (feature.type === 'crate') {
        addPart(new THREE.BoxGeometry(0.66, 0.66, 0.66), '#80502e', 0, 0.33, 0);
        addPart(new THREE.BoxGeometry(0.09, 0.68, 0.7), '#c28a4f', 0, 0.33, 0.01);
        addPart(new THREE.BoxGeometry(0.7, 0.68, 0.09), '#c28a4f', 0, 0.33, 0.01);
      } else if (feature.type === 'stairs_up' || feature.type === 'stairs_down') {
        const up = feature.type === 'stairs_up';
        const color = up ? '#49b976' : '#d19a3a';
        for (let index = 0; index < 4; index++) {
          addPart(
            new THREE.BoxGeometry(0.78, 0.12, 0.2),
            index % 2 ? '#81785f' : '#9a906f',
            0, 0.06 + index * 0.055, -0.3 + index * 0.2
          );
        }
        addPart(
          new THREE.ConeGeometry(0.15, 0.34, 4),
          color, 0, 0.39, up ? -0.34 : 0.34,
          { rx: up ? -Math.PI / 2 : Math.PI / 2, emissive: color, emissiveIntensity: 0.4 }
        );
      } else if (feature.type === 'door' || feature.type === 'secret_door') {
        const color = feature.type === 'secret_door'
          ? '#554278'
          : ({ red: '#713131', blue: '#304e78', green: '#356342' }[feature.keyColor] || '#67452c');
        addPart(new THREE.BoxGeometry(0.12, 1.12, 0.16), '#54483b', -0.43, 0.56, 0);
        addPart(new THREE.BoxGeometry(0.12, 1.12, 0.16), '#54483b', 0.43, 0.56, 0);
        addPart(new THREE.BoxGeometry(0.98, 0.12, 0.16), '#8a7455', 0, 1.08, 0);
        const panel = addPart(new THREE.BoxGeometry(0.72, 0.94, 0.1), color, 0, 0.52, 0);
        if (feature.state === 'open') panel.rotation.y = -Math.PI / 2;
        addPart(new THREE.SphereGeometry(0.045, 8, 6), '#f3c76a', 0.25, 0.52, 0.08, {
          emissive: '#ffb943', emissiveIntensity: 0.45
        });
      } else if (feature.type === 'item') {
        const color = feature.itemId?.startsWith('key_') ? '#ffe06b' : '#68d9c0';
        addPart(new THREE.OctahedronGeometry(0.23), color, 0, 0.3, 0, {
          emissive: color, emissiveIntensity: 0.7, metalness: 0.22
        });
      } else if (feature.type === 'trap') {
        addPart(new THREE.BoxGeometry(0.75, 0.08, 0.75), '#42464b', 0, 0.04, 0, {
          metalness: 0.55
        });
        if (!feature.activated) {
          for (let index = 0; index < 4; index++) {
            addPart(new THREE.ConeGeometry(0.09, 0.34, 4), '#a5a9ac',
              -0.24 + index * 0.16, 0.22, 0, { metalness: 0.7 });
          }
        }
      } else if (feature.type === 'sanctuary') {
        addPart(new THREE.CylinderGeometry(0.28, 0.34, 0.18, 8), '#6a655b', 0, 0.09, 0);
        addPart(new THREE.OctahedronGeometry(0.2), feature.used ? '#6d8275' : '#7be1ad',
          0, 0.46, 0, { emissive: '#42f29a', emissiveIntensity: feature.used ? 0.08 : 0.8 });
      } else if (feature.type === 'merchant') {
        addPart(new THREE.BoxGeometry(0.76, 0.58, 0.58), '#78542c', 0, 0.29, 0);
        addPart(new THREE.BoxGeometry(0.82, 0.1, 0.64), '#c59a4c', 0, 0.62, 0);
      } else {
        addPart(new THREE.BoxGeometry(0.56, 0.4, 0.56), '#77745f', 0, 0.2, 0);
      }

      this.world.add(group);
    });
  }

  createEnemyModel(entity) {
    const data = entity.get('Collider')?.enemyData || {};
    const typeId = data.typeId || 1;
    const group = new THREE.Group();
    const addPart = (geometry, color, x, y, z, options = {}) => {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.76,
        metalness: options.metalness ?? 0,
        emissive: options.emissive || '#000000',
        emissiveIntensity: options.emissiveIntensity || 0,
        transparent: options.transparent || false,
        opacity: options.opacity ?? 1,
        side: options.side || THREE.FrontSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };
    const eyes = (color, z) => {
      for (const x of [-0.085, 0.085]) {
        addPart(new THREE.SphereGeometry(0.045, 8, 6), color, x, 0.98, z, {
          emissive: color, emissiveIntensity: 1.5
        });
      }
    };

    if (typeId === 1) {
      addPart(new THREE.BoxGeometry(0.48, 0.58, 0.34), '#60703d', 0, 0.5, 0);
      addPart(new THREE.BoxGeometry(0.34, 0.34, 0.34), '#849252', 0, 0.96, 0.015);
      addPart(new THREE.BoxGeometry(0.15, 0.42, 0.17), '#75834a', -0.34, 0.55, 0);
      addPart(new THREE.BoxGeometry(0.15, 0.36, 0.17), '#75834a', 0.34, 0.55, 0);
      for (const x of [-0.13, 0.13]) {
        addPart(new THREE.BoxGeometry(0.17, 0.38, 0.2), '#444b30', x, 0.17, 0);
      }
      eyes('#f5cf55', 0.19);
    } else if (typeId === 2) {
      const bone = '#ddd2b0';
      addPart(new THREE.CylinderGeometry(0.09, 0.14, 0.42, 7), bone, 0, 0.57, 0);
      addPart(new THREE.SphereGeometry(0.22, 9, 7), '#c9bd9b', 0, 1.02, 0.01);
      for (const y of [0.43, 0.53, 0.63, 0.73]) {
        addPart(new THREE.BoxGeometry(0.36, 0.035, 0.04), '#eee2bd', 0, y, 0.08);
      }
      for (const x of [-0.3, 0.3]) {
        addPart(new THREE.CylinderGeometry(0.045, 0.06, 0.47, 5), bone, x, 0.57, 0);
        addPart(new THREE.CylinderGeometry(0.055, 0.07, 0.4, 5), bone, x * 0.42, 0.19, 0);
      }
      eyes('#ff3838', 0.19);
    } else if (typeId === 3) {
      addPart(new THREE.SphereGeometry(0.31, 10, 8), '#91baff', 0, 0.72, 0, {
        transparent: true, opacity: 0.68, emissive: '#477dff', emissiveIntensity: 0.45
      }).scale.set(0.82, 1.28, 0.72);
      addPart(new THREE.ConeGeometry(0.25, 0.52, 7), '#82a8ec', 0, 0.24, 0, {
        transparent: true, opacity: 0.62, rx: Math.PI
      });
      eyes('#c4ffff', 0.22);
    } else {
      addPart(new THREE.SphereGeometry(0.21, 8, 6), '#3a2831', 0, 0.58, 0);
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(-0.56, 0.26);
      wingShape.lineTo(-0.4, 0.02);
      wingShape.lineTo(-0.54, -0.22);
      wingShape.lineTo(-0.08, -0.16);
      wingShape.closePath();
      const wing = addPart(new THREE.ShapeGeometry(wingShape), '#8d303f', 0, 0.59, 0, {
        side: THREE.DoubleSide
      });
      const rightWing = wing.clone();
      rightWing.scale.x = -1;
      group.add(rightWing);
      eyes('#ff4f43', 0.17);
    }

    if (data.isBoss) group.scale.setScalar(1.3);
    group.userData.entity = entity;
    return group;
  }

  drawEntity(entity) {
    const pos = entity.get(Position);
    if (!pos) return;
    const isPlayer = entity.hasTag('player');
    let mesh = this.entityMeshes.get(entity.id);
    if (!mesh) {
      if (isPlayer) {
        mesh = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.28, 0.45, 3, 8),
          new THREE.MeshStandardMaterial({ color: '#ded8c4', roughness: 0.68 })
        );
        body.position.y = 0.56;
        mesh.add(body);
      } else {
        mesh = this.createEnemyModel(entity);
      }
      mesh.userData.entity = entity;
      this.world.add(mesh);
      this.entityMeshes.set(entity.id, mesh);
    }
    mesh.userData.entity = entity;
    mesh.visible = !isPlayer || !this.firstPerson;

    let renderX = pos.x;
    let renderY = pos.y;
    const vel = entity.get(Velocity);
    if (!this.firstPerson && vel?.moving) {
      renderX = lerp(pos.previousX, pos.x, this.context.alpha);
      renderY = lerp(pos.previousY, pos.y, this.context.alpha);
    }
    const gridWidth = this.engine?.currentScene?.gridMap?.width || 45;
    const gridHeight = this.engine?.currentScene?.gridMap?.height || 33;
    mesh.position.set(renderX - gridWidth / 2, 0, renderY - gridHeight / 2);
    if (!isPlayer) {
      const playerPos = this.engine?.currentScene?.player?.get(Position);
      if (playerPos) {
        mesh.rotation.y = Math.atan2(playerPos.x - pos.x, playerPos.y - pos.y);
      }
    }
  }

  drawDebugGrid() {}

  setFirstPerson(enabled = true) {
    this.firstPerson = enabled;
    if (this.crosshair) this.crosshair.style.display = enabled ? 'block' : 'none';
    if (this.canvas) this.canvas.style.cursor = enabled ? 'crosshair' : 'default';
    if (this.torchLight) this.torchLight.visible = enabled;
    if (!enabled) this.pauseGame(false);
  }

  onMouseClick(event) {
    if (!this.firstPerson || this.paused || !this.canvas || !this.camera) return;
    if (document.pointerLockElement === this.canvas) {
      this.pointer.set(0, 0);
    } else {
      const bounds = this.canvas.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      );
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targetsAndObstacles = this.world.children.filter(object =>
      !object.userData.entity || object.userData.entity.hasTag('enemy')
    );
    const target = this.raycaster.intersectObjects(targetsAndObstacles, true)[0];
    if (target && target.distance <= 7) {
      const getUserData = (object, key) => {
        while (object) {
          if (object.userData?.[key]) return object.userData[key];
          object = object.parent;
        }
        return null;
      };
      const entity = getUserData(target.object, 'entity');
      const feature = getUserData(target.object, 'feature');
      if (entity?.hasTag('enemy')) {
        eventBus.emit('actionAttack', { enemy: entity });
      } else if (feature?.type === 'crate' && feature.state !== 'destroyed') {
        eventBus.emit('actionCrate', { x: feature.x, y: feature.y });
      }
    }
    if (!document.pointerLockElement) {
      const request = this.canvas.requestPointerLock?.();
      request?.catch?.(error => {
        console.warn(`Não foi possível capturar o mouse: ${error.message}`);
      });
    }
  }

  onMouseMove(event) {
    if (!this.firstPerson || this.paused || document.pointerLockElement !== this.canvas) return;
    this.yaw += event.movementX * 0.0025;
    this.pitch = THREE.MathUtils.clamp(this.pitch - event.movementY * 0.0025, -1.35, 1.35);
  }

  onKeyDown(event) {
    if (this.engine?.currentScene?.inventoryUI?.visible) return;
    if (!this.firstPerson || event.code !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this.pauseGame(!this.paused, this.paused);
  }

  onPointerLockChange() {
    if (document.pointerLockElement === this.canvas) {
      this.pointerWasLocked = true;
      return;
    }
    if (!this.firstPerson || this.paused) return;
    if (this.pointerWasLocked) this.pauseGame(true);
  }

  createPausePanel() {
    this.pausePanel = document.createElement('div');
    this.pausePanel.id = 'three-pause-menu';
    this.pausePanel.style.cssText = `
      position: fixed; inset: 0; z-index: 2200; display: none;
      align-items: center; justify-content: center;
      background: rgba(0, 0, 0, .84); color: #eee;
      font: 12px 'Press Start 2P', 'Courier New', monospace;
    `;
    this.pausePanel.innerHTML = `
      <div style="width:min(440px,90vw);padding:28px;background:#111;border:2px solid #6b2020;box-shadow:0 0 30px #000">
        <h2 style="margin:0 0 20px;color:#bd4b4b;font-size:18px">JOGO PAUSADO</h2>
        <p style="font-size:9px;color:#aaa;line-height:1.8">Mouse liberado. Escolha uma opção.</p>
        <div style="display:grid;gap:10px;margin-top:18px">
          <button data-pause-action="resume">CONTINUAR</button>
          <button data-pause-action="controls">CONTROLES</button>
          <button data-pause-action="menu">VOLTAR AO MENU</button>
        </div>
        <div data-pause-controls style="display:none;margin-top:18px;color:#aaa;font-size:9px;line-height:2">
          WASD: mover · Mouse: olhar · Clique: atacar/quebrar caixa · E: interagir · G/Tab: inventário · Esc: pausar
        </div>
        <p data-pause-error style="display:none;color:#f08080;font-size:9px;line-height:1.7"></p>
      </div>
      <style>
        #three-pause-menu button { cursor:pointer;padding:13px;color:#eee;background:#202020;
          border:1px solid #555;font:inherit;font-size:10px }
        #three-pause-menu button:hover { border-color:#a33;background:#321919 }
      </style>
    `;
    this.pausePanel.addEventListener('click', event => {
      const action = event.target.closest('[data-pause-action]')?.dataset.pauseAction;
      if (action === 'resume') this.pauseGame(false, true);
      if (action === 'controls') {
        const controls = this.pausePanel.querySelector('[data-pause-controls]');
        controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
      }
      if (action === 'menu') eventBus.emit('leave3DToMenu');
    });
    document.body.appendChild(this.pausePanel);
  }

  pauseGame(paused, capturePointer = false) {
    if (!this.engine) return;
    this.paused = paused;
    this.engine.paused = paused;
    if (this.pausePanel) this.pausePanel.style.display = paused ? 'flex' : 'none';
    if (paused) {
      this.engine.currentScene?.inventoryUI?.hide();
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
      return;
    }
    if (capturePointer) {
      const request = this.canvas?.requestPointerLock?.();
      request?.catch?.(error => console.warn(`Não foi possível capturar o mouse: ${error.message}`));
    }
  }

  showPauseError(message) {
    const error = this.pausePanel?.querySelector('[data-pause-error]');
    if (!error) return;
    error.textContent = message;
    error.style.display = 'block';
  }

  flush() {
    if (!this.camera || !this.engine?.currentScene?.gridMap) return;
    const player = this.engine.currentScene.getFirstByTag('player');
    const pos = player?.get(Position);
    if (!pos) return;
    const gridMap = this.engine.currentScene.gridMap;
    const targetX = pos.x - gridMap.width / 2;
    const targetZ = pos.y - gridMap.height / 2;
    if (this.firstPerson) {
      this.camera.position.set(targetX, 1.05, targetZ);
      this.camera.lookAt(
        targetX + Math.sin(this.yaw) * 6 * Math.cos(this.pitch),
        1.05 + Math.sin(this.pitch) * 6,
        targetZ + Math.cos(this.yaw) * 6 * Math.cos(this.pitch)
      );
      if (this.torchLight) {
        const time = performance.now() / 1000;
        this.torchLight.position.copy(this.camera.position);
        this.torchLight.intensity = 12 + Math.sin(time * 13) * 0.45 +
          Math.sin(time * 21) * 0.22;
      }
      this.webgl.render(this.scene, this.camera);
      return;
    }
    this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
    this.camera.position.z += (targetZ + 28 - this.camera.position.z) * 0.08;
    this.camera.lookAt(targetX, 0, targetZ);
    this.webgl.render(this.scene, this.camera);
  }

  dispose() {
    this.canvas?.removeEventListener('click', this.clickHandler);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('pointerlockchange', this.pointerLockHandler);
    window.removeEventListener('keydown', this.keyDownHandler, true);
    this.crosshair?.remove();
    this.pausePanel?.remove();
    this.webgl?.dispose();
  }
}
