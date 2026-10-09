'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, Volume2, VolumeX, WandSparkles } from 'lucide-react';
import * as THREE from 'three';
import { useStore } from './store-context';

function makePerson(group: THREE.Group, x: number, z: number, shirt: string, skin: string, scale = 1) {
  const root = new THREE.Group(); root.position.set(x, 0, z); root.scale.setScalar(scale); group.add(root);
  const mat = (color: string, roughness=0.65) => new THREE.MeshStandardMaterial({color,roughness});
  const skinMat = mat(skin), shirtMat = mat(shirt), pantsMat = mat('#18283b');
  const sphere = (r: number, y: number, material: THREE.Material) => { const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),material);m.position.y=y;m.castShadow=true;root.add(m);return m; };
  const capsule = (radius:number,length:number,y:number,material:THREE.Material) => {const m=new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,6,12),material);m.position.y=y;m.castShadow=true;root.add(m);return m;};
  capsule(.18,.48,1.05,shirtMat); sphere(.145,1.53,skinMat);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.15,20,14,0,Math.PI*2,0,Math.PI*.65),mat('#243045')); hair.position.set(0,1.61,-.015);hair.castShadow=true;root.add(hair);
  const arm1=capsule(.055,.34,1.05,shirtMat),arm2=capsule(.055,.34,1.05,shirtMat); arm1.position.x=-.235;arm2.position.x=.235; arm1.rotation.z=-.15;arm2.rotation.z=.15;
  const leg1=capsule(.065,.35,.49,pantsMat),leg2=capsule(.065,.35,.49,pantsMat);leg1.position.x=-.085;leg2.position.x=.085;
  const eyeMat=mat('#112033',.3);[-.052,.052].forEach(ex=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.014,10,8),eyeMat);eye.position.set(ex,1.54,.127);root.add(eye);});
  return {root,arm1,arm2,leg1,leg2};
}
export function VirtualStore(){
  const mount=useRef<HTMLDivElement>(null); const [ready,setReady]=useState(false);const [entered,setEntered]=useState(false);const [muted,setMuted]=useState(true);const {t}=useStore();
  useEffect(()=>{
    const el=mount.current;if(!el)return;let renderer:THREE.WebGLRenderer;let raf=0;let observer:ResizeObserver;let cleanups:(()=>void)[]=[];
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches; const lightMode=window.innerWidth<720 || (navigator.hardwareConcurrency||8)<=4;
    try {
      const scene=new THREE.Scene();scene.background=new THREE.Color('#e8f1f7');scene.fog=new THREE.Fog('#e8f1f7',13,34);
      const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,3.75,13.5);camera.lookAt(0,1.5,0);
      renderer=new THREE.WebGLRenderer({antialias:!lightMode,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,lightMode?1.25:1.8));renderer.shadowMap.enabled=!lightMode;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;el.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive real-time 3D model of the Skyupinfra virtual shop entrance');
      scene.add(new THREE.HemisphereLight('#f1f8ff','#758eaa',2)); const key=new THREE.DirectionalLight('#fff1d9',3.3);key.position.set(-4,9,7);key.castShadow=!lightMode;scene.add(key);
      const floorMat=new THREE.MeshStandardMaterial({color:'#cedde8',roughness:.8});const floor=new THREE.Mesh(new THREE.CircleGeometry(10,64),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.07;floor.receiveShadow=true;scene.add(floor);
      const platformMat=new THREE.MeshStandardMaterial({color:'#d5e7ed',metalness:.24,roughness:.46});const platform=new THREE.Mesh(new THREE.CylinderGeometry(4.25,4.45,.22,64),platformMat);platform.position.y=.03;platform.receiveShadow=true;platform.castShadow=true;scene.add(platform);
      const shop=new THREE.Group();scene.add(shop);const mat=(c:string,m=0,r=.4)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r});
      const addBox=(w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material,bevel=false)=>{const geo=bevel?new THREE.BoxGeometry(w,h,d,2,2,2):new THREE.BoxGeometry(w,h,d);const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;shop.add(mesh);return mesh;};
      const frame=mat('#122f4c',.6,.3),white=mat('#f3f8fb',.1,.42),glass= new THREE.MeshPhysicalMaterial({color:'#88d6e5',metalness:.15,roughness:.12,transparent:true,opacity:.57,transmission:.18}),lime=mat('#b6e86c',.1,.28),purple=mat('#a7a3f4',.12,.32);
      addBox(5.4,3.15,.25,0,1.65,-.95,white);addBox(5.65,.23,.6,0,3.35,-.83,frame);addBox(.25,3.1,.55,-2.6,1.63,-.7,frame);addBox(.25,3.1,.55,2.6,1.63,-.7,frame);
      addBox(1.55,2.62,.06,-1.38,1.4,-.79,glass);addBox(1.55,2.62,.06,1.38,1.4,-.79,glass);addBox(.04,2.55,.1,0,1.38,-.72,lime);addBox(1.2,.075,.13,0,2.6,-.65,purple);
      // Floating brand plate and its metallic trim.
      addBox(3.2,.58,.19,0,3.9,-.65,frame,true);addBox(2.95,.37,.08,0,3.9,-.53,lime,true);
      const letters=new THREE.Group();shop.add(letters);const mark=new THREE.Mesh(new THREE.TorusGeometry(.12,.035,8,24),frame);mark.position.set(-1.1,3.9,-.46);letters.add(mark);
      // An illustrative S made of rounded linework keeps the store name legible without a texture dependency.
      const sCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.03,.1,0),new THREE.Vector3(.10,.14,0),new THREE.Vector3(.14,.04,0),new THREE.Vector3(.02,0,0),new THREE.Vector3(-.07,-.05,0),new THREE.Vector3(.06,-.12,0)]);const sMesh=new THREE.Mesh(new THREE.TubeGeometry(sCurve,.12,.027,8,false),frame);sMesh.position.set(-1.1,3.9,-.43);letters.add(sMesh);
      const decorative=new THREE.Group();scene.add(decorative);const orbMat=mat('#9ad4e4',.25,.2),orbMat2=mat('#c8ec8a',.15,.25);for(let i=0;i<7;i++){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.12+(i%3)*.065,1),i%2?orbMat:orbMat2);mesh.position.set(-3.5+i*1.08,2.2+Math.sin(i*1.8)*1.65,-.15-(i%2)*.9);mesh.castShadow=true;decorative.add(mesh);} 
      const visitor=makePerson(scene as unknown as THREE.Group,-3.15,1.05,'#a49df2','#bd815d',.98);visitor.root.rotation.y=.28;const keeper=makePerson(scene as unknown as THREE.Group,3.03,.15,'#b4e96e','#8f573b',1.05);keeper.root.rotation.y=-.18;
      // Product plinths at each side create depth while leaving the doorway clear.
      const plinthMat=mat('#f8fbfc',.12,.3);for(const [x,c] of [[-3.7,'#c8edf4'],[3.7,'#e7defe']] as const){const ped=new THREE.Mesh(new THREE.CylinderGeometry(.58,.64,.52,32),plinthMat);ped.position.set(x,.36,-.45);ped.castShadow=true;scene.add(ped);const pmat=mat(c,.18,.3);const orb=new THREE.Mesh(new THREE.SphereGeometry(.34,28,20),pmat);orb.position.set(x,.98,-.45);orb.castShadow=true;scene.add(orb);}
      const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};observer=new ResizeObserver(resize);observer.observe(el);resize();setReady(true);
      const clock=new THREE.Clock();const animate=()=>{raf=requestAnimationFrame(animate);const t=clock.getElapsedTime();if(!reduced){decorative.children.forEach((o,i)=>{o.position.y=2.2+Math.sin(i*1.8+t*.5)*1.65;o.rotation.y=t*.25+i;});visitor.root.position.x=-3.15+(entered?Math.min(2.4,t*.16):Math.sin(t*.4)*.05);visitor.arm1.rotation.z=Math.sin(t*1.2)*.08-.15;visitor.arm2.rotation.z=-Math.sin(t*1.2)*.08+.15;keeper.arm2.rotation.z=-.16+Math.sin(t*1.35)*.12;keeper.root.position.y=Math.sin(t*.9)*.025;platform.rotation.y=Math.sin(t*.12)*.025;}renderer.render(scene,camera);};animate();cleanups.push(()=>{cancelAnimationFrame(raf);observer?.disconnect();scene.traverse(obj=>{const mesh=obj as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();if(mesh.material){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();});
    }catch(e){console.error('3D scene unavailable; storefront remains usable.',e);setReady(false);}
    return()=>cleanups.forEach(fn=>fn());
  },[entered]);
  return <section className="virtual-scene" aria-label="Skyupinfra virtual shop entrance"><div className="scene-topline"><span className="scene-eyebrow"><i/> YOUR NEXT DISCOVERY IS HERE</span><span className="scene-dimensions">WORLD 001 <b>·</b> ONLINE</span></div><div className="scene-stage"><div className="scene-sky-glow"/><div className="scene-webgl" ref={mount}/><div className="scene-overlay scene-overlay-left"><span className="orbit-number">01 <i>—</i> INFINITE FINDS</span><h2>Open a door<br/>to <em>what’s next.</em></h2><p>Useful things. Unexpected things.<br/>Your kind of things.</p><button className="button button-dark" onClick={()=>{setEntered(true);document.getElementById('discover')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}>{t('enter')} <ArrowRight size={17}/></button><Link className="scene-skip" href="#discover">{t('skip')} <ArrowDownRight size={13}/></Link></div><div className="scene-overlay scene-overlay-right"><div className="keeper-caption"><span className="keeper-status"><i/> SHOPKEEPER ONLINE</span><strong>Hey, explorer.</strong><p>{t('welcome')}</p><span className="speech-mark">“</span></div><button className="scene-sound" onClick={()=>setMuted(!muted)} aria-label={muted?'Enable ambience (not yet configured)':'Disable ambience'} title="Ambient sound is optional and not enabled by default">{muted?<VolumeX size={15}/>:<Volume2 size={15}/>} <span>{muted?'SOUND OFF':'SOUND ON'}</span></button></div><div className="scene-caption"><span>REAL-TIME 3D EXPERIENCE</span><span>NO HEADSET REQUIRED</span></div></div><div className="scene-bottomline"><span>NOTHING IS ORDINARY UNTIL YOU LOOK CLOSER.</span><span>SCROLL TO EXPLORE <ArrowDownRight size={13}/></span></div><noscript><p>3D effects need JavaScript. You can always shop using the catalogue below.</p></noscript></section>;
}
