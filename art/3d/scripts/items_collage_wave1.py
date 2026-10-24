import bpy, math
from mathutils import Vector
O='/workspace/devlife-3d/wave1/'
for k in ('chair_plastic','monitor','lamp_desk','fan_standing'):
    bpy.ops.wm.read_factory_settings(use_empty=True); S=bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=O+k+'.glb')
    print('NODES',k,[(o.name,o.type,o.parent.name if o.parent else None) for o in bpy.data.objects if o.name=='blades' or o.parent is None])
    pts=[o.matrix_world@Vector(c) for o in bpy.data.objects if o.type=='MESH' for c in o.bound_box]
    mn=Vector([min(p[i] for p in pts) for i in range(3)]); mx=Vector([max(p[i] for p in pts) for i in range(3)])
    w=bpy.data.worlds.new('W'); S.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.75,0.66,0.74,1)
    for n,rot,E in (('Key',(50,0,30),2.4),('Rim',(60,0,200),0.8)):
        L=bpy.data.lights.new(n,'SUN'); L.energy=E; L.angle=0.4; o=bpy.data.objects.new(n,L); o.rotation_euler=[math.radians(a) for a in rot]; S.collection.objects.link(o)
    cam=bpy.data.cameras.new('C'); cam.type='ORTHO'; co=bpy.data.objects.new('Cam',cam); S.collection.objects.link(co); S.camera=co
    c=(mn+mx)/2; a=math.radians(150); co.rotation_euler=(math.radians(70),0,a)   # front (+Y blender) three-quarter
    co.location=c+co.rotation_euler.to_matrix()@Vector((0,0,6)); cam.ortho_scale=max(mx-mn)*1.35
    S.render.engine='BLENDER_EEVEE'; S.eevee.taa_render_samples=48; S.render.resolution_x=S.render.resolution_y=700
    S.view_settings.view_transform='AgX'; S.view_settings.look='AgX - Punchy'
    S.render.filepath=O+'views/item_'+k+'.png'; bpy.ops.render.render(write_still=True)
