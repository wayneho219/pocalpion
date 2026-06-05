#!/usr/bin/env python3
"""把目前的 crop 框畫在截圖上，方便校正座標。"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw

# ---- 與 regions.ts 相同的值 ----
LEFT_SPRITE_X   = 0.247
LEFT_SPRITE_W   = 0.070
LEFT_ROW_STARTS = [0.138, 0.253, 0.368, 0.483, 0.598, 0.713]
LEFT_ROW_H      = 0.115

RIGHT_SPRITE_X   = 0.836
RIGHT_SPRITE_W   = 0.070
RIGHT_BADGE_X    = 0.908
RIGHT_BADGE_W    = 0.060
RIGHT_ROW_STARTS = [0.138, 0.253, 0.368, 0.483, 0.598, 0.713]
RIGHT_SPRITE_H  = 0.115
RIGHT_BADGE_H   = 0.058
# ---------------------------------

def draw_rect(draw, W, H, xF, yF, wF, hF, color, label=""):
    x = round(xF * W)
    y = round(yF * H)
    w = max(1, round(wF * W))
    h = max(1, round(hF * H))
    draw.rectangle([x, y, x + w, y + h], outline=color, width=3)
    draw.text((x + 2, y + 2), label, fill=color)

def main(path):
    img = Image.open(path).convert("RGB")
    draw = ImageDraw.Draw(img)
    W, H = img.size
    print(f"圖片尺寸: {W}x{H}")

    for i, y in enumerate(LEFT_ROW_STARTS):
        draw_rect(draw, W, H, LEFT_SPRITE_X, y, LEFT_SPRITE_W, LEFT_ROW_H, "lime", f"L{i+1}")

    for i, y in enumerate(RIGHT_ROW_STARTS):
        draw_rect(draw, W, H, RIGHT_SPRITE_X, y, RIGHT_SPRITE_W, RIGHT_SPRITE_H, "cyan", f"R{i+1}")
        draw_rect(draw, W, H, RIGHT_BADGE_X,  y, RIGHT_BADGE_W,  RIGHT_BADGE_H,  "yellow", f"B{i+1}")

    out = Path(path).with_suffix(".debug.png")
    img.save(out)
    print(f"已儲存: {out}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python debug_regions.py <截圖路徑>")
        sys.exit(1)
    main(sys.argv[1])
