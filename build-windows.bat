@echo off
chcp 65001 >nul
echo ===== بناء نسخة الويندوز - سنترال أحمد يوسف =====
where node >nul 2>nul || (echo يلزم تثبيت Node.js أولًا من https://nodejs.org ثم أعد تشغيل هذا الملف & pause & exit /b 1)
call npm install || (echo فشل تثبيت الحزم & pause & exit /b 1)
call npm run dist:win || (echo فشل البناء & pause & exit /b 1)
echo.
echo تم! ستجد ملف التثبيت داخل مجلد dist
start "" dist
pause
