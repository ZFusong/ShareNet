import { useCallback, useEffect, useRef, useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Dialog from '@radix-ui/react-dialog'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Select from '@radix-ui/react-select'
import { toast } from 'sonner'
import { useDeviceStore } from '../../stores/deviceStore'

type ContentType='text'|'image'|'file'
type ImageStatus='offered'|'downloading'|'downloaded'

type Message={id:string;type:ContentType;content:string;from:string;fromPort?:number;fromName?:string;timestamp:number;fileName?:string;fileSize?:number;thumbnail?:string;mimeType?:string;shareId?:string;imageStatus?:ImageStatus;downloadPath?:string;progress?:number;isSelf?:boolean}
type PickedFile={name:string;path:string;size:number;file:File;sourcePath?:string}
type FileTransfer={fileId:string;fileName:string;fileSize:number;totalChunks:number;receivedCount:number;chunks:Array<Uint8Array|null>}
type ImageEvent={shareId:string;fromIp?:string;fromPort?:number;progress?:number;path?:string;dataUrl?:string;error?:string;fileName?:string;fileSize?:number;mimeType?:string}

export function ResourcePanel(){
  const [contentType,setContentType]=useState<ContentType>('text')
  const [textContent,setTextContent]=useState('')
  const [selectedFiles,setSelectedFiles]=useState<PickedFile[]>([])
  const [sendTarget,setSendTarget]=useState<'broadcast'|'selected'|'group'>('broadcast')
  const [groupFilter,setGroupFilter]=useState('all')
  const [groupTargetId,setGroupTargetId]=useState('all')
  const [messages,setMessages]=useState<Message[]>([])
  const [previewImage,setPreviewImage]=useState<string|null>(null)
  const [clearOpen,setClearOpen]=useState(false)
  const [pickerOpen,setPickerOpen]=useState(false)
  const textInputRef=useRef<HTMLTextAreaElement>(null)
  const fileInputRef=useRef<HTMLInputElement>(null)
  const imageInputRef=useRef<HTMLInputElement>(null)
  const fileTransfersRef=useRef<Map<string,FileTransfer>>(new Map())
  const {devices,deviceGroups,selectedDevices,toggleSelectDevice,selectAll,deselectAll,localDevice}=useDeviceStore()
  const selectedCount=selectedDevices.size
  const onlineDevices=devices.filter((d)=>d.status!=='offline')
  const getDeviceKey=(d:{ip:string;port:number})=>`${d.ip}:${d.port}`
  const groupsForFilter=deviceGroups.map((group)=>({group,devices:onlineDevices.filter((d)=>group.deviceKeys.includes(getDeviceKey(d)))}))
  const filteredDevices=groupFilter==='all'?onlineDevices:(groupsForFilter.find((entry)=>entry.group.id===groupFilter)?.devices||[])

  useEffect(()=>{
    const handlePaste=(e:ClipboardEvent)=>{
      const items=e.clipboardData?.items
      if(!items)return
      for(const item of items){
        if(item.type==='text/plain'){
          item.getAsString((text)=>{setContentType('text');setTextContent((prev)=>prev+text)})
          return
        }
      }
    }
    document.addEventListener('paste',handlePaste)
    return()=>document.removeEventListener('paste',handlePaste)
  },[])

  const base64FromUint8=(bytes:Uint8Array)=>{let binary='';for(let i=0;i<bytes.length;i+=0x8000){binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000))}return btoa(binary)}
  const uint8FromBase64=(base64:string)=>{const binary=atob(base64);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes}
  const senderDevice=()=>localDevice||{id:'local',name:'Local',ip:'127.0.0.1',port:0,role:'bidirectional' as const,tags:[],status:'online' as const,lastSeen:Date.now()}
  const createMessageId=()=>`${Date.now()}-${Math.random().toString(36).slice(2)}`
  const nativePath=(file:File)=>window.electronAPI?.getPathForFile(file)||((file as File & {path?:string}).path)
  const formatSize=(bytes:number)=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/(1024*1024)).toFixed(1)} MB`

  const updateImageMessage=useCallback((payload:ImageEvent,updater:(message:Message)=>Message)=>{
    setMessages((prev)=>prev.map((message)=>{
      const sameShare=message.type==='image'&&message.shareId===payload.shareId
      const sameSender=(payload.fromIp?message.from===payload.fromIp:true)&&(payload.fromPort?message.fromPort===payload.fromPort:true)
      return sameShare&&sameSender?updater(message):message
    }))
  },[])

  const prependMessage=useCallback((message:Message)=>{
    setMessages((prev)=>[message,...prev])
  },[])

  const sendMessageToTargets=useCallback(async(message:any)=>{
    let targets=sendTarget==='broadcast'?devices:devices.filter((d)=>selectedDevices.has(d.id))
    if(sendTarget==='group'){
      if(groupTargetId==='all'){toast.error('请先选择分组');return false}
      const targetGroup=deviceGroups.find((group)=>group.id===groupTargetId)
      if(!targetGroup||targetGroup.deviceKeys.length===0){toast.error('所选分组下暂无设备');return false}
      targets=devices.filter((device)=>targetGroup.deviceKeys.includes(getDeviceKey(device)))
    }
    if(targets.length===0){toast.error('没有可发送的目标设备');return false}
    let failed=0
    for(const device of targets){
      const connected=await window.electronAPI?.tcpConnect(device.ip,device.port,senderDevice())
      if(!connected?.success){failed+=1;continue}
      const sent=await window.electronAPI?.tcpSend(device.ip,device.port,message)
      if(!sent?.success)failed+=1
    }
    if(failed>0){toast.error(`发送失败：${failed} 台设备`);return false}
    return true
  },[deviceGroups,devices,groupTargetId,selectedDevices,sendTarget])

  useEffect(()=>{
    window.electronAPI?.onTcpMessage((message:any,from:any)=>{
      if(message?.msg_type==='SHARE_TEXT'){
        prependMessage({id:createMessageId(),type:'text',content:message.payload?.content||'',from:from?.ip||'unknown',fromPort:from?.port,fromName:from?.name||'Unknown',timestamp:message.timestamp||Date.now()})
        return
      }
      if(message?.msg_type==='IMAGE_OFFER'){
        const payload=message.payload||{}
        prependMessage({id:createMessageId(),type:'image',content:payload.thumbnail||'',thumbnail:payload.thumbnail||'',from:from?.ip||'unknown',fromPort:from?.port,fromName:from?.name||'Unknown',timestamp:payload.createdAt||message.timestamp||Date.now(),fileName:payload.fileName,fileSize:payload.fileSize,mimeType:payload.mimeType,shareId:payload.shareId,imageStatus:'offered',progress:0})
        return
      }
      if(message?.msg_type==='IMAGE_DOWNLOAD_ERROR'){
        const payload=message.payload||{}
        updateImageMessage({shareId:payload.shareId,fromIp:from?.ip,fromPort:from?.port},(current)=>({...current,imageStatus:current.downloadPath?'downloaded':'offered',progress:0}))
        toast.error(payload.message||'图片下载失败')
        return
      }
      if(message?.msg_type==='SHARE_FILE'){
        const payload=message.payload||{}
        if(!payload.fileId||typeof payload.totalChunks!=='number'||typeof payload.chunkIndex!=='number'||!payload.data)return
        let transfer=fileTransfersRef.current.get(payload.fileId)
        if(!transfer){transfer={fileId:payload.fileId,fileName:payload.fileName||'file',fileSize:payload.fileSize||0,totalChunks:payload.totalChunks,receivedCount:0,chunks:new Array(payload.totalChunks).fill(null)};fileTransfersRef.current.set(payload.fileId,transfer)}
        if(!transfer.chunks[payload.chunkIndex]){transfer.chunks[payload.chunkIndex]=uint8FromBase64(payload.data);transfer.receivedCount+=1}
        if(transfer.receivedCount===transfer.totalChunks){
          const blob=new Blob(transfer.chunks.filter(Boolean) as Uint8Array[])
          const reader=new FileReader()
          reader.onload=async()=>{
            const dataUrl=typeof reader.result==='string'?reader.result:''
            const saved=await window.electronAPI?.saveReceived?.({type:'file',content:dataUrl,fileName:transfer?.fileName})
            prependMessage({id:createMessageId(),type:'file',content:saved?.path||'',from:from?.ip||'unknown',fromPort:from?.port,fromName:from?.name||'Unknown',timestamp:message.timestamp||Date.now(),fileName:transfer?.fileName,fileSize:transfer?.fileSize})
          }
          reader.readAsDataURL(blob)
          fileTransfersRef.current.delete(payload.fileId)
        }
      }
    })
    window.electronAPI?.onImageDownloadProgress?.((payload:unknown)=>{const event=payload as ImageEvent;updateImageMessage(event,(current)=>({...current,imageStatus:'downloading',progress:event.progress||0}))})
    window.electronAPI?.onImageDownloadComplete?.((payload:unknown)=>{const event=payload as ImageEvent;updateImageMessage(event,(current)=>({...current,imageStatus:'downloaded',progress:100,content:event.dataUrl||current.content,downloadPath:event.path,fileName:event.fileName||current.fileName,fileSize:event.fileSize||current.fileSize,mimeType:event.mimeType||current.mimeType}));toast.success(`图片已下载到 ${event.path}`)})
    window.electronAPI?.onImageDownloadError?.((payload:unknown)=>{const event=payload as ImageEvent;updateImageMessage(event,(current)=>({...current,imageStatus:current.downloadPath?'downloaded':'offered',progress:0}));toast.error(event.error||'图片下载失败')})
    return()=>{window.electronAPI?.removeAllListeners?.('tcp-message');window.electronAPI?.removeAllListeners?.('image-download-progress');window.electronAPI?.removeAllListeners?.('image-download-complete');window.electronAPI?.removeAllListeners?.('image-download-error')}
  },[prependMessage,updateImageMessage])

  const addFiles=(files:FileList,type:'image'|'file')=>{
    const next:PickedFile[]=[]
    for(let i=0;i<files.length;i++){
      const file=files[i]
      if(type==='image'&&!file.type.startsWith('image/'))continue
      const sourcePath=nativePath(file)
      if(type==='image'&&!sourcePath){toast.error(`图片 ${file.name} 缺少本地路径，暂不支持按需下载`);continue}
      next.push({name:file.name,path:URL.createObjectURL(file),size:file.size,file,sourcePath})
    }
    if(next.length>0)setSelectedFiles((prev)=>[...prev,...next])
  }

  const createThumbnail=(file:PickedFile)=>new Promise<string>((resolve,reject)=>{
    const img=new Image()
    img.onload=()=>{const scale=Math.min(240/img.width,240/img.height,1);const width=Math.max(1,Math.round(img.width*scale));const height=Math.max(1,Math.round(img.height*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx){reject(new Error('无法生成缩略图'));return}ctx.drawImage(img,0,0,width,height);resolve(canvas.toDataURL('image/jpeg',0.82))}
    img.onerror=()=>reject(new Error(`无法读取图片 ${file.name}`))
    img.src=file.path
  })

  const handleRevealFile=async(filePath?:string)=>{
    if(!filePath){toast.error('当前文件路径无效');return}
    if(!window.electronAPI?.revealFile){toast.error('打开所在位置功能尚未加载，请重启客户端');return}
    const result=await window.electronAPI.revealFile(filePath)
    if(!result?.success){toast.error(result?.error||'无法打开文件所在位置')}
  }

  const sendText=async()=>{
    if(!textContent.trim())return
    const content=textContent
    const sender=senderDevice()
    const ok=await sendMessageToTargets({msg_type:'SHARE_TEXT',payload:{content}})
    if(ok){
      prependMessage({id:createMessageId(),type:'text',content,from:sender.ip,fromPort:sender.port,fromName:sender.name,timestamp:Date.now(),isSelf:true})
      setTextContent('')
      textInputRef.current?.focus()
    }
  }
  const sendImages=async()=>{
    if(sendTarget==='selected'&&selectedCount===0){toast.error('请先选择设备');return}
    if(sendTarget==='group'&&groupTargetId==='all'){toast.error('请先选择分组');return}
    let failed=false
    const sender=senderDevice()
    for(const file of selectedFiles){
      if(!file.sourcePath){toast.error(`图片 ${file.name} 缺少本地路径，无法发送`);failed=true;break}
      const thumbnail=await createThumbnail(file)
      const shareId=`img-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const registered=await window.electronAPI?.registerSharedImage({shareId,filePath:file.sourcePath,fileName:file.name,fileSize:file.size,mimeType:file.file.type||'image/png',thumbnail,createdAt:Date.now()})
      if(!registered?.success){toast.error(registered?.error||'图片注册失败');failed=true;break}
      const ok=await sendMessageToTargets({msg_type:'IMAGE_OFFER',payload:{shareId,fileName:file.name,fileSize:file.size,mimeType:file.file.type||'image/png',thumbnail,createdAt:Date.now()}})
      if(!ok){failed=true;break}
      prependMessage({id:createMessageId(),type:'image',content:file.path,thumbnail,from:sender.ip,fromPort:sender.port,fromName:sender.name,timestamp:Date.now(),fileName:file.name,fileSize:file.size,mimeType:file.file.type||'image/png',shareId,imageStatus:'offered',progress:0,isSelf:true})
    }
    if(!failed){setSelectedFiles([]);toast.success('图片卡片已发送，接收方确认后才会下载原图')}
  }
  const sendFiles=async()=>{
    if(sendTarget==='selected'&&selectedCount===0){toast.error('请先选择设备');return}
    if(sendTarget==='group'&&groupTargetId==='all'){toast.error('请先选择分组');return}
    let failed=false
    const sender=senderDevice()
    for(const file of selectedFiles){
      const bytes=new Uint8Array(await file.file.arrayBuffer())
      const totalChunks=Math.ceil(bytes.length/(256*1024))
      const fileId=`${Date.now()}-${Math.random().toString(36).slice(2)}`
      for(let i=0;i<totalChunks;i++){
        const chunk=bytes.subarray(i*256*1024,Math.min((i+1)*256*1024,bytes.length))
        const ok=await sendMessageToTargets({msg_type:'SHARE_FILE',payload:{fileId,fileName:file.name,fileSize:file.size,chunkIndex:i,totalChunks,data:base64FromUint8(chunk)}})
        if(!ok){failed=true;break}
      }
      if(!failed){prependMessage({id:createMessageId(),type:'file',content:file.sourcePath||'',from:sender.ip,fromPort:sender.port,fromName:sender.name,timestamp:Date.now(),fileName:file.name,fileSize:file.size,isSelf:true})}
      if(failed)break
    }
    if(!failed)setSelectedFiles([])
  }

  const handleSend=async()=>{if(contentType==='text')return sendText();if(contentType==='image')return sendImages();return sendFiles()}
  const handleDownloadImage=async(message:Message)=>{
    if(!message.shareId||!message.fromPort){toast.error('当前图片缺少下载信息');return}
    updateImageMessage({shareId:message.shareId,fromIp:message.from,fromPort:message.fromPort},(current)=>({...current,imageStatus:'downloading',progress:0}))
    const connected=await window.electronAPI?.tcpConnect(message.from,message.fromPort,senderDevice())
    if(!connected?.success){updateImageMessage({shareId:message.shareId,fromIp:message.from,fromPort:message.fromPort},(current)=>({...current,imageStatus:current.downloadPath?'downloaded':'offered',progress:0}));toast.error('无法连接发送方设备');return}
    const sent=await window.electronAPI?.tcpSend(message.from,message.fromPort,{msg_type:'IMAGE_DOWNLOAD_REQUEST',payload:{shareId:message.shareId}})
    if(!sent?.success){updateImageMessage({shareId:message.shareId,fromIp:message.from,fromPort:message.fromPort},(current)=>({...current,imageStatus:current.downloadPath?'downloaded':'offered',progress:0}));toast.error('下载请求发送失败')}
  }

  return <section id='resource-panel' className='panel h-full'><div className='h-full p-4'><div className='h-full grid grid-cols-1 lg:grid-cols-2 gap-8'>
    <div className='flex flex-col h-full bg-secondary/40 rounded-lg border p-4'>
      <div className='flex justify-between items-center mb-3'><h3 className='font-medium text-sm'>分享记录</h3><AlertDialog.Root open={clearOpen} onOpenChange={setClearOpen}><AlertDialog.Trigger asChild><button className='text-xs text-muted-foreground hover:text-foreground'>清理</button></AlertDialog.Trigger><AlertDialog.Portal><AlertDialog.Overlay className='fixed inset-0 bg-black/50 z-50'/><AlertDialog.Content className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded shadow-lg p-6 w-[90vw] max-w-md z-50'><AlertDialog.Title className='font-medium mb-2'>清理分享记录</AlertDialog.Title><AlertDialog.Description className='text-sm text-muted-foreground mb-4'>确定要清理所有分享记录吗？此操作无法撤销。</AlertDialog.Description><div className='flex justify-end gap-2'><AlertDialog.Cancel className='px-4 py-2 text-sm border rounded hover:bg-secondary'>取消</AlertDialog.Cancel><AlertDialog.Action onClick={()=>{setMessages([]);setClearOpen(false)}} className='px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red/90'>清理</AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root></div>
      <ScrollArea.Root className='flex-1 min-h-0 border rounded bg-background'><ScrollArea.Viewport className='h-full w-full relative'>{messages.length===0?<div className='absolute inset-0 flex items-center justify-center text-muted-foreground text-sm'>暂无分享记录</div>:<div className='space-y-2 p-2'>{messages.map((msg)=><div key={msg.id} className='p-3 bg-secondary/30 rounded border'><div className='flex justify-between items-start gap-3 mb-1'><div className='flex items-center gap-2 min-w-0'><span className='text-sm font-medium truncate'>{msg.fromName||msg.from}</span>{msg.isSelf&&<span className='shrink-0 rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 border border-green-200'>本机</span>}</div><span className='text-xs text-muted-foreground shrink-0'>{new Date(msg.timestamp).toLocaleString()}</span></div>{msg.type==='text'&&<p className='text-sm whitespace-pre-wrap'>{msg.content}</p>}{msg.type==='image'&&msg.thumbnail&&<div className='space-y-2'><img src={msg.thumbnail} alt='offer' className='max-h-32 rounded cursor-pointer hover:opacity-80' onClick={()=>setPreviewImage(msg.content||msg.thumbnail||null)}/>{msg.fileName&&<div className='text-sm text-foreground break-all'>{msg.fileName}</div>}</div>}{msg.type==='file'&&<div className='text-sm break-all'>{msg.fileName}</div>}<div className='flex gap-2 mt-2 items-center flex-wrap'>{msg.type==='text'&&<button onClick={()=>{navigator.clipboard.writeText(msg.content);toast.success('已复制到剪贴板')}} className='text-xs text-primary hover:underline'>复制</button>}{msg.type==='image'&&msg.imageStatus==='offered'&&!msg.isSelf&&<button onClick={()=>handleDownloadImage(msg)} className='text-xs text-primary hover:underline'>下载原图</button>}{msg.type==='image'&&msg.imageStatus==='downloading'&&<span className='text-xs text-muted-foreground'>下载中 {msg.progress||0}%</span>}{msg.type==='image'&&msg.imageStatus==='downloaded'&&<button onClick={()=>handleSaveImage(msg.content,msg.fileName||'image')} className='text-xs text-primary hover:underline'>另存为</button>}{msg.type==='image'&&msg.imageStatus==='downloaded'&&msg.downloadPath&&<button onClick={()=>handleRevealFile(msg.downloadPath)} className='text-xs text-primary hover:underline'>打开所在位置</button>}{msg.type==='image'&&msg.fileSize&&<span className='text-xs text-muted-foreground'>{formatSize(msg.fileSize)}</span>}{msg.type==='file'&&msg.content&&<a href={msg.content} download={msg.fileName} className='text-xs text-primary hover:underline'>下载</a>}</div></div>)}</div>}</ScrollArea.Viewport></ScrollArea.Root>
    </div>
    <div className='flex flex-col h-full bg-secondary/40 rounded-lg border p-4 overflow-auto'><div className='space-y-4'>
      <div className='flex gap-2'>{(['text','image','file'] as ContentType[]).map((type)=><button key={type} className={`px-4 py-2 rounded text-sm ${contentType===type?'bg-primary text-primary-foreground':'bg-secondary hover:bg-secondary/80'}`} onClick={()=>setContentType(type)}>{type==='text'?'文字':type==='image'?'图片':'文件'}</button>)}</div>
      {contentType==='text'&&<div><textarea ref={textInputRef} className='w-full h-40 p-3 border rounded resize-none text-sm bg-background' placeholder='输入文字内容... (支持 Ctrl+V 粘贴)' value={textContent} onChange={(e)=>setTextContent(e.target.value)} onKeyDown={(e)=>{if(e.ctrlKey&&e.key==='Enter')sendText()}}/><div className='text-xs text-muted-foreground mt-1'>按 Ctrl+Enter 发送</div></div>}
      {contentType==='image'&&<div className='space-y-3'><div className='border-2 border-dashed border-border rounded p-8 text-center cursor-pointer hover:border-primary/50' onClick={()=>imageInputRef.current?.click()} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault();addFiles(e.dataTransfer.files,'image')}}><p className='text-muted-foreground'>拖拽图片到这里，或点击选择</p><p className='text-xs text-muted-foreground mt-1'>发送元信息和缩略图，接收方确认后再下载原图</p><input ref={imageInputRef} type='file' accept='image/*' multiple className='hidden' onChange={(e)=>{if(e.target.files)addFiles(e.target.files,'image');e.target.value=''}}/></div>{selectedFiles.length>0&&<div className='grid grid-cols-3 gap-2'>{selectedFiles.map((file,index)=><div key={`${file.name}-${index}`} className='relative group'><img src={file.path} alt={file.name} className='w-full h-20 object-cover rounded border'/><button onClick={()=>setSelectedFiles((prev)=>prev.filter((_,i)=>i!==index))} className='absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100'>×</button><div className='text-xs truncate'>{file.name}</div></div>)}</div>}</div>}
      {contentType==='file'&&<div className='space-y-3'><div className='border-2 border-dashed border-border rounded p-8 text-center cursor-pointer hover:border-primary/50' onClick={()=>fileInputRef.current?.click()} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault();addFiles(e.dataTransfer.files,'file')}}><p className='text-muted-foreground'>拖拽文件到这里，或点击选择</p><input ref={fileInputRef} type='file' multiple className='hidden' onChange={(e)=>{if(e.target.files)addFiles(e.target.files,'file');e.target.value=''}}/></div>{selectedFiles.length>0&&<div className='space-y-1'>{selectedFiles.map((file,index)=><div key={`${file.name}-${index}`} className='flex items-center justify-between p-2 bg-secondary/50 rounded'><div className='min-w-0'><div className='text-sm truncate'>{file.name}</div><div className='text-xs text-muted-foreground'>{formatSize(file.size)}</div></div><button onClick={()=>setSelectedFiles((prev)=>prev.filter((_,i)=>i!==index))} className='text-red-500'>×</button></div>)}</div>}</div>}
      <div className='flex gap-4 h-6 items-center'><label className='flex items-center gap-2 cursor-pointer'><input type='radio' checked={sendTarget==='broadcast'} onChange={()=>setSendTarget('broadcast')}/><span className='text-sm'>广播</span></label><label className='flex items-center gap-2 cursor-pointer'><input type='radio' checked={sendTarget==='selected'} onChange={()=>setSendTarget('selected')}/><span className='text-sm'>已选设备</span></label><label className='flex items-center gap-2 cursor-pointer'><input type='radio' checked={sendTarget==='group'} onChange={()=>setSendTarget('group')}/><span className='text-sm'>分组设备</span></label>{sendTarget==='selected'&&<Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}><Dialog.Trigger asChild><button className='text-xs text-primary hover:underline'>已选 {selectedCount} 个设备</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className='fixed inset-0 bg-black/50 z-50'/><Dialog.Content className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded shadow-lg p-4 w-[420px] max-w-[90vw] z-50'><Dialog.Title className='text-sm font-medium mb-3'>选择设备</Dialog.Title><div className='flex gap-2 mb-3'><button onClick={selectAll} className='text-xs px-2 py-1 border rounded hover:bg-secondary'>全选</button><button onClick={deselectAll} className='text-xs px-2 py-1 border rounded hover:bg-secondary'>清空</button></div><div className='flex items-center gap-2 mb-3'><span className='text-xs text-muted-foreground'>分组</span><Select.Root value={groupFilter} onValueChange={setGroupFilter}><Select.Trigger className='flex items-center justify-between gap-2 px-2 py-1 border rounded text-xs bg-background w-48'><Select.Value/><Select.Icon>▼</Select.Icon></Select.Trigger><Select.Portal><Select.Content className='bg-background border rounded shadow-lg z-50' position='popper' side='bottom' align='start' sideOffset={4} avoidCollisions={false}><Select.Viewport className='p-1'><Select.Item value='all' className='px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded'><Select.ItemText>全部在线分组</Select.ItemText></Select.Item>{groupsForFilter.map(({group})=><Select.Item key={group.id} value={group.id} className='px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded'><Select.ItemText>{group.name}</Select.ItemText></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root></div><div className='max-h-60 overflow-auto border rounded'>{filteredDevices.length===0?<div className='p-3 text-xs text-muted-foreground'>暂无在线设备</div>:filteredDevices.map((device)=><label key={device.id} className='flex items-center gap-2 p-2 border-b last:border-b-0 cursor-pointer'><input type='checkbox' checked={selectedDevices.has(device.id)} onChange={()=>toggleSelectDevice(device.id)}/><span className='text-sm'>{device.name}</span><span className='text-xs text-muted-foreground'>{device.ip}:{device.port}</span></label>)}</div><div className='flex justify-end mt-3'><Dialog.Close asChild><button className='px-3 py-1 bg-primary text-primary-foreground rounded text-sm'>完成</button></Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>}{sendTarget==='group'&&<Select.Root value={groupTargetId} onValueChange={setGroupTargetId}><Select.Trigger className='flex items-center justify-between gap-2 px-2 py-1 border rounded text-xs bg-background w-28'><Select.Value/><Select.Icon>▼</Select.Icon></Select.Trigger><Select.Portal><Select.Content className='bg-background border rounded shadow-lg z-50' position='popper' side='bottom' align='start' sideOffset={4} avoidCollisions={false}><Select.Viewport className='p-1'><Select.Item value='all' className='px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded'><Select.ItemText>选择分组</Select.ItemText></Select.Item>{groupsForFilter.map(({group})=><Select.Item key={group.id} value={group.id} className='px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded'><Select.ItemText>{group.name}</Select.ItemText></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root>}</div>
      <button onClick={handleSend} disabled={contentType==='text'?!textContent.trim():selectedFiles.length===0} className='w-full py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium'>{contentType==='image'?'发送图片卡片':'发送'}</button>
    </div></div>
  </div></div>
  <Dialog.Root open={!!previewImage} onOpenChange={()=>setPreviewImage(null)}><Dialog.Portal><Dialog.Overlay className='fixed inset-0 bg-black/70 z-50'/><Dialog.Content className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[90vw] max-h-[90vh] z-50'>{previewImage&&<img src={previewImage} alt='Preview' className='max-w-full max-h-[80vh] object-contain'/>}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>
}

function handleSaveImage(imageUrl:string,fileName:string){const link=document.createElement('a');link.href=imageUrl;link.download=fileName;link.click()}


