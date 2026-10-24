import bpy, math, json, sys
from mathutils import Vector, Matrix
D='/workspace/devlife-3d/'; O=D+'wave1/'
bpy.ops.wm.open_mainfile(filepath=O+'devlife_room_wave1.blend'); S=bpy.context.scene
KEYS={'Chair':'chair_plastic','Monitor':'monitor','DeskLamp':'lamp_desk','Fan':'fan_standing'}
def desc(o): r=[o]; [r.extend(desc(c)) for c in o.children]; return r
res={}
dg=bpy.context.evaluated_depsgraph_get()
for n,k in KEYS.items():
    e=bpy.data.objects[n]; ob=desc(e); t=0
    for o in ob:
        if o.type=='MESH':
            ev=o.evaluated_get(dg); m=ev.to_mesh(); m.calc_loop_triangles(); t+=len(m.loop_triangles); ev.to_mesh_clear()
    loc=e.location.copy(); rot=e.rotation_euler.copy()
    e.location=(0,0,0); e.rotation_euler=(0,0,0); bpy.context.view_layer.update()
    pts=[o.matrix_world@Vector(c) for o in ob if o.type=='MESH' for c in o.bound_box]
    mn=[min(p[i] for p in pts) for i in range(3)]; mx=[max(p[i] for p in pts) for i in range(3)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in ob: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=O+k+'.glb',use_selection=True,export_yup=True,export_apply=True,export_lights=False,export_cameras=False)
    e.location=loc; e.rotation_euler=rot; bpy.context.view_layer.update()
    yaw=round(math.degrees(rot.z),2)
    res[k]=dict(tris=t,pos_b=[round(x,4) for x in loc],yaw=yaw,size=[round(mx[0]-mn[0],3),round(mx[2]-mn[2],3),round(mx[1]-mn[1],3)],pivot_err=[round((mn[0]+mx[0])/2,3),round((mn[1]+mx[1])/2,3),round(mn[2],3)],
                children=[c.name for c in e.children])
    print('ITEM',k,res[k])
bl=bpy.data.objects['blades']; print('BLADES parent',bl.parent.name,'origin_local',[round(x,3) for x in bl.location])
json.dump(res,open('/tmp/w1res.json','w'))
