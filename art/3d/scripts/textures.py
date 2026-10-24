from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
O='/workspace/devlife-3d/scripts/'
F='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
# poster 300x400
im=Image.new('RGB',(300,400),(246,240,228)); d=ImageDraw.Draw(im)
d.rounded_rectangle((40,40,260,190),12,fill=(218,37,29))
cx,cy,R=150,115,52
pts=[(cx+(R if i%2==0 else R*0.38)*math.sin(i*math.pi/5),cy-(R if i%2==0 else R*0.38)*math.cos(i*math.pi/5)) for i in range(10)]
d.polygon(pts,fill=(255,205,0))
f=ImageFont.truetype(F,44); t='VIỆT NAM'; w=d.textlength(t,font=f); d.text(((300-w)/2,235),t,font=f,fill=(60,50,60))
# heart
hx,hy=150,335
d.ellipse((hx-26,hy-22,hx+2,hy+6),fill=(220,70,80)); d.ellipse((hx-2,hy-22,hx+26,hy+6),fill=(220,70,80)); d.polygon([(hx-25,hy-2),(hx+25,hy-2),(hx,hy+28)],fill=(220,70,80))
im.save(O+'tex_poster.png')
# sky 400x300
W,H=400,300; im=Image.new('RGB',(W,H)); px=im.load()
top=(140,100,200); mid=(235,140,180); bot=(255,175,110)
for y in range(H):
    t=y/(H-1)
    c=[top[i]+(mid[i]-top[i])*t*2 if t<.5 else mid[i]+(bot[i]-mid[i])*(t-.5)*2 for i in range(3)]
    for x in range(W): px[x,y]=tuple(int(v) for v in c)
d=ImageDraw.Draw(im)
for (x,y,s) in ((80,80,1),(300,190,1.2),(120,210,.8)):
    for dx,dy,r in ((0,0,22),(25,-8,26),(52,0,20)): d.ellipse((x+dx*s-r*s,y+dy*s-r*s*0.7,x+dx*s+r*s,y+dy*s+r*s*0.7),fill=(240,180,210))
d.ellipse((260,50,330,120),fill=(255,240,190)); d.ellipse((280,40,350,110),fill=top)
im=im.filter(ImageFilter.GaussianBlur(1.5)); im.save(O+'tex_sky.png')
# monitor 320x200: blue sky + mountain
im=Image.new('RGB',(320,200),(90,120,200)); d=ImageDraw.Draw(im)
for y in range(200): d.line((0,y,320,y),fill=(int(80+y*0.4),int(100+y*0.5),int(190+y*0.2)))
d.polygon([(60,170),(160,60),(260,170)],fill=(70,80,150)); d.polygon([(130,94),(160,60),(190,94),(175,88),(160,100),(145,88)],fill=(245,245,255))
d.rectangle((0,170,320,200),fill=(60,70,130)); im.save(O+'tex_screen.png')
