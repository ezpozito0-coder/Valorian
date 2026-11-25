Add-Type -AssemblyName System.Drawing

$pairs = @(
  @{ Src = 'C:\Users\Felip\.gemini\antigravity\brain\a7bf8473-e922-46c6-80bf-03b077c8d3c6\iconos_habilidades_1795609685339.jpg'; Dst = 'c:\Valorian\scripts\raw_models\iconos_habilidades_raw.rgba' },
  @{ Src = 'C:\Users\Felip\.gemini\antigravity\brain\a7bf8473-e922-46c6-80bf-03b077c8d3c6\vfx_combate_sheet_v3_1795609733602.jpg'; Dst = 'c:\Valorian\scripts\raw_models\vfx_combate_raw.rgba' },
  @{ Src = 'C:\Users\Felip\.gemini\antigravity\brain\a7bf8473-e922-46c6-80bf-03b077c8d3c6\vfx_rpg_spritesheet_4x4_v3_1795609932536.jpg'; Dst = 'c:\Valorian\scripts\raw_models\vfx_proyectiles_raw.rgba' }
)

$sz = 512
foreach ($p in $pairs) {
  $img = [System.Drawing.Image]::FromFile($p.Src)
  $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($img, 0, 0, $sz, $sz)
  $g.Dispose()
  $img.Dispose()

  $rect = New-Object System.Drawing.Rectangle(0, 0, $sz, $sz)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bgra = New-Object byte[] ($sz * $sz * 4)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bgra, 0, $bgra.Length)
  $bmp.UnlockBits($data)
  $bmp.Dispose()

  $rgba = New-Object byte[] ($sz * $sz * 4)
  for ($i = 0; $i -lt $bgra.Length; $i += 4) {
    $rgba[$i] = $bgra[$i + 2]
    $rgba[$i + 1] = $bgra[$i + 1]
    $rgba[$i + 2] = $bgra[$i]
    $rgba[$i + 3] = $bgra[$i + 3]
  }
  [System.IO.File]::WriteAllBytes($p.Dst, $rgba)
  Write-Host ("Extracted " + $p.Dst + " (" + $rgba.Length + " bytes)")
}
