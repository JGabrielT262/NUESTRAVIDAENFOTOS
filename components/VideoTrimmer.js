"use client"

import { useState, useRef, useEffect } from "react"
import { Scissors, Clock, HardDrive, Play, Pause, X, Check, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function VideoTrimmer({ file, onConfirm, onCancel }) {
  const [videoUrl, setVideoUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [windowDuration, setWindowDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef(null)

  const MAX_SIZE = 50 * 1024 * 1024 // 50MB

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration
      setDuration(d)
      
      // Calculate allowed duration for 50MB
      if (file.size > MAX_SIZE) {
        const allowed = (MAX_SIZE / file.size) * d
        setWindowDuration(allowed)
      } else {
        setWindowDuration(d)
      }
      setIsLoaded(true)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      if (videoRef.current.currentTime >= startTime + windowDuration) {
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
        if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= startTime + windowDuration) {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] overflow-hidden max-w-4xl w-full flex flex-col sm:flex-row h-full max-h-[85vh] shadow-2xl"
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
               <div className="bg-romantic-500/80 p-6 rounded-full shadow-xl">
                 <Play className="w-10 h-10 text-white fill-white ml-2" />
               </div>
             )}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1 rounded-full text-white text-xs font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Editor Settings area */}
        <div className="w-full sm:w-96 bg-white p-8 flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <Scissors className="text-romantic-500 w-6 h-6" />
              Recorte 50MB
            </h3>
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 items-start border border-blue-100">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Para asegurar la mejor calidad y rapidez, hemos fijado el fragmento a <strong>50MB</strong>. Desliza para elegir la mejor parte.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                <span>Fragmento de {formatTime(windowDuration)}</span>
                <span className="text-romantic-500">Fixed Weight: 50MB</span>
              </div>
              
              <div className="relative h-14 bg-gray-100 rounded-2xl flex items-center">
                <input 
                  type="range"
                  min="0"
                  max={Math.max(0, duration - windowDuration)}
                  step="0.1"
                  value={startTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    setStartTime(val)
                    if (videoRef.current) videoRef.current.currentTime = val
                  }}
                  className="w-full h-full opacity-0 cursor-pointer absolute inset-0 z-20"
                />
                
                {/* Track Visual */}
                <div className="absolute inset-x-2 inset-y-5 bg-gray-200 rounded-full"></div>
                
                {/* Fixed Selection Window */}
                <div 
                  className="absolute h-6 bg-romantic-500/30 rounded-full border border-romantic-500/50 flex items-center justify-between px-2"
                  style={{ 
                    left: `${(startTime / duration) * 100}%`,
                    width: `${(windowDuration / duration) * 100}%` 
                  }}
                >
                    <div className="w-1 h-3 bg-romantic-500/50 rounded-full"></div>
                    <div className="w-1 h-3 bg-romantic-500/50 rounded-full"></div>
                </div>

                {/* Handles markers */}
                <div 
                  className="absolute h-10 w-1 bg-romantic-500 rounded-full shadow-lg"
                  style={{ left: `${(startTime / duration) * 100}%` }}
                />
                 <div 
                  className="absolute h-10 w-1 bg-romantic-500 rounded-full shadow-lg"
                  style={{ left: `${((startTime + windowDuration) / duration) * 100}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] px-2 font-bold text-gray-400">
                <span>Desde: {formatTime(startTime)}</span>
                <span>Hasta: {formatTime(startTime + windowDuration)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-1 border border-gray-100 shadow-sm">
                <Clock className="w-4 h-4 text-romantic-400 mb-1" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Original</span>
                <span className="text-sm font-bold text-gray-700">{formatTime(duration)} ({formatSize(file.size)})</span>
              </div>
              <div className="bg-romantic-50 p-4 rounded-2xl flex flex-col gap-1 border border-romantic-100 shadow-sm">
                <HardDrive className="w-4 h-4 text-romantic-500 mb-1" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Peso Final</span>
                <span className="text-sm font-bold text-romantic-600">{file.size > MAX_SIZE ? "50.00 MB" : formatSize(file.size)}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <button
              onClick={() => onConfirm({ startTime, endTime: startTime + windowDuration, estimatedSize: file.size > MAX_SIZE ? MAX_SIZE : file.size, duration })}
              className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-romantic-600 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Confirmar esta parte</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-gray-50 text-gray-500 py-3 rounded-2xl font-bold hover:bg-gray-100 transition-all text-xs"
            >
              Cancelar subida
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
