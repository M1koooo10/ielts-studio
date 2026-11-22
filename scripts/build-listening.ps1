param([string]$InputFile, [string]$OutputFile)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (!$InputFile) { $InputFile = Join-Path $root 'content/listening/listening-sets.json' }
if (!$OutputFile) { $OutputFile = Join-Path $root 'content/listening/listening-sets.json' }
$editionList = @(Get-Content -Raw -Encoding UTF8 -LiteralPath $InputFile | ConvertFrom-Json)
$assetDirectory = Join-Path $root 'public/content/listening'
[void][IO.Directory]::CreateDirectory($assetDirectory)
$utf8 = New-Object Text.UTF8Encoding($false)
$audio = New-Object -ComObject SAPI.SpVoice
$english = Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Speech\Voices\Tokens' | Where-Object {
  (Get-ItemProperty -LiteralPath (Join-Path $_.PSPath 'Attributes')).Language -match '(^|;)409($|;)'
} | Select-Object -First 1
if (!$english) { throw 'A US English SAPI desktop voice is required.' }
$token = New-Object -ComObject SAPI.SpObjectToken
$token.SetId($english.Name,'',$false)
$audio.Voice = $token
$audio.AllowAudioOutputFormatChangesOnNextSet = $false
$format = New-Object -ComObject SAPI.SpAudioFormat
$format.Type = 18 # 16 kHz, 16 bit, mono PCM
$bytesPerSecond = 32000
$lowRoles = @('Nora','Ben','Ruth','Lee','Lecturer')
foreach ($edition in $editionList) {
  $duration = 0.0
  foreach ($section in $edition.sections) {
    if ($section.id -notmatch '^l[12]p[1-4]$') { throw 'Unexpected section id.' }
    $samples = New-Object IO.MemoryStream
    try {
      $samples.Write((New-Object byte[] 6400),0,6400)
      foreach ($segment in $section.segments) {
        $role,$line = $segment.text -split ': ',2
        if (!$line) { throw 'Each transcript turn must identify its speaker.' }
        $pitch = if ($lowRoles -contains $role) { -6 } elseif ($role -eq 'Narrator') { -1 } else { 3 }
        $audio.Rate = if ($lowRoles -contains $role) { -2 } else { -1 }
        $stream = New-Object -ComObject SAPI.SpMemoryStream
        try {
          $stream.Format = $format
          $audio.AudioOutputStream = $stream
          $escaped = [Security.SecurityElement]::Escape($line)
          [void]$audio.Speak("<pitch absmiddle='$pitch'>$escaped</pitch>",8)
          $bytes = [byte[]]$stream.GetData()
          if ($bytes.Length -lt 1000) { throw 'Speech engine returned an empty turn.' }
          $segment.start = [Math]::Round($samples.Length / $bytesPerSecond,4)
          $samples.Write($bytes,0,$bytes.Length)
          $segment.end = [Math]::Round($samples.Length / $bytesPerSecond,4)
          $linked = @($section.questions | Where-Object { $segment.text.Contains($_.evidence) })
          foreach ($question in $linked) { $question.at = $segment.start }
          $gap = if ($role -eq 'Narrator') { $bytesPerSecond*5 } elseif ($linked.Count) { $bytesPerSecond*2 } else { $bytesPerSecond/2 }
          $samples.Write((New-Object byte[] $gap),0,$gap)
        } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($stream) }
      }
      $target = Join-Path $assetDirectory ($section.id + '.wav')
      $file = [IO.File]::Create($target)
      $writer = New-Object IO.BinaryWriter($file)
      try {
        $writer.Write([Text.Encoding]::ASCII.GetBytes('RIFF'))
        $writer.Write([int](36+$samples.Length))
        $writer.Write([Text.Encoding]::ASCII.GetBytes('WAVEfmt '))
        $writer.Write([int]16)
        $writer.Write([int16]1)
        $writer.Write([int16]1)
        $writer.Write([int]16000)
        $writer.Write([int]$bytesPerSecond)
        $writer.Write([int16]2)
        $writer.Write([int16]16)
        $writer.Write([Text.Encoding]::ASCII.GetBytes('data'))
        $writer.Write([int]$samples.Length)
        $samples.Position = 0
        $samples.CopyTo($file)
      } finally { $writer.Dispose() }
      $seconds = $samples.Length / $bytesPerSecond
      $duration += $seconds
      Write-Output ("{0}: {1:F1}s, {2} turns" -f $section.id,$seconds,$section.segments.Count)
    } finally { $samples.Dispose() }
  }
  $edition.minutes = [Math]::Ceiling($duration/60 + 2)
}
[void][IO.Directory]::CreateDirectory((Split-Path -Parent ([IO.Path]::GetFullPath($OutputFile))))
[IO.File]::WriteAllText([IO.Path]::GetFullPath($OutputFile),(ConvertTo-Json -InputObject $editionList -Depth 14),$utf8)

