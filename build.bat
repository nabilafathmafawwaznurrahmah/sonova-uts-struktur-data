@echo off
REM ============================================================
REM  build.bat - Kompilasi server C++ Sonova (Windows)
REM  ============================================================
where g++ >nul 2>nul
if %ERRORLEVEL%==0 (
    echo [1/2] Mengkompilasi dengan MinGW (g++)...
    g++ -std=c++17 -O0 -static-libgcc -static-libstdc++ server.cpp -o server.exe -lws2_32
    goto :hasil
)
where cl >nul 2>nul
if %ERRORLEVEL%==0 (
    echo [1/2] Mengkompilasi dengan MSVC (cl)...
    cl /EHsc /O2 server.cpp
    goto :hasil
)
echo.
echo [GAGAL] Kompiler C++ tidak ditemukan di PATH.
echo         Instal MinGW (winget install BrechtSanders.WinLibs.POSIX.UCRT)
echo         atau Visual Studio Build Tools, lalu coba lagi.
goto :eof

:hasil
if exist server.exe (
    echo.
    echo [2/2] server.exe berhasil dibuat. Jalankan: server.exe
) else (
    echo.
    echo [GAGAL] Kompilasi error. Periksa pesan error di atas.
)
