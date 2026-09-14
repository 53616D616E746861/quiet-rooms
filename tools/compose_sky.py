"""Beneath a Borrowed Sky — an original Quiet Rooms musical sketch.
Composed and synthesized for Sam, 14 September 2026.
18 bars in 3/4 at 66 BPM, hollow flute, muted celesta, wooden plucks,
soft bowed harmonics; D minor with borrowed modal colors.
No recordings or game melodies are used. Run with Python, NumPy, SciPy,
and ffmpeg. Run python tools/compose_sky.py to regenerate audio/sky.mp3.
"""
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io.wavfile import write
import subprocess
import tempfile

OUT = Path(__file__).resolve().parent.parent / "audio"
OUT.mkdir(parents=True,exist_ok=True)
SR = 44100
BEAT = 60 / 66
BAR = 3 * BEAT
START = 1.0
DURATION = START + 18 * BAR + 6.0
N = int(DURATION * SR)
rng = np.random.default_rng(140926)
dry = np.zeros((N, 2), dtype=np.float64)
send = np.zeros_like(dry)

PITCH = {'C':0,'C#':1,'D':2,'Eb':3,'E':4,'F':5,'F#':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}
def hz(note):
    return 440 * 2 ** (((int(note[-1]) + 1) * 12 + PITCH[note[:-1]] - 69) / 12)

def env(t, hold, attack, release):
    a = np.sin(np.clip(t / attack, 0, 1) * np.pi / 2) ** 2
    r = np.cos(np.clip((t - hold) / release, 0, 1) * np.pi / 2) ** 2
    return a * r

def add(signal, when, level, pan=0, wet=.3):
    offset = max(0, int(when * SR))
    count = min(len(signal), N - offset)
    if count <= 0:
        return
    gains = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)])
    stereo = signal[:count, None] * level * gains[None, :]
    dry[offset:offset + count] += stereo
    send[offset:offset + count] += stereo * wet

def flute(note, beats, velocity=1):
    hold = beats * BEAT
    t = np.arange(int((hold + .24) * SR)) / SR
    f = hz(note)
    vibrato = (1 - np.exp(-np.maximum(t-.16,0)*3)) * 5.8 * np.sin(2*np.pi*4.7*t)
    drift = 1.8*np.sin(2*np.pi*.8*t+.7) - 4*np.exp(-t*22)
    phase = np.cumsum(2*np.pi*f*2**((vibrato+drift)/1200)/SR)
    tone = np.sin(phase) + .105*np.sin(2*phase+.3) + .028*np.sin(3*phase)
    breath = sosfilt(butter(2,[650,2600],btype='bandpass',fs=SR,output='sos'),rng.normal(size=len(t)))
    breath *= .025 + .035*np.exp(-t*20)
    return velocity*(tone+breath)*env(t,hold,.07,.23)*(1-.10*np.minimum(t/max(hold,.01),1))

def bell(note, duration=4.5, softer=False):
    t = np.arange(int(duration*SR))/SR
    f = hz(note)
    result = np.zeros_like(t)
    for ratio, amp, decay in [(1,.85,2.6),(2.002,.16,1.1),(3.996,.075,.58),(5.37,.016,.35)]:
        if softer:
            decay *= .8
            if ratio>1: amp *= .6
        result += amp*np.sin(2*np.pi*f*ratio*t)*np.exp(-t/decay)
    result *= (1-np.exp(-t*180))*np.minimum(1,np.maximum(0,duration-t)/.18)
    return result

def wood(note, duration=2.5):
    t = np.arange(int(duration*SR))/SR
    f = hz(note)
    result = sum(a*np.sin(2*np.pi*f*k*t)*np.exp(-t/(1.0/k**.5)) for k,a in [(1,.8),(2,.20),(3,.09),(4,.025)])
    return result*(1-np.exp(-t*160))*np.minimum(1,np.maximum(0,duration-t)/.12)

def bowed(note, hold):
    t = np.arange(int((hold+1.4)*SR))/SR
    f = hz(note)
    drift = np.sin(2*np.pi*.29*t)*1.9
    phase = np.cumsum(2*np.pi*f*2**(drift/1200)/SR)
    tone = .65*np.sin(phase)+.22*np.sin(phase*1.0017+.9)+.085*np.sin(phase*2)+.022*np.sin(phase*3)
    return tone*env(t,hold,.9,1.4)*(.91+.09*np.sin(2*np.pi*.23*t))

# Bass, inner voice, upper dyad. Related harmonies share tones across the barlines.
chords = [
 ('D2',['A3','E4','F4']), ('D2',['A3','E4','F4']),
 ('Bb2',['A3','D4','E4']), ('G2',['A3','Bb3','E4']),
 ('E2',['G3','Bb3','D4']), ('A2',['G3','Bb3','C#4']),
 ('D2',['A3','B3','F4']), ('D2',['A3','E4','F4']),
 ('Bb2',['A3','D4','E4']), ('G2',['G3','C4','E4']),
 ('D2',['A3','D4','F4']), ('G2',['A3','Bb3','D4']),
 ('Eb2',['G3','Bb3','A4']), ('A2',['G3','Bb3','C#4']),
 ('D2',['A3','E4','F4']), ('Bb2',['A3','D4','E4']),
 ('D2',['A3','D4','E4']), ('D2',['A3','E4','F4'])
]
melody = {
 1:[(1.65,'A4',.58,.77)],
 2:[(.06,'D5',.90,1),(1.25,'A4',.43,.85),(2.02,'E5',.66,.92)],
 3:[(.06,'F5',1.35,.91),(1.72,'E5',.40,.8),(2.36,'C5',.49,.78)],
 4:[(.18,'Bb4',.63,.83),(1.18,'A4',.79,.89),(2.22,'G4',.65,.75)],
 5:[(.35,'C#5',.65,.76),(1.26,'D5',.42,.72),(2.10,'Bb4',.66,.8)],
 6:[(.05,'A4',1.27,.94),(1.87,'F4',.68,.77)],
 7:[(.23,'E4',.47,.75),(1.10,'G4',.47,.74),(1.93,'E4',.85,.66)],
 8:[(.06,'D5',.90,.91),(1.25,'A4',.43,.78),(2.02,'E5',.66,.85)],
 9:[(.10,'E5',.77,.88),(1.34,'G5',.39,.75),(2.14,'D5',.68,.84)],
 10:[(.08,'F5',1.13,.95),(1.69,'E5',.43,.81),(2.33,'D5',.47,.76)],
 11:[(.13,'Bb4',1.35,.85),(2.04,'A4',.68,.77)],
 12:[(.22,'G4',.57,.78),(1.17,'Bb4',.58,.84),(2.12,'F5',.72,.83)],
 13:[(.07,'E5',.88,.86),(1.34,'D5',.37,.76),(2.00,'C#5',.80,.74)],
 14:[(.04,'D5',2.04,.89)],
 15:[(.23,'E5',.60,.78),(1.18,'A4',.61,.77),(2.12,'F4',.72,.70)],
 16:[(.38,'E4',1.87,.63)],
 17:[(.18,'A4',.74,.52),(1.62,'E5',1.07,.43)]
}
for bar,(bass, voices) in enumerate(chords):
    at=START+bar*BAR
    # A soft three-beat accompaniment with deliberate breathing room.
    gain=.68 if bar<2 else (1 if bar<14 else .79-(bar-14)*.10)
    add(wood(bass,3.6),at+.015,.065*gain,-.10,.30)
    add(wood(voices[0]),at+BEAT*1.08,.028*gain,-.28,.42)
    if bar not in [6,11,14,17]:
        add(wood(voices[1]),at+BEAT*2.10,.023*gain,.32,.42)
    for i,note in enumerate(voices):
        add(bowed(note,BAR*.91),at-.10,.012*gain,[-.55,.2,.52][i],.67)
    for pos,note,length,velocity in melody.get(bar,[]):
        add(flute(note,length,velocity),at+pos*BEAT,.119,.03,.43)

# A smaller, more distant answer in bells; irregular enough to avoid a ticking feel.
for bar,beat,note,vol,pan in [
 (0,.55,'A5',.044,-.42),(0,2.20,'E6',.024,.37),
 (1,.36,'D6',.024,.2),(3,2.70,'A5',.030,-.36),
 (5,1.72,'E6',.022,.45),(7,2.76,'A5',.030,-.3),
 (9,2.73,'D6',.024,.4),(11,2.70,'E6',.020,-.42),
 (13,1.82,'Bb5',.014,.5),(14,2.60,'A5',.027,-.35),
 (16,1.90,'D6',.021,.34),(17,2.64,'E6',.016,-.2)]:
    add(bell(note,5.2),START+bar*BAR+beat*BEAT,vol,pan,.63)

# Quiet air, no sudden transients or percussion.
t=np.arange(N)/SR
air=sosfilt(butter(2,[250,1150],btype='bandpass',fs=SR,output='sos'),rng.normal(size=N))
air*=.0012*(.8+.2*np.sin(2*np.pi*.08*t))*np.minimum(t/3,1)
add(air,0,1,0,.32)

# An original diffuse room impulse: dark early reflections, then a soft tail.
IR_SECONDS=3.8
irn=int(IR_SECONDS*SR)
it=np.arange(irn)/SR
irs=[]
for ch in range(2):
    ir=rng.normal(size=irn)*np.exp(-it*2.0)
    ir=sosfilt(butter(2,3100,fs=SR,output='sos'),ir)
    ir[:int(.026*SR)]=0
    ir/=max(np.linalg.norm(ir),1e-9)
    ir*=.52
    for delay,amplitude in [(.043,.29),(.079,.21),(.127,.14),(.193,.10),(.277,.065)]:
        ir[int((delay+ch*.006)*SR)]+=amplitude
    irs.append(ir)
for ch in range(2):
    wet=fftconvolve(send[:,ch]*.78+send[:,1-ch]*.22,irs[ch])[:N]
    dry[:,ch]+=wet

# Gentle mastering, retaining the dynamics and a quiet end.
dry=sosfilt(butter(2,38,btype='highpass',fs=SR,output='sos'),dry,axis=0)
dry=sosfilt(butter(2,9200,fs=SR,output='sos'),dry,axis=0)
fade_in=np.sin(np.clip(t/.8,0,1)*np.pi/2)**2
fade_out=np.sin(np.clip((DURATION-t)/4.2,0,1)*np.pi/2)**2
dry*= (fade_in*fade_out)[:,None]
peak=float(np.max(np.abs(dry)))
dry*=.38/max(peak,1e-9)
assert np.isfinite(dry).all()
assert np.max(np.abs(dry))<1
mp3=OUT/'sky.mp3'
with tempfile.TemporaryDirectory(prefix='quiet-rooms-sky-') as directory:
    wav=Path(directory)/'sky.wav'
    write(wav,SR,np.int16(np.clip(dry,-1,1)*32767))
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','192k','-metadata','title=Beneath a Borrowed Sky — Sketch 1','-metadata','artist=Quiet Rooms','-metadata','comment=Original instrumental sketch; composed and synthesized for Quiet Rooms.',str(mp3)],check=True)
print(f'Created {mp3.name}: {DURATION:.2f}s stereo')
