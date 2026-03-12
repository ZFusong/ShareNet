import { useState } from 'react'

type ContentType = 'text' | 'image' | 'file'

interface ReceivedMessage {
  id: string
  type: ContentType
  content: string
  from: string
  timestamp: number
}

export function ResourcePanel() {
  const [contentType, setContentType] = useState<ContentType>('text')
  const [textContent, setTextContent] = useState('')
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([])

  const handleSend = () => {
    if (contentType === 'text' && !textContent.trim()) {
      alert('请输入内容')
      return
    }
    // TODO: Implement send logic
    console.log('Sending:', { type: contentType, content: textContent })
    setTextContent('')
  }

  const clearReceived = () => {
    setReceivedMessages([])
  }

  return (
    <section id="resource-panel" className="panel">
      <div className="panel-left">
        <div className="panel-header">
          <h3>发送内容</h3>
        </div>
        <div className="send-panel">
          <div className="content-type mb-4 flex gap-2">
            <button
              className={`type-btn px-4 py-2 rounded ${contentType === 'text' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
              data-type="text"
              onClick={() => setContentType('text')}
            >
              文字
            </button>
            <button
              className={`type-btn px-4 py-2 rounded ${contentType === 'image' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
              data-type="image"
              onClick={() => setContentType('image')}
            >
              图片
            </button>
            <button
              className={`type-btn px-4 py-2 rounded ${contentType === 'file' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
              data-type="file"
              onClick={() => setContentType('file')}
            >
              文件
            </button>
          </div>

          {contentType === 'text' && (
            <div id="text-content" className="content-editor">
              <textarea
                id="text-input"
                className="w-full h-40 p-2 border rounded resize-none"
                placeholder="输入文字内容..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
            </div>
          )}

          {contentType === 'image' && (
            <div id="image-content" className="content-editor">
              <div id="image-dropzone" className="dropzone border-2 border-dashed border-border rounded p-8 text-center cursor-pointer">
                <p>拖拽图片到这里，或点击选择</p>
                <input type="file" id="image-input" accept="image/*" hidden />
              </div>
              <div className="compression-options mt-4">
                <label className="mr-2">压缩:</label>
                <select id="image-quality">
                  <option value="original">原图</option>
                  <option value="high" selected>高质量</option>
                  <option value="preview">预览</option>
                </select>
              </div>
            </div>
          )}

          {contentType === 'file' && (
            <div id="file-content" className="content-editor">
              <div id="file-dropzone" className="dropzone border-2 border-dashed border-border rounded p-8 text-center cursor-pointer">
                <p>拖拽文件到这里，或点击选择</p>
                <input type="file" id="file-input" hidden />
              </div>
              <div id="file-list" className="file-list mt-4">
                {/* File list */}
              </div>
            </div>
          )}

          <div className="send-target mt-4 flex gap-4">
            <label>
              <input type="radio" name="send-target" value="broadcast" defaultChecked /> 广播
            </label>
            <label>
              <input type="radio" name="send-target" value="selected" /> 已选设备
            </label>
          </div>

          <button id="send-content" className="btn-primary mt-4" onClick={handleSend}>
            发送
          </button>
        </div>
      </div>

      <div className="panel-right">
        <div className="panel-header">
          <h3>接收历史</h3>
          <button id="clear-received" className="btn-icon" title="清理" onClick={clearReceived}>
            🗑️
          </button>
        </div>
        <div id="received-list" className="received-list h-full overflow-y-auto border rounded">
          {receivedMessages.length === 0 ? (
            <div className="empty-state">暂无接收记录</div>
          ) : (
            receivedMessages.map((msg) => (
              <div key={msg.id} className="p-3 border-b">
                <div className="text-sm font-medium">{msg.from}</div>
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}