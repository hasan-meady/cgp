@echo off
echo Adding all changes...
git add .

echo Committing with current date and time...
git commit -m "Update %date% %time%"

echo Pushing to origin main...
git push origin main

echo Done!
pause
