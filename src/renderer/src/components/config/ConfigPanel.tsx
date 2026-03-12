import { useState } from 'react'

type ConfigTab = 'software' | 'input' | 'scene'

interface Preset {
  id: string
  name: string
  path?: string
  args?: string
}

export function ConfigPanel() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('software')
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [formData, setFormData] = useState({ name: '', path: '', args: '' })

  const handleTabChange = (tab: ConfigTab) => {
    setActiveTab(tab)
    setSelectedPreset(null)
    setFormData({ name: '', path: '', args: '' })
    // TODO: Load presets from store
  }

  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset)
    setFormData({ name: preset.name, path: preset.path || '', args: preset.args || '' })
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('请输入名称')
      return
    }
    // TODO: Save preset to store
    console.log('Saving preset:', { type: activeTab, ...formData })
  }

  const handleDelete = () => {
    if (!selectedPreset) return
    if (!confirm('确定要删除这个预设吗？')) return
    // TODO: Delete preset from store
    console.log('Deleting preset:', selectedPreset.id)
    setSelectedPreset(null)
    setFormData({ name: '', path: '', args: '' })
  }

  const handleExport = () => {
    // TODO: Implement export
    console.log('Exporting config...')
  }

  const handleImport = () => {
    // TODO: Implement import
    console.log('Importing config...')
  }

  const configTabs: { id: ConfigTab; label: string }[] = [
    { id: 'software', label: '软件预设' },
    { id: 'input', label: '键鼠预设' },
    { id: 'scene', label: '场景编排' }
  ]

  return (
    <section id="config-panel" className="panel">
      <div className="config-tabs flex gap-2 p-4 border-b">
        {configTabs.map((tab) => (
          <button
            key={tab.id}
            className={`config-tab px-4 py-2 rounded ${
              activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
            data-config={tab.id}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="config-content flex flex-1 overflow-hidden">
        <div className="config-list w-1/2 p-4 border-r overflow-y-auto">
          <div className="config-header flex items-center justify-between mb-4">
            <h3 id="config-title">{configTabs.find((t) => t.id === activeTab)?.label}</h3>
            <button id="add-preset" className="btn-primary" onClick={() => setSelectedPreset(null)}>
              + 新增
            </button>
          </div>
          <div id="preset-list" className="preset-list">
            {presets.length === 0 ? (
              <div className="empty-state">暂无预设</div>
            ) : (
              presets.map((preset) => (
                <div
                  key={preset.id}
                  className={`p-3 border-b cursor-pointer hover:bg-accent ${
                    selectedPreset?.id === preset.id ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => handleSelectPreset(preset)}
                >
                  <div className="font-medium">{preset.name}</div>
                  {preset.path && (
                    <div className="text-xs text-muted-foreground truncate">{preset.path}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="config-editor w-1/2 p-4 overflow-y-auto">
          <h3 id="editor-title" className="mb-4">
            {selectedPreset ? '编辑预设' : '新增预设'}
          </h3>
          <div id="preset-form" className="preset-form">
            <div className="form-group">
              <label>名称</label>
              <input
                type="text"
                id="preset-name"
                placeholder="预设名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {activeTab === 'software' && (
              <>
                <div className="form-group">
                  <label>路径</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="preset-path"
                      placeholder="程序路径"
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      className="flex-1"
                    />
                    <button id="browse-path" className="btn-secondary">
                      浏览
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>参数</label>
                  <input
                    type="text"
                    id="preset-args"
                    placeholder="启动参数"
                    value={formData.args}
                    onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="form-actions flex gap-2 mt-4">
              <button id="save-preset" className="btn-primary" onClick={handleSave}>
                保存
              </button>
              {selectedPreset && (
                <button id="delete-preset" className="btn-danger" onClick={handleDelete}>
                  删除
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="config-actions flex gap-2 p-4 border-t">
        <button id="export-config" className="btn-secondary" onClick={handleExport}>
          导出配置
        </button>
        <button id="import-config" className="btn-secondary" onClick={handleImport}>
          导入配置
        </button>
      </div>
    </section>
  )
}