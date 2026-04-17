
$port = 5173
$root = "c:\Projects\AIMTRAINER\dist"
$mimeTypes = @{
    ".html" = "text/html"
    ".js"   = "application/javascript"
    ".css"  = "text/css"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".json" = "application/json"
}

$server = [System.Net.HttpListener]::new()
$server.Prefixes.Add("http://localhost:$port/")
$server.Start()
Write-Host "Server started on http://localhost:$port/"

try {
    while ($server.IsListening) {
        $context = $server.GetContext()
        $path = $context.Request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        $file = Join-Path $root $path
        
        if (Test-Path $file -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($file)
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $context.Response.ContentType = $contentType
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $context.Response.StatusCode = 404
        }
        $context.Response.Close()
    }
} finally {
    $server.Stop()
}
