# 'cheapest bed': thin dorm mattress on the floor. exec'd inside build_room_bed_floor_mat_v1.py (world coords, same footprint as old Bed).
import bmesh
mC=mat('FloorMat_Cream','e6dcc8',.92); mP=mat('FloorMat_Pillow','eee8dc',.92); mB=mat('FloorMat_Blanket','b8cadc',.92); mBd=mat('FloorMat_BlanketFold','a8bcd2',.92)
FZ=0.02; MT=0.06; ML,MW=1.85,1.0; mx0=bcx-ML/2
def sag(x,y):
    u=(x-(bcx+0.05))/0.55; v=(y-bcy)/0.45
    return -0.010*math.exp(-u*u)*max(0,1-v*v*0.6) + 0.0025*math.sin(11*x+1.3)*math.sin(8*y+0.4)
def slab(c,size,M,cuts,bev,seg,top_only=True,amp=1.0,yaw=0.0,extra=None):
    bpy.ops.mesh.primitive_cube_add(location=c); o=bpy.context.object; o.scale=[s/2 for s in size]; bpy.ops.object.transform_apply(scale=True)
    if cuts:
        bpy.ops.object.mode_set(mode='EDIT'); bm=bmesh.from_edit_mesh(o.data)
        bmesh.ops.subdivide_edges(bm,edges=[e for e in bm.edges if abs((e.verts[0].co-e.verts[1].co).z)<1e-6],cuts=cuts,use_grid_fill=True)
        bmesh.update_edit_mesh(o.data); bpy.ops.object.mode_set(mode='OBJECT')
    if bev:
        b=o.modifiers.new('b','BEVEL'); b.width=bev; b.segments=seg; bpy.ops.object.modifier_apply(modifier='b')
    # normalise local bbox back to the requested size/centre (subdivide+bevel can drift)
    V=o.data.vertices; lo=[min(v.co[i] for v in V) for i in range(3)]; hi=[max(v.co[i] for v in V) for i in range(3)]
    for v in V:
        for i in range(3): v.co[i]=(v.co[i]-(lo[i]+hi[i])/2)/max(hi[i]-lo[i],1e-6)*size[i]
    o.location=(0,0,0); o.rotation_euler=(0,0,0); cy_,sy_=math.cos(yaw),math.sin(yaw)
    for v in o.data.vertices:
        x,y,z=v.co; v.co=(x*cy_-y*sy_+c[0], x*sy_+y*cy_+c[1], z+c[2])
    bpy.context.view_layer.update()
    zc=c[2]
    for v in o.data.vertices:
        w=o.matrix_world@v.co; d=sag(w.x,w.y)*amp
        if extra: d+=extra(w)
        if (v.co.z>zc) or not top_only: v.co.z+=d
        elif not top_only: pass
    return fin(o,M)
with item('Bed'):
    slab((bcx,bcy,FZ+MT/2),(ML,MW,MT),mC,cuts=7,bev=0.028,seg=2)
    # flattened pillow at head end (old headboard side = BX0), slightly askew
    p=slab((mx0+0.24,bcy+0.04,FZ+MT+0.028),(0.34,0.56,0.05),mP,cuts=3,bev=0.022,seg=2,yaw=math.radians(7),
           extra=lambda w:-0.012*(((w.y-bcy-0.04)/0.28)**2))
    # thin blanket: base layer over lower 2/3, sloppily folded back + rolled fold edge
    bx0=bcx-0.2; bx1=mx0+ML+0.02
    slab(((bx0+bx1)/2,bcy-0.01,FZ+MT+0.008),(bx1-bx0,MW+0.04,0.014),mB,cuts=5,top_only=False,bev=0.006,seg=1,
         extra=lambda w:0.004*math.sin(9*w.x+2*w.y))
    fx0=bx0; fx1=bx0+0.42
    slab(((fx0+fx1)/2,bcy+0.01,FZ+MT+0.022),(fx1-fx0,MW-0.06,0.014),mBd,cuts=4,top_only=False,bev=0.006,seg=1,yaw=math.radians(-4),
         extra=lambda w:0.006*math.sin(7*w.y+1)+0.003*math.sin(14*w.x))
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=0.016,depth=MW-0.08,location=(fx0+0.005,bcy+0.01,FZ+MT+0.016+sag(fx0,bcy)),rotation=(math.pi/2,0,math.radians(-4)))
    fin(bpy.context.object,mBd)
