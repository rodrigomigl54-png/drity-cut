"""Proceduralno generiše CC0 teksturu betona (boja, normal, roughness) za intro i sajt.
Pokretanje: python scripts/gen-concrete.py  (potrebni numpy + opencv)"""
import numpy as np, cv2, os

rng = np.random.default_rng(39)
N = 1024

def tile_noise(size, cells):
    g = rng.random((cells, cells)).astype(np.float32)
    g = np.tile(g, (3, 3))
    big = cv2.resize(g, (size * 3, size * 3), interpolation=cv2.INTER_CUBIC)
    return big[size:2 * size, size:2 * size]

def fbm(size, base=4, octaves=7, gain=0.55):
    h = np.zeros((size, size), np.float32); a = 1.0; tot = 0
    for o in range(octaves):
        h += a * tile_noise(size, base * 2 ** o); tot += a; a *= gain
    return h / tot

h = fbm(N)
mottle = fbm(N, base=2, octaves=4, gain=0.6)
# pore / aggregate speckles
pores = np.zeros((N, N), np.float32)
for _ in range(2600):
    x, y = rng.integers(0, N, 2); r = rng.choice([1, 1, 1, 2, 2, 3])
    cv2.circle(pores, (int(x), int(y)), int(r), float(rng.uniform(0.4, 1.0)), -1, cv2.LINE_AA)
pores = cv2.GaussianBlur(pores, (0, 0), 0.6)
grit = rng.random((N, N)).astype(np.float32)
grit = cv2.GaussianBlur(grit, (0, 0), 0.7)

height = 0.55 * h + 0.25 * mottle + 0.2 * grit - 0.35 * pores
height = (height - height.min()) / (height.max() - height.min())

col = 0.42 + 0.22 * (mottle - 0.5) + 0.18 * (h - 0.5) + 0.06 * (grit - 0.5) - 0.22 * pores
col = np.clip(col, 0, 1)
tint = np.stack([col * 0.96, col * 0.97, col * 1.0], -1)  # B,G,R: slightly warm grey
os.makedirs('src/intro/tex', exist_ok=True)
cv2.imwrite('src/intro/tex/concrete_color.jpg', (tint * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 82])

# normal map from height (tileable gradients)
k = 3.0
dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * k
dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * k
nz = np.ones_like(dx)
n = np.stack([-dx, -dy, nz], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
nrm = ((n * 0.5 + 0.5) * 255).astype(np.uint8)
cv2.imwrite('src/intro/tex/concrete_normal.jpg', cv2.resize(nrm[..., ::-1], (768, 768), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 80])

rough = np.clip(0.78 + 0.18 * (mottle - 0.5) + 0.15 * pores, 0, 1)
cv2.imwrite('src/intro/tex/concrete_rough.jpg', cv2.resize((rough * 255).astype(np.uint8), (512, 512)), [cv2.IMWRITE_JPEG_QUALITY, 80])

# dark variant for the website (hero background / dividers)
dark = np.clip(col * 0.32 + 0.02, 0, 1)
site = cv2.resize(np.stack([dark * 0.97, dark * 0.98, dark], -1), (512, 512), interpolation=cv2.INTER_AREA)
cv2.imwrite('src/assets/images/concrete-dark.jpg', (site * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 74])
print('concrete ok')
