# devlife cozy clay-toy room, matched to room_3d_mockup.jpg
# usage: blender -b -P build_room_mockup.py -- [char|empty] [samples]
import bpy, math, sys, os
from mathutils import Vector, Matrix
sys.path.insert(0,os.path.dirname(__file__)); import importlib, toy_char_v6 as toy_char
D='/workspace/devlife-3d/'; T=D+'scripts/'
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
MODE=argv[0] if argv else 'char'; OUT=argv[3] if len(argv)>3 else 'wave2_1'; W2=(OUT in ('wave2','wave2_1')); W21=(OUT=='wave2_1'); SAMP=int(argv[1]) if len(argv)>1 else 64
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
grey=mat('Grey','6f7078',.6); darkG=mat('DarkGrey','4a4a55',.6); white=mat('White','f6f4ef',.7); blueS=mat('BluePlastic','4a6cc0',.85); blueS.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=0.05
leaf=mat('Leaf','6fa266'); leafD=mat('LeafDark','4f8a50'); potM=mat('Pot','efe4d0'); soil=mat('Soil','6a4a3a')
pillow=mat('Pillow','a9bde6'); sheet=mat('Sheet','c4ccec'); blanket=mat('Blanket','8fb486'); catM=mat('Cat','f0dcb8'); catD=mat('CatDark','5a4848')
bGreen=mat('BookGreen','93b98a'); bOrange=mat('BookOrange','e9a07a'); bBlue=mat('BookBlue','6f8fd0'); paper=mat('Paper','f8f2e4')
bulb=mat('Bulb','ffcf7a',e=30); wire=mat('Wire','6a6060',.6); mug=mat('Mug','55555e',.6)
# ---------- room
CHX,CHY=-0.87,0.2; ANG=-90; PS=1.4   # v6_rot: chair+player perpendicular to desk wall (was 0.6 / -48)
W=4.0; H=2.55; TH=1.15; WT=0.22
with item('Base'):
    box((0.015,-0.015,-0.16),(W+0.45,W+0.45,0.32),slabM,bev=0.07,seg=6)  # flat slab, wall-top bevel, 0.01 inset from wall outer faces
    box((0.05,-0.05,0.0),(W+0.3,W+0.3,0.04),floorM,bev=0.02)
with item('Walls'):
    # solid wall blocks: full thickness, floor (z=0) to top. Lower inner 0.03 is reserved for the tile layer.
    TL=0.03; FZ=0.0
    LY0,LY1=-W/2-0.01,W/2+WT          # left wall extent along y (outer end .. back corner outer)
    RX0,RX1=-W/2-WT,W/2+0.09          # right wall extent along x
    lx=-W/2-WT; ry=W/2+WT              # outer faces
    # left wall: lower core (outer face .. inner-TL), upper full thickness
    box((lx+(WT-TL)/2,(LY0+LY1)/2,(FZ+TH)/2),(WT-TL,LY1-LY0,TH-FZ),creamW,bev=0)
    box((lx+WT/2,(LY0+LY1)/2,(TH+H)/2),(WT,LY1-LY0,H-TH),creamW,bev=0)
    # right wall (starts at left wall inner face, no overlap gaps)
    box(((-W/2+RX1)/2,ry-(WT-TL)/2,(FZ+TH)/2),(RX1+W/2,WT-TL,TH-FZ),creamW,bev=0)
    box(((-W/2+RX1)/2,ry-WT/2,(TH+H)/2),(RX1+W/2,WT,H-TH),creamW,bev=0)
    # rounded caps: flush with the cut ends
    box((lx+WT/2,(LY0+LY1)/2,H),(WT+0.06,LY1-LY0,0.14),creamW,bev=0.07,seg=6)
    box(((RX0+RX1)/2,ry-WT/2,H),(RX1-RX0,WT+0.06,0.14),creamW,bev=0.07,seg=6)
with item('WallTiles'):
    rows=3; th=(TH-FZ)/rows; BK=0.01
    # grout backing strips (inside the reserved TL layer)
    box((-W/2-TL+BK/2,(LY0+W/2)/2,(FZ+TH)/2),(BK,W/2-LY0,TH-FZ),mintD,bev=0)
    box(((-W/2+RX1)/2,W/2+TL-BK/2,(FZ+TH)/2),(RX1+W/2,BK,TH-FZ),mintD,bev=0)
    nL=round((W/2-LY0)/0.36); tl=(W/2-LY0)/nL
    nR=round((RX1+W/2)/0.36); tr=(RX1+W/2)/nR
    for r in range(rows):
        zc=FZ+th*(r+.5)
        for k in range(nL):
            box((-W/2-(TL-BK)/2,LY0+tl*(k+.5),zc),(TL-BK,tl-0.02,th-0.02),mint,bev=0.008,seg=2)
        for k in range(nR):
            box((-W/2+tr*(k+.5),W/2+(TL-BK)/2,zc),(tr-0.02,TL-BK,th-0.02),mint,bev=0.008,seg=2)
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
def place(name,loc,yaw):
    e=bpy.data.objects[name]; e.location=loc; e.rotation_euler=(0,0,math.radians(yaw)); bpy.context.view_layer.update()
def torus(loc,R,r,M,rot=(0,0,0),maj=32,mi=6):
    bpy.ops.mesh.primitive_torus_add(major_radius=R,minor_radius=r,location=loc,rotation=rot,major_segments=maj,minor_segments=mi); return fin(bpy.context.object,M)
def ltube(a,b,r,M,v=8):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d.length,location=(a+b)/2,end_fill_type='NOTHING'); o=bpy.context.object
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return fin(o,M)
# ---- monitor (local, faces +Y)
scrM=mat('ScreenTexW1','ffffff',img='tex_screen.png',e=1.5)
with item('Monitor'):
    box((0,0,0.37),(0.64,0.07,0.44),creamP,bev=0.07,seg=4)
    box((0,0.03,0.38),(0.56,0.02,0.36),mat('Bezel','e2d2b4'),bev=0.05,seg=3)
    plane((0,0.042,0.38),0.52,0.32,scrM,(math.pi/2,0,math.pi))
    cyl((0,-0.02,0.1),0.035,0.18,creamP,v=16,bev=0.0)
    cyl((0,0,0.018),0.14,0.036,creamP,v=32,bev=0.014)
place('Monitor',(-1.76,0.12,DH),-102)
gm=bpy.data.objects['Monitor'].matrix_world
L=bpy.data.lights.new('ScreenGlow','AREA'); L.energy=6; L.color=(.75,.85,1); L.size=0.5
lo=bpy.data.objects.new('ScreenGlow',L); lo.matrix_world=gm@Matrix.Translation((0,0.12,0.38))@Matrix.Rotation(-math.pi/2,4,'X'); S.collection.objects.link(lo)
with item('Keyboard'):
    fa=math.radians(ANG); kx=-1.384; ky=CHY-math.cos(fa)*0.31*PS
    box((kx,ky,DH+0.02),(0.16,0.44,0.03),darkG,bev=0.012,rot=(0,0,fa+math.pi/2))
    box((kx,ky,DH+0.035),(0.13,0.4,0.01),grey,bev=0.004,rot=(0,0,fa+math.pi/2))
with item('DeskLamp'):
    cyl((0,0,0.02),0.085,0.04,grey,v=24,bev=0.015)
    sph((0,0,0.05),0.025,grey,seg=12)
    j1=Vector((0,-0.04,0.36)); j2=Vector((0,0.13,0.42))
    ltube((0,0,0.05),j1,0.013,grey); sph(j1,0.024,grey,seg=12); ltube(j1,j2,0.013,grey); sph(j2,0.022,grey,seg=12)
    o=cyl(j2+Vector((0,0.06,-0.04)),0.035,0.12,grey,v=20,r2=0.095,rot=(math.radians(-145),0,0),bev=0.0)
    o.modifiers.new('s','SOLIDIFY').thickness=0.008
    sph(j2+Vector((0,0.1,-0.085)),0.033,mat('LampBulbW1','ffd9a0',e=12),seg=14)
place('DeskLamp',(-1.86,-0.3,DH),-90)
bw=bpy.data.objects['DeskLamp'].matrix_world@Vector((0,0.23,0.31))
L=bpy.data.lights.new('LampGlow','POINT'); L.energy=8; L.color=(1,.8,.55); L.shadow_soft_size=0.1
lo=bpy.data.objects.new('LampGlow',L); lo.location=bw+Vector((0.02,0,-0.04)); S.collection.objects.link(lo)
L=bpy.data.lights.new('LampPool','SPOT'); L.energy=140; L.color=(1,.72,.3); L.spot_size=math.radians(75); L.spot_blend=0.7; L.shadow_soft_size=0.05
lo=bpy.data.objects.new('LampPool',L); lo.location=bw+Vector((0.03,0,-0.06)); lo.rotation_euler=(0,math.radians(25),0); S.collection.objects.link(lo)
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
    if not W2: box((bcx+0.05,bcy,0.33),(BL-0.18,BW-0.08,0.16),sheet,bev=0.07,seg=5)
    BZ=0.07 if W2 else 0.0
    box((BX0+0.33,bcy+0.02,0.47+BZ),(0.34,0.62,0.14),pillow,bev=0.065,seg=6)
    box((bcx+0.3,bcy-0.02,0.42+BZ),(BL-0.62,BW+0.04,0.06),blanket,bev=0.03,seg=4)
    box((bcx+0.3,BY0-0.01,0.32+BZ),(BL-0.62,0.06,0.22),blanket,bev=0.03,seg=4)
with item('Cat'):
    cx,cy,cz=0.2,bcy-0.12,0.45+BZ
    sph((cx,cy,cz+0.08),0.15,catM,sc=(1.3,1.0,0.62))
    sph((cx-0.17,cy-0.06,cz+0.1),0.115,catM,sc=(1,1,0.88))
    for s in (-1,1):
        o=cyl((cx-0.19,cy-0.06+s*0.06,cz+0.21),0.045,0.08,catM,r2=0.01,bev=0,rot=(s*0.35,-0.2,0))
        o2=sph((cx-0.24,cy-0.15+s*0.04,cz+0.11),0.02,catD,sc=(1,1.4,0.35))
    tor((cx+0.05,cy-0.08,cz+0.03),0.15,0.035,catM,rot=(0,0,0))
    sph((cx-0.25,cy-0.17,cz+0.075),0.012,mat('CatNose','e8a0a0'))
fanB=mat('FanBladeW1','e6d6bb'); creamF=mat('FanCream','f1e3c6'); btn=mat('FanButton','c9b28f')
HZ=0.95
with item('Fan'):
    cyl((0,0,0.04),0.2,0.07,creamF,v=20,bev=0.03)
    for i,x in enumerate((-0.06,0,0.06)): cyl((x,0.13,0.085),0.022,0.03,btn if i!=1 else mat('FanButtonOn','a8c9a0'),v=8,bev=0)
    cyl((0,0,0.5),0.04,0.86,creamF,v=16,bev=0)
    cyl((0,-0.04,HZ-0.1),0.05,0.1,creamF,v=12,bev=0)
    sph((0,-0.17,HZ),0.11,creamF,sc=(1,1.05,1),seg=12)
    torus((0,-0.07,HZ),0.07,0.03,creamF,rot=(math.pi/2,0,0),maj=14,mi=6)
    torus((0,0,HZ),0.31,0.05,creamF,rot=(math.pi/2,0,0),maj=24,mi=6)
    for side,bul in ((1,0.17),(-1,0.1)):
        for k in range(4):
            a=k*math.pi/2+math.pi/4; pts=[]
            for t in (0.3,0.68,0.97):
                r=0.31*t; y=side*bul*math.cos(t*math.pi/2)**0.8
                pts.append(Vector((r*math.cos(a),y,HZ+r*math.sin(a))))
            for i in range(len(pts)-1): ltube(pts[i],pts[i+1],0.03,creamF,v=6)
        torus((0,side*bul,HZ),0.09,0.035,creamF,rot=(math.pi/2,0,0),maj=12,mi=5)
    cyl((0,0.175,HZ),0.07,0.02,mat('FanBadge','e9b7a5'),v=14,rot=(math.pi/2,0,0),bev=0.008)
    bl=[]
    for k in range(4):
        a=k*math.pi/2+0.4; v=Vector((math.cos(a),0,math.sin(a)))
        o=sph(Vector((0,0.02,HZ))+v*0.15,0.12,fanB,sc=(1,0.16,0.55),seg=8); o.rotation_mode='XYZ'
        o.rotation_euler=(Matrix.Rotation(-a,3,'Y')@Matrix.Rotation(0.35,3,'X')).to_euler(); bl.append(o)
    hub=sph((0,0.03,HZ),0.05,creamF,seg=10); bl.append(hub)
    bpy.ops.object.select_all(action='DESELECT')
    for o in bl: o.select_set(True)
    bpy.context.view_layer.objects.active=hub; bpy.ops.object.join(); BL=bpy.context.object
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    BL.data.transform(Matrix.Translation((0,0,-HZ))); BL.location=(0,0,HZ)
BL.name='blades'
place('Fan',(1.0,1.64,0.01),120)
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
# ---------- chair v1.1: VN one-piece plastic chair, front +Y local
import bmesh
CH_YAW=ANG+180
def sbar(a,b,r1,r2,M):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2); o=bpy.context.object
    q=d.to_track_quat('Z','Y'); o.rotation_euler=(q.to_matrix().to_4x4()@Matrix.Rotation(math.pi/4,4,'Z')).to_euler()
    bv=o.modifiers.new('b','BEVEL'); bv.width=0.014; bv.segments=2; bv.limit_method='ANGLE'; return fin(o,M)
if not W21:
    with item('Chair'):
        sh=0.42
        box((0,0.0,sh),(0.46,0.44,0.05),blueS,bev=0.04,seg=3)
        box((0,0.0,sh-0.05),(0.42,0.40,0.07),blueS,bev=0.03,seg=2)        # apron: legs merge into seat
        for sx in (-1,1):
            for sy in (-1,1):
                sbar((sx*0.17,sy*0.16,sh-0.04),(sx*0.235,sy*0.225,0.0),0.055,0.045,blueS)
        me=bpy.data.meshes.new('back'); bm=bmesh.new(); n=18; c0=Vector((0,0.03,0))
        zs=(sh-0.06,sh+0.08,sh+0.2,sh+0.32); vs=[]
        for i in range(n+1):
            u=i/n; a=math.radians(-90-105+210*u)
            for z in zs:
                R=0.235+(z-sh)*0.18; dip=0.035*math.cos((u-0.5)*math.pi)**2 if z==zs[-1] else 0
                zz=z-(0.07*abs(u-0.5)*2)**1.5*(z>sh+0.1)+dip
                vs.append(bm.verts.new(c0+Vector((math.cos(a)*R,math.sin(a)*R,zz))))
        m4=len(zs)
        for i in range(n):
            for j in range(m4-1): bm.faces.new((vs[m4*i+j],vs[m4*(i+1)+j],vs[m4*(i+1)+j+1],vs[m4*i+j+1]))
        bm.to_mesh(me); bm.free(); ob=bpy.data.objects.new('back',me); S.collection.objects.link(ob)
        bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active=ob; ob.select_set(True)
        m=ob.modifiers.new('so','SOLIDIFY'); m.thickness=0.04; m.offset=0; bpy.ops.object.modifier_apply(modifier='so')
        ob.data.materials.append(blueS)
        cut=[]
        for z in (sh+0.235,sh+0.13):
            bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=1,depth=0.6,location=c0+Vector((0,-0.22,z)))
            cc=bpy.context.object; cc.scale=(0.1 if z>sh+0.2 else 0.075,0.032,1); cc.rotation_euler=(math.pi/2,0,0); cc.scale=(0.12 if z>sh+0.2 else 0.085,0.03,1); cut.append(cc)
        bpy.context.view_layer.objects.active=ob
        for cc in cut:
            b=ob.modifiers.new('bo','BOOLEAN'); b.object=cc; b.operation='DIFFERENCE'; b.solver='EXACT'; bpy.ops.object.modifier_apply(modifier='bo')
        for cc in cut: bpy.data.objects.remove(cc)
        bv=ob.modifiers.new('bv','BEVEL'); bv.width=0.012; bv.segments=2; bv.limit_method='ANGLE'
        bpy.context.view_layer.objects.active=ob; bpy.ops.object.modifier_apply(modifier='bv')
        bm=bmesh.new(); bm.from_mesh(ob.data)
        bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=0.0008)
        bmesh.ops.dissolve_degenerate(bm,edges=bm.edges,dist=0.0008)
        bad=[f for f in bm.faces if f.calc_area()<1e-7]
        if bad: bmesh.ops.delete(bm,geom=bad,context='FACES')
        bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(ob.data); bm.free()
        for pg in ob.data.polygons: pg.use_smooth=True
        bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active=ob
        bpy.ops.object.shade_auto_smooth(angle=math.radians(35))
        for md in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
        wn=ob.modifiers.new('wn','WEIGHTED_NORMAL'); wn.keep_sharp=True; bpy.ops.object.modifier_apply(modifier='wn')
    place('Chair',(CHX+0.04,CHY,0.0),CH_YAW)
    _ch=[o for o in bpy.data.objects if o.type=='MESH' and o.parent and (o.parent.name=='Chair' or (o.parent.parent and o.parent.parent.name=='Chair'))]
    bpy.context.view_layer.update()
    _mz=min((o.matrix_world@v.co).z for o in _ch for v in o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().vertices)
    bpy.data.objects['Chair'].location.z+=0.02-_mz; bpy.context.view_layer.update(); print('CHAIR_MINZ',_mz,'->0.02 n',len(_ch))

if W21:
    exec(open(T+'ergo_chair_wave2_1.py').read())
if W2:
    lav=mat('ErgoLavender','b8a8de'); lavD=mat('ErgoLavDark','8f82b8'); ergoG=mat('ErgoGrey','7a7884',.7)
    if not W21:
     with item('ErgoChair'):
        for k in range(5):
            a=k*2*math.pi/5+math.pi/2; d=Vector((math.cos(a),math.sin(a),0))
            ltube(d*0.04+Vector((0,0,0.08)),d*0.29+Vector((0,0,0.06)),0.022,ergoG,v=8)
            sph(d*0.29+Vector((0,0,0.035)),0.035,mat('Caster','4d4b55',.7),seg=12)
        cyl((0,0,0.09),0.06,0.06,ergoG,v=16,bev=0.02); cyl((0,0,0.26),0.025,0.3,ergoG,v=12,bev=0)
        box((0,0,0.42),(0.3,0.3,0.04),ergoG,bev=0.015,seg=2)
        box((0,0.02,0.48),(0.5,0.48,0.1),lav,bev=0.045,seg=4)
        box((0,-0.24,0.6),(0.08,0.04,0.3),ergoG,bev=0.015,seg=2)
        box((0,-0.26,0.85),(0.46,0.09,0.42),lav,bev=0.045,seg=4)
        for s in (-1,1):
            ltube((s*0.25,-0.05,0.47),(s*0.26,-0.05,0.65),0.018,ergoG,v=8)
            box((s*0.26,0.0,0.67),(0.07,0.24,0.04),lavD,bev=0.018,seg=2)
    if not W21: place('ErgoChair',(0.25,-0.75,0.02),-150)
    with item('Monitor2'):
        box((0,0,0.33),(0.5,0.07,0.36),creamP,bev=0.065,seg=4)
        box((0,0.03,0.34),(0.43,0.02,0.29),mat('Bezel','e2d2b4'),bev=0.045,seg=3)
        plane((0,0.042,0.34),0.39,0.25,mat('ScreenTex2','ffffff',img='tex_screen.png',e=1.5),(math.pi/2,0,math.pi))
        cyl((0,-0.02,0.09),0.03,0.16,creamP,v=16,bev=0.0); cyl((0,0,0.016),0.12,0.032,creamP,v=32,bev=0.012)
    place('Monitor2',(-1.74,0.64,DH),-78)
    with item('Mattress'):
        box((0,0,0.1),((BX1-BX0)-0.2,BW-0.06,0.2),mat('MattressW2','dfe2f3'),bev=0.08,seg=4)
        for i in range(4):
            for j in range(2): sph(((i-1.5)*0.38,(j-0.5)*0.4,0.2),0.018,mat('MattressBtn','c3c8e6'),seg=8)
    place('Mattress',(bcx+0.06,bcy,0.28),0)
    with item('Aircon'):
        box((0,0,0.15),(0.82,0.22,0.3),mat('AirconWhite','f5f0e8',.85),bev=0.1,seg=5)
        box((0,0.095,0.06),(0.66,0.04,0.035),mat('AirconVent','c9c2b8'),bev=0.015,seg=2)
        box((0,0.11,0.2),(0.7,0.01,0.008),mat('AirconLine','e4ddd2'),bev=0.003,seg=1)
        sph((0.32,0.112,0.12),0.01,mat('AirconLED','8fe0a0',e=4),seg=8)
    place('Aircon',(1.35,W/2-0.11+0.0,1.55),180)
# ---------- player: load REAL glb (character_v5_1/player_sit.glb) and place with pivot offset
GLB=D+'character_v6/player_sit.glb'
r0,o0=toy_char.build_character('sit','TmpRef'); bpy.context.view_layer.update()
ref=[]
dg=bpy.context.evaluated_depsgraph_get()
for o in o0:
    ev=o.evaluated_get(dg); mm=ev.to_mesh(); ref+=[o.matrix_world@v.co for v in mm.vertices]; ev.to_mesh_clear()
Lp=Matrix.Translation((CHX+0.04,CHY,0.02+0.305*PS+(0.006 if W21 else 0)))@Matrix.Rotation(math.radians(ANG),4,'Z')@Matrix.Scale(PS,4)
loc_pts=[Matrix.Rotation(math.pi,4,'Z')@Matrix.Scale(PS,4)@p for p in ref]
c=Vector(((min(p.x for p in loc_pts)+max(p.x for p in loc_pts))/2,(min(p.y for p in loc_pts)+max(p.y for p in loc_pts))/2,min(p.z for p in loc_pts)))
refw=[Lp@p for p in ref]
for o in o0: bpy.data.objects.remove(o)
bpy.data.objects.remove(r0)
before=set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=GLB)
imp=[o for o in bpy.data.objects if o not in before]; top=[o for o in imp if o.parent is None][0]
top.rotation_mode='XYZ'; yaw=math.radians(ANG)-math.pi
top.location=Vector((CHX+0.04,CHY,0.02+0.305*PS+(0.006 if W21 else 0)))+Matrix.Rotation(yaw,3,'Z')@c; top.rotation_euler=(0,0,yaw); top.scale=(1,1,1)
bpy.context.view_layer.update()
gw=[o.matrix_world@v.co for o in imp if o.type=='MESH' for v in o.data.vertices]
bb=lambda P:[round(f(getattr(p,a) for p in P),3) for f in (min,max) for a in 'xyz']
print('PLACE glb_origin',[round(x,3) for x in top.location],'yaw_deg',round(math.degrees(yaw),1),'pivot_c',[round(x,3) for x in c])
print('VERIFY ref_bbox',bb(refw)); print('VERIFY glb_bbox',bb(gw))
pcol=bpy.data.collections.new('Player'); S.collection.children.link(pcol)
for o in imp:
    for cl in list(o.users_collection): cl.objects.unlink(o)
    pcol.objects.link(o)
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
tag=('room_with_character' if MODE=='char' else 'room_empty')+'_v4'
tag=argv[2] if len(argv)>2 else 'room_wave1'; S.render.filepath=D+OUT+'/views/raw_'+tag+'.png'
bpy.ops.wm.save_as_mainfile(filepath=D+OUT+'/devlife_room_'+OUT+'_src.blend')
bpy.ops.render.render(write_still=True)
print('ITEMS',ITEMS)
