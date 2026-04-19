"use client"

import { useState, useRef, useEffect } from "react"
import { Music, Play, Pause, X, Check, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function MusicSelector({ file, onConfirm, onCancel }) {
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setIsLoaded(true)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      if (audioRef.current.currentTime >= startTime + 30) {
        audioRef.current.pause()
        setIsPlaying(false)
        audioRef.current.currentTime = startTime
      }
    }
  }

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        if (audioRef.current.currentTime < startTime || audioRef.current.currentTime >= startTime + 30) {
          audioRef.current.currentTime = startTime
        }
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] overflow-hidden max-w-md w-full p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Music className="text-romantic-500 w-6 h-6" />
            Elegir Música
          </h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Audio Visualizer (Simple) */}
          <div className="bg-romantic-50 rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden group">
            <audio
              ref={audioRef}
              src={audioUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
            />
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              className="bg-romantic-500 text-white p-6 rounded-full shadow-xl relative z-10"
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </motion.button>

            {/* Simulated Waves */}
            <div className="absolute inset-x-0 bottom-0 h-16 flex items-end justify-center gap-1 opacity-20 px-8">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: isPlaying ? [10, 40, 10] : 10 }}
                  transition={{ repeat: Infinity, duration: 0.5 + Math.random(), delay: i * 0.05 }}
                  className="w-1 bg-romantic-500 rounded-full"
                />
              ))}
            </div>

            <div className="mt-6 text-center z-10">
              <p className="text-sm font-bold text-gray-700 truncate max-w-[200px]">{file.name}</p>
              <p className="text-[10px] text-romantic-400 font-bold uppercase tracking-widest mt-1">
                {formatTime(startTime)} - {formatTime(startTime + 30)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
              <span>Mueve para seleccionar los 30 seg</span>
              <span className="text-romantic-500">Fixed: 30s</span>
            </div>

            <div className="relative h-12 bg-gray-100 rounded-2xl flex items-center">
              <input 
                type="range"
                min="0"
                max={Math.max(0, duration - 30)}
                step="0.1"
                value={startTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setStartTime(val)
                  if (audioRef.current) audioRef.current.currentTime = val
                }}
                className="w-full h-full opacity-0 cursor-pointer absolute inset-0 z-20"
              />
              
              <div className="absolute inset-x-2 inset-y-4 bg-gray-200 rounded-full"></div>
              <div 
                className="absolute h-4 bg-romantic-500 rounded-full shadow-sm"
                style={{ 
                  left: `${(startTime / duration) * 100}%`,
                  width: `${(30 / duration) * 100}%` 
                }}
              ></div>
              
              <div 
                className="absolute h-8 w-1 bg-romantic-500 rounded-full shadow-lg"
                style={{ left: `${(startTime / duration) * 100}%` }}
              />
              <div 
                className="absolute h-8 w-1 bg-romantic-500 rounded-full shadow-lg"
                style={{ left: `${((startTime + 30) / duration) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => onConfirm({ startTime, duration })}
              className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Confirmar esta parte</span>
            </button>
            <button
              onClick={onCancel}
               className="w-full py-4 text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors"
            >
              Cancelar música
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
