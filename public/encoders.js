const clamp=v=>Math.max(-1,Math.min(1,v));
const pcm=(v,bits)=>Math.round(clamp(v)*(v<0?2**(bits-1):2**(bits-1)-1));
const text=(view,offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
export function wav(channels,sr,bits=24){
  const bytes=bits/8,n=channels[0].length,count=channels.length,dataSize=n*count*bytes;
  const software=new TextEncoder().encode('Human Made Web\0'),infoSize=4+8+software.length+(software.length%2),padding=dataSize%2;
  const buffer=new ArrayBuffer(44+dataSize+padding+8+infoSize),v=new DataView(buffer);
  text(v,0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);text(v,8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,count,true);v.setUint32(24,sr,true);v.setUint32(28,sr*count*bytes,true);v.setUint16(32,count*bytes,true);v.setUint16(34,bits,true);text(v,36,'data');v.setUint32(40,dataSize,true);
  let o=44;for(let i=0;i<n;i++)for(const ch of channels){const a=pcm(ch[i],bits);if(bits===16){v.setInt16(o,a,true);o+=2;}else{v.setUint8(o++,a&255);v.setUint8(o++,(a>>8)&255);v.setUint8(o++,(a>>16)&255);}}
  o+=padding;text(v,o,'LIST');v.setUint32(o+4,infoSize,true);text(v,o+8,'INFOISFT');v.setUint32(o+16,software.length,true);new Uint8Array(buffer,o+20,software.length).set(software);
  return buffer;
}
function crc(bytes,poly,width){let c=0;const top=1<<(width-1),mask=(1<<width)-1;for(const b of bytes){c^=b<<(width-8);for(let j=0;j<8;j++)c=((c<<1)^((c&top)?poly:0))&mask;}return c;}
function utf8Number(n){if(n<128)return[n];let bytes=2;while(n>=2**(5*bytes+1))bytes++;const out=Array(bytes);for(let i=bytes-1;i>0;i--){out[i]=128|(n&63);n=Math.floor(n/64);}out[0]=((255<<(8-bytes))&255)|n;return out;}
export function flac(channels,sr){
  // FLAC verbatim subframes are lossless, valid, and intentionally uncompressed.
  const n=channels[0].length,count=channels.length,block=4096,bits=24;
  const head=new Uint8Array(42),v=new DataView(head.buffer);head.set([102,76,97,67,128,0,0,34]);v.setUint16(8,Math.min(block,n));v.setUint16(10,Math.min(block,n));
  const packed=(BigInt(sr)<<44n)|(BigInt(count-1)<<41n)|(BigInt(bits-1)<<36n)|BigInt(n);v.setBigUint64(18,packed);
  const parts=[head];let length=head.length;
  for(let start=0,index=0;start<n;start+=block,index++){
    const size=Math.min(block,n-start),prefix=[255,248,0x79,((count-1)<<4)|(6<<1),...utf8Number(index),(size-1)>>8,(size-1)&255];prefix.push(crc(prefix,7,8));
    const frame=new Uint8Array(prefix.length+count*(1+size*3)+2);frame.set(prefix);let o=prefix.length;
    for(const ch of channels){frame[o++]=2;for(let i=0;i<size;i++){const s=pcm(ch[start+i],24);frame[o++]=(s>>16)&255;frame[o++]=(s>>8)&255;frame[o++]=s&255;}}
    const checksum=crc(frame.subarray(0,o),0x8005,16);frame[o++]=checksum>>8;frame[o]=checksum&255;parts.push(frame);length+=frame.length;
  }
  const result=new Uint8Array(length);let offset=0;for(const p of parts){result.set(p,offset);offset+=p.length;}return result.buffer;
}
export function mp3(channels,sr,Encoder,progress=()=>{}){
  const encoder=new Encoder(2,sr,320),parts=[],size=1152;
  for(let start=0;start<channels[0].length;start+=size){const count=Math.min(size,channels[0].length-start),l=new Int16Array(count),r=new Int16Array(count);for(let i=0;i<count;i++){l[i]=pcm(channels[0][start+i],16);r[i]=pcm(channels[1][start+i],16);}const out=encoder.encodeBuffer(l,r);if(out.length)parts.push(new Uint8Array(out));if(start%(size*100)===0)progress(start/channels[0].length);}
  const tail=encoder.flush();if(tail.length)parts.push(new Uint8Array(tail));const result=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let off=0;for(const p of parts){result.set(p,off);off+=p.length;}return result.buffer;
}
