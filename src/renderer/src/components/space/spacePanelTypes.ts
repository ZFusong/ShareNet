import type { TriggerLogEntry } from '../../stores/triggerLogStore'
import type { Device } from '../../stores/deviceStore'
import type { SpaceButton } from '../../stores/configStore'

export type SpacePanelMode = 'view' | 'edit' | 'create'

export interface SpaceFormData {
  name: string
  description: string
  deviceKeys: string[]
  buttons: SpaceButton[]
}

export interface ButtonDraft {
  name: string
  triggerKey: string
}

export interface SpaceDeviceSummary {
  key: string
  device: Device
  displayName: string
  address: string
  isOnline: boolean
  isMissing: boolean
}

export type SpaceLogEntry = TriggerLogEntry
