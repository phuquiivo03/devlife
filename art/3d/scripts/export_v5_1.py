import bpy, sys, math
from mathutils import Vector, Matrix
sys.path.insert(0,'/workspace/devlife-3d/scripts'); import toy_char_v5_1 as tc
O='/workspace/devlife-3d/character_v5_1/'
bpy.ops.wm.read_factory_settings(use_empty=True)
def tris(o):
    dg=bpy.context.evaluated_depsgraph_get(); e=o.evaluated_get(dg); m=e.to_mesh()
    n=sum(len(p.vertices)-2 for p in m.polygons); e.to_mesh_clear(); return n
res={}
for pose,name in (('sit','player_sit'),('stand','player_stand')):
    before=set(bpy.data.objects)
    root,objs=tc.build_character(pose,name)
    bpy.context.view_layer.update()
    ms=[o for o in bpy.data.objects if o.type=='MESH' and o not in before]
    for o in ms:
        w=1.4 if any(k in o.name for k in ('Eye','Brow','Cheek','Mouth','Hair','Fringe','Tuft','Hl')) else 1.0
        o['w']=w; d=o.modifiers.new('dec','DECIMATE')
    base={o.name:tris(o) for o in ms}
    lo,hi=0.0,1.0
    def setr(r):
        for o in ms:
            rr=min(1.0,r*o['w']); rr=max(rr,min(1.0,40/max(base[o.name],1)))
            o.modifiers['dec'].ratio=rr
        bpy.context.view_layer.update(); return sum(tris(o) for o in ms)
    for _ in range(18):
        mid=(lo+hi)/2
        if setr(mid)>11800: hi=mid
        else: lo=mid
    t=setr(lo)
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms:
        o.select_set(True); bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.join(); j=bpy.context.active_object
    for e in [x for x in bpy.data.objects if x.type=='EMPTY']: bpy.data.objects.remove(e)
    j.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    j.data.transform(Matrix.Rotation(math.pi,4,'Z')@Matrix.Scale(1.4,4))
    vs=[v.co for v in j.data.vertices]
    c=Vector(((min(v.x for v in vs)+max(v.x for v in vs))/2,(min(v.y for v in vs)+max(v.y for v in vs))/2,min(v.z for v in vs)))
    j.data.transform(Matrix.Translation(-c)); j.data.update()
    h=max(v.co.z for v in j.data.vertices)
    bpy.ops.object.select_all(action='DESELECT'); j.select_set(True)
    bpy.ops.export_scene.gltf(filepath=O+name+'.glb',use_selection=True,export_yup=True)
    res[name]={'objs':[name],'tris':t}
    print('RES',name,t,'height_m',round(h,3))
    j.location.x = -0.6 if pose=='sit' else 0.6
bpy.ops.wm.save_as_mainfile(filepath=O+'character_v5_1.blend')
