"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function VideoPlayer({ src, className = "" }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const videoRef = useRef(null)
  const controlsTimeoutRef = useRef(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(currentProgress)
    }
  }

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * videoRef.current.duration
    videoRef.current.currentTime = seekTime
    setProgress(e.target.value)
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])

  return (
    <div 
      className={`relative group bg-black rounded-xl overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
      />

      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={togglePlay}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 flex flex-col justify-between p-4 cursor-pointer"
          >
            {/* Top Bar */}
            <div className="flex justify-end p-2 text-white/80">
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  videoRef.current.currentTime = 0;
                }} 
                className="hover:text-white transition-colors"
              >
                  <RotateCcw className="w-5 h-5" />
               </button>
            </div>

            {/* Center Play Button Overlay */}
            <AnimatePresence>
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    onClick={togglePlay}
                    className="bg-romantic-500/80 p-5 rounded-full shadow-2xl backdrop-blur-md hover:bg-romantic-600 transition-colors group/play"
                  >
                    <Play className="w-8 h-8 text-white fill-white ml-1 group-hover/play:scale-110 transition-transform" />
                  </motion.button>
                </div>
              )}
            </AnimatePresence>

            {/* Bottom Controls */}
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="relative w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer group/progress">
                <div 
                  className="absolute top-0 left-0 h-full bg-romantic-500 rounded-full" 
                  style={{ width: `${progress}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }} 
                    className="hover:text-romantic-400 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }} 
                      className="hover:text-romantic-400 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      videoRef.current.requestFullscreen();
                    }}
                    className="hover:text-romantic-400 transition-colors"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isPlaying && !showControls && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Play className="w-16 h-16 text-white/50" />
        </div>
      )}
    </div>
  )
}
