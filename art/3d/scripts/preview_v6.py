import bpy, math, sys, os
sys.path.insert(0,os.path.dirname(__file__)); import importlib, toy_char_v6 as tc
pose=sys.argv[sys.argv.index('--')+1]; out=sys.argv[sys.argv.index('--')+2]
bpy.ops.wm.read_factory_settings(use_empty=True); S=bpy.context.scene
root,objs=tc.build_character(pose,'Player')
w=bpy.data.worlds.new('W'); S.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.62,0.58,0.72,1); w.node_tree.nodes['Background'].inputs[1].default_value=0.9
for n,rot,E in (('Key',(50,0,-30),2.6),('Rim',(60,0,160),1.0)):
    L=bpy.data.lights.new(n,'SUN'); L.energy=E; L.angle=0.4; o=bpy.data.objects.new(n,L); o.rotation_euler=[math.radians(a) for a in rot]; S.collection.objects.link(o)
cam=bpy.data.cameras.new('C'); cam.type='ORTHO'; co=bpy.data.objects.new('Cam',cam); S.collection.objects.link(co); S.camera=co
S.render.engine='BLENDER_EEVEE'; S.eevee.taa_render_samples=32; S.render.resolution_x=700; S.render.resolution_y=800; S.render.film_transparent=False
S.view_settings.view_transform='AgX'; S.view_settings.look='AgX - Punchy'
zc=0.5 if pose=='stand' else 0.3
shots=[('front',0,1.15,zc),('q',35,1.15,zc),('side',90,1.15,zc),('back',180,1.15,zc),('face',15,0.55,zc+0.2 if pose=='stand' else 0.55)]
for nm,az,os_,z in shots:
    a=math.radians(az); co.location=(5*math.sin(a),-5*math.cos(a),z); co.rotation_euler=(math.pi/2,0,a); cam.ortho_scale=os_
    S.render.filepath=f'{out}_{nm}.png'; bpy.ops.render.render(write_still=True)
dg=bpy.context.evaluated_depsgraph_get(); t=0; zs=[]
for o in objs:
    e=o.evaluated_get(dg); m=e.to_mesh(); m.calc_loop_triangles(); t+=len(m.loop_triangles); zs+= [(o.matrix_world@v.co).z for v in m.vertices]; e.to_mesh_clear()
print('STATS tris',t,'zmin',round(min(zs),3),'zmax',round(max(zs),3),'parts',len(objs))
