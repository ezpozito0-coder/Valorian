# Recorta bustos y figuras de los modelos Pixel Art base (1024x1024) y los exporta como RGBA crudo para Node.js
Add-Type -AssemblyName System.Drawing

$assetsDir = "c:\Valorian\public\assets"
$outDir = "c:\Valorian\scripts\raw_ui"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# nombre | archivo origen | x | y | lado | tamaño salida
$crops = @(
  "bust_guerrero_m|heroe_guerrero|330|0|380|96",
  "bust_guerrera_f|heroina_guerrera|320|0|380|96",
  "bust_mago_m|heroe_mago|330|80|340|96",
  "bust_maga_f|heroina_maga|320|80|340|96",
  "bust_arquero_m|heroe_arquero|350|40|330|96",
  "bust_arquera_f|heroina_arquera|340|30|330|96",
  "bust_herrero|npc_herrero|360|0|400|96",
  "bust_lobo_enemigo|enemigo_lobo|20|250|400|96",
  "bust_lobo_mascota|mascota_lobo|590|50|390|96",
  "fig_guerrero_m|heroe_guerrero|0|0|1024|112",
  "fig_guerrera_f|heroina_guerrera|0|0|1024|112",
  "fig_mago_m|heroe_mago|0|0|1024|112",
  "fig_maga_f|heroina_maga|0|0|1024|112",
  "fig_arquero_m|heroe_arquero|0|0|1024|112",
  "fig_arquera_f|heroina_arquera|0|0|1024|112"
)

foreach ($line in $crops) {
  $p = $line.Split('|')
  $name = $p[0]; $src = $p[1]; $x = [int]$p[2]; $y = [int]$p[3]; $side = [int]$p[4]; $size = [int]$p[5]
  $srcImg = [System.Drawing.Image]::FromFile((Join-Path $assetsDir "$src.png"))
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.Clear([System.Drawing.Color]::White)
  $dest = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $g.DrawImage($srcImg, $dest, $x, $y, $side, $side, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $srcImg.Dispose()

  $bytes = New-Object byte[] ($size * $size * 4)
  $i = 0
  for ($yy = 0; $yy -lt $size; $yy++) {
    for ($xx = 0; $xx -lt $size; $xx++) {
      $c = $bmp.GetPixel($xx, $yy)
      $bytes[$i] = $c.R; $bytes[$i + 1] = $c.G; $bytes[$i + 2] = $c.B; $bytes[$i + 3] = $c.A
      $i += 4
    }
  }
  $bmp.Dispose()
  [System.IO.File]::WriteAllBytes((Join-Path $outDir "$name.rgba"), $bytes)
  Write-Host "Cropped $name ($size x $size)"
}
