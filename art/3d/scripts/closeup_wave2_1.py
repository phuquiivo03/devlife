# verify + close-up renders for wave2_1. usage: blender -b <blend> -P closeup_wave2_1.py -- outdir samples
import bpy, math, sys
from mathutils import Vector
A=sys.argv[sys.argv.index('--')+1:]; OD=A[0]; SAMP=int(A[1]); S=bpy.context.scene; dg=bpy.context.evaluated_depsgraph_get()
def desc(o): r=[o]; [r.extend(desc(c)) for c in o.children]; return r
def wverts(objs):
    P=[]
    for o in objs:
        if o.type!='MESH': continue
        e=o.evaluated_get(dg); m=e.to_mesh(); P+=[o.matrix_world@v.co for v in m.vertices]; e.to_mesh_clear()
    return P
pl=[o for o in bpy.data.objects if o.name.startswith('player') or (o.type=='MESH' and o.users_collection and o.users_collection[0].name=='Player')]
desk=desc(bpy.data.objects['Desk']); ch=desc(bpy.data.objects['ErgoChair'])
dv=wverts(desk); top=[p for p in dv if p.z>0.70]
x0,x1=min(p.x for p in top),max(p.x for p in top); y0,y1=min(p.y for p in top),max(p.y for p in top); z0,z1=min(p.z for p in top),max(p.z for p in top)
pv=wverts(pl)
inside=[p for p in pv if x0<p.x<x1 and y0<p.y<y1 and z0<p.z<z1]
near=[p for p in pv if x0<p.x<x1 and y0<p.y<y1 and p.z>=z1]
print('DESKTOP',[round(v,3) for v in (x0,x1,y0,y1,z0,z1)],'player verts inside desktop slab',len(inside),'over desk',len(near),'min z over desk',round(min((p.z for p in near),default=9),3))
cv=wverts(ch); print('CHAIR bbox',[round(min(p[i] for p in cv),3) for i in range(3)],[round(max(p[i] for p in cv),3) for i in range(3)])
kb=wverts(desc(bpy.data.objects['Keyboard'])); print('KEYBOARD x',round(min(p.x for p in kb),3),round(max(p.x for p in kb),3))
cam=S.camera; cam.data.type='PERSP'; cam.data.lens=35; cam.data.shift_y=0
S.render.resolution_x=1600; S.render.resolution_y=1000; S.eevee.taa_render_samples=SAMP; S.render.film_transparent=False
for tag,loc,tgt in (('closeup_hands',(-0.55,-0.75,1.35),(-1.33,0.2,0.80)),('closeup_hands_side',(-1.15,-0.95,0.95),(-1.25,0.2,0.80)),('closeup_chair',(0.25,-0.85,1.15),(-0.85,0.2,0.55))):
    cam.location=loc; cam.rotation_euler=(Vector(tgt)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    S.render.filepath=OD+'/views/'+tag+'.png'; bpy.ops.render.render(write_still=True)
