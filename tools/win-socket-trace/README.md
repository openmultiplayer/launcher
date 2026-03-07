# omp-socket-trace

Small Windows DLL used for runtime network diagnostics in the GTA/SA-MP process.

It patches the Import Address Table (IAT) of `samp.dll` (and main module) for:

- `socket`
- `WSASocketA`
- `connect`
- `WSAConnect`
- `sendto`
- `recvfrom`

The DLL writes lines to `omp_socket_trace.log` in the GTA executable directory.

## Why this helps

For your IPv6 issue, this answers three hard questions immediately:

- Does the client call `connect`/`sendto` at all during join?
- Which socket family is used (`AF_INET` vs `AF_INET6`)?
- Which destination address/port is passed from the game stack?

## Build (Windows, MinGW 32-bit recommended)

GTA/SA-MP is 32-bit, so build this DLL as 32-bit.

### CMake

```bash
cmake -S . -B build-mingw32 -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build build-mingw32 -j
```

### Direct g++

```bash
i686-w64-mingw32-g++ -O2 -std=c++17 -shared -static-libgcc -static-libstdc++ -o omp-socket-trace.dll wsock_trace.cpp -lws2_32
```

## Launcher integration

The launcher code in this repo was extended to inject this DLL optionally.

- Put `omp-socket-trace.dll` into launcher local data path: `.../omp/omp-socket-trace.dll`
- If present, it gets injected before `samp.dll`
- If missing, launcher behaves unchanged

## Expected log examples

```text
... socket(af=AF_INET6/23,type=2,proto=17) => ...
... connect(sock=...,family=AF_INET6/23,target=[2001:...]:7777) => rc=...
... sendto(sock=...,family=AF_INET6/23,to=[2001:...]:7777,len=...)
```

If only `AF_INET` appears in a failed IPv6 test, the blocker is in client-side address/socket handling.
