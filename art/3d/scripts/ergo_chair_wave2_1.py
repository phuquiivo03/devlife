# ergonomic chair v2.1 (exec'd from build_room_wave2_1.py). local: front +Y, seat centre at x=y=0, floor z=0
import bmesh
lav=mat('ErgoLavender','b8a8de',.9); lavD=mat('ErgoLavDark','8f82b8',.9); ergoG=mat('ErgoGrey','8a8794',.85)
meshA=mat('ErgoMeshA','c4b7e6',.95); meshB=mat('ErgoMeshB','b0a3d8',.95); castM=mat('Caster','55535e',.85)
ERGO_POS=(-0.824,0.2,0.02); ERGO_YAW=90
def back_pt(u,v,off=0.0):
    # u in [-1,1] across, v in [0,1] up the spine
    z=0.46+0.64*v; w=0.25-0.03*v
    y=-0.265-0.09*v**1.6+0.03*math.exp(-((v-0.18)/0.14)**2)+0.075*u*u
    return Vector((u*w,y+off,z))
with item('ErgoChair'):
    # 5-star base + casters
    for k in range(5):
        a=k*2*math.pi/5+math.pi/2; d=Vector((math.cos(a),math.sin(a),0))
        ltube(d*0.05+Vector((0,0,0.10)),d*0.29+Vector((0,0,0.075)),0.024,ergoG,v=6)
        sph(d*0.29+Vector((0,0,0.075)),0.03,ergoG,seg=6)                                  # leg tip
        cyl(d*0.29+Vector((0,0,0.035)),0.033,0.034,castM,v=8,rot=(math.pi/2,0,a),bev=0)  # wheel
        box(d*0.29+Vector((0,0,0.058)),(0.03,0.05,0.025),ergoG,bev=0.008,seg=1)          # fork
    cyl((0,0,0.10),0.065,0.06,ergoG,v=12,bev=0.02)                 # hub
    cyl((0,0,0.20),0.045,0.16,lavD,v=12,bev=0.01)                  # gas-lift sleeve
    cyl((0,0,0.27),0.026,0.08,ergoG,v=10,bev=0)                    # gas cylinder (chrome-ish grey)
    box((0,0,0.32),(0.26,0.26,0.05),ergoG,bev=0.015,seg=1)        # mechanism
    box((0.15,0.06,0.31),(0.08,0.02,0.02),ergoG,bev=0.006,seg=1)  # lift lever
    # thick seat cushion
    box((0,-0.05,0.362),(0.54,0.42,0.12),lav,bev=0.05,seg=3)
    box((0,0.13,0.345),(0.48,0.06,0.07),lav,bev=0.03,seg=2)        # waterfall front edge
    # spine bar
    ltube((0,-0.08,0.34),(0,-0.32,0.40),0.022,ergoG,v=6); ltube((0,-0.32,0.40),back_pt(0,0.3,-0.04),0.022,ergoG,v=6)
    # curved backrest: frame + checker mesh panel
    NU,NV=10,16; me=bpy.data.meshes.new('back'); bm=bmesh.new()
    vs=[[bm.verts.new(back_pt(-1+2*i/NU,j/NV)) for j in range(NV+1)] for i in range(NU+1)]
    for i in range(NU):
        for j in range(NV):
            f=bm.faces.new((vs[i][j],vs[i+1][j],vs[i+1][j+1],vs[i][j+1]))
            f.material_index=0 if (i in (0,NU-1) or j in (0,NV-1)) else (1+(i+j)%2)
    bm.to_mesh(me); bm.free(); ob=bpy.data.objects.new('back',me); S.collection.objects.link(ob)
    for M in (lavD,meshA,meshB): me.materials.append(M)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active=ob; ob.select_set(True)
    so=ob.modifiers.new('so','SOLIDIFY'); so.thickness=0.035; so.offset=-1; so.material_offset_rim=0
    bpy.ops.object.modifier_apply(modifier='so')
    for p in me.polygons: p.use_smooth=True
    bpy.ops.object.shade_auto_smooth(angle=math.radians(50))
    for md in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    # lumbar pad
    lp=back_pt(0,0.2,0.02); o=box(lp,(0.30,0.05,0.10),lavD,bev=0.022,seg=2)
    # headrest on posts
    for s in (-1,1): ltube(back_pt(s*0.3,0.95,-0.03),back_pt(s*0.3,0.95,-0.03)+Vector((0,-0.01,0.13)),0.012,ergoG,v=6)
    hp=back_pt(0,1.0,0)+Vector((0,0.0,0.14)); box(hp,(0.30,0.07,0.12),lav,bev=0.03,seg=2,rot=(math.radians(-10),0,0))
    # adjustable T armrests
    for s in (-1,1):
        box((s*0.24,-0.04,0.34),(0.16,0.05,0.025),ergoG,bev=0.008,seg=1)   # bracket under seat
        cyl((s*0.34,-0.04,0.45),0.022,0.22,ergoG,v=8,bev=0)                 # outer post
        cyl((s*0.34,-0.04,0.61),0.016,0.08,lavD,v=8,bev=0)                  # inner adjustable post
        box((s*0.34,-0.03,0.66),(0.075,0.24,0.035),lavD,bev=0.016,seg=2)    # T pad
        box((s*0.365,-0.04,0.53),(0.012,0.04,0.025),lav,bev=0.005,seg=1)    # height button
place('ErgoChair',ERGO_POS,ERGO_YAW)
_ec=[o for o in bpy.data.objects if o.type=='MESH' and o.parent and o.parent.name=='ErgoChair']
bpy.context.view_layer.update()
_dg=bpy.context.evaluated_depsgraph_get()
_mz=min((o.matrix_world@v.co).z for o in _ec for v in o.evaluated_get(_dg).to_mesh().vertices)
bpy.data.objects['ErgoChair'].location.z+=0.02-_mz; bpy.context.view_layer.update(); print('ERGO_MINZ',_mz)
