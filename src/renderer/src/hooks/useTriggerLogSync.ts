import { useEffect } from 'react'
import { useTriggerLogStore } from '../stores/triggerLogStore'

export function useTriggerLogSync() {
  useEffect(() => {
    window.electronAPI?.onTcpMessage((rawMessage: unknown) => {
      const message = (rawMessage || {}) as { msg_type?: string; payload?: Record<string, unknown> }
      if (message.msg_type !== 'EXECUTE_TRIGGER_RESULT') return

      const payload = message.payload || {}
      const key = String(payload.triggerKey || '')
      const sceneId = payload.sceneId ? String(payload.sceneId) : ''
      const text = String(payload.message || '')
      const ok = payload.ok === true

      useTriggerLogStore
        .getState()
        .addLog(`触发器回执${sceneId ? ` [${sceneId}]` : ''} ${key ? `(${key})` : ''}: ${text}`, ok ? 'success' : 'error')
    })

    return () => {
      window.electronAPI?.removeAllListeners('tcp-message')
    }
  }, [])
}
