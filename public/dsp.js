// Browser reconstruction of the recovered desktop DSP chain.

export const SR=44100;
export const defaults={pitch_cents:42,tempo_factor:1.02,deresonance:.85,punch:.75,room_ir:.16,dispersion:.95,flutter:.55,air:.7,analog:.7,room_db:-58,mono_bass:'140 Hz',lufs:-11.5,output_format:'wav24'};
export const ranges={pitch_cents:[-100,100],tempo_factor:[.8,1.2],deresonance:[0,1],punch:[0,1],room_ir:[0,.4],dispersion:[0,1],flutter:[0,1],air:[0,1],analog:[0,1],room_db:[-90,-35],lufs:[-24,-8]};
export function validateSettings(input={}){
  const s={...defaults};
  for(const [k,[min,max]] of Object.entries(ranges)){
    const n=Number(input[k]??s[k]);if(!Number.isFinite(n))throw new Error(`Parameter ${k} tidak valid.`);
    s[k]=Math.max(min,Math.min(max,n));
  }
  if(['Off','80 Hz','120 Hz','140 Hz','200 Hz'].includes(input.mono_bass))s.mono_bass=input.mono_bass;
  if(['wav24','wav16','mp3','flac'].includes(input.output_format))s.output_format=input.output_format;
  else if(typeof input.output_format==='string')s.output_format=input.output_format.includes('MP3')?'mp3':input.output_format.includes('FLAC')?'flac':'wav24';
  return s;
}
export function rng(seed=1337){let state=seed>>>0;return()=>{state=(1664525*state+1013904223)>>>0;return (state+.5)/4294967296;};}
const gaussian=random=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
export function biquad(type,freq,q=Math.SQRT1_2,gain=0,sr=SR){
  const w=2*Math.PI*Math.min(freq,sr*.475)/sr,c=Math.cos(w),sin=Math.sin(w),alpha=sin/(2*q),A=10**(gain/40);
  let b,a;
  if(type==='low'){b=[(1-c)/2,1-c,(1-c)/2];a=[1+alpha,-2*c,1-alpha];}
  else if(type==='high'){b=[(1+c)/2,-1-c,(1+c)/2];a=[1+alpha,-2*c,1-alpha];}
  else if(type==='peak'){b=[1+alpha*A,-2*c,1-alpha*A];a=[1+alpha/A,-2*c,1-alpha/A];}
  else if(type==='shelf'){const r=2*Math.sqrt(A)*alpha;b=[A*((A+1)+(A-1)*c+r),-2*A*((A-1)+(A+1)*c),A*((A+1)+(A-1)*c-r)];a=[(A+1)-(A-1)*c+r,2*((A-1)-(A+1)*c),(A+1)-(A-1)*c-r];}
  else {b=[1-alpha,-2*c,1+alpha];a=[1+alpha,-2*c,1-alpha];}
  return {b:b.map(x=>x/a[0]),a:a.map(x=>x/a[0])};
}
export function filter(x,coeff,reverse=false){
  const {b,a}=coeff,out=new Float32Array(x.length);let z1=0,z2=0;
  for(let j=0;j<x.length;j++){const i=reverse?x.length-1-j:j,y=b[0]*x[i]+z1;z1=b[1]*x[i]-a[1]*y+z2;z2=b[2]*x[i]-a[2]*y;out[i]=y;}
  return out;
}
const zeroPhase=(x,c)=>filter(filter(x,c),c,true);
export function multiband(channels,s,sr){
  // The recovered code always collapsed its <200 Hz band to mono; here Off works.
  const low=channels.map(x=>zeroPhase(x,biquad('low',200,Math.SQRT1_2,0,sr)));
  const high=channels.map((x,c)=>zeroPhase(x.map((v,i)=>v-low[c][i]),biquad('high',6500,Math.SQRT1_2,0,sr)));
  let mid=channels.map((x,c)=>x.map((v,i)=>v-low[c][i]-high[c][i]));
  if(s.deresonance>.01)for(const [f,q,g] of [[3150,2.5,-5.5],[4400,2.8,-4],[6250,3,-6]])mid=mid.map(x=>filter(x,biquad('peak',f,q,g*s.deresonance,sr)));
  const cutoff=parseFloat(s.mono_bass)||0;
  const bass=cutoff?channels.map(x=>zeroPhase(x,biquad('low',cutoff,Math.SQRT1_2,0,sr))):null;
  const dl=1+.5*s.analog,dm=1+1.2*s.analog;
  return channels.map((x,c)=>Float32Array.from(x,(_,i)=>{
    let l=low[c][i]+(bass?(bass[0][i]+bass[1][i])*.5-bass[c][i]:0),m=mid[c][i],h=high[c][i];
    if(s.analog>.01){l=Math.tanh(l*dl)/Math.tanh(dl);const v=m*dm;m=Math.tanh(v+.2*s.analog*v*v*Math.sign(v))/Math.tanh(dm);h=Math.tanh(h*1.2)/1.2;}
    return l+m+h;
  }));
}
export function punch(channels,amount,sr){
  if(amount<=.01)return channels;const af=Math.exp(-1/(.003*sr)),as=Math.exp(-1/(.04*sr));
  return channels.map(x=>{let fast=0,slow=0;return x.map(v=>{fast=af*fast+(1-af)*Math.abs(v);slow=as*slow+(1-as)*Math.abs(v);return v*Math.min(1+2.2*amount,1+2*amount*Math.max(0,fast-slow)/(slow+.0001));});});
}
// Radix-2 FFT, used for block convolution without an audio server.
export function fft(re,im,inverse=false){
  const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let size=2;size<=n;size*=2){const angle=(inverse?2:-2)*Math.PI/size,wr=Math.cos(angle),wi=Math.sin(angle);for(let start=0;start<n;start+=size){let ur=1,ui=0;for(let j=0;j<size/2;j++){const a=start+j,b=a+size/2,tr=ur*re[b]-ui*im[b],ti=ur*im[b]+ui*re[b];re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=ur*wr-ui*wi;ui=ur*wi+ui*wr;ur=next;}}}
  if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}
}
export function convolve(x,ir){
  let n=1;while(n<ir.length*2)n*=2;const hop=n-ir.length+1,Hr=new Float64Array(n),Hi=new Float64Array(n);Hr.set(ir);fft(Hr,Hi);
  const out=new Float32Array(x.length),re=new Float64Array(n),im=new Float64Array(n);
  for(let start=0;start<x.length;start+=hop){re.fill(0);im.fill(0);re.set(x.subarray(start,start+hop));fft(re,im);for(let j=0;j<n;j++){const r=re[j]*Hr[j]-im[j]*Hi[j];im[j]=re[j]*Hi[j]+im[j]*Hr[j];re[j]=r;}fft(re,im,true);for(let j=0;j<n&&start+j<out.length;j++)out[start+j]+=re[j];}
  return out;
}
export function room(channels,amount,sr,random){
  if(amount<=.005)return channels;
  const size=Math.floor(.22*sr),ir=[0,1].map(()=>filter(Float32Array.from({length:size},(_,i)=>gaussian(random)*Math.exp(-i/sr*20)),biquad('low',6800,Math.SQRT1_2,0,sr)));
  const norm=Math.sqrt(ir[0].reduce((sum,v)=>sum+v*v,0))+1e-6;ir.forEach(x=>{for(let i=0;i<x.length;i++)x[i]/=norm;});
  const wet=Math.min(.4,amount*1.8),dry=Math.sqrt(Math.max(.01,1-wet*wet));
  return channels.map((x,c)=>{const w=convolve(x,ir[c]);return x.map((v,i)=>dry*v+wet*w[i]);});
}
export function dispersion(channels,amount,sr,random){
  if(amount<=.01)return channels;const stages=Math.max(2,Math.floor(8*amount));let out=channels.map(x=>x.slice());
  for(let i=0;i<stages;i++){const freq=4500+(Math.min(20500,sr/2-300)-4500)*i/(stages-1);out=out.map(x=>filter(x,biquad('allpass',freq,1.4+.3*(random()*.4-.2),0,sr)));}
  const mix=Math.min(1,.6+.4*amount);return out.map((x,c)=>x.map((v,i)=>(1-mix)*channels[c][i]+mix*v));
}
export function flutter(channels,amount,sr){
  if(amount<=.01)return channels;
  return channels.map(x=>x.map((_,i)=>{const t=i/sr,pos=Math.max(0,Math.min(x.length-1,i+(Math.sin(2*Math.PI*.52*t)*.65+Math.sin(2*Math.PI*.89*t)*.35)*(1+3*amount))),j=Math.floor(pos);return x[j]+(x[Math.min(j+1,x.length-1)]-x[j])*(pos-j);}));
}
export function air(channels,amount,sr){
  if(amount<=.01)return channels;
  return channels.map(x=>{let band=filter(filter(x,biquad('high',10000,Math.SQRT1_2,0,sr)),biquad('low',15500,Math.SQRT1_2,0,sr));band=band.map(v=>Math.sign(v)*v*v+.45*Math.tanh(4*v));const extra=filter(band,biquad('high',15800,Math.SQRT1_2,0,sr));return x.map((v,i)=>v+extra[i]*(.06+.12*amount));});
}
export function ambiance(channels,db,sr,random){
  return channels.map(x=>{const noise=Float32Array.from(x,()=>gaussian(random));const shaped=filter(filter(noise,biquad('high',85,Math.SQRT1_2,0,sr)),biquad('low',10500,Math.SQRT1_2,0,sr));const gain=10**(db/20);return x.map((v,i)=>v+(random()+random()-1)*7.943282347242822e-5+shaped[i]*gain);});
}
// BS.1770-style K weighting, 400 ms windows, 100 ms hops, absolute/relative gating.
export function loudness(channels,sr=SR){
  const weighted=channels.map(x=>filter(filter(x,biquad('shelf',1500,1/Math.sqrt(2),4,sr)),biquad('high',38,.5,0,sr)));
  const size=Math.min(Math.round(.4*sr),channels[0].length),hop=Math.max(1,Math.round(.1*sr));if(!size)return -Infinity;
  const energies=[];let sum=0;for(const x of weighted)for(let i=0;i<size;i++)sum+=x[i]*x[i];
  energies.push(sum/size);
  for(let start=hop;start+size<=weighted[0].length;start+=hop){for(const x of weighted)for(let j=0;j<hop;j++)sum+=x[start+size-hop+j]**2-x[start-hop+j]**2;energies.push(Math.max(0,sum)/size);}
  const abs=energies.filter(v=>v>10**((-70+.691)/10));if(!abs.length)return -Infinity;
  const mean=abs.reduce((a,b)=>a+b)/abs.length,rel=abs.filter(v=>v>mean*.1);return -.691+10*Math.log10(rel.reduce((a,b)=>a+b)/rel.length);
}
export function samplePeak(channels){let p=0;for(const x of channels)for(const v of x)p=Math.max(p,Math.abs(v));return p;}
export function truePeak(channels){
  let peak=samplePeak(channels);for(const x of channels)for(let i=0;i<x.length-1;i++){
    const a=x[Math.max(0,i-1)],b=x[i],c=x[i+1],d=x[Math.min(i+2,x.length-1)];
    for(let j=1;j<4;j++){const t=j/4;peak=Math.max(peak,Math.abs(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)));}
  }return peak;
}
export function master(channels,target,sr){
  const current=loudness(channels,sr),gain=Number.isFinite(current)?10**(Math.max(-24,Math.min(12,target-current))/20):1,ceiling=10**(-1/20);
  let out=channels.map(x=>x.map(v=>v*gain));if(samplePeak(out)>ceiling)out=out.map(x=>x.map(v=>Math.tanh(v/ceiling)*ceiling));
  const peak=truePeak(out);if(peak>ceiling)out=out.map(x=>x.map(v=>v*(ceiling/peak)*.999));return out;
}
export async function processAudio(channels,settings,progress=()=>{}){
  const s=validateSettings(settings),random=rng();if(channels.length!==2||!channels[0].length||channels[0].length!==channels[1].length)throw new Error('Audio stereo tidak valid.');
  let audio=channels;
  const stages=[['Multiband & tekstur analog',x=>multiband(x,s,SR)],['Dinamika transient',x=>punch(x,s.punch,SR)],['Ruang studio',x=>room(x,s.room_ir,SR,random)],['Dispersi fase',x=>dispersion(x,s.dispersion,SR,random)],['Micro flutter',x=>flutter(x,s.flutter,SR)],['Harmonic air',x=>air(x,s.air,SR)],['Ambiance & dither',x=>ambiance(x,s.room_db,SR,random)],['Loudness & peak',x=>master(x,s.lufs,SR)]];
  for(let i=0;i<stages.length;i++){progress(i/stages.length,stages[i][0]);audio=stages[i][1](audio);await new Promise(r=>setTimeout(r,0));}
  for(const x of audio)for(const v of x)if(!Number.isFinite(v))throw new Error('DSP menghasilkan nilai audio tidak valid.');
  progress(1,'Audio selesai');return {channels:audio,stats:{lufs:loudness(audio,SR),peakDb:20*Math.log10(truePeak(audio)||1e-12),duration:audio[0].length/SR}};
}
