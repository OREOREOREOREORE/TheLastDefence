class SoundManager {
  private ctx: AudioContext = new AudioContext();
  private master: GainNode = this.ctx.createGain();
  private musicGain: GainNode = this.ctx.createGain();
  private sfxGain: GainNode = this.ctx.createGain();
  private musicBuffers: Map<string, AudioBuffer> = new Map<
    string,
    AudioBuffer
  >();
  private bgm?: AudioBufferSourceNode;

  constructor() {
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);

    const unlock = () => void this.ctx.resume(); // known is promise but just ignore it
    window.addEventListener('pointerdown', unlock, { once: true }); // included touchstart, pointerdown for mouse and touch devices
    window.addEventListener('keydown', unlock, { once: true });
  }

  async load(name: string, url: string): Promise<void> {
    const res = await fetch(url);
    const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
    this.musicBuffers.set(name, buf);
  }

  playSfx(name: string, volume = 1): void {
    const buf = this.musicBuffers.get(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.value = volume;
    src.connect(g).connect(this.sfxGain);
    src.start();
  }

  playBgm(name: string, volume = 1): void {
    const buf = this.musicBuffers.get(name);
    if (!buf) return;
    this.stopBgm();
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.value = volume;
    src.connect(g).connect(this.musicGain);
    src.loop = true;
    src.start();
    this.bgm = src;
  }

  stopBgm(): void {
    this.bgm?.stop();
    this.bgm = undefined;
  }

  setMusicVolume(volume: number): void {
    this.musicGain.gain.value = volume;
  }
  setSfxVolume(volume: number): void {
    this.sfxGain.gain.value = volume;
  }
  setMuted(muted: boolean): void {
    this.master.gain.value = muted ? 0 : 1;
  }
}

/* SoundManager docs
sounds.playSfx('shoot');
sounds.playSfx('shoot', 0.5);   // half volume
sounds.playBgm('bgm');
sounds.stopBgm();

sounds.setMusicVolume(0.4);
sounds.setSfxVolume(0.8);
sounds.setMuted(true);
*/

export default new SoundManager();
