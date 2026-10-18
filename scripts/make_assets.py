"""
Builds the image and sound files for the "Hidden in plain sight" track.

    python3 scripts/make_assets.py

Writes to public/files/ (served with the site) and tests/fixtures/ (reference images the tests
compare decoded output against). Deterministic: same output every run. Needs numpy and Pillow.
"""
from pathlib import Path
import io
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont, PngImagePlugin
from PIL.ExifTags import IFD

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'public' / 'files'
FIX = ROOT / 'tests' / 'fixtures'
rng = np.random.default_rng(1934)


def out(path: str) -> Path:
    p = PUB / path
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def font(size: int):
    return ImageFont.load_default(size=size)


def write_wav(path: Path, samples: np.ndarray, rate: int):
    data = (np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(data)


def scene(w: int, h: int) -> Image.Image:
    """A simple harbour picture: sky, sea, a pier and a lighthouse. Background for image puzzles."""
    img = Image.new('RGB', (w, h))
    px = np.zeros((h, w, 3), dtype=np.float64)
    horizon = int(h * 0.58)
    for y in range(h):
        if y < horizon:
            t = y / horizon
            px[y, :] = (70 + 90 * t, 120 + 80 * t, 190 + 40 * t)
        else:
            t = (y - horizon) / (h - horizon)
            px[y, :] = (30 + 20 * t, 70 + 30 * t, 110 + 20 * t)
    px += rng.normal(0, 6, px.shape)
    img = Image.fromarray(np.clip(px, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    d.rectangle([int(w * 0.62), horizon - 8, w, horizon + 4], fill=(70, 55, 45))
    lx = int(w * 0.8)
    d.polygon([(lx - 14, horizon - 8), (lx + 14, horizon - 8), (lx + 8, int(h * 0.22)), (lx - 8, int(h * 0.22))], fill=(235, 235, 230))
    for k in range(3):
        y = int(h * 0.3) + k * int(h * 0.09)
        d.rectangle([lx - 12, y, lx + 12, y + int(h * 0.035)], fill=(190, 40, 50))
    d.rectangle([lx - 10, int(h * 0.16), lx + 10, int(h * 0.22)], fill=(250, 220, 120))
    d.ellipse([int(w * 0.12), int(h * 0.1), int(w * 0.2), int(h * 0.1) + int(w * 0.08)], fill=(250, 245, 220))
    return img


def text_mask(w: int, h: int, lines: list[str], size: int) -> np.ndarray:
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    f = font(size)
    total = len(lines) * size * 1.25
    y = (h - total) / 2
    for line in lines:
        tw = d.textlength(line, font=f)
        d.text(((w - tw) / 2, y), line, fill=255, font=f)
        y += size * 1.25
    return np.array(m) > 127


# ── Metadata ────────────────────────────────────────────────────────────


def metadata_assets():
    # 1. Holiday snap: the answer is in the EXIF user comment; the description is a decoy.
    img = scene(640, 420)
    exif = Image.Exif()
    exif[0x010E] = 'Beach, August. Lovely weather.'
    exif[0x010F] = 'Halloran'
    exif[0x0110] = 'Box Brownie II'
    exif[0x0132] = '1987:08:14 16:02:11'
    exif.get_ifd(IFD.Exif)[0x9286] = b'ASCII\x00\x00\x00The answer is SANDCASTLE'
    img.save(out('metadata-1-snap/beach.jpg'), exif=exif.tobytes(), quality=85)

    # 2. Where was this taken: GPS coordinates of Bletchley Park.
    img = Image.new('RGB', (640, 420), (120, 150, 110))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 640, 200], fill=(175, 195, 215))
    for x0 in (60, 250, 440):
        d.rectangle([x0, 210, x0 + 150, 300], fill=(95, 85, 70))
        d.polygon([(x0 - 10, 212), (x0 + 75, 170), (x0 + 160, 212)], fill=(60, 55, 50))
        for k in range(4):
            d.rectangle([x0 + 12 + k * 35, 235, x0 + 32 + k * 35, 260], fill=(220, 215, 190))
    exif = Image.Exif()
    exif[0x010E] = 'Huts. Nobody will tell me what they do in them.'
    exif[0x0132] = '1942:05:03 09:15:00'
    gps = exif.get_ifd(IFD.GPSInfo)
    gps[1] = 'N'
    gps[2] = (51.0, 59.0, 51.72)
    gps[3] = 'W'
    gps[4] = (0.0, 44.0, 26.52)
    img.save(out('metadata-2-where/huts.jpg'), exif=exif.tobytes(), quality=85)

    # 3. Screenshot: a compressed PNG text chunk holding Base64.
    img = Image.new('RGB', (640, 360), (245, 245, 240))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 640, 36], fill=(60, 60, 70))
    d.text((14, 8), 'notes.txt', fill=(230, 230, 230), font=font(18))
    for k, line in enumerate(['Shopping:', '- milk', '- bread', '- birdseed (lots)', '', 'Ask about the nest on the roof.']):
        d.text((24, 60 + k * 30), line, fill=(40, 40, 40), font=font(20))
    info = PngImagePlugin.PngInfo()
    info.add_text('Software', 'Notepad Screenshot Tool 2.1')
    info.add_text('Comment', 'VEhFIEFOU1dFUiBJUyBNQUdQSUU=', zip=True)
    img.save(out('metadata-3-screenshot/notes.png'), pnginfo=info)

    # Lesson sample.
    img = scene(480, 320)
    exif = Image.Exif()
    exif[0x010E] = 'The harbour at dusk'
    exif[0x013B] = 'Plaintext'
    exif[0x010F] = 'Example Camera Co.'
    exif[0x0132] = '2026:10:18 18:40:00'
    img.save(out('lessons/harbour.jpg'), exif=exif.tobytes(), quality=85)


# ── Pixels ─────────────────────────────────────────────────────────────


def lsb_write(arr: np.ndarray, message: str):
    """Same scheme as src/lib/pixels.ts: RGB low bits, row by row, zero-terminated."""
    bits = []
    for b in list(message.encode()) + [0]:
        bits += [(b >> k) & 1 for k in range(7, -1, -1)]
    flat = arr.reshape(-1, 3)
    for i, bit in enumerate(bits):
        p, c = divmod(i, 3)
        flat[p, c] = (flat[p, c] & 0xFE) | bit


def pixel_assets():
    # 1. Fog: a word one shade lighter than its background.
    w, h = 480, 320
    arr = np.full((h, w, 3), 128, dtype=np.uint8)
    mask = text_mask(w, h, ['OTTER'], 96)
    arr[mask] = 129
    Image.fromarray(arr).save(out('pixels-1-fog/fog.png'))
    Image.fromarray((mask * 255).astype(np.uint8)).save(FIX / 'pixels-fog-mask.png')

    # 2. Three channels: each colour's lowest bit draws a different line of text.
    arr = np.array(scene(w, h))
    for c, word in enumerate(['NOT HERE', 'TRY BLUE', 'KESTREL']):
        m = text_mask(w, h, [word], 72)
        arr[..., c] = (arr[..., c] & 0xFE) | m.astype(np.uint8)
    Image.fromarray(arr).save(out('pixels-2-channels/harbour.png'))

    # 3. Least significant: a text message in the RGB low bits.
    arr = np.array(scene(w, h))
    lsb_write(arr, 'THE ANSWER IS PELICAN')
    Image.fromarray(arr).save(out('pixels-3-lsb/pier.png'))

    # Lesson sample: a faint word and an LSB message in one picture.
    arr = np.array(scene(w, h))
    m = text_mask(w, h, ['PIXEL'], 80)
    arr[..., 2] = (arr[..., 2] & 0xFE) | m.astype(np.uint8)
    lsb_write(arr, 'Hidden in the pixels')
    Image.fromarray(arr).save(out('lessons/pixels.png'))


# ── Spectrograms ───────────────────────────────────────────────────────


def spectro_text(word: str, rate: int, seconds: float, f_lo: float, f_hi: float, rows: int = 40) -> np.ndarray:
    """Synthesises sound whose spectrogram draws `word`: one sine per lit pixel, per time slice."""
    cols = int(len(word) * rows * 0.9)
    m = text_mask(cols, rows, [word], int(rows * 0.8))
    n = int(rate * seconds)
    t = np.arange(n) / rate
    sig = np.zeros(n)
    col_len = n // cols
    freqs = np.linspace(f_hi, f_lo, rows)
    phases = rng.uniform(0, 2 * np.pi, rows)
    fade = np.minimum(1, np.minimum(np.arange(col_len), np.arange(col_len)[::-1]) / (col_len * 0.15 + 1))
    for c in range(cols):
        lit = np.nonzero(m[:, c])[0]
        if not len(lit):
            continue
        s = slice(c * col_len, (c + 1) * col_len)
        chunk = np.zeros(col_len)
        for r in lit:
            chunk += np.sin(2 * np.pi * freqs[r] * t[s] + phases[r])
        sig[s] += chunk * fade
    sig /= np.max(np.abs(sig)) + 1e-9
    return sig


MORSE = {'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
         'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
         'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..'}


def morse_tone(word: str, rate: int, freq: float, unit: float, lead: float) -> np.ndarray:
    pieces = [np.zeros(int(lead * rate))]
    for i, ch in enumerate(word):
        for j, sym in enumerate(MORSE[ch]):
            dur = unit * (1 if sym == '.' else 3)
            n = int(dur * rate)
            env = np.minimum(1, np.minimum(np.arange(n), np.arange(n)[::-1]) / (rate * 0.004))
            pieces.append(np.sin(2 * np.pi * freq * np.arange(n) / rate) * env)
            pieces.append(np.zeros(int(unit * rate)))
        pieces.append(np.zeros(int(unit * 2 * rate)))
    return np.concatenate(pieces)


def sound_assets():
    rate = 22050
    # 1. Interference: a word drawn in the spectrogram, under some noise.
    sig = spectro_text('FALCON', rate, 6.0, 1500, 7500)
    sig = 0.7 * sig + 0.08 * rng.normal(0, 1, len(sig))
    write_wav(out('spectro-1-interference/interference.wav'), sig, rate)

    # 2. Mosquito: an audible drone, and Morse at 17.5 kHz that most adults can't hear.
    rate2 = 44100
    morse = morse_tone('WREN', rate2, 17500, 0.12, 0.8)
    n = len(morse) + int(rate2 * 0.8)
    t = np.arange(n) / rate2
    drone = 0.25 * np.sin(2 * np.pi * 110 * t) + 0.12 * np.sin(2 * np.pi * 165 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t))
    sig = drone.copy()
    sig[: len(morse)] += 0.12 * morse
    write_wav(out('spectro-2-mosquito/drone.wav'), sig / np.max(np.abs(sig)) * 0.8, rate2)

    # Lesson sample.
    write_wav(out('lessons/spectrogram-hello.wav'), 0.7 * spectro_text('HELLO', rate, 4.0, 1500, 7500), rate)


# ── SSTV (Martin M1) ───────────────────────────────────────────────────

M1 = dict(sync=0.004862, porch=0.000572, scan=0.146432, sep=0.000572, vis=44)


def sstv_encode(rgb: np.ndarray, rate: int) -> np.ndarray:
    """Martin M1, phase-continuous, with VIS header. Same timing as src/lib/audio.ts."""
    freqs = []
    durs = []

    def tone(f, d):
        freqs.append(f)
        durs.append(d)

    tone(1900, 0.3); tone(1200, 0.01); tone(1900, 0.3); tone(1200, 0.03)
    ones = 0
    for b in range(7):
        bit = (M1['vis'] >> b) & 1
        ones += bit
        tone(1100 if bit else 1300, 0.03)
    tone(1100 if ones % 2 else 1300, 0.03)
    tone(1200, 0.03)
    h, w, _ = rgb.shape
    px = M1['scan'] / w
    for y in range(h):
        tone(1200, M1['sync']); tone(1500, M1['porch'])
        for c in (1, 2, 0):
            for x in range(w):
                tone(1500 + rgb[y, x, c] / 255 * 800, px)
            tone(1500, M1['sep'])
    # Sample-accurate frequency track, then integrate phase.
    ends = np.cumsum(durs)
    n = int(round(ends[-1] * rate))
    idx = np.searchsorted(ends, (np.arange(n) + 0.5) / rate)
    f = np.array(freqs)[np.minimum(idx, len(freqs) - 1)]
    phase = np.cumsum(2 * np.pi * f / rate)
    return 0.5 * np.sin(phase)


def sstv_image(lines: list[str], colours: tuple, size: int, height: int = 256) -> np.ndarray:
    img = Image.new('RGB', (320, height), colours[0])
    d = ImageDraw.Draw(img)
    for k in range(0, 320, 40):
        d.rectangle([k, height - 18, k + 20, height], fill=colours[2])
    f = font(size)
    total = len(lines) * size * 1.2
    y = (height - total) / 2 - 6
    for line in lines:
        tw = d.textlength(line, font=f)
        d.text(((320 - tw) / 2, y), line, fill=colours[1], font=f)
        y += size * 1.2
    return np.array(img)


def sstv_assets():
    rate = 8000
    jobs = [
        ('sstv-1-orbit/transmission.wav', 'sstv-orbit.png', sstv_image(['THE ANSWER IS', 'SPUTNIK'], ((10, 20, 60), (255, 235, 120), (200, 60, 60)), 36)),
        ('sstv-2-ham/transmission.wav', 'sstv-ham.png', sstv_image(['GUR NAFJRE VF', 'ZNEPBAV'], ((240, 240, 230), (20, 40, 120), (30, 140, 60)), 36)),
        ('lessons/sstv-radio.wav', 'sstv-radio.png', sstv_image(['RADIO'], ((0, 70, 90), (255, 255, 255), (250, 180, 40)), 40, height=64)),
    ]
    for wav_path, fixture, rgb in jobs:
        write_wav(out(wav_path), sstv_encode(rgb, rate), rate)
        Image.fromarray(rgb).save(FIX / fixture)


if __name__ == '__main__':
    FIX.mkdir(parents=True, exist_ok=True)
    metadata_assets()
    pixel_assets()
    sound_assets()
    sstv_assets()
    for p in sorted(PUB.rglob('*')):
        if p.is_file():
            print(f'{p.relative_to(ROOT)}  {p.stat().st_size // 1024} KB')
