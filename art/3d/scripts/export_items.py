import bpy
D='/workspace/devlife-3d/items/'
for col in bpy.context.scene.collection.children:
    if col.name in('Lights','Camera'): continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.all_objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=D+col.name+'.glb',use_selection=True,export_apply=True)
bpy.ops.export_scene.gltf(filepath='/workspace/devlife-3d/devlife_room.glb',export_apply=True)
