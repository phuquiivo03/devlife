import bpy, math
from mathutils import Vector
S=bpy.context.scene; co=S.camera; cam=co.data
cam.type='PERSP'; cam.lens=50; S.render.resolution_x=1600; S.render.resolution_y=1200
D='/workspace/devlife-3d/'
for name,tgt,eye in (('left',(-2.1,-2.01,1.2),(1.2,-5.6,1.9)),('right',(2.09,2.11,1.2),(5.6,-1.2,1.9))):
    t=Vector(tgt); e=Vector(eye); co.location=e; co.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
    cam.lens=55; S.render.filepath=D+f'views/raw_wall_edge_{name}_v3.png'; bpy.ops.render.render(write_still=True)
