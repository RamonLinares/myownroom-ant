import * as THREE from 'three';
import type { ItemDef } from '../assets/catalog';

let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<string, string>();

/** Renders a small studio shot of a catalog item and returns a data URL. */
export function thumbnail(def: ItemDef): string {
  const cached = cache.get(def.id);
  if (cached) return cached;

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(112, 112);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
  }

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#dfeaf2', '#a89478', 1.3));
  const key = new THREE.DirectionalLight('#fff2dc', 2.4);
  key.position.set(2, 3, 2.5);
  scene.add(key);

  const group = def.make(def.colors[0]);
  scene.add(group);
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.72 + 0.12;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 30);
  camera.position.set(center.x + radius * 1.15, center.y + radius * 0.85, center.z + radius * 1.35);
  camera.lookAt(center);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  cache.set(def.id, url);

  group.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.geometry.dispose();
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) m.dispose();
    }
  });
  return url;
}
