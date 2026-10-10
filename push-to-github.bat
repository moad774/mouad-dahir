@echo off
chcp 65001 >nul
cd /d "C:\Users\Ibtis\.gemini\antigravity\scratch\cellulite-massager-landing"
echo ====================================================
echo 🚀 جاري رفع المشروع إلى GitHub (moad774/mouad-dahir)...
echo ====================================================
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ تم رفع المشروع بنجاح إلى GitHub!
) else (
    echo ❌ فشل الرفع. تأكد من تسجيل الدخول أو إدخال Token بشكل صحيح.
)
echo.
pause
