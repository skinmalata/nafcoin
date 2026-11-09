Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $root 'logo.png'
$bannerPath = Join-Path $root 'banner.png'

function New-SquareIcon {
    param([string]$Source, [string]$Dest, [int]$Size)

    $src = [System.Drawing.Image]::FromFile($Source)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $scale = [Math]::Min($Size / $src.Width, $Size / $src.Height)
    $w = [int]($src.Width * $scale)
    $h = [int]($src.Height * $scale)
    $x = [int](($Size - $w) / 2)
    $y = [int](($Size - $h) / 2)
    $g.DrawImage($src, $x, $y, $w, $h)
    $g.Dispose()
    $bmp.Save($Dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $src.Dispose()
}

function New-OgImage {
    param([string]$Banner, [string]$Dest, [int]$W = 1200, [int]$H = 630)

    $src = [System.Drawing.Image]::FromFile($Banner)
    $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(15, 15, 20))
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $scale = $W / $src.Width
    $w = $W
    $h = [int]($src.Height * $scale)
    if ($h -gt $H) {
        $scale = $H / $src.Height
        $h = $H
        $w = [int]($src.Width * $scale)
    }
    $x = [int](($W - $w) / 2)
    $y = [int](($H - $h) / 2)
    $g.DrawImage($src, $x, $y, $w, $h)
    $g.Dispose()
    $bmp.Save($Dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $src.Dispose()
}

New-SquareIcon -Source $logoPath -Dest (Join-Path $root 'favicon-32.png') -Size 32
New-SquareIcon -Source $logoPath -Dest (Join-Path $root 'favicon-192.png') -Size 192
New-SquareIcon -Source $logoPath -Dest (Join-Path $root 'apple-touch-icon.png') -Size 180
New-SquareIcon -Source $logoPath -Dest (Join-Path $root 'logo-64.png') -Size 64
New-SquareIcon -Source $logoPath -Dest (Join-Path $root 'logo-128.png') -Size 128
New-SquareIcon -Source $logoPath -Dest (Join-Path $root 'logo-512.png') -Size 512
New-OgImage -Banner $bannerPath -Dest (Join-Path $root 'og-image.png')

Write-Output 'Images generated: favicon-32.png, favicon-192.png, apple-touch-icon.png, og-image.png'

