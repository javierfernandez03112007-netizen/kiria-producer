import sys, cv2, numpy as np, glob, os
files = sys.argv[2:]; out = sys.argv[1]
ims = [cv2.resize(cv2.imread(f), (360, 640)) for f in files]
for im, f in zip(ims, files): cv2.putText(im, os.path.basename(f), (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = np.zeros((rows * 640, cols * 360, 3), np.uint8)
for i, im in enumerate(ims): r, c = divmod(i, cols); sheet[r*640:(r+1)*640, c*360:(c+1)*360] = im
cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
