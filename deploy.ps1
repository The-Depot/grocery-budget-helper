# Push changes to GitHub and trigger Render deploy hook
git add .
if ($args.Count -gt 0) {
    $msg = $args[0]
} else {
    $msg = "Deploy updates"
}
git commit -m $msg
git push
Write-Host "Push complete. Triggering Render deploy hook..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Method Post -Uri "https://api.render.com/deploy/srv-d949p6tckfvc739jc2m0?key=dCRoDGcJEt8"
Write-Host "Deployment triggered successfully on Render (ID: $($response.deploy.id))!" -ForegroundColor Green
