# TrackpadFixSA - cross-compiles the 32-bit Windows dinput8.dll proxy on macOS.
# GTA San Andreas (disc 1.0 and Rockstar Launcher build) is a 32-bit process,
# so the DLL MUST be i686. Toolchain: `brew install mingw-w64`.

# Plain assignment (not ?=) so make's built-in CXX=g++ default does not win.
# A command-line `make CXX=...` still overrides this.
CXX       = i686-w64-mingw32-g++
TARGET    = vorbisFile.dll
SRCDIR    = src
OBJDIR    = build
SRCS      = $(wildcard $(SRCDIR)/*.cpp)
OBJS      = $(patsubst $(SRCDIR)/%.cpp,$(OBJDIR)/%.o,$(SRCS))

CXXFLAGS  = -O2 -std=c++17 -Wall -Wextra -Wno-cast-function-type \
            -fno-exceptions -fno-rtti \
            -ffunction-sections -fdata-sections -DWIN32_LEAN_AND_MEAN
# --kill-at strips the @nn stdcall suffix so exports match dinput8's real names.
LDFLAGS   = -shared -static -static-libgcc -static-libstdc++ \
            -Wl,--gc-sections -Wl,--enable-stdcall-fixup -Wl,--kill-at
LIBS      = -ldxguid

all: $(TARGET)

$(OBJDIR):
	mkdir -p $(OBJDIR)

$(OBJDIR)/%.o: $(SRCDIR)/%.cpp | $(OBJDIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(TARGET): $(OBJS)
	$(CXX) $(LDFLAGS) $(OBJS) $(LIBS) -o $@
	@echo "==> $(TARGET) built"

clean:
	rm -rf $(OBJDIR) $(TARGET)

.PHONY: all clean
