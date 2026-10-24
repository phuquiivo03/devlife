import bpy, math, sys, os
from mathutils import Vector
sys.path.insert(0,os.path.dirname(__file__)); import toy_char
D='/workspace/devlife-3d/'
bpy.ops.wm.read_factory_settings(use_empty=True); S=bpy.context.scene
root,objs=toy_char.build_character('stand','Player')
w=bpy.data.worlds.new('W'); S.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.62,0.58,0.72,1)
for n,rot,E in (('Key',(50,0,-30),2.5),('Rim',(60,0,160),1.2)):
    L=bpy.data.lights.new(n,'SUN'); L.energy=E; L.angle=0.3; o=bpy.data.objects.new(n,L); o.rotation_euler=[math.radians(a) for a in rot]; S.collection.objects.link(o)
cam=bpy.data.cameras.new('C'); cam.type='ORTHO'; cam.ortho_scale=1.55; co=bpy.data.objects.new('Cam',cam); S.collection.objects.link(co); S.camera=co
S.render.engine='BLENDER_EEVEE'; S.eevee.taa_render_samples=64; S.render.resolution_x=800; S.render.resolution_y=1000; S.render.film_transparent=True
S.view_settings.view_transform='AgX'; S.view_settings.look='AgX - Punchy'
for name,az in (('front',0),('side',90),('back',180)):
    a=math.radians(az); co.location=(5*math.sin(a),-5*math.cos(a),0.62); co.rotation_euler=(math.pi/2,0,a)
    S.render.filepath=D+f'views/character_{name}_v2.png'; bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=D+'character_standing.blend')
bpy.ops.export_scene.gltf(filepath=D+'items/Player_standing.glb')
