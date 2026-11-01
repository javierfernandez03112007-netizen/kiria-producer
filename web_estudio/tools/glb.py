import json, struct, numpy as np
def load(path):
    b = open(path, 'rb').read()
    l0 = struct.unpack('<I', b[12:16])[0]; js = json.loads(b[20:20 + l0])
    o = 20 + l0; l1 = struct.unpack('<I', b[o:o + 4])[0]; bin_ = b[o + 8:o + 8 + l1]
    def acc(i, dt, n):
        a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
        return np.frombuffer(bin_, dtype=dt, count=a['count'] * n, offset=bv.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, n) if n > 1 else np.frombuffer(bin_, dtype=dt, count=a['count'], offset=bv.get('byteOffset', 0))
    idx = acc(0, np.uint16, 1).astype(np.int64).reshape(-1, 3); pos = acc(1, np.float32, 3).astype(np.float64); nor = acc(2, np.float32, 3).astype(np.float64)
    return pos, nor, idx
