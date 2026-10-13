import {processAudio,SR} from './dsp.js';
import {wav,flac,mp3} from './encoders.js';
// A local vendored encoder; no remote CDN or activation service.
import lamejs from './vendor/lamejs/lame.min.js';
self.onmessage=async({data})=>{
  try{
    const result=await processAudio(data.channels,data.settings,(value,message)=>self.postMessage({type:'progress',value:value*.85,message}));
    self.postMessage({type:'progress',value:.87,message:'Mengemas file audio…'});
    const format=data.settings.output_format;
    const buffer=format==='mp3'?mp3(result.channels,SR,lamejs.Mp3Encoder,p=>self.postMessage({type:'progress',value:.87+.12*p,message:'Encoding MP3 320 kbps…'})):format==='flac'?flac(result.channels,SR):wav(result.channels,SR,format==='wav16'?16:24);
    self.postMessage({type:'done',buffer,stats:result.stats,mime:format==='mp3'?'audio/mpeg':format==='flac'?'audio/flac':'audio/wav',extension:format==='mp3'?'mp3':format==='flac'?'flac':'wav'},[buffer]);
  }catch(error){self.postMessage({type:'error',message:error.message||String(error)});}
};
