import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * Enhanced 3D Donation Box — world-class visual quality
 * - PBR materials with emissive glow effects
 * - Particle system for floating medical symbols
 * - Better blood drops with size variation and staggered timing
 * - Improved ambulance with animated siren
 * - Multi-point lighting with color accents
 * - Cursor-tracked rotation with smooth interpolation
 */

/* ─── Blood Drop ─── */
function BloodDrop({ position, delay, size = 0.12 }: { position: [number, number, number]; delay: number; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const startY = 3.5;
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#dc2626"),
        emissive: new THREE.Color("#7f1d1d"),
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.3,
        ior: 1.4,
        transparent: true,
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() + delay) % 5;
    if (t < 3) {
      ref.current.position.y = startY - t * 1.3;
      ref.current.scale.setScalar(0.8 + Math.sin(t * 3) * 0.15);
      mat.opacity = Math.min(1, t * 2);
    } else {
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2 + delay) * 0.03;
      ref.current.scale.setScalar(0.75);
    }
  });
  return (
    <mesh ref={ref} position={position} castShadow material={mat}>
      <sphereGeometry args={[size, 24, 24]} />
    </mesh>
  );
}

/* ─── Floating Glow Particles ─── */
function GlowParticles({ count = 30 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4,
        ),
        speed: 0.2 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
        scale: 0.02 + Math.random() * 0.04,
      })),
    [count],
  );
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      dummy.position.set(
        d.pos.x + Math.sin(t * d.speed + d.offset) * 0.5,
        d.pos.y + Math.cos(t * d.speed * 0.7 + d.offset) * 0.4,
        d.pos.z + Math.sin(t * d.speed * 0.5) * 0.3,
      );
      dummy.scale.setScalar(d.scale * (1 + Math.sin(t * 2 + d.offset) * 0.3));
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#00e676" transparent opacity={0.4} />
    </instancedMesh>
  );
}

/* ─── Medical Box (Enhanced) ─── */
function MedicalBox({ rotation }: { rotation: [number, number] }) {
  const group = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, rotation[0], 0.06);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, rotation[1], 0.06);
    // Pulsing glow on handle
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(clock.getElapsedTime() * 3) * 0.4;
    }
  });

  return (
    <group ref={group}>
      {/* Box body — frosted white medical crate */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 1.6, 1.6]} />
        <meshPhysicalMaterial
          color="#f0f4f8"
          roughness={0.3}
          metalness={0.05}
          clearcoat={0.4}
          clearcoatRoughness={0.2}
          envMapIntensity={1.2}
        />
      </mesh>
      {/* Red cross horizontal */}
      <mesh position={[0, 0, 0.81]}>
        <boxGeometry args={[1.2, 0.28, 0.06]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.7} roughness={0.2} />
      </mesh>
      {/* Red cross vertical */}
      <mesh position={[0, 0, 0.81]}>
        <boxGeometry args={[0.28, 1.2, 0.06]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.7} roughness={0.2} />
      </mesh>
      {/* Back cross */}
      <mesh position={[0, 0, -0.81]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.04]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.81]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.04]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>
      {/* Lid edge with subtle glow */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[2.28, 0.06, 1.68]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.3} metalness={0.4} clearcoat={0.5} />
      </mesh>
      {/* Handle ring with pulsing glow */}
      <mesh ref={glowRef} position={[0, 1.0, 0]}>
        <torusGeometry args={[0.28, 0.05, 16, 48]} />
        <meshStandardMaterial color="#dc2626" emissive="#ff4444" emissiveIntensity={0.8} roughness={0.1} metalness={0.6} />
      </mesh>
      {/* Corner accents */}
      {[
        [1.05, 0.75, 0.75],
        [-1.05, 0.75, 0.75],
        [1.05, -0.75, 0.75],
        [-1.05, -0.75, 0.75],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#b0bec5" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Enhanced Ambulance ─── */
function Ambulance() {
  const ref = useRef<THREE.Group>(null);
  const sirenRef = useRef<THREE.Mesh>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() % 10) - 5;
    ref.current.position.x = t * 1.0;
    ref.current.position.y = -1.5;
    // Animate wheels
    wheelRefs.current.forEach((w) => {
      if (w) w.rotation.x = clock.getElapsedTime() * 8;
    });
    // Flash siren
    if (sirenRef.current) {
      const mat = sirenRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.0 + Math.sin(clock.getElapsedTime() * 12) * 1.0;
      mat.color.setHSL((Math.sin(clock.getElapsedTime() * 6) + 1) / 2 * 0.05, 1, 0.5);
    }
  });

  return (
    <group ref={ref} scale={0.32}>
      {/* Body */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[2.6, 0.85, 1.25]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.3} metalness={0.1} clearcoat={0.6} />
      </mesh>
      {/* Cabin */}
      <mesh castShadow position={[0.95, 0.97, 0]}>
        <boxGeometry args={[0.72, 0.52, 1.12]} />
        <meshPhysicalMaterial color="#e0f2f1" roughness={0.2} metalness={0.05} clearcoat={0.8} />
      </mesh>
      {/* Windshield */}
      <mesh position={[1.32, 0.97, 0]}>
        <boxGeometry args={[0.02, 0.45, 1.0]} />
        <meshPhysicalMaterial color="#80cbc4" roughness={0.1} metalness={0.1} transmission={0.6} ior={1.5} />
      </mesh>
      {/* Red cross on body */}
      <mesh position={[-0.4, 0.4, 0.635]}>
        <boxGeometry args={[0.5, 0.12, 0.02]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.4, 0.4, 0.635]}>
        <boxGeometry args={[0.12, 0.5, 0.02]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
      </mesh>
      {/* Red stripe */}
      <mesh position={[0, 0.15, 0.64]}>
        <boxGeometry args={[2.5, 0.06, 0.01]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>
      {/* Flashing siren */}
      <mesh ref={sirenRef} position={[0.95, 1.28, 0]}>
        <boxGeometry args={[0.35, 0.1, 0.45]} />
        <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={1.5} />
      </mesh>
      {/* Wheels */}
      {(
        [
          [-0.85, 0, 0.65],
          [-0.85, 0, -0.65],
          [0.85, 0, 0.65],
          [0.85, 0, -0.65],
        ] as [number, number, number][]
      ).map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) wheelRefs.current[i] = el; }}
          position={p}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.22, 0.22, 0.16, 20]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Wheel hubs */}
      {(
        [
          [-0.85, 0, 0.74],
          [-0.85, 0, -0.74],
          [0.85, 0, 0.74],
          [0.85, 0, -0.74],
        ] as [number, number, number][]
      ).map((p, i) => (
        <mesh key={`hub-${i}`} position={p} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
          <meshStandardMaterial color="#b0bec5" metalness={0.8} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── DNA Helix ─── */
function DnaHelix() {
  const group = useRef<THREE.Group>(null);
  const points = useMemo(() => {
    const arr: { pos1: THREE.Vector3; pos2: THREE.Vector3 }[] = [];
    for (let i = 0; i < 20; i++) {
      const y = i * 0.25 - 2.5;
      const angle = i * 0.5;
      arr.push({
        pos1: new THREE.Vector3(Math.cos(angle) * 0.3, y, Math.sin(angle) * 0.3),
        pos2: new THREE.Vector3(Math.cos(angle + Math.PI) * 0.3, y, Math.sin(angle + Math.PI) * 0.3),
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <group ref={group} position={[3.5, 0, -1]} scale={0.6}>
      {points.map((p, i) => (
        <group key={i}>
          <mesh position={p.pos1.toArray()}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={p.pos2.toArray()}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
          </mesh>
          {i % 3 === 0 && (
            <mesh position={[0, p.pos1.y, 0]}>
              <boxGeometry args={[0.6, 0.01, 0.01]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* ─── Scene ─── */
function Scene() {
  const [rot, setRot] = useState<[number, number]>([0, 0]);
  const { size } = useThree();

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const x = (e.clientX / size.width) * 2 - 1;
      const y = (e.clientY / size.height) * 2 - 1;
      setRot([x * 0.4, y * 0.25]);
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => window.removeEventListener("pointermove", handler);
  }, [size]);

  const drops = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        pos: [
          (Math.random() - 0.5) * 1.6,
          -0.5 + (i % 4) * 0.12,
          (Math.random() - 0.5) * 1.2,
        ] as [number, number, number],
        delay: i * 0.5,
        size: 0.08 + Math.random() * 0.06,
      })),
    [],
  );

  return (
    <>
      {/* Lighting — 3 point setup */}
      <ambientLight intensity={0.35} color="#e0f7fa" />
      <directionalLight position={[5, 6, 5]} intensity={1.5} castShadow color="#ffffff" shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 3, -3]} color="#dc2626" intensity={0.6} distance={12} />
      <pointLight position={[4, -1, 3]} color="#00e676" intensity={0.4} distance={10} />
      <spotLight position={[0, 8, 0]} angle={0.3} penumbra={0.8} intensity={0.5} color="#e0f7fa" />

      {/* Main medical box with float */}
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
        <MedicalBox rotation={rot} />
      </Float>

      {/* Blood drops */}
      {drops.map((d, i) => (
        <BloodDrop key={i} position={d.pos} delay={d.delay} size={d.size} />
      ))}

      {/* Floating glow particles */}
      <GlowParticles count={25} />

      {/* DNA helix accent */}
      <DnaHelix />

      {/* Ambulance */}
      <Ambulance />

      {/* Ground contact shadows */}
      <ContactShadows position={[0, -1.65, 0]} opacity={0.5} scale={10} blur={2.8} far={4} />
      <Environment preset="city" />
    </>
  );
}

/* ─── Canvas Wrapper ─── */
export function DonationBox3D({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full ${className}`} style={{ height: "420px" }}>
      <Canvas
        camera={{ position: [0, 1.2, 6.5], fov: 42 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      {/* Subtle vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(13,13,13,0.4) 100%)",
        }}
      />
    </div>
  );
}
