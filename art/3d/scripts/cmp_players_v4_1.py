import bpy, math
S=bpy.context.scene
for o in list(S.objects): bpy.data.objects.remove(o)
pairs=[('/workspace/devlife-3d/export_v4/player_standing.glb',-1.9,1.4),('/workspace/devlife-3d/export_v4_1/player_standing.glb',-0.6,1),
       ('/workspace/devlife-3d/export_v4/player.glb',0.7,1),('/workspace/devlife-3d/export_v4_1/player.glb',2.0,1)]
for f,x,s in pairs:
    before=set(S.objects); bpy.ops.import_scene.gltf(filepath=f)
    roots=[o for o in S.objects if o not in before and o.parent is None]
    for r in roots: r.rotation_mode='XYZ'; r.location.x+=x; r.scale=(s,s,s)
# face v4 orig standing faces -Y; v4 sitting baked; rotate to camera: camera at -Y looking +Y sees -Y faces. v4.1 canonical faces +Y -> rotate 180
    if 'v4_1' in f:
        for r in roots: r.rotation_euler.z=math.pi
    elif 'player.glb' in f:
        for r in roots: r.rotation_euler.z=math.radians(48)
for n,rot,E in (('K',(50,0,-30),3),('R',(60,0,160),1.2)):
    L=bpy.data.lights.new(n,'SUN'); L.energy=E; o=bpy.data.objects.new(n,L); o.rotation_euler=[math.radians(a) for a in rot]; S.collection.objects.link(o)
w=bpy.data.worlds.new('w'); S.world=w; w.color=(0.5,0.5,0.55)
cam=bpy.data.cameras.new('C'); cam.type='ORTHO'; cam.ortho_scale=5.6; co=bpy.data.objects.new('C',cam); S.collection.objects.link(co); S.camera=co
co.location=(0.05,-10,1.0); co.rotation_euler=(math.pi/2,0,0)
S.render.engine='BLENDER_EEVEE'; S.render.resolution_x=1800; S.render.resolution_y=800; S.eevee.taa_render_samples=32
S.render.filepath='/workspace/devlife-3d/export_v4_1/player_decimate_compare.png'; bpy.ops.render.render(write_still=True)
