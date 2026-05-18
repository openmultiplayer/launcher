# Builds vorbisFile.dll — a 32-bit SA-MP loader proxy for GTA SA under Wine.
# Requires mingw-w64 (brew install mingw-w64). GTA SA is 32-bit, so the
# proxy must be i686.

CC      := i686-w64-mingw32-gcc
OUT     := vorbisFile.dll
SRC     := loader.c
DEF     := loader.def

CFLAGS  := -O2 -s -Wall
LDFLAGS := -shared -static -static-libgcc -Wl,--enable-stdcall-fixup

$(OUT): $(SRC) $(DEF)
	$(CC) $(CFLAGS) -o $(OUT) $(SRC) $(DEF) $(LDFLAGS)

clean:
	rm -f $(OUT)

.PHONY: clean
