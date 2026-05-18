/*
 * vorbisFile.dll SA-MP loader proxy (32-bit, for GTA SA under Wine/macOS).
 *
 * GTA SA statically imports vorbisFile.dll for Ogg user-track playback, so
 * Windows/Wine loads this DLL automatically at process start. Every export
 * is forwarded to the renamed real DLL (vorbisFile_o.dll, see loader.def),
 * so game audio is unaffected. DllMain additionally LoadLibrary's samp.dll
 * (and omp-client.dll) into gta_sa.exe.
 *
 * Once samp.dll is in the process it parses gta_sa.exe's command line
 * (-c -n <name> -h <ip> -p <port> [-z <pass>]) and connects to that server,
 * which is exactly how the Windows launcher's runtime injection behaves.
 * This replaces the need for native DLL injection (impossible from macOS)
 * and the localhost-only samp_debug.exe.
 */
#include <windows.h>

static void load_client(void)
{
    /* Load only samp.dll. omp-client.dll loaded this early (inside the
     * import-time DllMain) faults with 0xC0000005; samp.dll alone connects
     * to both SA-MP and open.mp servers. Search order resolves it from the
     * game directory. */
    LoadLibraryA("samp.dll");
}

BOOL WINAPI DllMain(HINSTANCE inst, DWORD reason, LPVOID reserved)
{
    (void)inst;
    (void)reserved;
    if (reason == DLL_PROCESS_ATTACH)
    {
        DisableThreadLibraryCalls(inst);
        load_client();
    }
    return TRUE;
}
