import createFFmpegCore from './vendor/ffmpeg/ffmpeg-core.js';
import {processAudio,SR,validateSettings} from './dsp.js';
import {audioFilters,outputOptions,interleave,deinterleave,runCommand,measureOutput} from './ffmpeg-audio.js';
let instance=null,loading=null,working=false;
const progress=(value,message)=>self.postMessage({type:'progress',value,message});
async function engine(){
  if(instance)return instance;
  if(!loading)loading=(async()=>{
    progress(.01,'Memuat FFmpeg lokal (~31 MB pada kunjungan pertama)…');
    const response=await fetch(new URL('./vendor/ffmpeg/ffmpeg-core.wasm',import.meta.url));if(!response.ok)throw new Error('Mesin FFmpeg tidak ditemukan. Pastikan seluruh folder public ikut dideploy.');
    const wasmBinary=new Uint8Array(await response.arrayBuffer());progress(.03,'Menyiapkan FFmpeg di PC Anda…');
    const core=await createFFmpegCore({wasmBinary});
    const filters=runCommand(core,['-hide_banner','-filters']);core.supportsRubberBand=/\brubberband\s/.test(filters);
    instance=core;return core;
  })().catch(error=>{loading=null;throw error;});
  return loading;
}
self.onmessage=async({data})=>{
  if(working){self.postMessage({type:'error',message:'Mesin audio sedang dipakai.'});return;}working=true;
  let core;const files=['input.audio','decoded.f32','master.f32','output.wav','output.mp3','output.flac'];
  try{
    const s=validateSettings(data.settings);if(!(data.input instanceof ArrayBuffer)||data.input.byteLength>128*1024**2)throw new Error('File input tidak valid atau melebihi 128 MB.');
    core=await engine();core.FS.writeFile('input.audio',new Uint8Array(data.input));data.input=null;
    progress(.06,'FFmpeg: mendekode audio menjadi stereo 44.1 kHz…');
    core.setProgress(({progress:p})=>progress(.06+Math.max(0,Math.min(1,p||0))*.09,'FFmpeg: mendekode audio…'));
    runCommand(core,['-hide_banner','-loglevel','error','-i','input.audio','-map','0:a:0','-vn','-t','601','-ar',String(SR),'-ac','2','-f','f32le','decoded.f32']);
    const channels=deinterleave(core.FS.readFile('decoded.f32'));core.FS.unlink('input.audio');core.FS.unlink('decoded.f32');
    const result=await processAudio(channels,s,(value,message)=>progress(.16+value*.56,message));
    core.FS.writeFile('master.f32',interleave(result.channels));
    const output=outputOptions(s.output_format),name='output.'+output.extension;
    progress(.74,'FFmpeg: pitch, tempo, filter akhir & encoding…');core.setProgress(({progress:p})=>progress(.74+Math.max(0,Math.min(1,p||0))*.15,'FFmpeg: mengekspor '+output.extension.toUpperCase()+'…'));
    const title=String(data.filename||'Master').replace(/\.[^.]+$/,'').replace(/[\x00-\x1f]/g,'').slice(0,256);
    runCommand(core,['-hide_banner','-loglevel','error','-f','f32le','-ar',String(SR),'-ac','2','-i','master.f32','-af',audioFilters(s,core.supportsRubberBand),'-map_metadata','-1','-map_chapters','-1','-metadata','title='+title,'-metadata','comment=Mastered locally with Human Made Web',...output.args,'-ar',String(SR),name]);
    core.FS.unlink('master.f32');progress(.91,'FFmpeg: mengukur loudness & true peak hasil…');core.setProgress(()=>{});
    const measured=measureOutput(core,name),bytes=core.FS.readFile(name),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    self.postMessage({type:'done',buffer,stats:{...measured,duration:result.channels[0].length/SR/s.tempo_factor},mime:output.mime,extension:output.extension},[buffer]);
  }catch(error){self.postMessage({type:'error',message:error.message||String(error)});}
  finally{if(core)for(const name of files)try{core.FS.unlink(name);}catch{}working=false;}
};
