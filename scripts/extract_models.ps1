# Script PowerShell con System.Drawing para extraer tus modelos base a resolución Pixel Art (160x160 RGBA),
# eliminar el fondo blanco con BFS Flood-Fill, y exportar el búfer binario RGBA para Node.js
Add-Type -AssemblyName System.Drawing

$assetsDir = "c:\Valorian\public\assets"
$outRawDir = "c:\Valorian\scripts\raw_models"
if (!(Test-Path $outRawDir)) { New-Item -ItemType Directory -Path $outRawDir | Out-Null }

$models = @(
  "heroina_guerrera",
  "heroina_maga",
  "heroina_arquera",
  "heroe_guerrero",
  "heroe_mago",
  "heroe_arquero",
  "npc_tabernero",
  "npc_herrero",
  "prop_muneco",
  "enemigo_lobo",
  "enemigo_trasgo",
  "enemigo_esqueleto",
  "enemigo_elemental",
  "mascota_lobo",
  "mascota_fantasma",
  "mascota_gato",
  "mascota_dragon",
  "jefe_malakor",
  "jefe_ignis",
  "jefe_boreas",
  "jefe_vaelor"
)

$targetSize = 144

foreach ($name in $models) {
  $srcPath = Join-Path $assetsDir "$name.png"
  if (!(Test-Path $srcPath)) { continue }

  $srcImg = [System.Drawing.Image]::FromFile($srcPath)
  $bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawImage($srcImg, 0, 0, $targetSize, $targetSize)
  $g.Dispose()
  $srcImg.Dispose()

  $bytes = New-Object byte[] ($targetSize * $targetSize * 4)
  $idx = 0
  for ($y = 0; $y -lt $targetSize; $y++) {
    for ($x = 0; $x -lt $targetSize; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $bytes[$idx] = $c.R
      $bytes[$idx + 1] = $c.G
      $bytes[$idx + 2] = $c.B
      $bytes[$idx + 3] = $c.A
      $idx += 4
    }
  }
  $bmp.Dispose()

  $rawPath = Join-Path $outRawDir "$name.rgba"
  [System.IO.File]::WriteAllBytes($rawPath, $bytes)
  Write-Host "Extracted raw RGBA: $name ($targetSize x $targetSize)"
}
