# devlife chibi v5: ~2.2 heads tall, matte clay, tufted hair. build_character(pose) -> (root, objs). Faces -Y (local).
import bpy, math, random
from mathutils import Vector, Matrix
def _C(h): return tuple((int(h[i:i+2],16)/255)**2.2 for i in (0,2,4))
_M={}
def M(n,h,r=.85,spec=0.25,e=0):
    if n in _M: return _M[n]
    m=bpy.data.materials.new('CH5_'+n); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*_C(h),1); b.inputs['Roughness'].default_value=r
    b.inputs['Specular IOR Level'].default_value=spec
    if e: b.inputs['Emission Color'].default_value=(1,1,1,1); b.inputs['Emission Strength'].default_value=e
    _M[n]=m; return m
def build_character(pose='stand', name='Character', seed=7):
    _M.clear(); objs=[]; rnd=random.Random(seed)
    skin=M('skin','f6cfb2',.8); shirt=M('tshirt','f7f4ee',.9); navy=M('pants','2c3150',.9)
    hair=M('hair','3d3b44',.88,spec=0.0); white=M('shoe','f2efe9',.85)
    eye=M('eye','3b2016',.45,spec=.3); hl=M('eye_hl','ffffff',.5,e=0.6); brow=M('brow','3a2f2c',.9,spec=0)
    cheek=M('cheek','f4a3a0',.9,spec=0); mouth=M('mouth','b8625c',.85,spec=0)
    def add(o,part,mat,smooth=True):
        o.name=f'Player_{part}'; o.data.materials.append(mat)
        if smooth:
            for p in o.data.polygons: p.use_smooth=True
        objs.append(o); return o
    def sph(part,loc,r,mat,sc=(1,1,1),rot=(0,0,0),seg=20):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=max(6,seg//2),radius=r,location=loc,rotation=rot); o=bpy.context.object; o.scale=sc; return add(o,part,mat)
    def cyl(part,a,b,r,mat,r2=None,seg=16):
        a,b=Vector(a),Vector(b); d=b-a
        bpy.ops.mesh.primitive_cone_add(vertices=seg,radius1=r,radius2=r2 or r,depth=d.length,location=(a+b)/2); o=bpy.context.object
        o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); add(o,part,mat)
        sph(part+'J1',a,r,mat,seg=14); sph(part+'J2',b,r2 or r,mat,seg=14); return o
    sit=pose=='sit'
    dz=-0.18 if sit else 0.0; fy=-0.04 if sit else 0.0     # seated: drop + slight forward lean of upper body
    # ---------------- legs (25% of height) + shoes
    for s,side in ((-1,'L'),(1,'R')):
        x=0.068*s
        if sit:
            cyl(f'Thigh{side}',(x,-0.01,0.065),(x,-0.15,0.06),0.07,navy,0.066)
            cyl(f'Shin{side}',(x,-0.16,0.05),(x,-0.19,-0.09),0.062,navy,0.058)
            fz=-0.15; fy0=-0.2
        else:
            cyl(f'Leg{side}',(x,0,0.21),(x,0,0.085),0.072,navy,0.064)
            fz=0.0; fy0=-0.01
        sph(f'Shoe{side}',(x,fy0-0.02,fz+0.04),0.06,white,(0.95,1.3,0.68))
        sph(f'Sole{side}',(x,fy0-0.02,fz+0.018),0.062,white,(1.0,1.35,0.3))
    # ---------------- chubby short torso
    tz=0.36+dz
    sph('Torso',(0,fy,tz+0.02),0.155,shirt,(1.0,0.86,0.95),seg=24)
    sph('Hips',(0,fy*0.5,tz-0.1),0.15,navy,(1.0,0.86,0.52),seg=24)
    # ---------------- arms (short, chubby) with t-shirt sleeves
    for s,side in ((-1,'L'),(1,'R')):
        sh=Vector((0.14*s,fy,tz+0.08))
        if sit: el=Vector((0.15*s,fy-0.12,tz-0.04)); hd=Vector((0.085*s,-0.27,0.235))
        else:   el=Vector((0.185*s,0,tz-0.02)); hd=Vector((0.2*s,-0.005,tz-0.13))
        sph(f'Sleeve{side}',sh*0.75+el*0.25,0.062,shirt,(1,1,1.05),seg=18)
        cyl(f'Arm{side}',sh*0.55+el*0.45,el,0.04,skin); cyl(f'ForeArm{side}',el,hd,0.04,skin,0.038)
        sph(f'Hand{side}',hd+Vector((0,-0.02,0)) if sit else hd+Vector((0,0,-0.025)),0.046,skin,(1,1.1,0.85),seg=16)
    # ---------------- head (45% of height)
    hz=0.69+dz; HC=Vector((0,fy,hz)); HR=Vector((0.205,0.19,0.185))
    sph('Head',HC,1.0,skin,tuple(HR),seg=32)
    sph('Neck',(0,fy,hz-0.17),0.05,skin)
    def surf(az,el):   # point/normal on head ellipsoid, az=0 is face front (-Y), +az to character's left(+x)
        a,e=math.radians(az),math.radians(el)
        d=Vector((math.sin(a)*math.cos(e),-math.cos(a)*math.cos(e),math.sin(e)))
        p=HC+Vector((d.x*HR.x,d.y*HR.y,d.z*HR.z)); n=Vector((d.x/HR.x,d.y/HR.y,d.z/HR.z)).normalized(); return p,n
    def decal(part,az,el,w,h,mat,t=0.008,roll=0,lift=0.0,seg=20):
        p,n=surf(az,el)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=seg//2,radius=1,location=(0,0,0)); o=bpy.context.object
        o.scale=(w,t,h); q=n.to_track_quat('-Y','Z')
        o.rotation_euler=(q.to_matrix().to_4x4()@Matrix.Rotation(roll,4,'Y')).to_euler(); o.location=p+n*(lift-t*0.35)
        return add(o,part,mat)
    for s,side in ((-1,'L'),(1,'R')):
        sph(f'Ear{side}',(0.2*s,fy+0.01,hz-0.02),0.045,skin,(0.55,0.85,1))
        decal(f'Eye{side}',24*s,-4,0.036,0.048,eye,t=0.012)
        decal(f'EyeHL{side}',24*s-5,3,0.012,0.014,hl,t=0.01,lift=0.006,seg=12)
        decal(f'EyeHL2{side}',24*s+5,-10,0.006,0.006,hl,t=0.008,lift=0.006,seg=10)
        decal(f'Brow{side}',25*s,17,0.034,0.009,brow,t=0.008,roll=0.18*s,seg=14)
        decal(f'Cheek{side}',37*s,-20,0.035,0.022,cheek,t=0.008,seg=16)
    # smile: half torus laid on the face
    bpy.ops.mesh.primitive_torus_add(major_radius=0.026,minor_radius=0.0055,major_segments=24,minor_segments=6,location=(0,0,0))
    sm=bpy.context.object; me=sm.data
    import bmesh; bm=bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.y>-0.008],context='VERTS'); bm.to_mesh(me); bm.free()
    p,n=surf(0,-26); q=n.to_track_quat('-Y','Z')
    sm.rotation_euler=(q.to_matrix().to_4x4()@Matrix.Rotation(math.pi/2,4,'X')).to_euler(); sm.location=p-n*0.001; sm.scale=(1,1,0.9)
    add(sm,'Mouth',mouth)
    # ---------------- hair: cap + many gently pointed tufts flaring out
    HCap=HC+Vector((0,0.012,0.03)); CR=Vector((0.218,0.212,0.2))
    sph('HairCap',HCap,1.0,hair,tuple(CR),seg=28)
    # trim cap front-bottom so the face is free
    cap=objs[-1]; bm=bmesh.new(); bm.from_mesh(cap.data)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if (v.co.y<-0.25 and v.co.z<0.55) or v.co.z<-0.35 or (v.co.y<-0.6 and v.co.z<0.75)],context='VERTS'); bm.to_mesh(cap.data); bm.free()
    def tuft(i,az,el,L,R,droop):
        a,e=math.radians(az),math.radians(el)
        d=Vector((math.sin(a)*math.cos(e),-math.cos(a)*math.cos(e),math.sin(e)))
        base=HCap+Vector((d.x*CR.x,d.y*CR.y,d.z*CR.z))*0.72
        dirv=(d+Vector((0,0,-droop))+Vector((rnd.uniform(-.08,.08),rnd.uniform(-.08,.08),rnd.uniform(-.05,.05)))).normalized()
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=7,radius=1,location=(0,0,0)); o=bpy.context.object
        for v in o.data.vertices:
            t=(v.co.z+1)/2                      # 0 base .. 1 tip
            f=(max(0,1-t))**0.55*min(1,(t+0.15)*2.2)
            v.co.x*=f*R; v.co.y*=f*R*0.75; v.co.z=t*L
        o.rotation_euler=(dirv.to_track_quat('Z','Y').to_matrix().to_4x4()@Matrix.Rotation(rnd.uniform(0,3.14),4,'Z')).to_euler()
        o.location=base
        return add(o,f'Hair{i:02d}',hair)
    k=0
    rings=[(84,3,0.10,0.09,0.0),(64,7,0.12,0.095,0.2),(42,10,0.13,0.095,0.45),(20,12,0.125,0.09,0.8),(-2,10,0.11,0.085,1.1),(-22,7,0.1,0.085,1.2)]
    for el,n,L,R,dr in rings:
        for j in range(n):
            az=360*j/n+rnd.uniform(-8,8)+(17 if n%2 else 0)
            fa=abs(((az+180)%360)-180)
            if el<35 and fa<48: continue          # keep face clear
            if -10<el<0 and fa<75: continue
            if el<-10 and fa<115: continue        # nape only at the back
            tuft(k,az,el+rnd.uniform(-5,5),L*rnd.uniform(.85,1.15),R*rnd.uniform(.9,1.1),dr); k+=1
    # fringe: soft pointed bangs over forehead
    for j,az in enumerate((-44,-26,-9,8,25,43)):
        tuft(k,az,36+rnd.uniform(-3,3),0.12*rnd.uniform(.9,1.1),0.075,1.3); k+=1
    root=bpy.data.objects.new(name,None); bpy.context.scene.collection.objects.link(root)
    for o in objs: o.parent=root
    root['pose']=pose
    return root, objs
