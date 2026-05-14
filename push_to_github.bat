@echo off
echo 🚀 Pushing to GitHub...

REM Initialize if not a git repo
if not exist .git (
    git init
)

REM Check if origin exists, if so remove it to avoid conflicts
git remote remove origin >nul 2>&1

REM Add the new remote
git remote add origin https://github.com/lateefatobadina2016/HSM-streamlit-deploy-back-up.git

REM Add files
git add .

REM Commit
git commit -m "Deploy: Backup for Vercel deployment"

REM Set branch and push
git branch -M main
git push -u origin main

echo ✅ Done!
pause
