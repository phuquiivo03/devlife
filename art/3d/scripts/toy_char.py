# Chibi player character (devlife). build_character(pose='stand'|'sit') -> root Empty 'Character'
import bpy, math
from mathutils import Vector, Euler
def _C(h): return tuple((int(h[i:i+2],16)/255)**2.2 for i in (0,2,4))
_M={}
def M(n,h,r=.5,sss=0,e=0,coat=0):
    if n in _M: return _M[n]
    m=bpy.data.materials.new('CHR_'+n); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*_C(h),1); b.inputs['Roughness'].default_value=r
    if sss: b.inputs['Subsurface Weight'].default_value=sss; b.inputs['Subsurface Radius'].default_value=(1,.35,.2); b.inputs['Subsurface Scale'].default_value=0.03
    if coat: b.inputs['Coat Weight'].default_value=coat; b.inputs['Coat Roughness'].default_value=0.03
    if e: b.inputs['Emission Color'].default_value=(*_C(h),1); b.inputs['Emission Strength'].default_value=e
    _M[n]=m; return m
def build_character(pose='stand', name='Character'):
    _M.clear(); objs=[]
    skin=M('skin','f2c2a0',.75); red=M('tshirt','f6f3ee',.85); navy=M('pants','34364a',.85)
    hair=M('hair','1d1a24',.38,coat=.25); white=M('white','f4f2ee',.6); black=M('strap','1c1a20',.6)
    iris=M('iris','3a1a10',.05,coat=1); pupil=M('pupil','0c0606',.05,coat=1); hl=M('eye_hl','ffffff',.3,e=1)
    cheek=M('cheek','f08a8a',.6,sss=.2); lip=M('mouth','8a3a3a',.5); badge=M('badge','f0b030',.4); zipm=M('zip','b8b8c0',.3)
    shoe_red=M('shoe','e6e2da',.8)
    def add(o,part,mat=None,smooth=True,sub=0):
        o.name=f'Player_{part}'
        if mat: o.data.materials.append(mat)
        if smooth:
            for p in o.data.polygons: p.use_smooth=True
        if sub: m=o.modifiers.new('sub','SUBSURF'); m.levels=sub; m.render_levels=sub
        objs.append(o); return o
    def sph(part,loc,r,mat,sc=(1,1,1),rot=(0,0,0),sub=1,seg=20):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=seg//2,radius=r,location=loc,rotation=rot); o=bpy.context.object; o.scale=sc; return add(o,part,mat,sub=sub)
    def cyl(part,a,b,r,mat,sub=1):
        a,b=Vector(a),Vector(b); d=b-a
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=d.length,location=(a+b)/2); o=bpy.context.object
        o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); add(o,part,mat,sub=0)
        sph(part+'J1',a,r,mat,sub=0,seg=16); sph(part+'J2',b,r,mat,sub=0,seg=16); return o
    def box(part,loc,size,mat,rot=(0,0,0),bev=0.02):
        bpy.ops.mesh.primitive_cube_add(location=loc,rotation=rot); o=bpy.context.object; o.scale=[s/2 for s in size]
        if bev: m=o.modifiers.new('b','BEVEL'); m.width=bev; m.segments=3
        return add(o,part,mat)
    sit = pose=='sit'
    dz = -0.22 if sit else 0.0          # upper body drop when seated (hips at z=0.06 local)
    # ---- legs + shoes
    for s,side in ((-1,'L'),(1,'R')):
        x=0.075*s
        if sit:
            cyl(f'Thigh{side}',(x,0,0.06),(x,-0.24,0.07),0.065,navy)
            cyl(f'Shin{side}',(x,-0.26,0.05),(x,-0.27,-0.2),0.058,navy)
            bpy.ops.mesh.primitive_torus_add(major_radius=0.06,minor_radius=0.018,location=(x,-0.27,-0.2)); add(bpy.context.object,f'Cuff{side}',navy)
            sz=-0.31; sy=-0.3
        else:
            cyl(f'Leg{side}',(x,0,0.27),(x,0,0.13),0.065,navy)
            bpy.ops.mesh.primitive_torus_add(major_radius=0.065,minor_radius=0.02,location=(x,0,0.12)); add(bpy.context.object,f'Cuff{side}',navy)
            sz=0.0; sy=-0.02
        sph(f'Shoe{side}',(x,sy-0.02,sz+0.06),0.07,shoe_red,(0.85,1.35,0.7))
        box(f'Sole{side}',(x,sy-0.02,sz+0.022),(0.12,0.2,0.035),white,bev=0.015)
        sph(f'ShoeToe{side}',(x,sy-0.1,sz+0.05),0.04,white,(1.2,0.9,0.7))
        for k in range(2): box(f'Lace{side}{k}',(x,sy-0.04+k*0.03,sz+0.105),(0.07,0.012,0.01),white,bev=0)
    # ---- torso (hoodie)
    tz=0.42+dz
    sph('Torso',(0,0,tz),0.15,red,(0.92,0.72,1.0))
    sph('Belly',(0,-0.01,tz-0.1),0.14,navy,(1.05,0.8,0.45))   # jeans waist
    bpy.ops.mesh.primitive_torus_add(major_radius=0.07,minor_radius=0.018,location=(0,0,tz+0.135)); add(bpy.context.object,'Collar',red)
    # ---- arms
    for s,side in ((-1,'L'),(1,'R')):
        sh=(0.125*s,0,tz+0.07)
        if sit: el=(0.16*s,-0.05,tz-0.07); hd=(0.09*s,-0.27,0.235)
        else:   el=(0.19*s,0,tz-0.05); hd=(0.19*s,-0.01,tz-0.16)
        mid=tuple(sh[i]*0.45+el[i]*0.55 for i in range(3)); cyl(f'Sleeve{side}',sh,mid,0.047,red); cyl(f'UpperArm{side}',mid,el,0.04,skin); cyl(f'ForeArm{side}',el,hd,0.038,skin)
        hp=(hd[0],hd[1]-0.04,hd[2]) if sit else (hd[0],hd[1],hd[2]-0.045)
        sph(f'Hand{side}',hp,0.044,skin,(1,1.15,0.72))
    # ---- head
    hz=0.76+dz
    sph('Head',(0,0,hz),0.22,skin,(1.05,0.98,0.95),seg=32)
    for s,side in ((-1,'L'),(1,'R')):
        sph(f'Ear{side}',(0.225*s,0.01,hz-0.01),0.045,skin,(0.6,1,1))
        ex=0.085*s
        sph(f'EyeWhite{side}',(ex,-0.166,hz-0.005),0.055,white,(1,0.45,1.05),sub=1)
        sph(f'Iris{side}',(ex,-0.179,hz-0.01),0.047,iris,(1,0.35,1.05),sub=1)
        sph(f'Pupil{side}',(ex,-0.19,hz-0.01),0.024,pupil,(1,0.3,1.05),sub=0)
        sph(f'EyeHL{side}',(ex+0.018,-0.196,hz+0.018),0.013,hl,(1,0.4,1),sub=0)
        sph(f'EyeHL2{side}',(ex-0.015,-0.195,hz-0.025),0.006,hl,sub=0)
        sph(f'Brow{side}',(ex*1.05,-0.19,hz+0.085),0.042,hair,(1.25,0.35,0.33),rot=(0,-0.18*s,0))
        sph(f'Cheek{side}',(0.125*s,-0.148,hz-0.065),0.04,cheek,(1.1,0.35,0.7))
    sph('Nose',(0,-0.198,hz-0.045),0.014,skin,(1.2,0.35,0.8),sub=0)
    sph('Mouth',(0,-0.186,hz-0.088),0.026,lip,(1,0.3,0.42),sub=0)
    # ---- hair: 6 big soft clumps + cap
    hc=Vector((0,0.03,hz+0.06))
    sph('HairCap',(0,0.035,hz+0.075),0.228,hair,(1.07,1.05,0.92),sub=1,seg=32)
    from mathutils import Matrix
    clumps=[(90,15,0.2,0.12),(20,35,0.19,0.11),(160,35,0.19,0.11),(270,55,0.24,0.13),(220,25,0.2,0.11),(320,25,0.2,0.11),(90,70,0.2,0.13)]
    for i,(az,el,Ln,R) in enumerate(clumps):
        a=math.radians(az); e=math.radians(el)
        n=Vector((math.cos(a)*math.cos(e),math.sin(a)*math.cos(e),math.sin(e)))
        p=hc+n*0.19
        sw=Vector((1.0,0.3,-0.5)); t=(sw-n*sw.dot(n)); t.normalize(); y=t.cross(n)
        o=sph(f'Hair{i:02d}',p,R,hair,(0.55,1.0,Ln/R),sub=1,seg=24); o.rotation_euler=Matrix((n,y,t)).transposed().to_euler()
    for i,(x,z,rz) in enumerate([(-0.09,0.17,-0.45),(0.08,0.16,-0.25)]):
        sph(f'Fringe{i}',(x,-0.14,hz+z+0.03),0.1,hair,(1.35,0.5,0.62),rot=(0.6,rz,-0.4),sub=1,seg=24)
    # ---- big chibi head: scale all head parts about neck
    HS=1.32; pv=Vector((0,0,hz-0.2))
    for o in objs:
        if any(o.name.startswith('Player_'+k) for k in ('Head','Ear','Eye','Iris','Pupil','Brow','Cheek','Nose','Mouth','Hair','Fringe')):
            o.location=pv+(o.location-pv)*HS; o.scale=o.scale*HS
    # ---- hierarchy
    root=bpy.data.objects.new(name,None); root.empty_display_type='PLAIN_AXES'; bpy.context.scene.collection.objects.link(root)
    for o in objs: o.parent=root
    root['pose']=pose
    return root, objs
