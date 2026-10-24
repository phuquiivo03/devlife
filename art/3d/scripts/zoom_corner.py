import bpy
from mathutils import Vector
S=bpy.context.scene; co=S.camera; cam=co.data
cam.type='PERSP'; cam.lens=50; S.render.resolution_x=1600; S.render.resolution_y=1200
t=Vector((2.1,-2.1,0.1)); e=Vector((4.6,-4.6,1.3)); co.location=e; co.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
S.render.filepath='/workspace/devlife-3d/views/raw_floor_corner_v4.png'; bpy.ops.render.render(write_still=True)
