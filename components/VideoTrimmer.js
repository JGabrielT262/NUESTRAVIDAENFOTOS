"use client"

import { useState, useRef, useEffect } from "react"
import { Scissors, Clock, HardDrive, Play, Pause, ChevronLeft, ChevronRight, X, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function VideoTrimmer({ file, onConfirm, onCancel }) {
  const [videoUrl, setVideoUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration
      setDuration(d)
      setEndTime(d)
      setIsLoaded(true)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.pause()
        setIsPlaying(false)
        videoRef.current.currentTime = startTime
      }
    }
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        if (videoRef.current.currentTime >= endTime) {
          videoRef.current.currentTime = startTime
        }
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const estimatedSize = duration > 0 ? (file.size / duration) * (endTime - startTime) : 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] overflow-hidden max-w-4xl w-full flex flex-col sm:flex-row h-full max-h-[85vh] shadow-2xl shadow-romantic-500/20"
      >
        {/* Preview Area */}
        <div className="flex-1 bg-black relative flex items-center justify-center p-2">
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="max-h-full max-w-full rounded-2xl"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlay}
            />
          )}
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             {!isPlaying && isLoaded && (
               <div className="bg-romantic-500/80 p-6 rounded-full shadow-xl backdrop-blur-md">
                 <Play className="w-10 h-10 text-white fill-white ml-1" />
               </div>
             )}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1 rounded-full text-white text-xs font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Editor Settings area */}
        <div className="w-full sm:w-80 bg-white p-8 flex flex-col gap-6 ">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <Scissors className="text-romantic-500 w-6 h-6" />
              Editor Lite
            </h3>
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                <span>Rango seleccionado</span>
                <span className="text-romantic-500">{formatTime(endTime - startTime)}</span>
              </div>
              
              <div className="relative h-12 bg-romantic-50 rounded-2xl p-2 flex items-center overflow-hidden">
                {/* Visual indicator of duration */}
                <div className="absolute inset-x-2 inset-y-4 bg-gray-200 rounded-full"></div>
                <div 
                  className="absolute h-4 bg-romantic-500/30 rounded-full"
                  style={{ 
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%` 
                  }}
                ></div>

                {/* Range Sliders */}
                <input 
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={startTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (val < endTime) {
                      setStartTime(val)
                      videoRef.current.currentTime = val
                    }
                  }}
                  className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <input 
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={endTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (val > startTime) {
                      setEndTime(val)
                      videoRef.current.currentTime = val
                    }
                  }}
                  className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                <div className="absolute inset-0 pointer-events-none flex items-center px-2">
                   <div 
                    className="absolute h-8 w-1 bg-romantic-500 rounded-full shadow-lg"
                    style={{ left: `${(startTime / duration) * 100}%` }}
                   >
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-romantic-600">{formatTime(startTime)}</div>
                   </div>
                   <div 
                    className="absolute h-8 w-1 bg-romantic-500 rounded-full shadow-lg"
                    style={{ left: `${(endTime / duration) * 100}%` }}
                   >
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-romantic-600">{formatTime(endTime)}</div>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-1 border border-gray-100">
                <Clock className="w-4 h-4 text-romantic-400 mb-1" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Original</span>
                <span className="text-sm font-bold text-gray-700">{formatTime(duration)}</span>
              </div>
              <div className="bg-romantic-50 p-4 rounded-2xl flex flex-col gap-1 border border-romantic-100">
                <HardDrive className="w-4 h-4 text-romantic-500 mb-1" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Peso Est.</span>
                <span className="text-sm font-bold text-romantic-600">{formatSize(estimatedSize)}</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 italic text-center px-4 leading-relaxed">
              El peso puede variar ligeramente dependiendo de la compresión final. 💝
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <button
              onClick={() => onConfirm({ startTime, endTime, estimatedSize, duration })}
              className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Confirmar rango</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              Sin recortar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
