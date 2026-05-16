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
git commit -m "Update: MedOs AI Assistant behavior and persistence fixes"

REM Set branch and push
git branch -M main
git push -u origin main

echo ✅ Done!
pause
