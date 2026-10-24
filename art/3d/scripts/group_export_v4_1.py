import bpy, json, sys, os
from mathutils import Vector, Matrix
MODE=sys.argv[sys.argv.index('--')+1]  # room | standing
OUT='/workspace/devlife-3d/export_v4_1/'
import math
PS=1.4; TARGET=11800
KNOWN={'Chair':42.0,'Player':-48.0}  # scene yaw (deg) of rotated items
STATS={}
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
        me.transform(o.matrix_world)
        if MODE=='standing': me.transform(Matrix.Scale(PS,4))
        data.append((o,me))
    yaw=0.0
    if key.startswith('player') or key=='chair_plastic':
        # measure world facing direction (blender XY angle)
        def cen(sel):
            P=[v.co for o,me in data if sel(o.name.lower()) for v in me.vertices]; return sum(P,Vector())/len(P)
        if key.startswith('player'):
            f=cen(lambda n:'eyewhite' in n)-cen(lambda n:n.endswith('_head'))
        else:
            allp=[v.co for _,me in data for v in me.vertices]; zt=max(p.z for p in allp)
            c_all=sum(allp,Vector())/len(allp); f=c_all-cen_hi if False else None
            hi=[p for p in allp if p.z>zt-0.25]; f=c_all-sum(hi,Vector())/len(hi)
        a=math.degrees(math.atan2(f.y,f.x))      # facing angle
        canon=90.0                                # canonical: +Y blender == -Z glTF
        yaw=a-canon
        if MODE=='room' and old in KNOWN:          # snap to known scene yaw + k*90
            k=round((yaw-KNOWN[old])/90.0); yaw=KNOWN[old]+90*k
        else: yaw=round(yaw/90.0)*90 if abs(yaw-round(yaw/90.0)*90)<10 else yaw
        STATS[key+'_measured_facing_deg']=round(a,1); STATS[key+'_yaw_deg']=yaw
        R=Matrix.Rotation(math.radians(-yaw),4,'Z')
        for _,me in data: me.transform(R)
        yaw=(yaw+180)%360-180
        if MODE=='standing': yaw=0.0
        STATS[key+'_yaw_deg']=yaw
    if key.startswith('player'):
        # decimate: keep small face parts, hair gets 1.5x ratio
        def tri(me): me.calc_loop_triangles(); return len(me.loop_triangles)
        face=('eye','iris','pupil','brow','mouth','nose','cheek','hl')
        T0=sum(tri(me) for _,me in data); STATS[key+'_tris_before']=T0
        def w(n):
            n=n.lower()
            if any(x in n for x in face): return 1.4
            if 'hair' in n or 'fringe' in n: return 1.4
            return 1.0
        tmpd={}
        def dec(i,rr):
            o,me=data[i]
            if rr>=0.999: return me
            t=bpy.data.objects.new('tmp',me); S.collection.objects.link(t)
            m=t.modifiers.new('d','DECIMATE'); m.ratio=max(rr,0.02); m.use_collapse_triangulate=True
            bpy.context.view_layer.update(); d2=bpy.context.evaluated_depsgraph_get()
            nm=bpy.data.meshes.new_from_object(t.evaluated_get(d2)); bpy.data.objects.remove(t); return nm
        def run(r):
            out=[]
            for i,(o,me) in enumerate(data):
                n0=tri(me); rr=min(1.0,max(r*w(o.name),min(1.0,40/max(n0,1))))
                out.append(dec(i,rr))
            return out,sum(tri(m) for m in out)
        lo,hi=0.01,1.0; best=None
        for it_ in range(9):
            r=(lo+hi)/2; out,tot=run(r); print('DBG',r,tot)
            if tot>TARGET: hi=r
            else: lo=r; best=(out,tot)
        out,tot=best
        data=[(o,out[i]) for i,(o,me) in enumerate(data)]
        for m in data:
            for p in m[1].polygons: p.use_smooth=True
        STATS[key+'_tris_after']=tot
    pts=[v.co for _,me in data for v in me.vertices]
    mn=Vector([min(p[i] for p in pts) for i in range(3)]); mx=Vector([max(p[i] for p in pts) for i in range(3)])
    piv=Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))
    E=bpy.data.objects.new(key,None); move(E,newcols[cat]); E.parent=groups[cat]; E.location=Matrix.Rotation(math.radians(yaw),4,'Z')@piv; E.rotation_euler=(0,0,math.radians(yaw))
    tris=0
    for i,(o,me) in enumerate(data):
        me.transform(Matrix.Translation(-piv)); me.calc_loop_triangles(); tris+=len(me.loop_triangles)
        suf=o.name.split('_',1)[1].lower() if '_' in o.name else f'{i:02d}'
        n=bpy.data.objects.new(f'{key}_{suf}',me); move(n,newcols[cat]); n.parent=E
    for o in [root]+ds:
        if o.type!='LIGHT': bpy.data.objects.remove(o)
    items.append(dict(key=key,category=cat,file=f'items/{key}.glb',tris=tris,piv=E.location.copy(),yaw=yaw,size=mx-mn))
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
    E=bpy.data.objects[it['key']]; P=E.parent; E.parent=None; E.location=(0,0,0); E.rotation_euler=(0,0,0)
    sel([E]+desc(E)); fn=OUT+('items/' if MODE=='room' else '')+it['key']+'.glb'
    if MODE=='standing': it['file']='player_standing.glb'
    bpy.ops.export_scene.gltf(filepath=fn,**G)
    if MODE=='room' and it['key']=='player': bpy.ops.export_scene.gltf(filepath=OUT+'player.glb',**G)
    E.parent=P; E.location=it['piv']; E.rotation_euler=(0,0,math.radians(it['yaw']))
if MODE=='room':
    allx=[o for g in groups.values() for o in [g]+desc(g)]
    sel(allx); bpy.ops.export_scene.gltf(filepath=OUT+'room_full.glb',**G)
    g=groups['room_shell']; sel([g]+desc(g)); bpy.ops.export_scene.gltf(filepath=OUT+'room_shell.glb',**G)
    bpy.ops.wm.save_as_mainfile(filepath=OUT+'devlife_room_v4_1_grouped.blend')
r=lambda v:[round(x,4) for x in v]
man=[dict(key=i['key'],category=i['category'],file=i['file'],
  position_blender_zup=r(i['piv']),position_gltf_yup=r((i['piv'].x,i['piv'].z,-i['piv'].y)),
  rotation_euler_gltf_rad=[0,round(math.radians(i['yaw']),5),0],rotation_y_deg=i['yaw'],scale=[1,1,1],triangles=i['tris'],
  bbox_size_gltf_m=r((i['size'].x,i['size'].z,i['size'].y))) for i in items]
json.dump(dict(items=man,stats=STATS),open(f'/tmp/man41_{MODE}.json','w'),indent=1)
