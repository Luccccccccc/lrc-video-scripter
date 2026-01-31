import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Play, Pause, Plus, Trash2, Download, Upload, Scissors, 
  Edit3, Save, X, RotateCcw, Type, GripVertical, HelpCircle, Info
} from 'lucide-react';
import './index.css';

// --- 类型定义 ---

interface TextBlock {
  id: string;
  text: string;
}

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  textId: string | null;
}

// --- 主应用组件 ---

const App: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('字幕导出');
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [dragOverSegmentId, setDragOverSegmentId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // --- 视频处理 ---

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
            
      // 提取不带后缀的文件名
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setVideoFileName(nameWithoutExt);
      
      setSegments([]); 
      if (videoRef.current) {
        videoRef.current.src = url;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      setSegments([{
        id: crypto.randomUUID(),
        startTime: 0,
        endTime: d,
        textId: null
      }]);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const seek = useCallback((time: number) => {
    if (videoRef.current && duration > 0) {
      const newTime = Math.max(0, Math.min(time, duration));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // --- 段落逻辑 ---

  const splitSegment = useCallback(() => {
    const time = currentTime;
    setSegments(prev => {
      const index = prev.findIndex(s => time > s.startTime && time < s.endTime);
      if (index === -1) return prev;

      const target = prev[index];
      const newSegments = [...prev];
      
      const segA: VideoSegment = { ...target, endTime: time };
      const segB: VideoSegment = { 
        id: crypto.randomUUID(), 
        startTime: time, 
        endTime: target.endTime, 
        textId: null 
      };

      newSegments.splice(index, 1, segA, segB);
      return newSegments;
    });
  }, [currentTime]);

  const mergeSegments = (segmentIndex: number) => {
    if (segmentIndex >= segments.length - 1) return;
    setSegments(prev => {
      const newSegments = [...prev];
      const current = newSegments[segmentIndex];
      const next = newSegments[segmentIndex + 1];
      
      newSegments.splice(segmentIndex, 2, {
        ...current,
        endTime: next.endTime,
        textId: current.textId || next.textId 
      });
      return newSegments;
    });
  };

  const updateSegmentText = (segmentId: string, textId: string | null) => {
    setSegments(prev => prev.map(s => s.id === segmentId ? { ...s, textId } : s));
  };

  // --- 文本块逻辑 ---

  const addTextBlock = (text: string = "") => {
    const newBlock = { id: crypto.randomUUID(), text: text || "新文本行..." };
    setTextBlocks(prev => [...prev, newBlock]);
    setEditingBlockId(newBlock.id);
  };

  const deleteTextBlock = (id: string) => {
    setTextBlocks(prev => prev.filter(b => b.id !== id));
    setSegments(prev => prev.map(s => s.textId === id ? { ...s, textId: null } : s));
  };

  const updateTextBlock = (id: string, text: string) => {
    setTextBlocks(prev => prev.map(b => b.id === id ? { ...b, text } : b));
    setEditingBlockId(null);
  };

  // 拖拽排序逻辑
  const handleTextBlockDragStart = (e: React.DragEvent, blockId: string, index: number) => {
    e.dataTransfer.setData('textBlockId', blockId);
    e.dataTransfer.setData('sourceIndex', index.toString());
  };

  const handleTextBlockDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTextBlockDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('sourceIndex');
    if (!sourceIndexStr) return; // Not a reorder operation

    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (sourceIndex === targetIndex) return;

    setTextBlocks(prev => {
      const result = [...prev];
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(targetIndex, 0, removed);
      return result;
    });
  };

  const handleSegmentDragOver = (e: React.DragEvent, segmentId: string) => {
    e.preventDefault();
    setDragOverSegmentId(segmentId);
  };

  const handleSegmentDrop = (e: React.DragEvent, segmentId: string) => {
    e.preventDefault();
    setDragOverSegmentId(null);
    const textBlockId = e.dataTransfer.getData('textBlockId');
    if (textBlockId) {
      updateSegmentText(segmentId, textBlockId);
    }
  };

  const handleBulkImport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const text = formData.get('rawText') as string;
    if (!text.trim()) return;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newBlocks = lines.map(line => ({ id: crypto.randomUUID(), text: line }));
    setTextBlocks(prev => [...prev, ...newBlocks]);
    e.currentTarget.reset();
  };

  // --- 导出逻辑 ---

  const exportLRC = () => {
    const lrcLines = segments
      .filter(s => s.textId)
      .map(s => {
        const block = textBlocks.find(b => b.id === s.textId);
        if (!block) return null;
        
        const formatLrcTime = (seconds: number) => {
          const m = Math.floor(seconds / 60);
          const sRem = (seconds % 60).toFixed(2);
          return `[${m.toString().padStart(2, '0')}:${sRem.padStart(5, '0')}]`;
        };
        
        return `${formatLrcTime(s.startTime)}${block.text}`;
      })
      .filter(Boolean);

    const blob = new Blob([lrcLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFileName}.lrc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimeDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'KeyM') { e.preventDefault(); splitSegment(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, splitSegment]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* 头部导航 */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-xl px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            LRC 视频字幕同步器
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white transition-colors bg-transparent"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">使用帮助</span>
          </button>
          <button 
            onClick={() => {
              setTextBlocks([{ id: '1', text: '你好，这是一个示例行。' }, { id: '2', text: '在静谧中看日落。' }]);
            }}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded-md transition-all bg-transparent"
          >
            加载示例文本
          </button>
          <label className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-all border border-slate-700 text-sm font-medium">
            <Upload className="w-4 h-4" />
            导入视频
            <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </label>
          <button 
            onClick={exportLRC}
            disabled={!segments.some(s => s.textId)}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-lg shadow-indigo-500/25 text-sm font-medium text-white"
          >
            <Download className="w-4 h-4" />
            导出 .LRC
          </button>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧编辑器 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto overflow-x-hidden">
            
            {/* 视频视图 */}
            <div className="relative shrink-0 w-full max-w-5xl mx-auto aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
              {videoUrl ? (
                <video 
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlay}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                  <div className="p-8 bg-slate-900 rounded-full">
                    <Upload className="w-12 h-12 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">请先导入视频文件开始切分段落</p>
                </div>
              )}
              
              {/* 播放控制悬浮层 */}
              {videoUrl && (
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={togglePlay} className="w-12 h-12 flex items-center justify-center bg-white rounded-full text-black hover:scale-110 transition-transform">
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="fill-current w-6 h-6 ml-1" />}
                      </button>
                      <div className="font-mono text-sm">
                        <span className="text-white">{formatTimeDisplay(currentTime)}</span>
                        <span className="mx-2 text-slate-500">/</span>
                        <span className="text-slate-400">{formatTimeDisplay(duration)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={splitSegment}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm shadow-xl transition-all text-white"
                    >
                      <Scissors className="w-4 h-4" />
                      在此处切割 (M)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 时间轴控制 */}
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 shadow-inner shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">主工作流时间轴</h3>
                {duration > 0 && <span className="text-[10px] text-slate-500 font-mono">可点击或拖拽跳转</span>}
              </div>
              
              <div 
                ref={timelineRef}
                className="relative h-20 bg-slate-800/30 rounded-2xl cursor-pointer border border-slate-800/50 overflow-hidden"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - rect.left) / rect.width) * duration);
                }}
              >
                {/* 分段可视化 */}
                {segments.map((seg, idx) => {
                  const left = (seg.startTime / duration) * 100;
                  const width = ((seg.endTime - seg.startTime) / duration) * 100;
                  const isActive = currentTime >= seg.startTime && currentTime < seg.endTime;
                  
                  return (
                    <div 
                      key={seg.id}
                      className={`absolute h-full border-r border-slate-700/30 transition-all ${
                        isActive ? 'bg-indigo-500/15' : 'hover:bg-slate-700/20'
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {seg.textId && (
                        <div className="absolute inset-0 flex items-center justify-center p-2">
                           <div className="text-[10px] text-indigo-400 font-medium truncate opacity-60">
                             {textBlocks.find(b => b.id === seg.textId)?.text}
                           </div>
                        </div>
                      )}
                      
                      {/* 合并手柄 */}
                      {idx < segments.length - 1 && (
                        <button 
                          className="absolute top-0 right-0 bottom-0 w-2 hover:bg-red-500/50 z-20 transition-all cursor-col-resize group/merge bg-transparent"
                          onClick={(e) => { e.stopPropagation(); mergeSegments(idx); }}
                        >
                          <div className="hidden group-hover/merge:flex absolute top-0 -translate-y-full left-1/2 -translate-x-1/2 bg-red-600 text-[8px] px-1 py-0.5 rounded font-bold text-white">合并</div>
                        </button>
                      )}
                    </div>
                  );
                })}
                
                {/* 游标 */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] z-30 transition-all pointer-events-none"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-b-full" />
                </div>
              </div>

              {/* 活动分段详细列表 */}
              <div className="mt-6 space-y-3 max-h-[300px] overflow-y-auto pr-2 min-h-0">
                {segments.map((seg, idx) => {
                  const isActive = currentTime >= seg.startTime && currentTime < seg.endTime;
                  const isDragOver = dragOverSegmentId === seg.id;
                  return (
                    <div 
                      key={seg.id}
                      onDragOver={(e) => handleSegmentDragOver(e, seg.id)}
                      onDragLeave={() => setDragOverSegmentId(null)}
                      onDrop={(e) => handleSegmentDrop(e, seg.id)}
                      className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                        isActive ? 'bg-indigo-600/10 border-indigo-500/50' : (isDragOver ? 'bg-indigo-500/20 border-indigo-500 shadow-indigo-500/20' : 'bg-slate-900 border-slate-800')
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-500 w-16 uppercase">分段 {idx + 1}</div>
                      <div className="text-[10px] font-mono text-slate-400 w-24 whitespace-nowrap">
                        {seg.startTime.toFixed(2)}s - {seg.endTime.toFixed(2)}s
                      </div>
                      <select 
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
                        value={seg.textId || ''}
                        onChange={(e) => updateSegmentText(seg.id, e.target.value || null)}
                      >
                        <option value="">(未分配文本 / 拖拽此处分配)</option>
                        {textBlocks.map(b => (
                          <option key={b.id} value={b.id}>{b.text.slice(0, 50)}...</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => seek(seg.startTime)} 
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors bg-transparent"
                        title="跳转至开始点"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧边栏：字幕库 */}
        <aside className="w-96 border-l border-slate-800 bg-slate-900/20 backdrop-blur-sm flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-400" />
              字幕库
            </h2>
            <button 
              onClick={() => addTextBlock()}
              className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-colors bg-transparent"
              title="添加文本行"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {/* 批量导入区域 */}
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 mb-2">
               <form onSubmit={handleBulkImport}>
                 <textarea 
                   name="rawText"
                   placeholder="在此粘贴完整字幕文案... (每行将自动转为一个分段)"
                   className="w-full h-32 bg-transparent text-sm text-slate-300 placeholder:text-slate-700 outline-none resize-none border-none"
                 />
                 <button className="w-full mt-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-slate-700">
                   批量处理文本
                 </button>
               </form>
            </div>

            {/* 文本块列表 */}
            <div className="space-y-3 pb-8">
              {textBlocks.length === 0 && (
                <div className="text-center py-20 opacity-20 italic text-sm">字幕库为空</div>
              )}
              {textBlocks.map((block, index) => (
                <div 
                  key={block.id}
                  draggable={editingBlockId !== block.id}
                  onDragStart={(e) => handleTextBlockDragStart(e, block.id, index)}
                  onDragOver={handleTextBlockDragOver}
                  onDrop={(e) => handleTextBlockDrop(e, index)}
                  className={`group relative p-4 rounded-2xl border transition-all ${
                    editingBlockId === block.id 
                    ? 'bg-slate-950 border-indigo-500/50 shadow-xl ring-1 ring-indigo-500/20' 
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 cursor-grab active:cursor-grabbing'
                  }`}
                >
                  {editingBlockId === block.id ? (
                    <div className="flex flex-col gap-3">
                      <textarea 
                        autoFocus
                        className="w-full bg-transparent text-sm text-white outline-none resize-none border-none"
                        defaultValue={block.text}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            updateTextBlock(block.id, e.currentTarget.value);
                          }
                          if (e.key === 'Escape') setEditingBlockId(null);
                        }}
                        onBlur={(e) => updateTextBlock(block.id, e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingBlockId(null)} className="p-1.5 hover:bg-slate-800 rounded-lg bg-transparent"><X className="w-3.5 h-3.5 text-slate-500" /></button>
                        <button className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg bg-transparent"><Save className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-slate-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed flex-1">{block.text}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur p-1 rounded-lg shrink-0">
                          <button onClick={() => setEditingBlockId(block.id)} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors bg-transparent">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteTextBlock(block.id)} className="p-1.5 hover:bg-red-900/20 rounded-md text-red-500 transition-colors bg-transparent">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {segments.some(s => s.textId === block.id) ? (
                          <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full uppercase">已分配</span>
                        ) : (
                          <span className="text-[9px] font-bold bg-slate-800 text-slate-600 px-2 py-0.5 rounded-full uppercase">空闲</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* 帮助中心模态框 */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Info className="text-indigo-500" />
                使用指南
              </h2>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors bg-transparent text-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6 text-slate-300">
              <section className="space-y-2">
                <h3 className="font-bold text-white">1. 准备工作</h3>
                <p className="text-sm">点击右上角的 <span className="text-indigo-400">导入视频</span> 上传视频文件；在右侧 <span className="text-indigo-400">剧本库</span> 粘贴或逐行输入文本。</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-bold text-white">2. 切分段落</h3>
                <p className="text-sm">播放视频（快捷键 <kbd>Space</kbd>），当画面进行转场或需要切换字幕时，按下 <kbd>M</kbd> 键。视频会自动切分为两个分段。</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-bold text-white">3. 分配剧本</h3>
                <p className="text-sm">除了使用下拉菜单，您还可以直接从右侧 <b>字幕库</b> 拖拽文本块到下方的 <b>分段列表</b> 中进行分配。如果切错了，可以点击段落之间的红色感应区进行 <span className="text-red-400">合并</span>。</p>
              </section>
              <section className="space-y-2">
                <h3 className="font-bold text-white">4. 整理与导出</h3>
                <p className="text-sm">右侧字幕库支持拖拽调整顺序、随时修改内容。完成后点击右上角的 <span className="text-indigo-400">导出 .LRC</span> 即可下载带有精确时间轴的字幕文件。</p>
              </section>
            </div>

            <button 
              onClick={() => setShowHelp(false)}
              className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 text-white"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* 底部信息栏 */}
      <footer className="h-10 border-t border-slate-900 flex items-center justify-between px-6 shrink-0 bg-slate-950">
        <div className="flex items-center gap-6 text-[10px] text-slate-600 font-medium uppercase tracking-widest">
          <span>快捷键：[空格] 播放/暂停</span>
          <span>[M] 在当前位置切割</span>
          <span>[拖拽] 分配文本块</span>
        </div>
        <div className="text-[10px] text-slate-700">
          状态：等待操作
        </div>
      </footer>
    </div>
  );
};

// --- 初始化 ---

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}