param(
  [string]$SourceDir = "F:\tencent game craft\craft furniture",
  [string]$OutputDir = "F:\tencent game craft\public\assets\processed\furniture"
)

Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Test-BackgroundLike {
  param([System.Drawing.Color]$Pixel)

  if ($Pixel.A -eq 0) { return $true }

  $max = [Math]::Max($Pixel.R, [Math]::Max($Pixel.G, $Pixel.B))
  $min = [Math]::Min($Pixel.R, [Math]::Min($Pixel.G, $Pixel.B))
  $avg = ($Pixel.R + $Pixel.G + $Pixel.B) / 3

  return (($max - $min) -le 14 -and $avg -ge 204)
}

function Test-HaloPixel {
  param([System.Drawing.Color]$Pixel)

  if ($Pixel.A -eq 0) { return $false }

  $max = [Math]::Max($Pixel.R, [Math]::Max($Pixel.G, $Pixel.B))
  $min = [Math]::Min($Pixel.R, [Math]::Min($Pixel.G, $Pixel.B))
  $avg = ($Pixel.R + $Pixel.G + $Pixel.B) / 3

  return (($max - $min) -le 18 -and $avg -ge 222)
}

function Get-TransparentNeighborCount {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [int]$X,
    [int]$Y
  )

  $count = 0
  for ($dy = -1; $dy -le 1; $dy++) {
    for ($dx = -1; $dx -le 1; $dx++) {
      if ($dx -eq 0 -and $dy -eq 0) { continue }
      $nx = $X + $dx
      $ny = $Y + $dy
      if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $Bitmap.Width -or $ny -ge $Bitmap.Height) {
        $count += 1
        continue
      }
      if ($Bitmap.GetPixel($nx, $ny).A -eq 0) {
        $count += 1
      }
    }
  }
  return $count
}

Get-ChildItem -Path $SourceDir -Filter *.png | ForEach-Object {
  $safeName = $_.BaseName -replace '\s+', ''
  $source = [System.Drawing.Bitmap]::FromFile($_.FullName)
  $width = $source.Width
  $height = $source.Height
  $visited = New-Object 'bool[,]' $width, $height
  $queue = New-Object System.Collections.Generic.Queue[object]

  for ($x = 0; $x -lt $width; $x++) {
    $queue.Enqueue(@($x, 0))
    $queue.Enqueue(@($x, ($height - 1)))
  }
  for ($y = 0; $y -lt $height; $y++) {
    $queue.Enqueue(@(0, $y))
    $queue.Enqueue(@(($width - 1), $y))
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    $x = [int]$point[0]
    $y = [int]$point[1]

    if ($x -lt 0 -or $x -ge $width -or $y -lt 0 -or $y -ge $height -or $visited[$x, $y]) {
      continue
    }

    if (-not (Test-BackgroundLike $source.GetPixel($x, $y))) {
      continue
    }

    $visited[$x, $y] = $true
    $queue.Enqueue(@(($x + 1), $y))
    $queue.Enqueue(@(($x - 1), $y))
    $queue.Enqueue(@($x, ($y + 1)))
    $queue.Enqueue(@($x, ($y - 1)))
  }

  $clean = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
      if ($visited[$x, $y]) {
        $clean.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      } else {
        $clean.SetPixel($x, $y, $source.GetPixel($x, $y))
      }
    }
  }

  $halo = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $minX = $width
  $minY = $height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
      $pixel = $clean.GetPixel($x, $y)
      $outPixel = $pixel
      $transparentNeighbors = Get-TransparentNeighborCount $clean $x $y

      if ((Test-HaloPixel $pixel) -and $transparentNeighbors -ge 3) {
        $alpha = if ($transparentNeighbors -ge 5) { 0 } else { 96 }
        $outPixel = [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B)
      }

      $halo.SetPixel($x, $y, $outPixel)
      if ($outPixel.A -gt 0) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -ge $minX -and $maxY -ge $minY) {
    $cropWidth = $maxX - $minX + 1
    $cropHeight = $maxY - $minY + 1
    $crop = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($crop)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $graphics.DrawImage(
      $halo,
      (New-Object System.Drawing.Rectangle 0, 0, $cropWidth, $cropHeight),
      (New-Object System.Drawing.Rectangle $minX, $minY, $cropWidth, $cropHeight),
      [System.Drawing.GraphicsUnit]::Pixel
    )
    $graphics.Dispose()

    $outputPath = Join-Path $OutputDir ($safeName + ".png")
    $crop.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output ("{0} -> {1}x{2}" -f $outputPath, $cropWidth, $cropHeight)
    $crop.Dispose()
  }

  $halo.Dispose()
  $clean.Dispose()
  $source.Dispose()
}
