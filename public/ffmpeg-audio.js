import {SR,validateSettings} from './dsp.js';
export function audioFilters(settings,rubberband=false){
  const s=validateSettings(settings),filters=[],pitch=2**(s.pitch_cents/1200);
  if(Math.abs(s.pitch_cents)>.1||Math.abs(s.tempo_factor-1)>.001){
    if(rubberband)filters.push(`rubberband=pitch=${pitch.toFixed(5)}:tempo=${s.tempo_factor.toFixed(5)}:pitchq=quality:phase=independent:transients=crisp`);
    else{
      const rate=Math.round(SR*pitch),actualPitch=rate/SR;
      filters.push(`asetrate=${rate}`,`aresample=${SR}`,`atempo=${(s.tempo_factor/actualPitch).toFixed(8)}`);
    }
  }
  filters.push('highpass=f=28:p=1','lowpass=f=19500:p=1');return filters.join(',');
}
export function outputOptions(format){
  if(format==='mp3')return {extension:'mp3',mime:'audio/mpeg',args:['-c:a','libmp3lame','-b:a','320k']};
  if(format==='flac')return {extension:'flac',mime:'audio/flac',args:['-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24','-compression_level','8']};
  return {extension:'wav',mime:'audio/wav',args:['-c:a',format==='wav16'?'pcm_s16le':'pcm_s24le']};
}
export function interleave(channels){
  const samples=new Float32Array(channels[0].length*2);for(let i=0;i<channels[0].length;i++){samples[2*i]=channels[0][i];samples[2*i+1]=channels[1][i];}return new Uint8Array(samples.buffer);
}
export function deinterleave(bytes){
  const samples=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),frames=samples.length/2;
  if(!Number.isInteger(frames)||!frames)throw new Error('Tidak ada audio yang dapat dibaca.');
  if(frames>600*SR)throw new Error('Durasi maksimal 10 menit per lagu. Potong lagu menjadi beberapa bagian.');
  const channels=[new Float32Array(frames),new Float32Array(frames)];for(let i=0;i<frames;i++){channels[0][i]=samples[2*i];channels[1][i]=samples[2*i+1];}return channels;
}
export function runCommand(core,args){
  const lines=[];core.setLogger(({message})=>{lines.push(message);if(lines.length>2000)lines.shift();});
  let code;try{code=core.exec(...args);}finally{core.reset();}
  if(code!==0)throw new Error('FFmpeg gagal: '+lines.slice(-5).join(' ').slice(-700));return lines.join('\n');
}
export function measureOutput(core,filename){
  const log=runCommand(core,['-hide_banner','-loglevel','info','-nostats','-i',filename,'-map','0:a:0','-af','ebur128=peak=true','-f','null','-']);
  const summary=log.slice(log.lastIndexOf('Summary:'));
  const lufs=Number(summary.match(/I:\s+(-?[\d.]+)\s+LUFS/)?.[1]);
  const peakDb=Number(summary.match(/Peak:\s+(-?[\d.]+)\s+dBFS/)?.[1]);
  if(!Number.isFinite(lufs)||!Number.isFinite(peakDb))throw new Error('Pengukuran loudness FFmpeg tidak tersedia.');return {lufs,peakDb};
}
