import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import createFFmpegCore from '../public/vendor/ffmpeg/ffmpeg-core.js';
import {SR,defaults,validateSettings,processAudio,convolve} from '../public/dsp.js';
import {audioFilters,outputOptions,runCommand,measureOutput,interleave,deinterleave} from '../public/ffmpeg-audio.js';
globalThis.self={location:{href:import.meta.url}};
const wasmBinary=await readFile(new URL('../public/vendor/ffmpeg/ffmpeg-core.wasm',import.meta.url));
const core=await createFFmpegCore({wasmBinary});
const sine=(seconds,f=440)=>Float32Array.from({length:Math.round(SR*seconds)},(_,i)=>.15*Math.sin(2*Math.PI*f*i/SR));
test('settings are validated and convolution matches direct calculation',()=>{assert.throws(()=>validateSettings({lufs:'bad'}));const x=Float32Array.from([1,2,3,4]),y=convolve(x,Float32Array.from([.5,.25]));assert.deepEqual([...y],[.5,1.25,2,2.75]);});
test('real FFmpeg core contains required filters; bundled build has no Rubber Band',()=>{const list=runCommand(core,['-hide_banner','-loglevel','info','-filters']);for(const name of ['asetrate','atempo','aresample','ebur128','highpass','lowpass'])assert.ok(list.includes(name),name);assert.ok(!/\brubberband\s/.test(list));});
test('real FFmpeg independently shifts pitch and tempo with expected duration',()=>{
  const x=sine(2);core.FS.writeFile('source.f32',interleave([x,x]));const settings={pitch_cents:100,tempo_factor:1.1};
  runCommand(core,['-hide_banner','-loglevel','error','-f','f32le','-ar',String(SR),'-ac','2','-i','source.f32','-af',audioFilters(settings),'-f','f32le','shifted.f32']);
  const channels=deinterleave(core.FS.readFile('shifted.f32'));assert.ok(Math.abs(channels[0].length/SR-2/1.1)<.06);
  let crossings=0;const start=Math.floor(.3*SR),end=Math.floor(1.4*SR);for(let i=start;i<end;i++)if(channels[0][i]<=0&&channels[0][i+1]>0)crossings++;const frequency=crossings*SR/(end-start);assert.ok(Math.abs(frequency-440*2**(100/1200))<4,frequency.toString());core.FS.unlink('source.f32');core.FS.unlink('shifted.f32');
});
test('actual FFmpeg exports WAV 16/24 bit, MP3 320k, compressed FLAC24, and measures output',async()=>{
  const x=sine(.8),result=await processAudio([x,x.slice()],{...defaults,pitch_cents:0,tempo_factor:1});core.FS.writeFile('master.f32',interleave(result.channels));const decoded={};let wavSize,flacSize;
  for(const format of ['wav24','wav16','mp3','flac']){
    const options=outputOptions(format),file=format+'.'+options.extension;
    runCommand(core,['-hide_banner','-loglevel','error','-f','f32le','-ar',String(SR),'-ac','2','-i','master.f32','-af',audioFilters({pitch_cents:0,tempo_factor:1}),...options.args,file]);
    const output=core.FS.readFile(file);assert.ok(output.length>1000);const stats=measureOutput(core,file);assert.ok(Number.isFinite(stats.lufs));assert.ok(Number.isFinite(stats.peakDb));
    runCommand(core,['-hide_banner','-loglevel','error','-i',file,'-f','s32le','decoded.pcm']);decoded[format]=core.FS.readFile('decoded.pcm').slice();core.FS.unlink('decoded.pcm');
    if(format==='wav24')wavSize=output.length;if(format==='flac')flacSize=output.length;core.FS.unlink(file);
  }
  assert.deepEqual(decoded.flac,decoded.wav24);assert.ok(flacSize<wavSize);core.FS.unlink('master.f32');
});
test('empty and invalid input fail instead of producing a fake result',()=>{
  assert.throws(()=>deinterleave(new Uint8Array(0)));core.FS.writeFile('bad.audio',new Uint8Array([1,2,3]));assert.throws(()=>runCommand(core,['-hide_banner','-loglevel','error','-i','bad.audio','-f','f32le','bad.f32']));core.FS.unlink('bad.audio');try{core.FS.unlink('bad.f32');}catch{}
});
