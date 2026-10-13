// ZIP STORE keeps already-encoded audio unchanged and avoids extra compression memory.
const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32Update(crc,bytes){for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return crc>>>0;}
function uniqueName(name,used){
  let clean=String(name).normalize('NFC').replace(/[\\/\x00-\x1f<>:"|?*]/g,'_').replace(/^\.+/,'').trim()||'audio';
  const dot=clean.lastIndexOf('.'),base=dot>0?clean.slice(0,dot):clean,ext=dot>0?clean.slice(dot):'';let index=1;
  while(used.has(clean.toLowerCase()))clean=`${base} (${++index})${ext}`;used.add(clean.toLowerCase());return clean;
}
function timestamp(date){return {time:(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1),date:((Math.max(1980,Math.min(2107,date.getFullYear()))-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate()};}
export async function zipBlobs(entries,onProgress=()=>{}){
  if(!entries.length)throw new Error('Belum ada hasil untuk diunduh.');if(entries.length>65535)throw new Error('Terlalu banyak file untuk satu ZIP.');
  const total=entries.reduce((sum,e)=>sum+e.blob.size,0);if(total>2*1024**3)throw new Error('Total hasil melebihi 2 GB. Unduh dalam beberapa antrean.');
  const parts=[],directory=[],used=new Set(),stamp=timestamp(new Date());let offset=0,processed=0;
  for(const entry of entries){
    const name=new TextEncoder().encode(uniqueName(entry.name,used));if(name.length>65535)throw new Error('Nama file terlalu panjang.');
    let crc=0xffffffff;const reader=entry.blob.stream().getReader();try{while(true){const {done,value}=await reader.read();if(done)break;crc=crc32Update(crc,value);processed+=value.byteLength;onProgress(total?processed/total:1);}}finally{reader.releaseLock();}crc=(crc^0xffffffff)>>>0;
    const header=new Uint8Array(30+name.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(10,stamp.time,true);v.setUint16(12,stamp.date,true);v.setUint32(14,crc,true);v.setUint32(18,entry.blob.size,true);v.setUint32(22,entry.blob.size,true);v.setUint16(26,name.length,true);header.set(name,30);
    const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,stamp.time,true);c.setUint16(14,stamp.date,true);c.setUint32(16,crc,true);c.setUint32(20,entry.blob.size,true);c.setUint32(24,entry.blob.size,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
    parts.push(header,entry.blob);directory.push(central);offset+=header.length+entry.blob.size;await new Promise(resolve=>setTimeout(resolve,0));
  }
  const directorySize=directory.reduce((sum,p)=>sum+p.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,directorySize,true);v.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/zip'});
}
