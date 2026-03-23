import { spawn } from 'child_process'

type KeyboardStepType = 'keyCombo' | 'keyPress' | 'textInput'
type MouseStepType = 'mouseMove' | 'mouseScroll' | 'mouseClick'

interface InputAction {
  kind: 'keyboard' | 'mouse'
  stepType: KeyboardStepType | MouseStepType
  data: Record<string, unknown>
}

const powershellCommand = 'powershell.exe'

const WINDOWS_INPUT_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'

if (-not ('ShareNet.NativeInput' -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
namespace ShareNet {
  public static class NativeInput {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern short VkKeyScan(char ch);
  }
}
"@
}

$KEYEVENTF_KEYUP = 0x0002
$MOUSEEVENTF_LEFTDOWN = 0x0002
$MOUSEEVENTF_LEFTUP = 0x0004
$MOUSEEVENTF_RIGHTDOWN = 0x0008
$MOUSEEVENTF_RIGHTUP = 0x0010
$MOUSEEVENTF_MIDDLEDOWN = 0x0020
$MOUSEEVENTF_MIDDLEUP = 0x0040
$MOUSEEVENTF_WHEEL = 0x0800

function Get-ModifierTokens {
  return @('Ctrl', 'Alt', 'Shift', 'Meta')
}

function Invoke-KeyDown([int]$virtualKey) {
  [ShareNet.NativeInput]::keybd_event([byte]$virtualKey, 0, 0, [UIntPtr]::Zero)
}

function Invoke-KeyUp([int]$virtualKey) {
  [ShareNet.NativeInput]::keybd_event([byte]$virtualKey, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
}

function Resolve-KeySpec([string]$token) {
  switch ($token) {
    'Ctrl' { return @{ VirtualKey = 0x11; Modifiers = @() } }
    'Alt' { return @{ VirtualKey = 0x12; Modifiers = @() } }
    'Shift' { return @{ VirtualKey = 0x10; Modifiers = @() } }
    'Meta' { return @{ VirtualKey = 0x5B; Modifiers = @() } }
    'Enter' { return @{ VirtualKey = 0x0D; Modifiers = @() } }
    'Tab' { return @{ VirtualKey = 0x09; Modifiers = @() } }
    'Esc' { return @{ VirtualKey = 0x1B; Modifiers = @() } }
    'Space' { return @{ VirtualKey = 0x20; Modifiers = @() } }
    'Up' { return @{ VirtualKey = 0x26; Modifiers = @() } }
    'Down' { return @{ VirtualKey = 0x28; Modifiers = @() } }
    'Left' { return @{ VirtualKey = 0x25; Modifiers = @() } }
    'Right' { return @{ VirtualKey = 0x27; Modifiers = @() } }
    'Home' { return @{ VirtualKey = 0x24; Modifiers = @() } }
    'End' { return @{ VirtualKey = 0x23; Modifiers = @() } }
    'PageUp' { return @{ VirtualKey = 0x21; Modifiers = @() } }
    'PageDown' { return @{ VirtualKey = 0x22; Modifiers = @() } }
    'Insert' { return @{ VirtualKey = 0x2D; Modifiers = @() } }
    'Delete' { return @{ VirtualKey = 0x2E; Modifiers = @() } }
    'Backspace' { return @{ VirtualKey = 0x08; Modifiers = @() } }
    'CapsLock' { return @{ VirtualKey = 0x14; Modifiers = @() } }
    'PrintScreen' { return @{ VirtualKey = 0x2C; Modifiers = @() } }
    'ScrollLock' { return @{ VirtualKey = 0x91; Modifiers = @() } }
    'Pause' { return @{ VirtualKey = 0x13; Modifiers = @() } }
    'ContextMenu' { return @{ VirtualKey = 0x5D; Modifiers = @() } }
    'Menu' { return @{ VirtualKey = 0x5D; Modifiers = @() } }
  }

  if ($token -match '^F([1-9]|1[0-9]|2[0-4])$') {
    $number = [int]$Matches[1]
    return @{ VirtualKey = (0x70 + $number - 1); Modifiers = @() }
  }

  if ($token.Length -eq 1) {
    $vkScan = [ShareNet.NativeInput]::VkKeyScan($token[0])
    if ($vkScan -ne -1) {
      $modifiers = @()
      $modifierMask = ($vkScan -shr 8) -band 0xFF
      if ($modifierMask -band 1) { $modifiers += 'Shift' }
      if ($modifierMask -band 2) { $modifiers += 'Ctrl' }
      if ($modifierMask -band 4) { $modifiers += 'Alt' }
      return @{ VirtualKey = ($vkScan -band 0xFF); Modifiers = $modifiers }
    }
  }

  return $null
}

function Press-ModifierSet([string[]]$tokens) {
  foreach ($token in $tokens) {
    $spec = Resolve-KeySpec $token
    if ($null -eq $spec) { throw "Unsupported modifier token: $token" }
    Invoke-KeyDown $spec.VirtualKey
  }
}

function Release-ModifierSet([string[]]$tokens) {
  for ($index = $tokens.Count - 1; $index -ge 0; $index--) {
    $token = $tokens[$index]
    $spec = Resolve-KeySpec $token
    if ($null -eq $spec) { continue }
    Invoke-KeyUp $spec.VirtualKey
  }
}

function Invoke-KeyTap([string]$token) {
  $spec = Resolve-KeySpec $token
  if ($null -eq $spec) { throw "Unsupported key token: $token" }

  Press-ModifierSet $spec.Modifiers
  Invoke-KeyDown $spec.VirtualKey
  Start-Sleep -Milliseconds 25
  Invoke-KeyUp $spec.VirtualKey
  Release-ModifierSet $spec.Modifiers
}

function Invoke-KeyCombo([object[]]$tokens) {
  $modifierTokens = @($tokens | Where-Object { $_ -in (Get-ModifierTokens) })
  $regularTokens = @($tokens | Where-Object { $_ -notin (Get-ModifierTokens) })

  if ($regularTokens.Count -eq 0 -and $modifierTokens.Count -gt 0) {
    $regularTokens = @($modifierTokens[-1])
    if ($modifierTokens.Count -gt 1) {
      $modifierTokens = @($modifierTokens[0..($modifierTokens.Count - 2)])
    } else {
      $modifierTokens = @()
    }
  }

  Press-ModifierSet $modifierTokens

  $pressed = @()
  foreach ($token in $regularTokens) {
    $spec = Resolve-KeySpec ([string]$token)
    if ($null -eq $spec) { throw "Unsupported key token: $token" }

    $tempModifiers = @($spec.Modifiers | Where-Object { $_ -notin $modifierTokens })
    Press-ModifierSet $tempModifiers
    Invoke-KeyDown $spec.VirtualKey
    $pressed += [pscustomobject]@{
      VirtualKey = $spec.VirtualKey
      TempModifiers = $tempModifiers
    }
    Start-Sleep -Milliseconds 25
  }

  for ($index = $pressed.Count - 1; $index -ge 0; $index--) {
    $item = $pressed[$index]
    Invoke-KeyUp $item.VirtualKey
    Release-ModifierSet $item.TempModifiers
  }

  Release-ModifierSet $modifierTokens
}

function Escape-SendKeysText([string]$text) {
  $builder = New-Object System.Text.StringBuilder
  foreach ($char in $text.ToCharArray()) {
    switch ($char) {
      '+' { [void]$builder.Append('{+}') }
      '^' { [void]$builder.Append('{^}') }
      '%' { [void]$builder.Append('{%}') }
      '~' { [void]$builder.Append('{~}') }
      '(' { [void]$builder.Append('{(}') }
      ')' { [void]$builder.Append('{)}') }
      '[' { [void]$builder.Append('{[}') }
      ']' { [void]$builder.Append('{]}') }
      '{' { [void]$builder.Append('{{}') }
      '}' { [void]$builder.Append('{}}') }
      "\`r" { }
      "\`n" { [void]$builder.Append('{ENTER}') }
      default { [void]$builder.Append($char) }
    }
  }
  return $builder.ToString()
}

$actionJson = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:SHARENET_INPUT_ACTION))
$action = $actionJson | ConvertFrom-Json

switch ($action.kind) {
  'keyboard' {
    switch ($action.stepType) {
      'textInput' {
        $shell = New-Object -ComObject WScript.Shell
        $text = [string]$action.data.text
        if ($text) {
          $shell.SendKeys((Escape-SendKeysText $text))
        }
      }
      'keyPress' {
        $tokens = @($action.data.keys)
        if ($tokens.Count -eq 0 -and $action.data.key) {
          $tokens = @([string]$action.data.key)
        }
        if ($tokens.Count -eq 0) { throw 'keyPress step missing key token' }
        Invoke-KeyTap ([string]$tokens[-1])
      }
      'keyCombo' {
        $tokens = @($action.data.keys)
        if ($tokens.Count -eq 0 -and $action.data.key) {
          $tokens = @([string]$action.data.key)
        }
        if ($tokens.Count -eq 0) { throw 'keyCombo step missing key tokens' }
        Invoke-KeyCombo $tokens
      }
      default {
        throw "Unsupported keyboard stepType: $($action.stepType)"
      }
    }
  }
  'mouse' {
    switch ($action.stepType) {
      'mouseMove' {
        $x = [int][Math]::Round([double]$action.data.screenX)
        $y = [int][Math]::Round([double]$action.data.screenY)
        [void][ShareNet.NativeInput]::SetCursorPos($x, $y)
      }
      'mouseClick' {
        $button = [int]$action.data.button
        $clickCount = [Math]::Max(1, [int]$action.data.clickCount)
        switch ($button) {
          2 { $downFlag = $MOUSEEVENTF_RIGHTDOWN; $upFlag = $MOUSEEVENTF_RIGHTUP }
          1 { $downFlag = $MOUSEEVENTF_MIDDLEDOWN; $upFlag = $MOUSEEVENTF_MIDDLEUP }
          default { $downFlag = $MOUSEEVENTF_LEFTDOWN; $upFlag = $MOUSEEVENTF_LEFTUP }
        }
        for ($i = 0; $i -lt $clickCount; $i++) {
          [ShareNet.NativeInput]::mouse_event($downFlag, 0, 0, 0, [UIntPtr]::Zero)
          Start-Sleep -Milliseconds 25
          [ShareNet.NativeInput]::mouse_event($upFlag, 0, 0, 0, [UIntPtr]::Zero)
          if ($i -lt ($clickCount - 1)) {
            Start-Sleep -Milliseconds 90
          }
        }
      }
      'mouseScroll' {
        $direction = [string]$action.data.direction
        $stepCount = [Math]::Max(1, [int]$action.data.step)
        $wheelDelta = 120 * $stepCount
        if ($direction -eq 'up') {
          [ShareNet.NativeInput]::mouse_event($MOUSEEVENTF_WHEEL, 0, 0, $wheelDelta, [UIntPtr]::Zero)
        } else {
          [ShareNet.NativeInput]::mouse_event($MOUSEEVENTF_WHEEL, 0, 0, (-1 * $wheelDelta), [UIntPtr]::Zero)
        }
      }
      default {
        throw "Unsupported mouse stepType: $($action.stepType)"
      }
    }
  }
  default {
    throw "Unsupported action kind: $($action.kind)"
  }
}
`

export async function executeWindowsInputAction(action: InputAction): Promise<void> {
  const encodedAction = Buffer.from(JSON.stringify(action), 'utf8').toString('base64')

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      powershellCommand,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', WINDOWS_INPUT_SCRIPT],
      {
        windowsHide: true,
        env: {
          ...process.env,
          SHARENET_INPUT_ACTION: encodedAction
        }
      }
    )

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr.trim() || `Windows input helper exited with code ${code}`))
    })
  })
}
