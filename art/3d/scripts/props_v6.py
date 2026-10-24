# builds table_folding, laptop (character_v6/) and stool_plastic (stool/). Local front = +Y (glTF -Z). pivot bottom-center.
import bpy, math, sys, os
from mathutils import Vector, Matrix
bpy.ops.wm.read_factory_settings(use_empty=True)
exec(open(os.path.join(os.path.dirname(__file__),'_helpers_v6.py')).read())
def ltube(a,b,r,M,v=8):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d.length,location=(a+b)/2); o=bpy.context.object
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return fin(o,M)
def tris_of(objs):
    dg=bpy.context.evaluated_depsgraph_get(); n=0
    for o in objs:
        e=o.evaluated_get(dg); m=e.to_mesh(); m.calc_loop_triangles(); n+=len(m.loop_triangles); e.to_mesh_clear()
    return n
def finish(name,path):
    objs=[o for o in bpy.data.objects if o.type=='MESH' and o.get('asset') is None]
    for o in objs: o['asset']=name
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH'); bpy.ops.object.join(); j=bpy.context.object
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bpy.ops.mesh.separate(type='MATERIAL'); parts=list(bpy.context.selected_objects)
    vs=[o.matrix_world@v.co for o in parts for v in o.data.vertices]
    c=Vector(((min(v.x for v in vs)+max(v.x for v in vs))/2,(min(v.y for v in vs)+max(v.y for v in vs))/2,min(v.z for v in vs)))
    e=bpy.data.objects.new(name,None); bpy.context.scene.collection.objects.link(e); e['asset']=name
    for p in parts:
        p.data.transform(Matrix.Translation(-c)); p.name=f'{name}__{p.data.materials[0].name}'; p.parent=e; p['asset']=name
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    e.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path,use_selection=True,export_yup=True)
    dims=[round(max(v[i] for v in vs)-min(v[i] for v in vs),3) for i in range(3)]
    print('ASSET',name,tris_of(parts),'parts',len(parts),'dims',dims)
    return e
# ---------- table_folding
top=mat('TableTop','f3c9b6'); edge=mat('TableEdge','e8b3a0'); leg=mat('TableLeg','c9cbd6',.6)
box((0,0,0.285),(0.6,0.4,0.03),top,bev=0.012,seg=2)
box((0,0,0.262),(0.56,0.36,0.02),edge,bev=0.006,seg=1)
for s in (-1,1):
    x=s*0.24
    for yy in (-0.15,0.15):
        ltube((x,yy*0.6,0.255),(x+0.02*s,yy,0.012),0.011,leg)
    ltube((x+0.02*s,-0.16,0.012),(x+0.02*s,0.16,0.012),0.012,leg)
    ltube((x,-0.09,0.25),(x,0.09,0.25),0.009,leg)
finish('table_folding','/workspace/devlife-3d/character_v6/table_folding.glb')
# ---------- laptop (user at +Y, hinge at -Y)
body=mat('LaptopBody','d9d3e6',.6); keys=mat('LaptopKeys','6e6a7c',.7); scr=mat('LaptopScreen','bfe3ff',e=1.6)
box((0,0,0.009),(0.32,0.22,0.018),body,bev=0.006,seg=2)
box((0,0.015,0.0185),(0.27,0.1,0.002),keys,bev=0,seg=1)
box((0,0.085,0.0185),(0.09,0.05,0.002),keys,bev=0,seg=1)
hz=0.018; ang=math.radians(105-90)
lid=box((0,0,0),(0.32,0.012,0.21),body,bev=0.005,seg=2)
sp=plane((0,0,0),0.29,0.18,scr,(math.pi/2,0,0))
R=Matrix.Rotation(ang,4,'X'); bpy.context.view_layer.update()
for o,off in ((lid,Vector((0,0,0.105))),(sp,Vector((0,0.0065,0.11)))):
    o.matrix_world=Matrix.Translation((0,-0.11,hz))@R@Matrix.Translation(off)@o.matrix_world
finish('laptop','/workspace/devlife-3d/character_v6/laptop.glb')
# ---------- stool_plastic (ref photo): top 0.38 sq, bottom 0.46 sq, h 0.45
blue=mat('StoolBlue','9fb6ee'); blueL=mat('StoolBlueGrid','a6bcf0')
H=0.45; t0,b0=0.19,0.235
box((0,0,H-0.02),(0.39,0.39,0.04),blue,bev=0.025,seg=2)
for i in (-1.5,-0.5,0.5,1.5):     # subtle grid on top
    box((i*0.07,0,H+0.001),(0.005,0.3,0.003),blueL,bev=0,seg=1); box((0,i*0.07,H+0.001),(0.3,0.005,0.003),blueL,bev=0,seg=1)
def hw(z): return b0+(t0-b0)*z/H
tilt=math.atan((b0-t0)/H)
for k in range(4):
    Rz=Matrix.Rotation(k*math.pi/2,4,'Z'); objs=[]
    # apron under top + bottom crossbar, in the slanted side plane (side at +Y)
    for z,h,th in ((H-0.075,0.07,0.03),(0.1,0.045,0.03)):
        o=box((0,0,0),(2*hw(z)-0.1,th,h),blue,bev=0.01,seg=2); o.matrix_world=Rz@Matrix.Translation((0,hw(z)-0.022,z))@Matrix.Rotation(-tilt,4,'X')@o.matrix_world
finish_sides=None
def slab(ct,cb,st,sb,M,bev=0.008):
    import bmesh
    me=bpy.data.meshes.new('slab'); bm=bmesh.new()
    vs=[bm.verts.new(c+Vector((dx*sz[0]/2,dy*sz[1]/2,0))) for c,sz in ((cb,sb),(ct,st)) for dx,dy in ((-1,-1),(1,-1),(1,1),(-1,1))]
    bmesh.ops.convex_hull(bm,input=vs); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new('slab',me); bpy.context.scene.collection.objects.link(o)
    b=o.modifiers.new('b','BEVEL'); b.width=bev; b.segments=2; return fin(o,M)
for sx in (-1,1):
    for sy in (-1,1):
        slab(Vector((sx*(t0-0.03),sy*(t0-0.012),H-0.03)),Vector((sx*(b0-0.035),sy*(b0-0.012),0)),(0.06,0.024),(0.07,0.024),blue)
        slab(Vector((sx*(t0-0.012),sy*(t0-0.03),H-0.03)),Vector((sx*(b0-0.012),sy*(b0-0.035),0)),(0.024,0.06),(0.024,0.07),blue)
finish('stool_plastic','/workspace/devlife-3d/stool/stool_plastic.glb')
