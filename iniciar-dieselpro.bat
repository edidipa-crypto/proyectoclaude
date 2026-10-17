@echo off
title DieselPro (no cierres esta ventana mientras uses la plataforma)
cd /d C:\Proyectos\DieselPro
echo.
echo  Iniciando DieselPro...
echo  Cuando aparezca "Ready", abre en el navegador: http://localhost:3000
echo  Para apagarla, cierra esta ventana.
echo.
start "" cmd /c "timeout /t 12 >nul && start http://localhost:3000"
call npm run dev
pause
