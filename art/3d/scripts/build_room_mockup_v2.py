# devlife cozy clay-toy room, matched to room_3d_mockup.jpg
# usage: blender -b -P build_room_mockup.py -- [char|empty] [samples]
import bpy, math, sys, os
from mathutils import Vector, Matrix
sys.path.insert(0,os.path.dirname(__file__)); import importlib, toy_char; importlib.reload(toy_char)
D='/workspace/devlife-3d/'; T=D+'scripts/'
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
MODE=argv[0] if argv else 'char'; SAMP=int(argv[1]) if len(argv)>1 else 64
bpy.ops.wm.read_factory_settings(use_empty=True); S=bpy.context.scene
C=lambda h:tuple(((int(h[i:i+2],16)/255)**2.2) for i in (0,2,4))
mats={}
def mat(n,h,r=.85,e=0,img=None,es=1.0):
    if n in mats: return mats[n]
    M=bpy.data.materials.new(n); M.use_nodes=True; nt=M.node_tree; b=nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*C(h),1); b.inputs['Roughness'].default_value=r
    b.inputs['Specular IOR Level'].default_value=0.25
    if img:
        t=nt.nodes.new('ShaderNodeTexImage'); t.image=bpy.data.images.load(T+img); t.image.pack()
        nt.links.new(t.outputs[0],b.inputs['Base Color'])
        if e: nt.links.new(t.outputs[0],b.inputs['Emission Color'])
    elif e: b.inputs['Emission Color'].default_value=(*C(h),1)
    if e: b.inputs['Emission Strength'].default_value=e
    mats[n]=M; return M
def fin(o,M,smooth=True):
    o.data.materials.append(M)
    if smooth:
        for p in o.data.polygons: p.use_smooth=True
    return o
def box(loc,size,M,bev=0.04,seg=4,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(location=loc,rotation=rot); o=bpy.context.object
    o.scale=[s/2 for s in size]; bpy.ops.object.transform_apply(scale=True)
    if bev: b=o.modifiers.new('b','BEVEL'); b.width=min(bev,min(size)/2-1e-3); b.segments=seg; b.harden_normals=False
    return fin(o,M,bool(bev))
def cyl(loc,r,d,M,v=32,rot=(0,0,0),bev=0.02,r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=loc,rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=v,radius1=r,radius2=r2,depth=d,location=loc,rotation=rot)
    o=bpy.context.object
    if bev: b=o.modifiers.new('b','BEVEL'); b.width=bev; b.segments=3; b.limit_method='ANGLE'
    fin(o,M); return o
def sph(loc,r,M,sc=(1,1,1),rot=(0,0,0),seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=seg//2,radius=r,location=loc,rotation=rot); o=bpy.context.object; o.scale=sc; return fin(o,M)
def tor(loc,R,r,M,rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R,minor_radius=r,location=loc,rotation=rot,major_segments=40,minor_segments=12); return fin(bpy.context.object,M)
def tube(a,b,r,M):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=d.length,location=(a+b)/2); o=bpy.context.object
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return fin(o,M)
def plane(loc,sx,sy,M,rot):
    bpy.ops.mesh.primitive_plane_add(size=1,location=loc,rotation=rot); o=bpy.context.object; o.scale=(sx,sy,1); return fin(o,M,False)
# ---------- item grouping
ITEMS=[]
class item:
    def __init__(s,name): s.name=name
    def __enter__(s): s.before=set(bpy.data.objects); return s
    def __exit__(s,*a):
        new=[o for o in bpy.data.objects if o not in s.before and o.parent is None]
        col=bpy.data.collections.new(s.name); S.collection.children.link(col)
        bpy.context.view_layer.update()
        pts=[o.matrix_world@Vector(c) for o in bpy.data.objects if o not in s.before and o.type=='MESH' for c in o.bound_box]
        mn=Vector([min(p[i] for p in pts) for i in range(3)]); mx=Vector([max(p[i] for p in pts) for i in range(3)])
        e=bpy.data.objects.new(s.name,None); e.location=((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z); col.objects.link(e)
        bpy.context.view_layer.update()
        allo=[]
        def walk(o): allo.append(o); [walk(c) for c in o.children]
        for o in new: walk(o)
        for i,o in enumerate(new):
            mw=o.matrix_world.copy(); o.parent=e; o.matrix_world=mw
        for i,o in enumerate(allo):
            if not o.name.startswith('Player_'): o.name=f'{s.name}_{i:02d}'
            for c in list(o.users_collection): c.objects.unlink(o)
            col.objects.link(o)
        ITEMS.append(s.name)
# ---------- palette
floorM=mat('Floor','9c8798'); slabM=mat('Slab','86728a'); mint=mat('Mint','94c8a0'); mintD=mat('MintGrout','93b89b')
creamW=mat('CreamWall','f2dcb0'); wood=mat('Wood','c98f5c',.7); woodL=mat('WoodLight','e9d3ae'); creamP=mat('Cream','ecdcbc')
grey=mat('Grey','6f7078',.6); darkG=mat('DarkGrey','4a4a55',.6); white=mat('White','f6f4ef',.7); blueS=mat('BluePlastic','4a6cc0',.45)
leaf=mat('Leaf','6fa266'); leafD=mat('LeafDark','4f8a50'); potM=mat('Pot','efe4d0'); soil=mat('Soil','6a4a3a')
pillow=mat('Pillow','a9bde6'); sheet=mat('Sheet','c4ccec'); blanket=mat('Blanket','8fb486'); catM=mat('Cat','f0dcb8'); catD=mat('CatDark','5a4848')
bGreen=mat('BookGreen','93b98a'); bOrange=mat('BookOrange','e9a07a'); bBlue=mat('BookBlue','6f8fd0'); paper=mat('Paper','f8f2e4')
bulb=mat('Bulb','ffcf7a',e=30); wire=mat('Wire','6a6060',.6); mug=mat('Mug','55555e',.6)
# ---------- room
CHX,CHY=-1.12,0.6; ANG=-48; PS=1.4
W=4.0; H=2.55; TH=1.15; WT=0.22
with item('Base'):
    box((0.05,-0.05,-0.16),(W+0.45,W+0.45,0.32),slabM,bev=0.16,seg=6)
    box((0.05,-0.05,0.0),(W+0.3,W+0.3,0.04),floorM,bev=0.02)
with item('Walls'):
    x0=-W/2-WT/2
    box((x0,0.1,TH/2),(WT,W+WT+0.0,TH),mintD,bev=0.03)          # left wall lower core
    box((x0,0.1,(TH+H)/2),(WT,W+WT,H-TH),creamW,bev=0.0)
    box((0.1-WT/2,W/2+WT/2,TH/2),(W+WT,WT,TH),mintD,bev=0.03)
    box((0.1-WT/2,W/2+WT/2,(TH+H)/2),(W+WT,WT,H-TH),creamW,bev=0.0)
    box((x0,0.1,H),(WT+0.06,W+WT+0.06,0.14),creamW,bev=0.07,seg=6)  # rounded tops
    box((0.1-WT/2,W/2+WT/2,H),(W+WT+0.06,WT+0.06,0.14),creamW,bev=0.07,seg=6)
    ts=0.36; n=int(TH/ts)
with item('WallTiles'):
    rows=3; th=TH/rows
    for r in range(rows):
        zc=th*(r+.5)
        for k in range(12):
            y=-W/2-0.15+ts*(k+.5)+0.02
            if y>W/2: break
            box((-W/2+0.01,y,zc),(0.03,ts-0.025,th-0.025),mint,bev=0.012,seg=2)
        for k in range(12):
            x=-W/2+ts*(k+.5)
            if x>W/2+0.3: break
            box((x,W/2-0.01,zc),(ts-0.025,0.03,th-0.025),mint,bev=0.012,seg=2)
# ---------- left wall: poster
with item('Poster'):
    plane((-W/2+0.025,-1.35,1.62),-0.42,0.56,mat('PosterTex','ffffff',img='tex_poster.png'),(math.pi/2,0,-math.pi/2))
    box((-W/2+0.015,-1.35,1.62),(0.012,0.46,0.6),paper,bev=0.005)
    sph((-W/2+0.04,-1.35,1.88),0.025,mat('Pin','c98a5a'))
# ---------- window right wall
with item('Window'):
    wx,wz=-0.35,1.62
    box((wx,W/2+0.08,wz),(1.32,0.4,1.08),creamP,bev=0.19,seg=8)
    for dz in (-1,1): box((wx,W/2-0.15,wz+dz*0.37),(1.02,0.08,0.09),creamP,bev=0.04,seg=5)
    for dx in (-1,1): box((wx+dx*0.48,W/2-0.15,wz),(0.09,0.08,0.82),creamP,bev=0.04,seg=5)
    for dx in (-1,1):
        for dz in (-1,1): sph((wx+dx*0.42,W/2-0.135,wz+dz*0.31),0.075,creamP,sc=(1,0.45,1))
    plane((wx,W/2-0.125,wz),0.92,0.7,mat('SkyTex','ffffff',img='tex_sky.png',e=2.6),(math.pi/2,0,math.pi))
    box((wx,W/2-0.2,wz-0.5),(1.4,0.22,0.09),creamP,bev=0.03)
# ---------- fairy lights
def catenary(p0,p1,sag,n):
    return [p0.lerp(p1,t)+Vector((0,0,-sag*4*t*(1-t))) for t in [i/n for i in range(n+1)]]
with item('FairyLights'):
    segsL=[(Vector((-W/2+0.05,-1.7,2.12)),Vector((-W/2+0.05,0.1,2.12))),(Vector((-W/2+0.05,0.1,2.12)),Vector((-W/2+0.05,W/2-0.05,2.2)))]
    segsR=[(Vector((-W/2+0.05,W/2-0.05,2.2)),Vector((0.9,W/2-0.05,2.12))),(Vector((0.9,W/2-0.05,2.12)),Vector((W/2+0.25,W/2-0.05,2.1)))]
    for a,b in segsL+segsR:
        pts=catenary(a,b,0.2,24)
        for i in range(len(pts)-1): tube(pts[i],pts[i+1],0.006,wire)
        for i in range(1,len(pts)-1,3):
            p=pts[i]; tube(p,p+Vector((0,0,-0.03)),0.012,wire); sph(p+Vector((0,0,-0.06)),0.028,bulb,seg=12)
# ---------- desk
DX0=-W/2; DXW=0.72; DY0,DY1=-0.85,0.8; DH=0.74
dcx=DX0+DXW/2+0.02; dcy=(DY0+DY1)/2
with item('Desk'):
    box((dcx,dcy,DH-0.05),(DXW,DY1-DY0,0.1),wood,bev=0.045)
    for sx in (-1,1):
        for sy in (-1,1): cyl((dcx+sx*(DXW/2-0.07),dcy+sy*((DY1-DY0)/2-0.07),(DH-0.08)/2),0.055,DH-0.08,wood,bev=0.0)
    box((dcx-0.05,dcy-0.35,0.17),(0.42,0.4,0.34),mat('BoxCream','e4cfaa'),bev=0.05)
with item('Monitor'):
    mx,my=-W/2+0.2,0.12; MA=math.radians(-12)
    box((mx,my,DH+0.37),(0.06,0.62,0.42),creamP,bev=0.03,rot=(0,0,MA))
    plane((mx+0.032*math.cos(MA),my+0.032*math.sin(MA),DH+0.38),0.54,0.34,mat('ScreenTex','ffffff',img='tex_screen.png',e=2.5),(math.pi/2,0,math.pi/2+MA))
    box((mx-0.01,my,DH+0.1),(0.05,0.06,0.18),creamP,bev=0.02,rot=(0,0,MA)); box((mx+0.02,my,DH+0.015),(0.22,0.26,0.03),creamP,bev=0.012,rot=(0,0,MA))
with item('Keyboard'):
    fa=math.radians(ANG); kx=CHX+0.04+math.sin(fa)*0.31*PS; ky=CHY-math.cos(fa)*0.31*PS
    box((kx,ky,DH+0.02),(0.16,0.44,0.03),darkG,bev=0.012,rot=(0,0,fa+math.pi/2))
    box((kx,ky,DH+0.035),(0.13,0.4,0.01),grey,bev=0.004,rot=(0,0,fa+math.pi/2))
with item('DeskLamp'):
    lx,ly=-W/2+0.13,-0.3
    cyl((lx,ly,DH+0.02),0.085,0.04,grey,bev=0.015)
    tube((lx,ly,DH+0.03),(lx+0.05,ly+0.06,DH+0.38),0.014,grey); tube((lx+0.05,ly+0.06,DH+0.38),(lx+0.2,ly+0.15,DH+0.42),0.014,grey)
    sph((lx+0.05,ly+0.06,DH+0.38),0.022,grey)
    o=cyl((lx+0.24,ly+0.18,DH+0.38),0.1,0.13,grey,r2=0.04,rot=(math.radians(-50),math.radians(35),0),bev=0.0)
    o.modifiers.new('s','SOLIDIFY').thickness=0.01
    sph((lx+0.25,ly+0.19,DH+0.35),0.035,mat('LampBulb','ffe7b0',e=10))
    L=bpy.data.lights.new('LampGlow','POINT'); L.energy=8; L.color=(1,.8,.55); L.shadow_soft_size=0.1
    lo=bpy.data.objects.new('LampGlow',L); lo.location=(lx+0.26,ly+0.2,DH+0.28); S.collection.objects.link(lo)
    L=bpy.data.lights.new('LampPool','SPOT'); L.energy=140; L.color=(1,.72,.3); L.spot_size=math.radians(75); L.spot_blend=0.7; L.shadow_soft_size=0.05
    lo=bpy.data.objects.new('LampPool',L); lo.location=(lx+0.27,ly+0.21,DH+0.27); lo.rotation_euler=(math.radians(-10),math.radians(20),0); S.collection.objects.link(lo)
with item('Mug'):
    cyl((-W/2+0.52,-0.35,DH+0.06),0.05,0.11,mug,bev=0.01); tor((-W/2+0.52,-0.405,DH+0.065),0.03,0.01,mug,rot=(0,math.pi/2,0))
def plant(x,y,z,s,potr,poth,name):
    cyl((x,y,z+poth/2),potr,poth,potM,r2=potr*0.82,rot=(math.pi,0,0),bev=0.02)
    cyl((x,y,z+poth-0.01),potr*0.88,0.02,soil,bev=0)
    import random; R=random.Random(name)
    for i in range(9):
        a=i*2.4+R.random()*0.3; el=math.radians(30+R.random()*35); L=s*(0.75+R.random()*0.35)
        d=Vector((math.cos(a)*math.cos(el),math.sin(a)*math.cos(el),math.sin(el)))
        c=Vector((x,y,z+poth))+d*L*0.55
        o=sph(c,L*0.5,leaf if i%2 else leafD,sc=(1,0.42,0.12),seg=16)
        o.rotation_euler=d.to_track_quat('X','Z').to_euler()
with item('DeskPlant'): plant(-W/2+0.2,-0.68,DH,0.17,0.08,0.13,'dp')
with item('BigPlant'): plant(-W/2+0.32,-W/2+0.25,0.02,0.5,0.2,0.36,'bp')
with item('Books'):
    bx,by=-W/2+0.95,-W/2+0.35
    for i,(M,h,rz) in enumerate(((bBlue,0.08,0.1),(bOrange,0.075,-0.05),(bGreen,0.08,0.12))):
        z=0.02+sum((0.08,0.075,0.08)[:i])+h/2
        box((bx,by,z),(0.42,0.3,h),M,bev=0.02,rot=(0,0,rz))
        box((bx+0.012,by+0.0,z),(0.40,0.27,h*0.7),paper,bev=0.008,rot=(0,0,rz))
# ---------- bed
BX0,BX1=-1.25,0.62; BY0=W/2-1.05; BY1=W/2-0.02
bcx=(BX0+BX1)/2; bcy=(BY0+BY1)/2; BL=BX1-BX0; BW=BY1-BY0
with item('Bed'):
    box((bcx,bcy,0.15),(BL,BW,0.26),woodL,bev=0.08,seg=5)
    box((BX0+0.06,bcy,0.42),(0.12,BW,0.6),woodL,bev=0.06,seg=5)
    box((bcx+0.05,bcy,0.33),(BL-0.18,BW-0.08,0.16),sheet,bev=0.07,seg=5)
    box((BX0+0.33,bcy+0.02,0.47),(0.34,0.62,0.14),pillow,bev=0.065,seg=6)
    box((bcx+0.3,bcy-0.02,0.42),(BL-0.62,BW+0.04,0.06),blanket,bev=0.03,seg=4)
    box((bcx+0.3,BY0-0.01,0.32),(BL-0.62,0.06,0.22),blanket,bev=0.03,seg=4)
with item('Cat'):
    cx,cy,cz=0.2,bcy-0.12,0.45
    sph((cx,cy,cz+0.08),0.15,catM,sc=(1.3,1.0,0.62))
    sph((cx-0.17,cy-0.06,cz+0.1),0.115,catM,sc=(1,1,0.88))
    for s in (-1,1):
        o=cyl((cx-0.19,cy-0.06+s*0.06,cz+0.21),0.045,0.08,catM,r2=0.01,bev=0,rot=(s*0.35,-0.2,0))
        o2=sph((cx-0.24,cy-0.15+s*0.04,cz+0.11),0.02,catD,sc=(1,1.4,0.35))
    tor((cx+0.05,cy-0.08,cz+0.03),0.15,0.035,catM,rot=(0,0,0))
    sph((cx-0.25,cy-0.17,cz+0.075),0.012,mat('CatNose','e8a0a0'))
with item('Fan'):
    fx,fy=1.0,W/2-0.36
    cyl((fx,fy,0.04),0.17,0.06,creamP,bev=0.025)
    cyl((fx,fy,0.4),0.03,0.75,creamP,bev=0)
    hz=0.95; rot=(math.pi/2,0,math.radians(-60))
    tor((fx,fy,hz),0.28,0.025,creamP,rot=rot)
    sph((fx,fy,hz),0.06,creamP,sc=(1,1,1))
    o=bpy.context.object; ax=Matrix.Rotation(math.radians(-60),3,'Z')@Vector((0,-1,0))
    for k in range(10):
        a=k*math.pi/5; v=Matrix.Rotation(math.radians(-60),3,'Z')@Vector((math.cos(a),0,math.sin(a)))
        tube(Vector((fx,fy,hz))+v*0.06,Vector((fx,fy,hz))+v*0.27,0.008,creamP)
    for k in range(4):
        a=k*math.pi/2+0.4; v=Matrix.Rotation(math.radians(-60),3,'Z')@Vector((math.cos(a),0,math.sin(a)))
        o=sph(Vector((fx,fy,hz))+v*0.15,0.12,mat('FanBlade','e8dcc4'),sc=(1,0.15,0.55)); o.rotation_euler=(0,-a,math.radians(-60))
with item('BedsideTable'):
    tx,ty=1.6,W/2-0.33
    box((tx,ty,0.33),(0.55,0.55,0.62),mint,bev=0.06,seg=5)
    for k,z in enumerate((0.47,0.2)):
        box((tx+0.01,ty-0.28,z),(0.46,0.03,0.22),mat('MintLight','b9dbbf'),bev=0.03)
        box((tx+0.01,ty-0.305,z+0.02),(0.12,0.03,0.03),mat('MintKnob','8fb898'),bev=0.012)
with item('Kettle'):
    kx,ky,kz=tx+0.08,ty+0.05,0.64
    cyl((kx,ky,kz+0.13),0.1,0.26,creamP,r2=0.075,bev=0.03)
    cyl((kx,ky,kz+0.27),0.06,0.03,creamP,bev=0.01); sph((kx,ky,kz+0.295),0.022,darkG)
    tor((kx+0.1,ky,kz+0.15),0.08,0.018,darkG,rot=(math.pi/2,0,0))
    tube((kx-0.08,ky,kz+0.16),(kx-0.15,ky,kz+0.22),0.018,creamP)
    cyl((kx,ky,kz+0.01),0.105,0.02,darkG,bev=0.005)
with item('Cup'):
    cyl((tx-0.15,ty-0.12,0.64+0.045),0.04,0.09,creamP,bev=0.01)
# ---------- chair + player
CH_ROT=math.radians(ANG+90)
with item('Chair'):
    sh=0.42
    box((CHX,CHY,sh),(0.44,0.44,0.08),blueS,bev=0.035)
    for sx in (-1,1):
        for sy in (-1,1):
            cyl((CHX+sx*0.15,CHY+sy*0.15,sh/2),0.04,sh,blueS,r2=0.03,rot=(sy*0.08,-sx*0.08,0),bev=0)
    for sy in (-1,1): tube((CHX+0.15,CHY+sy*0.15,sh),(CHX+0.2,CHY+sy*0.15,sh+0.22),0.032,blueS)
    import bmesh
    me=bpy.data.meshes.new('back'); bm=bmesh.new(); n=16; R0=0.26; c0=Vector((CHX-0.06,CHY,0))
    vs=[]
    for i in range(n+1):
        a=math.radians(-62+124*i/n)
        for z in (sh+0.2,sh+0.44):
            tilt=(z-sh)*0.18
            vs.append(bm.verts.new(c0+Vector((math.cos(a)*(R0+tilt),math.sin(a)*(R0+tilt),z))))
    for i in range(n): bm.faces.new((vs[2*i],vs[2*i+2],vs[2*i+3],vs[2*i+1]))
    bm.to_mesh(me); bm.free(); ob=bpy.data.objects.new('back',me); S.collection.objects.link(ob)
    bpy.context.view_layer.objects.active=ob; ob.select_set(True)
    m=ob.modifiers.new('so','SOLIDIFY'); m.thickness=0.045; m.offset=0
    bpy.ops.object.modifier_apply(modifier='so')
    ob.data.materials.append(blueS)
    cut=[]
    for a in (-34,0,34):
        a=math.radians(a); d=Vector((math.cos(a),math.sin(a),0))
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=0.045,depth=0.3,location=c0+d*0.3+Vector((0,0,sh+0.32)))
        cc=bpy.context.object; cc.rotation_euler=d.to_track_quat('Z','Y').to_euler(); cut.append(cc)
    bpy.context.view_layer.objects.active=ob
    for cc in cut:
        b=ob.modifiers.new('bo','BOOLEAN'); b.object=cc; b.operation='DIFFERENCE'; b.solver='EXACT'
        bpy.ops.object.modifier_apply(modifier='bo')
    for cc in cut: bpy.data.objects.remove(cc)
    bv=ob.modifiers.new('bv','BEVEL'); bv.width=0.015; bv.segments=3
    for pg in ob.data.polygons: pg.material_index=0; pg.use_smooth=True
e=bpy.data.objects['Chair']; e.rotation_euler.z=CH_ROT
if MODE in('char','both'):
    with item('Player'):
        root,objs=toy_char.build_character('sit','PlayerRoot')
        root.scale=(PS,)*3; root.rotation_euler=(0,0,math.radians(ANG)); root.location=(CHX+0.04,CHY,0.02+0.305*PS)
        bpy.context.view_layer.update()
# ---------- lighting / world / camera
w=bpy.data.worlds.new('W'); S.world=w; w.use_nodes=True; bg=w.node_tree.nodes['Background']; bg.inputs[0].default_value=(*C('dcc0d4'),1); bg.inputs[1].default_value=0.8
lc=bpy.data.collections.new('Lights'); S.collection.children.link(lc)
def light(n,t,loc,rot,E,col,size):
    L=bpy.data.lights.new(n,t); L.energy=E; L.color=col
    if t=='SUN': L.angle=math.radians(size)
    else: L.shadow_soft_size=size
    o=bpy.data.objects.new(n,L); o.location=loc; o.rotation_euler=[math.radians(a) for a in rot]; lc.objects.link(o)
light('Key','SUN',(0,0,5),(50,0,20),1.7,(1,.84,.66),12)
light('Fill','AREA',(4,-4,3),(60,0,45),160,(.95,.85,.95),4)
light('WinGlow','AREA',(-0.35,W/2-0.25,1.62),(-90,0,0),350,(1,.55,.45),0.9)
for i,p in enumerate(((-W/2+0.2,-1.0,2.0),(-W/2+0.2,0.9,2.05),(0.0,W/2-0.2,2.05),(1.4,W/2-0.2,2.0))): light(f'Fairy{i}','POINT',p,(0,0,0),10,(1,.78,.5),0.3)
cc=bpy.data.collections.new('Camera'); S.collection.children.link(cc)
cam=bpy.data.cameras.new('Cam'); cam.type='ORTHO'; cam.ortho_scale=8.1
co=bpy.data.objects.new('Camera',cam); cc.objects.link(co); S.camera=co
rot=Matrix(); e=(math.radians(66),0,math.radians(45)); co.rotation_euler=e
tgt=Vector((0.05,-0.05,1.25)); co.location=tgt+co.rotation_euler.to_matrix()@Vector((0,0,25))
cam.shift_y=-0.03
S.render.engine='BLENDER_EEVEE'; S.eevee.taa_render_samples=SAMP
try: S.eevee.use_raytracing=True; S.eevee.use_shadows=True
except Exception as ex: print(ex)
S.render.resolution_x=1920; S.render.resolution_y=1080; S.render.film_transparent=True
S.view_settings.view_transform='AgX'; S.view_settings.look='AgX - Punchy'
tag=('room_with_character' if MODE=='char' else 'room_empty')+'_v2'
S.render.filepath=D+'views/raw_'+tag+'.png'
bpy.ops.wm.save_as_mainfile(filepath=D+('devlife_room.blend' if MODE=='char' else 'devlife_room_empty.blend'))
bpy.ops.render.render(write_still=True)
print('ITEMS',ITEMS)
