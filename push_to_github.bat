@echo off
echo 🚀 Pushing to GitHub...

REM Initialize if not a git repo
if not exist .git (
    git init
)

REM Add the new remote
git remote remove origin >nul 2>&1
git remote add origin https://github.com/devadex247/hospital_management_system.git

REM Add files
git add .

REM Commit
git commit -m "Update: MedOs AI Assistant behavior, Nigerian accounts, and persistence fixes"

REM Set branch
git branch -M main

REM Pull remote changes first to avoid "rejected" error, or force push if it's a new repo
echo 🔄 Syncing with remote...
git pull origin main --rebase --allow-unrelated-histories

REM Push
echo ⬆️ Pushing to main branch...
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ Standard push failed. Attempting force push to overwrite remote defaults...
    git push -u origin main --force
)

echo ✅ Done!
pause
