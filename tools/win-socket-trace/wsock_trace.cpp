#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0600
#endif

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <tlhelp32.h>

#include <algorithm>
#include <atomic>
#include <cstdarg>
#include <cstdio>
#include <cstring>
#include <mutex>
#include <string>
#include <unordered_map>

namespace {

struct SocketMeta {
    int family = AF_UNSPEC;
    bool forced_dualstack = false;
};

using socket_fn_t = SOCKET(WSAAPI*)(int, int, int);
using wsasocketa_fn_t = SOCKET(WSAAPI*)(int, int, int, LPWSAPROTOCOL_INFOA, GROUP, DWORD);
using closesocket_fn_t = int(WSAAPI*)(SOCKET);
using connect_fn_t = int(WSAAPI*)(SOCKET, const sockaddr*, int);
using wsaconnect_fn_t =
    int(WSAAPI*)(SOCKET, const sockaddr*, int, LPWSABUF, LPWSABUF, LPQOS, LPQOS);
using bind_fn_t = int(WSAAPI*)(SOCKET, const sockaddr*, int);
using sendto_fn_t = int(WSAAPI*)(SOCKET, const char*, int, int, const sockaddr*, int);
using recvfrom_fn_t = int(WSAAPI*)(SOCKET, char*, int, int, sockaddr*, int*);
using getsockname_fn_t = int(WSAAPI*)(SOCKET, sockaddr*, int*);
using getpeername_fn_t = int(WSAAPI*)(SOCKET, sockaddr*, int*);

static socket_fn_t g_real_socket = nullptr;
static wsasocketa_fn_t g_real_wsasocketa = nullptr;
static closesocket_fn_t g_real_closesocket = nullptr;
static connect_fn_t g_real_connect = nullptr;
static wsaconnect_fn_t g_real_wsaconnect = nullptr;
static bind_fn_t g_real_bind = nullptr;
static sendto_fn_t g_real_sendto = nullptr;
static recvfrom_fn_t g_real_recvfrom = nullptr;
static getsockname_fn_t g_real_getsockname = nullptr;
static getpeername_fn_t g_real_getpeername = nullptr;

static std::mutex g_log_mutex;
static std::once_flag g_log_once;
static std::string g_log_path;

static std::mutex g_socket_mutex;
static std::unordered_map<SOCKET, SocketMeta> g_socket_meta;

static std::atomic<bool> g_initialized{false};
static bool g_dualstack_enabled = false;

static const char* family_name(int af) {
    switch (af) {
        case AF_INET:
            return "AF_INET";
        case AF_INET6:
            return "AF_INET6";
        case AF_UNSPEC:
            return "AF_UNSPEC";
        default:
            return "AF_OTHER";
    }
}

static std::string get_env_string(const char* key) {
    DWORD needed = GetEnvironmentVariableA(key, nullptr, 0);
    if (needed == 0) {
        return {};
    }
    std::string out;
    out.resize(needed);
    DWORD rc = GetEnvironmentVariableA(key, out.data(), needed);
    if (rc == 0 || rc >= needed) {
        return {};
    }
    out.resize(rc);
    return out;
}

static bool get_env_bool(const char* key) {
    std::string v = get_env_string(key);
    if (v.empty()) {
        return false;
    }
    std::transform(v.begin(), v.end(), v.begin(), [](unsigned char c) { return (char)tolower(c); });
    return v == "1" || v == "true" || v == "yes" || v == "on";
}

static void ensure_directory_path(std::string path) {
    if (path.empty()) {
        return;
    }

    for (char& c : path) {
        if (c == '/') {
            c = '\\';
        }
    }

    size_t pos = 0;
    if (path.size() >= 2 && path[1] == ':') {
        pos = 3;
    } else if (path.size() >= 2 && path[0] == '\\' && path[1] == '\\') {
        pos = 2;
    }

    while (pos < path.size()) {
        size_t next = path.find('\\', pos);
        if (next == std::string::npos) {
            break;
        }

        std::string piece = path.substr(0, next);
        if (!piece.empty()) {
            CreateDirectoryA(piece.c_str(), nullptr);
        }
        pos = next + 1;
    }
}

static void init_log_path() {
    std::call_once(g_log_once, [] {
        std::string custom = get_env_string("OMP_TRACE_LOG");
        if (!custom.empty()) {
            g_log_path = custom;
        } else {
            std::string local = get_env_string("LOCALAPPDATA");
            if (!local.empty()) {
                g_log_path = local + "\\mp.open.launcher\\omp\\omp_socket_trace.log";
            } else {
                g_log_path = "C:\\temp\\omp_socket_trace.log";
            }
        }

        size_t slash = g_log_path.find_last_of("\\/");
        if (slash != std::string::npos) {
            ensure_directory_path(g_log_path.substr(0, slash));
        }
    });
}

static void log_line(const char* fmt, ...) {
    init_log_path();

    char msg[2048];
    va_list ap;
    va_start(ap, fmt);
    _vsnprintf(msg, sizeof(msg) - 1, fmt, ap);
    va_end(ap);
    msg[sizeof(msg) - 1] = '\0';

    SYSTEMTIME st;
    GetLocalTime(&st);

    char line[2300];
    _snprintf(
        line,
        sizeof(line) - 1,
        "%04u-%02u-%02u %02u:%02u:%02u.%03u pid=%lu tid=%lu %s\n",
        (unsigned)st.wYear,
        (unsigned)st.wMonth,
        (unsigned)st.wDay,
        (unsigned)st.wHour,
        (unsigned)st.wMinute,
        (unsigned)st.wSecond,
        (unsigned)st.wMilliseconds,
        (unsigned long)GetCurrentProcessId(),
        (unsigned long)GetCurrentThreadId(),
        msg);
    line[sizeof(line) - 1] = '\0';

    {
        std::lock_guard<std::mutex> lock(g_log_mutex);
        FILE* f = fopen(g_log_path.c_str(), "ab");
        if (f) {
            fwrite(line, 1, strlen(line), f);
            fclose(f);
        }
    }

    OutputDebugStringA(line);
}

static std::string format_sockaddr(const sockaddr* sa, int salen) {
    if (!sa) {
        return "(null)";
    }

    char ipbuf[INET6_ADDRSTRLEN] = {0};
    if (sa->sa_family == AF_INET && salen >= (int)sizeof(sockaddr_in)) {
        auto* in4 = reinterpret_cast<const sockaddr_in*>(sa);
        if (!InetNtopA(AF_INET, (PVOID)&in4->sin_addr, ipbuf, sizeof(ipbuf))) {
            strcpy(ipbuf, "?");
        }
        char out[128];
        _snprintf(out, sizeof(out) - 1, "%s:%u", ipbuf, (unsigned)ntohs(in4->sin_port));
        out[sizeof(out) - 1] = '\0';
        return out;
    }

    if (sa->sa_family == AF_INET6 && salen >= (int)sizeof(sockaddr_in6)) {
        auto* in6 = reinterpret_cast<const sockaddr_in6*>(sa);
        if (!InetNtopA(AF_INET6, (PVOID)&in6->sin6_addr, ipbuf, sizeof(ipbuf))) {
            strcpy(ipbuf, "?");
        }
        char out[192];
        if (in6->sin6_scope_id != 0) {
            _snprintf(
                out,
                sizeof(out) - 1,
                "[%s%%%u]:%u",
                ipbuf,
                (unsigned)in6->sin6_scope_id,
                (unsigned)ntohs(in6->sin6_port));
        } else {
            _snprintf(out, sizeof(out) - 1, "[%s]:%u", ipbuf, (unsigned)ntohs(in6->sin6_port));
        }
        out[sizeof(out) - 1] = '\0';
        return out;
    }

    char out[64];
    _snprintf(out, sizeof(out) - 1, "family=%d,len=%d", sa->sa_family, salen);
    out[sizeof(out) - 1] = '\0';
    return out;
}

static bool is_v4_mapped(const sockaddr_in6& in6) {
    const unsigned char* b = reinterpret_cast<const unsigned char*>(&in6.sin6_addr);
    for (int i = 0; i < 10; ++i) {
        if (b[i] != 0) {
            return false;
        }
    }
    return b[10] == 0xff && b[11] == 0xff;
}

static sockaddr_in6 v4_to_mapped(const sockaddr_in& in4) {
    sockaddr_in6 out{};
    out.sin6_family = AF_INET6;
    out.sin6_port = in4.sin_port;
    unsigned char* b = reinterpret_cast<unsigned char*>(&out.sin6_addr);
    b[10] = 0xff;
    b[11] = 0xff;
    memcpy(&b[12], &in4.sin_addr, 4);
    return out;
}

static bool mapped_to_v4(const sockaddr_in6& in6, sockaddr_in* out4) {
    if (!is_v4_mapped(in6)) {
        return false;
    }
    sockaddr_in out{};
    out.sin_family = AF_INET;
    out.sin_port = in6.sin6_port;
    const unsigned char* b = reinterpret_cast<const unsigned char*>(&in6.sin6_addr);
    memcpy(&out.sin_addr, &b[12], 4);
    *out4 = out;
    return true;
}

static void remember_socket(SOCKET s, int family, bool forced_dualstack) {
    if (s == INVALID_SOCKET) {
        return;
    }
    std::lock_guard<std::mutex> lock(g_socket_mutex);
    g_socket_meta[s] = SocketMeta{family, forced_dualstack};
}

static void forget_socket(SOCKET s) {
    std::lock_guard<std::mutex> lock(g_socket_mutex);
    g_socket_meta.erase(s);
}

static bool get_socket_meta(SOCKET s, SocketMeta* out) {
    std::lock_guard<std::mutex> lock(g_socket_mutex);
    auto it = g_socket_meta.find(s);
    if (it == g_socket_meta.end()) {
        return false;
    }
    if (out) {
        *out = it->second;
    }
    return true;
}

static bool should_translate_to_v6(SOCKET s) {
    SocketMeta m{};
    return g_dualstack_enabled && get_socket_meta(s, &m) && m.forced_dualstack;
}

static bool copy_or_translate_addr(const sockaddr_storage& src, int src_len, sockaddr* dst, int* dst_len) {
    if (!dst || !dst_len || *dst_len <= 0) {
        return false;
    }

    if (src.ss_family == AF_INET6 && src_len >= (int)sizeof(sockaddr_in6) &&
        *dst_len >= (int)sizeof(sockaddr_in)) {
        sockaddr_in out4{};
        if (mapped_to_v4(*reinterpret_cast<const sockaddr_in6*>(&src), &out4)) {
            memcpy(dst, &out4, sizeof(out4));
            *dst_len = (int)sizeof(out4);
            return true;
        }
    }

    int to_copy = std::min(*dst_len, src_len);
    memcpy(dst, &src, to_copy);
    *dst_len = to_copy;
    return true;
}

template <typename T>
static void resolve_real(T& fn, HMODULE ws2, const char* name) {
    if (!fn && ws2) {
        fn = reinterpret_cast<T>(GetProcAddress(ws2, name));
    }
}

static void resolve_real_functions() {
    HMODULE ws2 = GetModuleHandleA("ws2_32.dll");
    if (!ws2) {
        ws2 = LoadLibraryA("ws2_32.dll");
    }
    resolve_real(g_real_socket, ws2, "socket");
    resolve_real(g_real_wsasocketa, ws2, "WSASocketA");
    resolve_real(g_real_closesocket, ws2, "closesocket");
    resolve_real(g_real_connect, ws2, "connect");
    resolve_real(g_real_wsaconnect, ws2, "WSAConnect");
    resolve_real(g_real_bind, ws2, "bind");
    resolve_real(g_real_sendto, ws2, "sendto");
    resolve_real(g_real_recvfrom, ws2, "recvfrom");
    resolve_real(g_real_getsockname, ws2, "getsockname");
    resolve_real(g_real_getpeername, ws2, "getpeername");
}

static bool patch_iat_for_module(
    HMODULE mod,
    const char* import_name,
    const char* func_name,
    void* replacement,
    void** original_store) {
    if (!mod) {
        return false;
    }

    auto base = reinterpret_cast<unsigned char*>(mod);
    auto* dos = reinterpret_cast<IMAGE_DOS_HEADER*>(base);
    if (dos->e_magic != IMAGE_DOS_SIGNATURE) {
        return false;
    }

    auto* nt = reinterpret_cast<IMAGE_NT_HEADERS*>(base + dos->e_lfanew);
    if (nt->Signature != IMAGE_NT_SIGNATURE) {
        return false;
    }

    auto& dir = nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];
    if (!dir.VirtualAddress) {
        return false;
    }

    auto* imp = reinterpret_cast<IMAGE_IMPORT_DESCRIPTOR*>(base + dir.VirtualAddress);
    bool patched = false;

    for (; imp->Name; ++imp) {
        auto* dll = reinterpret_cast<const char*>(base + imp->Name);
        if (_stricmp(dll, import_name) != 0) {
            continue;
        }

        auto* thunk = reinterpret_cast<IMAGE_THUNK_DATA*>(base + imp->FirstThunk);
        auto* orig = reinterpret_cast<IMAGE_THUNK_DATA*>(
            base + (imp->OriginalFirstThunk ? imp->OriginalFirstThunk : imp->FirstThunk));

        for (; orig->u1.AddressOfData; ++orig, ++thunk) {
            if (IMAGE_SNAP_BY_ORDINAL(orig->u1.Ordinal)) {
                continue;
            }

            auto* by_name = reinterpret_cast<IMAGE_IMPORT_BY_NAME*>(base + orig->u1.AddressOfData);
            if (strcmp(reinterpret_cast<char*>(by_name->Name), func_name) != 0) {
                continue;
            }

            auto current = reinterpret_cast<void*>((uintptr_t)thunk->u1.Function);
            if (current == replacement) {
                patched = true;
                continue;
            }

            DWORD old_protect = 0;
            if (!VirtualProtect(
                    &thunk->u1.Function,
                    sizeof(thunk->u1.Function),
                    PAGE_EXECUTE_READWRITE,
                    &old_protect)) {
                continue;
            }

            if (original_store && *original_store == nullptr) {
                *original_store = current;
            }
            thunk->u1.Function = (uintptr_t)replacement;

            DWORD ignored = 0;
            VirtualProtect(
                &thunk->u1.Function,
                sizeof(thunk->u1.Function),
                old_protect,
                &ignored);
            FlushInstructionCache(
                GetCurrentProcess(),
                &thunk->u1.Function,
                sizeof(thunk->u1.Function));
            patched = true;
        }
    }

    return patched;
}

struct HookDef {
    const char* symbol;
    void* replacement;
    void** original;
};

static SOCKET WSAAPI hook_socket(int af, int type, int protocol);
static SOCKET WSAAPI hook_wsasocketa(
    int af,
    int type,
    int protocol,
    LPWSAPROTOCOL_INFOA info,
    GROUP group,
    DWORD flags);
static int WSAAPI hook_closesocket(SOCKET s);
static int WSAAPI hook_connect(SOCKET s, const sockaddr* name, int namelen);
static int WSAAPI hook_wsaconnect(
    SOCKET s,
    const sockaddr* name,
    int namelen,
    LPWSABUF callerData,
    LPWSABUF calleeData,
    LPQOS sqos,
    LPQOS gqos);
static int WSAAPI hook_bind(SOCKET s, const sockaddr* name, int namelen);
static int WSAAPI hook_sendto(
    SOCKET s,
    const char* buf,
    int len,
    int flags,
    const sockaddr* to,
    int tolen);
static int WSAAPI hook_recvfrom(
    SOCKET s,
    char* buf,
    int len,
    int flags,
    sockaddr* from,
    int* fromlen);
static int WSAAPI hook_getsockname(SOCKET s, sockaddr* name, int* namelen);
static int WSAAPI hook_getpeername(SOCKET s, sockaddr* name, int* namelen);

static HookDef kHooks[] = {
    {"socket", (void*)&hook_socket, (void**)&g_real_socket},
    {"WSASocketA", (void*)&hook_wsasocketa, (void**)&g_real_wsasocketa},
    {"closesocket", (void*)&hook_closesocket, (void**)&g_real_closesocket},
    {"connect", (void*)&hook_connect, (void**)&g_real_connect},
    {"WSAConnect", (void*)&hook_wsaconnect, (void**)&g_real_wsaconnect},
    {"bind", (void*)&hook_bind, (void**)&g_real_bind},
    {"sendto", (void*)&hook_sendto, (void**)&g_real_sendto},
    {"recvfrom", (void*)&hook_recvfrom, (void**)&g_real_recvfrom},
    {"getsockname", (void*)&hook_getsockname, (void**)&g_real_getsockname},
    {"getpeername", (void*)&hook_getpeername, (void**)&g_real_getpeername},
};

static void apply_hooks_for_module(HMODULE mod) {
    for (const auto& hook : kHooks) {
        patch_iat_for_module(mod, "ws2_32.dll", hook.symbol, hook.replacement, hook.original);
        patch_iat_for_module(mod, "WS2_32.dll", hook.symbol, hook.replacement, hook.original);
        patch_iat_for_module(mod, "wsock32.dll", hook.symbol, hook.replacement, hook.original);
        patch_iat_for_module(mod, "WSOCK32.dll", hook.symbol, hook.replacement, hook.original);
    }
}

static void patch_loaded_modules() {
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, GetCurrentProcessId());
    if (snap == INVALID_HANDLE_VALUE) {
        return;
    }

    MODULEENTRY32 me{};
    me.dwSize = sizeof(me);
    if (Module32First(snap, &me)) {
        do {
            apply_hooks_for_module(me.hModule);
        } while (Module32Next(snap, &me));
    }
    CloseHandle(snap);
}

static SOCKET WSAAPI hook_socket(int af, int type, int protocol) {
    resolve_real_functions();
    int requested_af = af;
    bool forced = false;

    if (g_dualstack_enabled && af == AF_INET) {
        af = AF_INET6;
        forced = true;
    }

    SOCKET s = g_real_socket ? g_real_socket(af, type, protocol) : INVALID_SOCKET;
    int err = (s == INVALID_SOCKET) ? WSAGetLastError() : 0;

    if (s != INVALID_SOCKET) {
        remember_socket(s, af, forced);
        if (forced) {
            int off = 0;
            setsockopt(s, IPPROTO_IPV6, IPV6_V6ONLY, (const char*)&off, sizeof(off));
        }
    }

    log_line(
        "socket(req_af=%s/%d,real_af=%s/%d,type=%d,proto=%d) => sock=%llu err=%d dualstack=%d",
        family_name(requested_af),
        requested_af,
        family_name(af),
        af,
        type,
        protocol,
        (unsigned long long)s,
        err,
        forced ? 1 : 0);

    if (s == INVALID_SOCKET) {
        WSASetLastError(err);
    }
    return s;
}

static SOCKET WSAAPI hook_wsasocketa(
    int af,
    int type,
    int protocol,
    LPWSAPROTOCOL_INFOA info,
    GROUP group,
    DWORD flags) {
    resolve_real_functions();
    int requested_af = af;
    bool forced = false;

    if (g_dualstack_enabled && af == AF_INET) {
        af = AF_INET6;
        forced = true;
    }

    SOCKET s =
        g_real_wsasocketa ? g_real_wsasocketa(af, type, protocol, info, group, flags) : INVALID_SOCKET;
    int err = (s == INVALID_SOCKET) ? WSAGetLastError() : 0;

    if (s != INVALID_SOCKET) {
        remember_socket(s, af, forced);
        if (forced) {
            int off = 0;
            setsockopt(s, IPPROTO_IPV6, IPV6_V6ONLY, (const char*)&off, sizeof(off));
        }
    }

    log_line(
        "WSASocketA(req_af=%s/%d,real_af=%s/%d,type=%d,proto=%d,flags=0x%lx) => sock=%llu err=%d dualstack=%d",
        family_name(requested_af),
        requested_af,
        family_name(af),
        af,
        type,
        protocol,
        (unsigned long)flags,
        (unsigned long long)s,
        err,
        forced ? 1 : 0);

    if (s == INVALID_SOCKET) {
        WSASetLastError(err);
    }
    return s;
}

static int WSAAPI hook_closesocket(SOCKET s) {
    resolve_real_functions();
    int rc = g_real_closesocket ? g_real_closesocket(s) : SOCKET_ERROR;
    int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;
    forget_socket(s);
    log_line("closesocket(sock=%llu) => rc=%d err=%d", (unsigned long long)s, rc, err);
    if (rc == SOCKET_ERROR) {
        WSASetLastError(err);
    }
    return rc;
}

static int WSAAPI hook_connect(SOCKET s, const sockaddr* name, int namelen) {
    resolve_real_functions();

    const sockaddr* real_name = name;
    int real_len = namelen;
    sockaddr_in6 mapped{};
    bool translated = false;

    if (name && name->sa_family == AF_INET && should_translate_to_v6(s)) {
        mapped = v4_to_mapped(*reinterpret_cast<const sockaddr_in*>(name));
        real_name = reinterpret_cast<const sockaddr*>(&mapped);
        real_len = (int)sizeof(mapped);
        translated = true;
    }

    int rc = g_real_connect ? g_real_connect(s, real_name, real_len) : SOCKET_ERROR;
    int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;

    log_line(
        "connect(sock=%llu,target=%s,translated=%d) => rc=%d err=%d",
        (unsigned long long)s,
        format_sockaddr(name, namelen).c_str(),
        translated ? 1 : 0,
        rc,
        err);

    if (rc == SOCKET_ERROR) {
        WSASetLastError(err);
    }
    return rc;
}

static int WSAAPI hook_wsaconnect(
    SOCKET s,
    const sockaddr* name,
    int namelen,
    LPWSABUF callerData,
    LPWSABUF calleeData,
    LPQOS sqos,
    LPQOS gqos) {
    resolve_real_functions();

    const sockaddr* real_name = name;
    int real_len = namelen;
    sockaddr_in6 mapped{};
    bool translated = false;

    if (name && name->sa_family == AF_INET && should_translate_to_v6(s)) {
        mapped = v4_to_mapped(*reinterpret_cast<const sockaddr_in*>(name));
        real_name = reinterpret_cast<const sockaddr*>(&mapped);
        real_len = (int)sizeof(mapped);
        translated = true;
    }

    int rc = g_real_wsaconnect
        ? g_real_wsaconnect(s, real_name, real_len, callerData, calleeData, sqos, gqos)
        : SOCKET_ERROR;
    int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;

    log_line(
        "WSAConnect(sock=%llu,target=%s,translated=%d) => rc=%d err=%d",
        (unsigned long long)s,
        format_sockaddr(name, namelen).c_str(),
        translated ? 1 : 0,
        rc,
        err);

    if (rc == SOCKET_ERROR) {
        WSASetLastError(err);
    }
    return rc;
}

static int WSAAPI hook_bind(SOCKET s, const sockaddr* name, int namelen) {
    resolve_real_functions();

    const sockaddr* real_name = name;
    int real_len = namelen;
    sockaddr_in6 mapped{};
    bool translated = false;

    if (name && name->sa_family == AF_INET && should_translate_to_v6(s)) {
        mapped = v4_to_mapped(*reinterpret_cast<const sockaddr_in*>(name));
        real_name = reinterpret_cast<const sockaddr*>(&mapped);
        real_len = (int)sizeof(mapped);
        translated = true;
    }

    int rc = g_real_bind ? g_real_bind(s, real_name, real_len) : SOCKET_ERROR;
    int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;

    log_line(
        "bind(sock=%llu,addr=%s,translated=%d) => rc=%d err=%d",
        (unsigned long long)s,
        format_sockaddr(name, namelen).c_str(),
        translated ? 1 : 0,
        rc,
        err);

    if (rc == SOCKET_ERROR) {
        WSASetLastError(err);
    }
    return rc;
}

static int WSAAPI hook_sendto(
    SOCKET s,
    const char* buf,
    int len,
    int flags,
    const sockaddr* to,
    int tolen) {
    resolve_real_functions();

    const sockaddr* real_to = to;
    int real_tolen = tolen;
    sockaddr_in6 mapped{};
    bool translated = false;

    if (to && to->sa_family == AF_INET && should_translate_to_v6(s)) {
        mapped = v4_to_mapped(*reinterpret_cast<const sockaddr_in*>(to));
        real_to = reinterpret_cast<const sockaddr*>(&mapped);
        real_tolen = (int)sizeof(mapped);
        translated = true;
    }

    int rc = g_real_sendto ? g_real_sendto(s, buf, len, flags, real_to, real_tolen) : SOCKET_ERROR;
    int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;

    log_line(
        "sendto(sock=%llu,len=%d,to=%s,translated=%d) => rc=%d err=%d",
        (unsigned long long)s,
        len,
        format_sockaddr(to, tolen).c_str(),
        translated ? 1 : 0,
        rc,
        err);

    if (rc == SOCKET_ERROR) {
        WSASetLastError(err);
    }
    return rc;
}

static int WSAAPI hook_recvfrom(
    SOCKET s,
    char* buf,
    int len,
    int flags,
    sockaddr* from,
    int* fromlen) {
    resolve_real_functions();

    bool translate_back = should_translate_to_v6(s) && from && fromlen && *fromlen > 0;
    if (!translate_back) {
        int rc = g_real_recvfrom ? g_real_recvfrom(s, buf, len, flags, from, fromlen) : SOCKET_ERROR;
        int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;
        log_line(
            "recvfrom(sock=%llu,len=%d,from=%s) => rc=%d err=%d",
            (unsigned long long)s,
            len,
            from && fromlen ? format_sockaddr(from, *fromlen).c_str() : "(null)",
            rc,
            err);
        if (rc == SOCKET_ERROR) {
            WSASetLastError(err);
        }
        return rc;
    }

    sockaddr_storage tmp{};
    int tmp_len = sizeof(tmp);
    int rc = g_real_recvfrom
        ? g_real_recvfrom(s, buf, len, flags, reinterpret_cast<sockaddr*>(&tmp), &tmp_len)
        : SOCKET_ERROR;
    int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;

    if (rc != SOCKET_ERROR) {
        copy_or_translate_addr(tmp, tmp_len, from, fromlen);
    }

    log_line(
        "recvfrom(sock=%llu,len=%d,raw_from=%s,translated=%d) => rc=%d err=%d",
        (unsigned long long)s,
        len,
        format_sockaddr(reinterpret_cast<sockaddr*>(&tmp), tmp_len).c_str(),
        1,
        rc,
        err);

    if (rc == SOCKET_ERROR) {
        WSASetLastError(err);
    }
    return rc;
}

static int WSAAPI hook_getsockname(SOCKET s, sockaddr* name, int* namelen) {
    resolve_real_functions();
    bool translate_back = should_translate_to_v6(s) && name && namelen && *namelen > 0;

    if (!translate_back) {
        int rc = g_real_getsockname ? g_real_getsockname(s, name, namelen) : SOCKET_ERROR;
        int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;
        log_line(
            "getsockname(sock=%llu) => rc=%d err=%d addr=%s",
            (unsigned long long)s,
            rc,
            err,
            name && namelen ? format_sockaddr(name, *namelen).c_str() : "(null)");
        if (rc == SOCKET_ERROR) {
            WSASetLastError(err);
        }
        return rc;
    }

    sockaddr_storage tmp{};
    int tmp_len = sizeof(tmp);
    int rc = g_real_getsockname
        ? g_real_getsockname(s, reinterpret_cast<sockaddr*>(&tmp), &tmp_len)
        : SOCKET_ERROR;
    int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (rc != SOCKET_ERROR) {
        copy_or_translate_addr(tmp, tmp_len, name, namelen);
    }

    log_line(
        "getsockname(sock=%llu) => rc=%d err=%d raw_addr=%s",
        (unsigned long long)s,
        rc,
        err,
        format_sockaddr(reinterpret_cast<sockaddr*>(&tmp), tmp_len).c_str());

    if (rc == SOCKET_ERROR) {
        WSASetLastError(err);
    }
    return rc;
}

static int WSAAPI hook_getpeername(SOCKET s, sockaddr* name, int* namelen) {
    resolve_real_functions();
    bool translate_back = should_translate_to_v6(s) && name && namelen && *namelen > 0;

    if (!translate_back) {
        int rc = g_real_getpeername ? g_real_getpeername(s, name, namelen) : SOCKET_ERROR;
        int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;
        log_line(
            "getpeername(sock=%llu) => rc=%d err=%d addr=%s",
            (unsigned long long)s,
            rc,
            err,
            name && namelen ? format_sockaddr(name, *namelen).c_str() : "(null)");
        if (rc == SOCKET_ERROR) {
            WSASetLastError(err);
        }
        return rc;
    }

    sockaddr_storage tmp{};
    int tmp_len = sizeof(tmp);
    int rc = g_real_getpeername
        ? g_real_getpeername(s, reinterpret_cast<sockaddr*>(&tmp), &tmp_len)
        : SOCKET_ERROR;
    int err = (rc == SOCKET_ERROR) ? WSAGetLastError() : 0;
    if (rc != SOCKET_ERROR) {
        copy_or_translate_addr(tmp, tmp_len, name, namelen);
    }

    log_line(
        "getpeername(sock=%llu) => rc=%d err=%d raw_addr=%s",
        (unsigned long long)s,
        rc,
        err,
        format_sockaddr(reinterpret_cast<sockaddr*>(&tmp), tmp_len).c_str());

    if (rc == SOCKET_ERROR) {
        WSASetLastError(err);
    }
    return rc;
}

static DWORD WINAPI init_worker(void*) {
    resolve_real_functions();
    g_dualstack_enabled = get_env_bool("OMP_TRACE_DUALSTACK");
    init_log_path();

    log_line(
        "omp-socket-trace loaded; dualstack=%d; log=%s",
        g_dualstack_enabled ? 1 : 0,
        g_log_path.c_str());

    DWORD loop = 0;
    for (;;) {
        patch_loaded_modules();
        g_initialized.store(true, std::memory_order_release);

        ++loop;
        if (loop < 60) {
            Sleep(250);
        } else {
            Sleep(2000);
        }
    }
}

}  // namespace

BOOL APIENTRY DllMain(HMODULE module, DWORD reason, LPVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        DisableThreadLibraryCalls(module);
        HANDLE thread = CreateThread(nullptr, 0, init_worker, nullptr, 0, nullptr);
        if (thread) {
            CloseHandle(thread);
        }
    }
    return TRUE;
}
