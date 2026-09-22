BS = chr(92)  # backslash
LP = chr(40)  # (
RP = chr(41)  # )

def extract_strings(s: bytes):
    out = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i:i+1]
        if c == LP.encode():
            # scan until unescaped RP
            j = i + 1
            depth = 1
            buf = bytearray()
            while j < n and depth > 0:
                ch = s[j:j+1]
                if ch == BS.encode():
                    # escaped char: next byte literal (handles \( \) \\)
                    if j + 1 < n:
                        nxt = s[j+1:j+2]
                        buf += nxt
                        j += 2
                        continue
                    else:
                        j += 1
                        continue
                if ch == LP.encode():
                    depth += 1
                    buf += ch
                elif ch == RP.encode():
                    depth -= 1
                    if depth == 0:
                        break
                    buf += ch
                else:
                    buf += ch
                j += 1
            out.append(bytes(buf))
            i = j + 1
        else:
            i += 1
    return out

data = open("pdf_streams.txt", "rb").read()
streams = data.split(b"===STREAM===")
full = []
total = 0
for i, s in enumerate(streams):
    if b"BT" not in s:
        continue
    parts = extract_strings(s)
    line = b"".join(parts)
    if line.strip():
        full.append(("--- stream %d ---" % i).encode() + b"\n" + line)
        total += len(line)

open("pdf_text_raw.txt", "wb").write(b"\n".join(full))
print("wrote", total, "chars")
