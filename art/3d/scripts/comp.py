import sys
from PIL import Image, ImageFilter, ImageChops
import numpy as np
D='/workspace/devlife-3d/'
def comp(raw,out):
    im=Image.open(raw).convert('RGBA'); W,H=im.size
    y=np.linspace(0,1,H)[:,None]; x=np.linspace(-1,1,W)[None,:]
    top=np.array([176,160,206]); bot=np.array([150,130,182])
    g=top+(bot-top)*y[...,None]; g=g*(1-0.08*(x[...,None]**2))
    bg=Image.fromarray(np.broadcast_to(g,(H,W,3)).clip(0,255).astype('uint8')).convert('RGBA')
    # soft contact shadow under base
    a=np.array(im)[...,3].astype(float)/255
    sh=Image.fromarray((a*120).astype('uint8')).filter(ImageFilter.GaussianBlur(30))
    sh=ImageChops.offset(sh,0,22)
    dark=Image.new('RGBA',(W,H),(80,60,110,255)); bg=Image.composite(dark,bg,sh)
    o=Image.alpha_composite(bg,im).convert('RGB')
    # bloom on bright
    arr=np.array(o).astype(float); lum=arr.mean(2)
    br=np.where(lum[...,None]>215,arr,0).astype('uint8')
    bl=np.array(Image.fromarray(br).filter(ImageFilter.GaussianBlur(14))).astype(float)
    o=Image.fromarray((arr+bl*0.55).clip(0,255).astype('uint8'))
    # tilt-shift: blur top/bottom bands
    b=o.filter(ImageFilter.GaussianBlur(3.5)); m=np.abs(np.linspace(-1,1,H)-0.05)
    mask=((m-0.55)/0.4).clip(0,1); mk=Image.fromarray((np.broadcast_to(mask[:,None],(H,W))*255).astype('uint8'))
    o=Image.composite(b,o,mk); o.save(out); print(out)
if __name__=='__main__':
    for t in sys.argv[1:]: comp(D+'views/raw_'+t+'.png',D+t+'.png')
