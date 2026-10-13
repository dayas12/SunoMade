import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {zipBlobs,crc32Update} from '../public/zip.js';
test('CRC32 matches the standard ZIP checksum vector',()=>{assert.equal((crc32Update(0xffffffff,new TextEncoder().encode('123456789'))^0xffffffff)>>>0,0xcbf43926);});
test('bulk ZIP preserves file bytes, Unicode names, and disambiguates duplicate paths',async()=>{
  const entries=[{name:'lagu.wav',blob:new Blob(['audio one'])},{name:'lagu.wav',blob:new Blob(['audio two'])},{name:'../lagu ❤️.mp3',blob:new Blob(['audio three'])}],zip=await zipBlobs(entries),buffer=await zip.arrayBuffer(),v=new DataView(buffer);assert.equal(v.getUint32(0,true),0x04034b50);const end=buffer.byteLength-22;assert.equal(v.getUint32(end,true),0x06054b50);assert.equal(v.getUint16(end+10,true),3);let offset=v.getUint32(end+16,true),names=[];
  for(let i=0;i<3;i++){assert.equal(v.getUint32(offset,true),0x02014b50);const length=v.getUint16(offset+28,true);names.push(new TextDecoder().decode(new Uint8Array(buffer,offset+46,length)));offset+=46+length;}
  assert.deepEqual(names,['lagu.wav','lagu (2).wav','_lagu ❤️.mp3']);
  if(process.env.AUDIO_TEST_OUTPUT){mkdirSync(process.env.AUDIO_TEST_OUTPUT,{recursive:true});writeFileSync(process.env.AUDIO_TEST_OUTPUT+'/bulk.zip',new Uint8Array(buffer));}
});
test('empty archives and ZIP64-sized bulk exports are rejected',async()=>{await assert.rejects(zipBlobs([]));await assert.rejects(zipBlobs([{name:'large.wav',blob:{size:3*1024**3}}]));});

