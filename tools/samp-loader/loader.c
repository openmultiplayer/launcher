/*
 * vorbisFile.dll SA-MP loader proxy (32-bit, for GTA SA under Wine/macOS).
 *
 * GTA SA statically imports vorbisFile.dll for Ogg user-track playback, so
 * Windows/Wine loads this DLL automatically at process start. Every export
 * is forwarded to the renamed real DLL (vorbisFile_o.dll, see loader.def),
 * so game audio is unaffected. DllMain additionally LoadLibrary's samp.dll
 * into gta_sa.exe.
 *
 * Only samp.dll is loaded. omp-client.dll (the open.mp client) faults with
 * 0xC0000005 under Wine regardless of when it is loaded — both from DllMain
 * and deferred from a worker thread were tested; deferring only delays the
 * crash. samp.dll alone connects to both SA-MP and open.mp servers.
 *
 * Once samp.dll is in the process it parses gta_sa.exe's command line
 * (-c -n <name> -h <ip> -p <port> [-z <pass>]) and connects to that server.
 */
#include <windows.h>

BOOL WINAPI DllMain(HINSTANCE inst, DWORD reason, LPVOID reserved)
{
    (void)reserved;
    if (reason == DLL_PROCESS_ATTACH)
    {
        DisableThreadLibraryCalls(inst);
        /* Search order resolves samp.dll from the game directory first. */
        LoadLibraryA("samp.dll");
    }
    return TRUE;
}
