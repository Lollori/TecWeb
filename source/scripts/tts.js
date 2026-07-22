const { EdgeTTS } = require('edge-tts-universal');

const VOICE_IT = 'it-IT-ElsaNeural';
const MAX_CHARS = 2000;

async function synthesize(text, voice = VOICE_IT) {
  const tts = new EdgeTTS(text.slice(0, MAX_CHARS), voice);
  const result = await tts.synthesize();
  return Buffer.from(await result.audio.arrayBuffer());
}

module.exports = { synthesize, VOICE_IT };
