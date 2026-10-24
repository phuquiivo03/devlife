import bpy, json, sys, os
from mathutils import Vector, Matrix
MODE=sys.argv[sys.argv.index('--')+1]  # room | standing
OUT='/workspace/devlife-3d/export_v4/'
MAP={'Base':('floor_base','room_shell'),'Walls':('walls','room_shell'),'WallTiles':('wall_tiles','room_shell'),
 'Bed':('bed','furniture'),'BedsideTable':('nightstand','furniture'),'Chair':('chair_plastic','furniture'),'Desk':('desk','furniture'),'Fan':('fan_standing','furniture'),
 'BigPlant':('plant_big','decor'),'DeskPlant':('plant_small','decor'),'Books':('books_stack','decor'),'Cat':('cat','decor'),'Cup':('cup','decor'),
 'Kettle':('kettle','decor'),'Keyboard':('keyboard','decor'),'DeskLamp':('lamp_desk','decor'),'Monitor':('monitor','decor'),'Mug':('mug','decor'),
 'Poster':('poster_vn','decor'),'Window':('window','decor'),'FairyLights':('fairy_lights','decor'),'Player':('player','character')}
if MODE=='standing': MAP={'Player':('player_standing','character')}
S=bpy.context.scene; dg=bpy.context.evaluated_depsgraph_get()
def desc(o):
    r=[]
    for c in o.children: r.append(c); r+=desc(c)
    return r
newcols={}
for n in ('room_shell','furniture','decor','lights','character','camera'):
    c=bpy.data.collections.new(n); S.collection.children.link(c); newcols[n]=c
def move(o,col):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o)
groups={}
for n in ('room_shell','furniture','decor','character'):
    g=bpy.data.objects.new(n,None); move(g,newcols[n]); groups[n]=g
items=[]
for old,(key,cat) in MAP.items():
    root=bpy.data.objects[old]; ds=desc(root)
    meshes=[o for o in ds if o.type=='MESH']
    for l in [o for o in ds if o.type=='LIGHT']:
        mw=l.matrix_world.copy(); l.parent=None; l.matrix_world=mw; move(l,newcols['lights'])
    data=[]
    for o in meshes:
        me=bpy.data.meshes.new_from_object(o.evaluated_get(dg),preserve_all_data_layers=True,depsgraph=dg)
        me.transform(o.matrix_world); data.append((o,me))
    pts=[v.co for _,me in data for v in me.vertices]
    mn=Vector([min(p[i] for p in pts) for i in range(3)]); mx=Vector([max(p[i] for p in pts) for i in range(3)])
    piv=Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))
    E=bpy.data.objects.new(key,None); move(E,newcols[cat]); E.parent=groups[cat]; E.location=piv
    tris=0
    for i,(o,me) in enumerate(data):
        me.transform(Matrix.Translation(-piv)); me.calc_loop_triangles(); tris+=len(me.loop_triangles)
        suf=o.name.split('_',1)[1].lower() if '_' in o.name else f'{i:02d}'
        n=bpy.data.objects.new(f'{key}_{suf}',me); move(n,newcols[cat]); n.parent=E
    for o in [root]+ds:
        if o.type!='LIGHT': bpy.data.objects.remove(o)
    items.append(dict(key=key,category=cat,file=f'items/{key}.glb',tris=tris,piv=piv,size=mx-mn))
for o in list(S.objects):
    if o.type=='LIGHT': move(o,newcols['lights'])
    if o.type=='CAMERA': move(o,newcols['camera'])
for c in list(bpy.data.collections):
    if c.name not in newcols: bpy.data.collections.remove(c)
for c in ('lights','camera'): bpy.context.view_layer.layer_collection.children[c].exclude=True
for n in list(groups):
    if not groups[n].children: bpy.data.objects.remove(groups[n]); del groups[n]
bpy.data.orphans_purge(do_recursive=True)
G=dict(export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_lights=False,export_cameras=False,export_extras=False,export_animations=False)
def sel(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
for it in items:
    E=bpy.data.objects[it['key']]; P=E.parent; E.parent=None; E.location=(0,0,0)
    sel([E]+desc(E)); fn=OUT+('items/' if MODE=='room' else '')+it['key']+'.glb'
    if MODE=='standing': it['file']='player_standing.glb'
    bpy.ops.export_scene.gltf(filepath=fn,**G); E.parent=P; E.location=it['piv']
    if MODE=='room' and it['key']=='player':
        bpy.ops.export_scene.gltf(filepath=OUT+'player.glb',**G)
if MODE=='room':
    allx=[o for g in groups.values() for o in [g]+desc(g)]
    sel(allx); bpy.ops.export_scene.gltf(filepath=OUT+'room_full.glb',**G)
    g=groups['room_shell']; sel([g]+desc(g)); bpy.ops.export_scene.gltf(filepath=OUT+'room_shell.glb',**G)
    bpy.ops.wm.save_as_mainfile(filepath=OUT+'devlife_room_v4_grouped.blend')
r=lambda v:[round(x,4) for x in v]
man=[dict(key=i['key'],category=i['category'],file=i['file'],
  position_blender_zup=r(i['piv']),position_gltf_yup=r((i['piv'].x,i['piv'].z,-i['piv'].y)),
  rotation_euler_gltf=[0,0,0],scale=[1,1,1],triangles=i['tris'],
  bbox_size_gltf_m=r((i['size'].x,i['size'].z,i['size'].y))) for i in items]
json.dump(man,open(f'/tmp/man_{MODE}.json','w'),indent=1)
