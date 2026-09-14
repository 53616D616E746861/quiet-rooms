"""Quiet Rooms — three original variations on Beneath a Borrowed Sky.
Composed and synthesized for Sam, 14 September 2026.
18 bars in 3/4 at 48–62 BPM, hollow flute, muted celesta, wooden plucks,
soft bowed harmonics; D minor with borrowed modal colors.
No recordings or game melodies are used. Run with Python, NumPy, SciPy,
and ffmpeg. Usage: python tools/compose_music.py sunflower (or moon / evening).
The approved Sky recording remains unchanged in audio/sky.mp3.
"""
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io.wavfile import write
import subprocess
import tempfile
import argparse
parser=argparse.ArgumentParser()
parser.add_argument("room",choices=["sunflower","moon","evening"])
args=parser.parse_args()
ROOM=args.room
BPM={"sunflower":62,"moon":48,"evening":55}[ROOM]

OUT = Path(__file__).resolve().parent.parent / "audio"
OUT.mkdir(parents=True,exist_ok=True)
SR = 44100
BEAT = 60 / BPM
BAR = 3 * BEAT
START = 1.0
DURATION = START + 18 * BAR + 6.0
N = int(DURATION * SR)
rng = np.random.default_rng({"sunflower":240926,"moon":340926,"evening":440926}[ROOM])
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
def piano(note,duration=4.2):
    t=np.arange(int(duration*SR))/SR;f=hz(note);result=np.zeros_like(t)
    for k,a in [(1,.78),(2,.23),(3,.10),(4,.037),(5,.018)]:
        result+=a*np.sin(2*np.pi*f*k*(1+.00011*k*k)*t)*np.exp(-t/(2.0/k**.65))
    return result*(1-np.exp(-t*100))*np.minimum(1,np.maximum(0,duration-t)/.15)

def bronze(note,duration=6):
    t=np.arange(int(duration*SR))/SR;f=hz(note);result=np.zeros_like(t)
    for ratio,a,decay in [(1,.76,3.1),(1.004,.14,2.4),(2.71,.047,1.4),(4.03,.023,.8)]:
        result+=a*np.sin(2*np.pi*f*ratio*t)*np.exp(-t/decay)
    return result*(1-np.exp(-t*75))*np.minimum(1,np.maximum(0,duration-t)/.22)

def octave(note,delta):
    return note[:-1]+str(int(note[-1])+delta)

if ROOM=='sunflower':
    # Warm ritual colors: the melody rings from bronze, with a low flute answer.
    for bar,(bass,voices) in enumerate(chords):
        at=START+bar*BAR;gain=.66 if bar<2 else (.92 if bar<14 else .77-(bar-14)*.1)
        add(wood(bass,3.8),at,.048*gain,-.12,.44)
        for i,note in enumerate(voices):
            add(bowed(note,BAR*.92),at,.010*gain,[-.5,0,.5][i],.67)
            if bar%4!=3:
                add(piano(note,3.8),at+BEAT*(.98+i*.53),.018*gain,[-.35,.1,.35][i],.57)
        for pos,note,length,velocity in melody.get(bar,[]):
            add(bronze(note,5.7),at+pos*BEAT,.074*velocity,-.15,.64)
            if pos<.4 and bar in [2,4,6,8,10,12,14]:
                add(flute(octave(note,-1),min(length*1.3,2),velocity),at+(pos+.22)*BEAT,.048,.24,.56)
    for bar,note in [(0,'D5'),(3,'A5'),(7,'E5'),(11,'A5'),(16,'D5')]:
        add(bronze(note,6),START+bar*BAR+BEAT*.48,.025,.48,.74)
elif ROOM=='moon':
    # The theme breaks apart. No pulse: individual notes are left in long rooms of air.
    moon_chords=[('D2',['A3','E4']),('D2',['A3','E4']),('Eb2',['A3','Bb3']),('Eb2',['A3','D4']),
     ('D2',['Ab3','E4']),('A2',['Bb3','E4']),('D2',['A3','F4']),('D2',['A3','E4']),
     ('Bb2',['A3','E4']),('G2',['Ab3','D4']),('D2',['A3','Eb4']),('G2',['A3','Bb3']),
     ('Eb2',['A3','D4']),('A2',['Bb3','C#4']),('D2',['A3','E4']),('Bb2',['A3','D4']),
     ('D2',['A3','E4']),('D2',['A3','E4'])]
    for bar,(bass,voices) in enumerate(moon_chords):
        at=START+bar*BAR;gain=.72 if bar<14 else .64-(bar-14)*.08
        add(bowed(bass,BAR*1.02),at,.026*gain,0,.78)
        for i,note in enumerate(voices):add(bowed(note,BAR*.86),at+.35,.009*gain,[-.52,.52][i],.92)
    fragments=[(1,.6,'D5',1.4),(3,1.2,'A4',.8),(4,2.05,'E5',1.1),(6,.4,'F5',1.7),
     (8,1.55,'E5',.85),(9,2.1,'D5',.7),(11,.2,'Bb4',1.7),(13,1.1,'C#5',1.0),
     (15,.65,'D5',1.5),(17,.5,'E5',1.3)]
    for i,(bar,beat,note,length) in enumerate(fragments):
        at=START+bar*BAR+beat*BEAT
        add(flute(note,length,.78),at,.073,(-.18 if i%2 else .18),.88)
        if i in [0,3,6,9]:add(bronze(octave(note,-1),6),at+BEAT*.31,.030,-.38,.92)
    for bar,note in [(0,'A5'),(5,'Bb5'),(10,'E6'),(16,'A5')]:
        add(bell(note,6.5,True),START+bar*BAR+BEAT*1.8,.014,.48,.92)
else:
    # A gentler reharmonization, warm piano, and room for a phrase to come to rest.
    evening_chords=[('D2',['A3','E4','F4']),('D2',['A3','D4','F4']),
     ('Bb2',['A3','D4','F4']),('F2',['A3','C4','E4']),('G2',['G3','Bb3','D4']),
     ('A2',['G3','C#4','E4']),('D2',['A3','D4','F4']),('D2',['A3','E4','F4']),
     ('Bb2',['A3','D4','F4']),('C3',['G3','C4','E4']),('D2',['A3','D4','F4']),
     ('G2',['G3','Bb3','D4']),('Bb2',['A3','D4','F4']),('A2',['G3','C#4','E4']),
     ('D2',['A3','D4','F4']),('Bb2',['A3','D4','F4']),('D2',['A3','E4','F4']),('D2',['A3','D4','F4'])]
    for bar,(bass,voices) in enumerate(evening_chords):
        at=START+bar*BAR;gain=.60 if bar<2 else (.90 if bar<14 else .76-(bar-14)*.10)
        add(piano(octave(bass,1),4.7),at,.050*gain,-.13,.52)
        for i,note in enumerate(voices):
            add(piano(note,4.5),at+BEAT*(.72+i*.62),.025*gain,[-.38,0,.34][i],.54)
            add(bowed(note,BAR*.9),at,.006*gain,[-.5,0,.5][i],.7)
        for pos,note,length,velocity in melody.get(bar,[]):
            add(piano(note,4.8),at+pos*BEAT,.103*velocity,.07,.56)
            if bar in [3,6,11,14] and pos<.2:
                add(flute(octave(note,-1),length,.7),at+(pos+.06)*BEAT,.031,-.27,.64)
    add(piano('D5',6),START+17*BAR+BEAT*2.75,.040,.1,.65)
    for bar,note in [(0,'A5'),(7,'D6'),(14,'A5')]:add(bell(note,5,True),START+bar*BAR+BEAT*1.4,.016,.4,.6)

# Soft, static air and a shared reverberant space tie the rooms together.
t=np.arange(N)/SR
air=sosfilt(butter(2,[250,1150],btype='bandpass',fs=SR,output='sos'),rng.normal(size=N))
air*=.0008*(.8+.2*np.sin(2*np.pi*.08*t))*np.minimum(t/3,1)
add(air,0,1,0,.4)
irn=int((5.1 if ROOM=='moon' else 3.8)*SR);it=np.arange(irn)/SR
for ch in range(2):
    ir=rng.normal(size=irn)*np.exp(-it*(1.45 if ROOM=='moon' else 2.0))
    ir=sosfilt(butter(2,2400 if ROOM=='moon' else 3100,fs=SR,output='sos'),ir)
    ir[:int(.026*SR)]=0;ir/=max(np.linalg.norm(ir),1e-9);ir*=.52
    for delay,amp in [(.043,.29),(.079,.21),(.127,.14),(.193,.10),(.277,.065)]:ir[int((delay+ch*.006)*SR)]+=amp
    dry[:,ch]+=fftconvolve(send[:,ch]*.78+send[:,1-ch]*.22,ir)[:N]
dry=sosfilt(butter(2,38,btype='highpass',fs=SR,output='sos'),dry,axis=0)
dry=sosfilt(butter(2,7000,fs=SR,output='sos'),dry,axis=0)
dry*=(np.sin(np.clip(t/.8,0,1)*np.pi/2)**2*np.sin(np.clip((DURATION-t)/4.2,0,1)*np.pi/2)**2)[:,None]
dry*=.38/max(float(np.max(np.abs(dry))),1e-9)
assert np.isfinite(dry).all() and np.max(np.abs(dry))<1
# Temporary lossless render; only the compressed track is deployed.
mp3=OUT/(ROOM+'.mp3')
title={'sunflower':'The Kept Faces','moon':'Under the Near Moon','evening':'Putting Things Away'}[ROOM]
with tempfile.TemporaryDirectory(prefix='quiet-rooms-music-') as directory:
    wav=Path(directory)/(ROOM+'.wav')
    write(wav,SR,np.int16(np.clip(dry,-1,1)*32767))
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','192k','-metadata','title='+title,'-metadata','artist=Quiet Rooms',str(mp3)],check=True)
print(f'{ROOM}: {DURATION:.2f}s stereo, peak {20*np.log10(np.max(np.abs(dry))):.2f} dBFS')
