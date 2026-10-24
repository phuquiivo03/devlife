import bpy, math, json, sys
from mathutils import Vector, Matrix
D='/workspace/devlife-3d/'; OUT=sys.argv[sys.argv.index('--')+1]; O=D+OUT+'/'
bpy.ops.wm.open_mainfile(filepath=O+f'devlife_room_{OUT}_src.blend'); S=bpy.context.scene
KEY={'Bed':'bed_floor_mat'}
old=json.load(open(D+'wave1/manifest.json')); cat={i['key']:i['category'] for i in old['items']}
cat.update(ergo_chair='furniture',monitor2='electronics',mattress='furniture',aircon='appliance_wall')
def desc(o): r=[o]; [r.extend(desc(c)) for c in o.children]; return r
items=[]; 
for bn,k in KEY.items():
    e=bpy.data.objects.get(bn)
    if e is None or e.type!='EMPTY': continue
    ms=[o for o in desc(e) if o.type=='MESH' and o.name!='blades']
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms:
        o.select_set(True)
        if o.data.users>1: o.data=o.data.copy()
    bpy.context.view_layer.objects.active=ms[0]
    bpy.ops.object.convert(target='MESH')
    if len(ms)>1: bpy.ops.object.join()
    j=bpy.context.view_layer.objects.active
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
    parts=[o for o in e.children if o.type=='MESH' and o.name!='blades']
    for o in parts:
        o.name=f"{k}__{o.data.materials[0].name if o.data.materials else 'nomat'}"
        # drop unused material slots
        used={p.material_index for p in o.data.polygons}
        if len(o.data.materials)>1:
            keep=[o.data.materials[i] for i in sorted(used)]; remap={i:n for n,i in enumerate(sorted(used))}
            for p in o.data.polygons: p.material_index=remap[p.material_index]
            o.data.materials.clear(); [o.data.materials.append(m) for m in keep]
            o.name=f"{k}__{keep[0].name}"
    nodes=desc(e); t=0
    for o in nodes:
        if o.type=='MESH': o.data.calc_loop_triangles(); t+=len(o.data.loop_triangles)
    loc=e.location.copy(); rot=e.rotation_euler.copy(); e.location=(0,0,0); e.rotation_euler=(0,0,0); bpy.context.view_layer.update()
    pts=[o.matrix_world@v.co for o in nodes if o.type=='MESH' for v in o.data.vertices]
    mn=[min(p[i] for p in pts) for i in range(3)]; mx=[max(p[i] for p in pts) for i in range(3)]
    off=Vector(((mn[0]+mx[0])/2,(mn[1]+mx[1])/2,mn[2]))
    if off.length>0.002:   # re-pivot to exact bottom-center, keep world placement
        tops=[o for o in nodes if o.parent==e]
        for o in tops: o.matrix_world=Matrix.Translation(-off)@o.matrix_world
        loc=loc+rot.to_matrix()@off; bpy.context.view_layer.update()
        pts=[o.matrix_world@v.co for o in nodes if o.type=='MESH' for v in o.data.vertices]
        mn=[min(p[i] for p in pts) for i in range(3)]; mx=[max(p[i] for p in pts) for i in range(3)]
        print('REPIVOT',k,[round(x,3) for x in off])
    bpy.ops.object.select_all(action='DESELECT'); [o.select_set(True) for o in nodes]
    bpy.ops.export_scene.gltf(filepath=O+k+'.glb',use_selection=True,export_yup=True,export_apply=True,export_lights=False,export_cameras=False)
    e.location=loc; e.rotation_euler=rot; bpy.context.view_layer.update()
    x,y,z=[round(v,4) for v in loc]; yaw=round(math.degrees(rot.z),2)
    it=dict(key=k,category=cat.get(k,'misc'),file=f'{OUT}/{k}.glb',position_blender_zup=[x,y,z],position_gltf_yup=[x,z,-y],rotation_euler_gltf_rad=[0,round(rot.z,4),0],
            rotation_y_deg=yaw,scale=[1,1,1],triangles=t,bbox_size_gltf_m=[round(mx[0]-mn[0],3),round(mx[2]-mn[2],3),round(mx[1]-mn[1],3)],
            meshes=[o.name for o in nodes if o.type=='MESH'],pivot_check=[round((mn[0]+mx[0])/2,3),round((mn[1]+mx[1])/2,3),round(mn[2],3)])
    if k=='fan_standing':
        b=bpy.data.objects['blades']; it['children']={'blades':{'pivot_local_gltf':[round(b.location.x,3),round(b.location.z,3),round(-b.location.y,3)],'spin_axis_local':'Z (glTF, forward)'}}
    items.append(it); print('ITEM',k,t,len(it['meshes']),it['pivot_check'])
pl=[i for i in old['items'] if i['key'] in('player','player_standing')]
for i in pl:
    i['file']=i.get('file','').replace('character_v5_1','character_v6').replace('character_v5','character_v6') or ('character_v6/player_stand.glb' if i['key']=='player_standing' else 'character_v6/player_sit.glb')
    if i['key']=='player_standing':
        i.update(position_blender_zup=[-0.95,-0.5,0.02],position_gltf_yup=[-0.95,0.02,0.5],rotation_y_deg=90.0,rotation_euler_gltf_rad=[0,round(math.pi/2,4),0],note='standing beside the desk, facing it (-X)')
m=dict(old); m['version']=OUT; m['items']=items+pl
m['notes']=f'{OUT}: every item merged to one mesh per material (fan_standing keeps child node "blades", pivot on hub axis). Wall items (window, poster_vn, fairy_lights, aircon): pivot bottom-center of own bbox, position puts them on the wall.'
json.dump(m,open(O+'manifest.json','w'),indent=1)
bpy.ops.wm.save_as_mainfile(filepath=O+f'devlife_room_{OUT}.blend')
