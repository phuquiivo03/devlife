import bpy, math
from mathutils import Vector, Matrix

from mathutils import Vector, Matrix
D='/workspace/devlife-3d/'; T=D+'scripts/'
C=lambda h:tuple(((int(h[i:i+2],16)/255)**2.2) for i in (0,2,4))
mats={}
def mat(n,h,r=.85,e=0,img=None,es=1.0):
    if n in mats: return mats[n]
    M=bpy.data.materials.new(n); M.use_nodes=True; nt=M.node_tree; b=nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*C(h),1); b.inputs['Roughness'].default_value=r
    b.inputs['Specular IOR Level'].default_value=0.25
    if img:
        t=nt.nodes.new('ShaderNodeTexImage'); t.image=bpy.data.images.load(T+img); t.image.pack()
        nt.links.new(t.outputs[0],b.inputs['Base Color'])
        if e: nt.links.new(t.outputs[0],b.inputs['Emission Color'])
    elif e: b.inputs['Emission Color'].default_value=(*C(h),1)
    if e: b.inputs['Emission Strength'].default_value=e
    mats[n]=M; return M
def fin(o,M,smooth=True):
    o.data.materials.append(M)
    if smooth:
        for p in o.data.polygons: p.use_smooth=True
    return o
def box(loc,size,M,bev=0.04,seg=4,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(location=loc,rotation=rot); o=bpy.context.object
    o.scale=[s/2 for s in size]; bpy.ops.object.transform_apply(scale=True)
    if bev: b=o.modifiers.new('b','BEVEL'); b.width=min(bev,min(size)/2-1e-3); b.segments=seg; b.harden_normals=False
    return fin(o,M,bool(bev))
def cyl(loc,r,d,M,v=32,rot=(0,0,0),bev=0.02,r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=loc,rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=v,radius1=r,radius2=r2,depth=d,location=loc,rotation=rot)
    o=bpy.context.object
    if bev: b=o.modifiers.new('b','BEVEL'); b.width=bev; b.segments=3; b.limit_method='ANGLE'
    fin(o,M); return o
def sph(loc,r,M,sc=(1,1,1),rot=(0,0,0),seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=seg//2,radius=r,location=loc,rotation=rot); o=bpy.context.object; o.scale=sc; return fin(o,M)
def tor(loc,R,r,M,rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R,minor_radius=r,location=loc,rotation=rot,major_segments=40,minor_segments=12); return fin(bpy.context.object,M)
def tube(a,b,r,M):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=d.length,location=(a+b)/2); o=bpy.context.object
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return fin(o,M)
def plane(loc,sx,sy,M,rot):
    bpy.ops.mesh.primitive_plane_add(size=1,location=loc,rotation=rot); o=bpy.context.object; o.scale=(sx,sy,1); return fin(o,M,False)