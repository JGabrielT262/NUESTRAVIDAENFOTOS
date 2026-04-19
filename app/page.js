"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Heart, 
  Upload, 
  Download, 
  Lock, 
  Plus, 
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Calendar,
  MapPin,
  MessageSquare,
  X,
  Clock,
  ChevronRight,
  Trash2,
  LogOut,
  Key,
  Eye,
  EyeOff,
  Pencil,
  Save,
  CheckCircle2
} from "lucide-react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import confetti from "canvas-confetti"
import HeartRain from "@/components/HeartRain"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import VideoPlayer from "@/components/VideoPlayer"

const isVideo = (url) => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.quicktime', '.m4v', '.3gp']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

export default function Home() {
  const [imagenes, setImagenes] = useState([])
  const [authorized, setAuthorized] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [recuerdoDelDia, setRecuerdoDelDia] = useState(null)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ fecha: '', ubicacion: '', nota: '' })
  const [updating, setUpdating] = useState(false)
  const [vistas, setVistas] = useState([]) // Array of seen story IDs
  
  // Historias destacadas del día (cerca de la fecha actual de años anteriores)
  const [historiasDelDia, setHistoriasDelDia] = useState([])
  const [showDayStoriesModal, setShowDayStoriesModal] = useState(false)
  const [currentDayStoryIdx, setCurrentDayStoryIdx] = useState(0)
  
  // Sort stories: NEWEST to OLDEST
  const historiasOrdenadas = [...imagenes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 15)
  
  // Auth states
  const [inputClave, setInputClave] = useState("")
  const [loginError, setLoginError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadData, setUploadData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    ubicacion: "",
    nota: ""
  })

  const [timeTogether, setTimeTogether] = useState({
    noOficial: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    oficial: { days: 0, hours: 0, minutes: 0, seconds: 0 }
  })

  const fileInputRef = useRef(null)
  
  // Keys from env
  const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY || "floriyjesusporsiempre"
  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "jesus26244640"

  useEffect(() => {
    setIsClient(true)
    
    // Check for seen stories
    const savedVistas = localStorage.getItem("historias_vistas")
    if (savedVistas) {
      setVistas(JSON.parse(savedVistas))
    }

    // Check for existing session in localStorage
    const savedClave = localStorage.getItem("album_clave")
    if (savedClave) {
      verificarClave(savedClave)
    } else {
      // Also check URL for convenience
      const url = new URL(window.location.href)
      const urlClave = url.searchParams.get("clave")
      if (urlClave) {
        verificarClave(urlClave)
      }
    }
  }, [SECRET_KEY, ADMIN_KEY])

  // Lógica para historias del día (cerca de la fecha actual de años anteriores)
  useEffect(() => {
    if (imagenes.length > 0) {
      const hoy = new Date()
      const diaActual = hoy.getDate()
      const mesActual = hoy.getMonth()
      
      const destacadas = imagenes.filter(img => {
        const fechaImg = new Date(img.fecha + "T00:00:00")
        const diaImg = fechaImg.getDate()
        const mesImg = fechaImg.getMonth()
        const anioImg = fechaImg.getFullYear()
        
        // No mostrar historias de este año (solo pasadas)
        if (anioImg === hoy.getFullYear()) return false
        
        // Historias cerca de la fecha (+- 3 días)
        const diffDias = Math.abs(diaImg - diaActual)
        return mesImg === mesActual && diffDias <= 3
      })
      
      setHistoriasDelDia(destacadas)
    }
  }, [imagenes])

  const marcarComoVista = (id) => {
    if (!vistas.includes(id)) {
      const nuevasVistas = [...vistas, id]
      setVistas(nuevasVistas)
      localStorage.setItem("historias_vistas", JSON.stringify(nuevasVistas))
    }
  }

  const esNueva = (fechaSubida) => {
    if (!fechaSubida) return false
    const subida = new Date(fechaSubida)
    const ahora = new Date()
    const diffHours = (ahora - subida) / (1000 * 60 * 60)
    return diffHours <= 48 // Considerar nueva si se subió hace menos de 48h
  }

  useEffect(() => {
    if (selectedImage) {
      setEditForm({ 
        fecha: selectedImage.fecha, 
        ubicacion: selectedImage.ubicacion || "", 
        nota: selectedImage.nota || "" 
      })
      setIsEditing(false)
    }
  }, [selectedImage])

  useEffect(() => {
    if (imagenes.length > 0 && !recuerdoDelDia) {
      const randomIdx = Math.floor(Math.random() * imagenes.length)
      setRecuerdoDelDia(imagenes[randomIdx])
    }
  }, [imagenes, recuerdoDelDia])

  function verificarClave(clave) {
    if (clave === ADMIN_KEY) {
      setAuthorized(true)
      setIsAdmin(true)
      localStorage.setItem("album_clave", clave)
      obtenerImagenes()
      return true
    } else if (clave === SECRET_KEY) {
      setAuthorized(true)
      setIsAdmin(false)
      localStorage.setItem("album_clave", clave)
      obtenerImagenes()
      return true
    }
    return false
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (verificarClave(inputClave)) {
      setLoginError(false)
    } else {
      setLoginError(true)
      setTimeout(() => setLoginError(false), 2000)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("album_clave")
    setAuthorized(false)
    setIsAdmin(false)
    setImagenes([])
    // Remove key from URL if present
    const url = new URL(window.location.href)
    url.searchParams.delete("clave")
    window.history.replaceState({}, '', url)
  }

  useEffect(() => {
    const calculateTime = (startDate) => {
      const start = new Date(startDate)
      const now = new Date()
      const diff = now - start
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      
      return { days, hours, minutes, seconds }
    }

    const timer = setInterval(() => {
      setTimeTogether({
        noOficial: calculateTime('2025-12-15T00:00:00'),
        oficial: calculateTime('2026-02-14T00:00:00')
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  async function obtenerImagenes() {
    try {
      const { data, error } = await supabase
        .from("fotos")
        .select("*")
        .order("fecha", { ascending: false })

      if (error) throw error
      // Asegurarnos de que las fechas sean correctas y añadir created_at si existe para 'esNueva'
      setImagenes(data || [])
    } catch (err) {
      console.error("Error fetching images:", err)
    }
  }

  const descargarCollage = async () => {
    if (historiasDelDia.length === 0) return
    const zip = new JSZip()
    const folder = zip.folder("nuestro-dia-especial")
    
    try {
      const downloadPromises = historiasDelDia.map(async (img, index) => {
        const response = await fetch(img.url)
        const blob = await response.blob()
        const ext = img.url.split('.').pop().split('?')[0]
        folder.file(`recuerdo-${img.fecha}-${index + 1}.${ext}`, blob)
      })

      await Promise.all(downloadPromises)
      const content = await zip.generateAsync({ type: "blob" })
      saveAs(content, "collage-nuestro-dia.zip")
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.7 },
        colors: ['#ff7da3', '#f84a7e', '#ffffff']
      })
    } catch (err) {
      alert("Error al descargar el collage")
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setSelectedFiles(files)
      setShowUploadModal(true)
    }
  }

  async function subirImagenes() {
    if (selectedFiles.length === 0) return
    setUploading(true)
    
    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from("fotos")
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from("fotos")
          .getPublicUrl(fileName)

        const { error: dbError } = await supabase
          .from("fotos")
          .insert([{ 
            url: publicUrl, 
            name: file.name,
            fecha: uploadData.fecha,
            ubicacion: uploadData.ubicacion,
            nota: uploadData.nota
          }])

        if (dbError) throw dbError
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff7da3', '#f84a7e', '#ffffff']
      })

      setShowUploadModal(false)
      setSelectedFiles([])
      setUploadData({
        fecha: new Date().toISOString().split('T')[0],
        ubicacion: "",
        nota: ""
      })
      obtenerImagenes()
    } catch (err) {
      alert("Error al subir: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function actualizarImagen() {
    if (!isAdmin || !selectedImage) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from("fotos")
        .update({ 
          fecha: editForm.fecha,
          ubicacion: editForm.ubicacion,
          nota: editForm.nota
        })
        .eq('id', selectedImage.id)

      if (error) throw error

      setImagenes(imagenes.map(img => img.id === selectedImage.id ? { ...img, ...editForm } : img))
      setSelectedImage({ ...selectedImage, ...editForm })
      setIsEditing(false)
      
      confetti({
        particleCount: 50,
        spread: 30,
        origin: { y: 0.9 },
        colors: ['#ff7da3', '#f84a7e']
      })
    } catch (err) {
      alert("Error al actualizar: " + err.message)
    } finally {
      setUpdating(false)
    }
  }

  async function eliminarImagen(id, url) {
    if (!isAdmin) return
    if (!confirm("¿Estás seguro de que quieres eliminar este recuerdo para siempre? 🥺")) return

    setDeletingId(id)
    try {
      const fileName = url.split('/').pop()
      const { error: storageError } = await supabase.storage
        .from("fotos")
        .remove([fileName])
      
      if (storageError) console.warn("Error deleting from storage:", storageError)

      const { error: dbError } = await supabase
        .from("fotos")
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      setImagenes(imagenes.filter(img => img.id !== id))
      if (selectedImage?.id === id) setSelectedImage(null)
      if (recuerdoDelDia?.id === id) setRecuerdoDelDia(null)
      
    } catch (err) {
      alert("Error al eliminar: " + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function descargarTodo() {
    if (imagenes.length === 0) return
    const zip = new JSZip()
    const folder = zip.folder("nuestra-vida-juntos")
    
    try {
      const downloadPromises = imagenes.map(async (img, index) => {
        const response = await fetch(img.url)
        const blob = await response.blob()
        const ext = img.url.split('.').pop().split('?')[0]
        folder.file(`recuerdo-${img.fecha}-${index + 1}.${ext}`, blob)
      })

      await Promise.all(downloadPromises)
      const content = await zip.generateAsync({ type: "blob" })
      saveAs(content, "nuestra-vida-juntos.zip")
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (err) {
      alert("Error al descargar")
    }
  }

  if (!isClient) return null

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-romantic-50 p-6 text-center">
        <HeartRain />
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full border border-romantic-100 relative overflow-hidden"
        >
          {/* Decorative hearts */}
          <div className="absolute -top-6 -right-6 text-romantic-100 rotate-12">
            <Heart className="w-24 h-24 fill-current" />
          </div>
          <div className="absolute -bottom-10 -left-10 text-romantic-50 -rotate-12">
            <Heart className="w-32 h-32 fill-current" />
          </div>

          <div className="relative z-10">
            <div className="bg-romantic-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Lock className="text-romantic-500 w-10 h-10" />
            </div>
            
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Nuestra Vida Juntos</h1>
            <p className="text-gray-500 mb-10 text-sm">Ingresa nuestra clave secreta para ver nuestros recuerdos ❤️</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-romantic-300 group-focus-within:text-romantic-500 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Escribe la clave aquí..."
                  value={inputClave}
                  onChange={(e) => setInputClave(e.target.value)}
                  className={`w-full bg-romantic-50/50 border-2 ${loginError ? 'border-red-300 animate-shake' : 'border-romantic-100'} rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:border-romantic-400 focus:bg-white transition-all`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-romantic-300 hover:text-romantic-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all flex items-center justify-center gap-2"
              >
                <span>Entrar al Álbum</span>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </form>

            {loginError && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs font-bold mt-4"
              >
                ¡Clave incorrecta! Inténtalo de nuevo ❤️
              </motion.p>
            )}
          </div>
        </motion.div>
        
        <p className="mt-8 text-romantic-300 text-[10px] uppercase tracking-[0.2em] font-bold">Un lugar solo para nosotros dos</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-romantic-50 pb-20">
      <HeartRain />
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-romantic-100 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="bg-romantic-500 p-2 rounded-lg">
              <Heart className="text-white fill-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Nuestra Vida Juntos ❤️</h1>
            {isAdmin && (
              <span className="bg-romantic-100 text-romantic-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-romantic-200 ml-2">
                ADMIN
              </span>
            )}
          </motion.div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={descargarTodo}
              disabled={imagenes.length === 0}
              title="Descargar todo"
              className="p-2.5 sm:px-4 sm:py-2 bg-white border border-romantic-200 text-romantic-600 rounded-full hover:bg-romantic-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4 sm:mr-2 sm:inline" />
              <span className="hidden sm:inline">Descargar todo</span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Subir Recuerdo"
              className="p-2.5 sm:px-5 sm:py-2 bg-romantic-500 text-white rounded-full hover:bg-romantic-600 shadow-lg shadow-romantic-200 transition-all active:scale-95 text-sm font-medium"
            >
              <Plus className="w-4 h-4 sm:mr-2 sm:inline" />
              <span className="hidden sm:inline">Subir Recuerdo</span>
            </button>

            <div className="w-[1px] h-6 bg-romantic-200 mx-1 hidden sm:block"></div>

            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2.5 bg-romantic-100 text-romantic-600 rounded-full hover:bg-romantic-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 xl:px-12 pt-8">
        {/* Stories Section - Instagram Style */}
        {imagenes.length > 0 && (
          <section className="mb-12 overflow-x-auto pb-6 no-scrollbar">
            <div className="flex gap-6 items-start">
              <div className="flex flex-col items-center gap-2 min-w-[80px]">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-romantic-300 flex items-center justify-center bg-white shadow-sm hover:bg-romantic-50 transition-colors"
                >
                  <Plus className="text-romantic-400 w-8 h-8" />
                </motion.button>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Añadir</span>
              </div>
              
              {historiasOrdenadas.map((img, i) => {
                const vista = vistas.includes(img.id)
                const nueva = esNueva(img.created_at)
                
                return (
                  <motion.div 
                    key={`story-${img.id}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
                    onClick={() => {
                      setSelectedStoryIndex(i)
                      marcarComoVista(img.id)
                    }}
                  >
                    <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] ${
                      vista 
                        ? 'bg-gray-200' 
                        : 'bg-gradient-to-tr from-romantic-300 via-romantic-500 to-romantic-600'
                    } shadow-md transition-all duration-300 group-hover:scale-105`}>
                      <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100 flex items-center justify-center">
                        {isVideo(img.url) ? (
                          <div className="w-full h-full relative">
                            <video src={img.url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="text-white w-6 h-6 fill-white" />
                            </div>
                          </div>
                        ) : (
                          <img src={img.url} className="w-full h-full object-cover" alt="Story" />
                        )}
                      </div>
                      
                      {nueva && !vista && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white animate-pulse">
                          NUEVA
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold truncate w-full text-center px-1 ${
                      vista ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {new Date(img.fecha + "T00:00:00").toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </section>
        )}
        {/* Welcome Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-12 text-center sm:text-left flex flex-col md:flex-row gap-8 xl:gap-20 items-center md:items-start"
        >
          <div className="flex-1">
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl 2xl:text-7xl font-extrabold text-gray-800 mb-4 tracking-tight"
            >
              Nuestra historia en fotos <Sparkles className="inline text-romantic-400 w-8 h-8 2xl:w-12 2xl:h-12" />
            </motion.h2>
            <p className="text-gray-500 text-lg 2xl:text-2xl mb-8 font-medium">
              Guardando cada lugar, cada fecha y cada sentimiento. ✨
            </p>
            
            <div className="flex flex-wrap gap-4 mb-10">
              <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-romantic-100 flex items-center gap-3">
                <span className="text-2xl font-black text-romantic-500">{imagenes.length}</span>
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Momentos</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-romantic-100 flex items-center gap-3">
                <Clock className="text-romantic-300 w-5 h-5" />
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest text-romantic-500">Para siempre</span>
              </div>
            </div>

            {/* Timers Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-[32px] shadow-sm border border-romantic-100 relative overflow-hidden group hover:shadow-md transition-shadow"
              >
                <div className="absolute top-0 right-0 p-4 bg-romantic-50 text-romantic-300 rounded-bl-[32px]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-romantic-300 uppercase tracking-[0.2em] mb-4">Desde que todo empezó 💙</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-black text-gray-800 tracking-tighter">{timeTogether.noOficial.days}</span>
                  <span className="text-sm font-bold text-gray-400">días</span>
                </div>
                <div className="flex gap-4 text-xs font-bold text-romantic-400">
                  <span>{String(timeTogether.noOficial.hours).padStart(2, '0')}h</span>
                  <span>{String(timeTogether.noOficial.minutes).padStart(2, '0')}m</span>
                  <span>{String(timeTogether.noOficial.seconds).padStart(2, '0')}s</span>
                </div>
                <p className="mt-4 text-[10px] text-gray-400 font-medium">15 de diciembre, 2025</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-romantic-500 p-6 rounded-[32px] shadow-lg shadow-romantic-100 relative overflow-hidden group hover:scale-[1.02] transition-transform"
              >
                <div className="absolute top-0 right-0 p-4 bg-white/10 text-white/50 rounded-bl-[32px]">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] mb-4">Nuestro Sí Oficial 💍</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-black text-white tracking-tighter">{timeTogether.oficial.days}</span>
                  <span className="text-sm font-bold text-white/70">días</span>
                </div>
                <div className="flex gap-4 text-xs font-bold text-white/60">
                  <span>{String(timeTogether.oficial.hours).padStart(2, '0')}h</span>
                  <span>{String(timeTogether.oficial.minutes).padStart(2, '0')}m</span>
                  <span>{String(timeTogether.oficial.seconds).padStart(2, '0')}s</span>
                </div>
                <p className="mt-4 text-[10px] text-white/50 font-medium">14 de febrero, 2026</p>
              </motion.div>
            </div>
          </div>

          {/* Historias del día y Recuerdo del día */}
          <div className="flex flex-col sm:flex-row gap-8 items-center justify-center md:items-start shrink-0">
            {/* Historias del Día (Libros apilados) */}
            {historiasDelDia.length > 0 && (
              <motion.div 
                initial={{ rotate: -5, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                className="relative w-64 h-80 flex flex-col items-center group cursor-pointer"
                onClick={() => {
                  setCurrentDayStoryIdx(0)
                  setShowDayStoriesModal(true)
                }}
              >
                <div className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-romantic-100 transform translate-y-4 translate-x-4 rotate-6 group-hover:rotate-12 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-white rounded-2xl shadow-lg border border-romantic-100 transform translate-y-2 translate-x-2 rotate-3 group-hover:rotate-6 transition-transform duration-500"></div>
                
                <div className="relative w-full h-full bg-white rounded-2xl shadow-md border-4 border-white overflow-hidden flex flex-col group-hover:scale-105 transition-transform duration-500">
                  <div className="flex-1 overflow-hidden relative">
                    {isVideo(historiasDelDia[0].url) ? (
                      <video src={historiasDelDia[0].url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={historiasDelDia[0].url} className="w-full h-full object-cover" alt="Recuerdos pasados" />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                      {isVideo(historiasDelDia[0].url) && <Play className="text-white w-10 h-10 fill-white" />}
                    </div>
                    <div className="absolute top-3 left-3 bg-romantic-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg">
                      {historiasDelDia.length} recuerdos pasados
                    </div>
                  </div>
                  <div className="p-4 bg-white text-center">
                    <p className="text-romantic-600 font-black text-sm uppercase tracking-tighter">Recuerdos de un día como hoy</p>
                    <p className="text-[10px] text-gray-400 font-medium">Pulsa para abrir el álbum</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recuerdo del día Card */}
            {recuerdoDelDia && (
              <motion.div 
                initial={{ rotate: 2, scale: 0.9, opacity: 0 }}
                animate={{ rotate: -2, scale: 1, opacity: 1 }}
                whileHover={{ rotate: 0, scale: 1.05 }}
                onClick={() => setSelectedImage(recuerdoDelDia)}
                className="w-64 bg-white p-3 rounded-xl shadow-xl border-4 border-white transform transition-all cursor-pointer group"
              >
                <div className="aspect-square overflow-hidden rounded-lg mb-2 relative flex items-center justify-center bg-gray-100">
                  {isVideo(recuerdoDelDia.url) ? (
                    <div className="w-full h-full relative">
                      <video src={recuerdoDelDia.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                        <Play className="text-white w-10 h-10 fill-white" />
                      </div>
                    </div>
                  ) : (
                    <img src={recuerdoDelDia.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Recuerdo" />
                  )}
                  <div className="absolute top-2 right-2 bg-romantic-500/90 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                    Recuerdo del día
                  </div>
                </div>
                <div className="px-1 text-center">
                  <p className="text-romantic-600 text-xs font-bold mb-1 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(recuerdoDelDia.fecha + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-gray-600 text-[11px] italic line-clamp-2">"{recuerdoDelDia.nota || "Te amo mucho"}"</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Timeline Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-[1px] flex-1 bg-romantic-200"></div>
          <span className="text-romantic-400 font-bold text-sm tracking-widest uppercase">Nuestra Línea de Tiempo</span>
          <div className="h-[1px] flex-1 bg-romantic-200"></div>
        </div>

        {/* Gallery Grid */}
        <div className="gallery-grid">
          <AnimatePresence>
            {imagenes.map((img, index) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="gallery-item group relative overflow-hidden rounded-3xl bg-white shadow-sm hover:shadow-2xl transition-all duration-500"
              >
                <div 
                  className="relative cursor-pointer min-h-[200px] flex items-center justify-center bg-gray-50"
                  onClick={() => setSelectedImage(img)}
                >
                  {isVideo(img.url) ? (
                    <div className="w-full relative">
                      <video src={img.url} className="w-full h-auto object-cover rounded-t-3xl" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/0 transition-all">
                        <div className="bg-white/90 p-4 rounded-full shadow-xl transform transition-transform group-hover:scale-110">
                          <Play className="text-romantic-500 w-8 h-8 fill-romantic-500" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={img.url} 
                      className="w-full h-auto object-cover rounded-t-3xl transition-transform duration-500 group-hover:scale-105" 
                      alt="Recuerdo"
                      loading="lazy"
                    />
                  )}
                  
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-romantic-500" />
                    <span className="text-[10px] font-bold text-gray-700">
                      {new Date(img.fecha + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarImagen(img.id, img.url);
                      }}
                      disabled={deletingId === img.id}
                      className="absolute top-4 right-4 bg-white/90 hover:bg-red-50 text-red-500 p-2 rounded-full shadow-sm transition-all"
                    >
                      {deletingId === img.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                <div className="p-4 bg-white">
                  {img.ubicacion && (
                    <div className="flex items-center gap-1.5 text-romantic-500 mb-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold truncate">{img.ubicacion}</span>
                    </div>
                  )}
                  
                  {img.nota && (
                    <div className="flex gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                      <p className="text-gray-500 text-xs italic leading-relaxed line-clamp-3">
                        {img.nota}
                      </p>
                    </div>
                  )}

                  {!img.nota && !img.ubicacion && (
                    <p className="text-gray-300 text-[10px] italic">Momento guardado con amor</p>
                  )}
                  
                  <div className="mt-4 pt-3 border-t border-romantic-50 flex justify-between items-center">
                    <span className="text-[9px] text-gray-400 uppercase tracking-tighter">
                      {new Date(img.fecha).getFullYear()}
                    </span>
                    <Heart className="w-3.5 h-3.5 text-romantic-200 group-hover:text-romantic-500 group-hover:fill-romantic-500 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Day Stories Modal (Presentación) */}
      <AnimatePresence>
        {showDayStoriesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowDayStoriesModal(false)}
            />

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl h-full max-h-[80vh] flex flex-col items-center justify-center z-10"
            >
              {currentDayStoryIdx < historiasDelDia.length ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="absolute top-0 left-0 right-0 flex gap-2 p-4 z-20">
                    {historiasDelDia.map((_, idx) => (
                      <div key={`day-bar-${idx}`} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: idx === currentDayStoryIdx ? "100%" : idx < currentDayStoryIdx ? "100%" : "0%" 
                          }}
                          transition={{ duration: idx === currentDayStoryIdx ? 4 : 0, ease: "linear" }}
                          onAnimationComplete={() => {
                            if (idx === currentDayStoryIdx) {
                              setCurrentDayStoryIdx(prev => prev + 1)
                            }
                          }}
                          className="h-full bg-romantic-400"
                        />
                      </div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={historiasDelDia[currentDayStoryIdx].id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="w-full h-full flex flex-col items-center justify-center"
                    >
                      <div className="relative max-h-[70%] w-full flex justify-center">
                        {isVideo(historiasDelDia[currentDayStoryIdx].url) ? (
                          <VideoPlayer 
                            src={historiasDelDia[currentDayStoryIdx].url} 
                            className="max-h-full max-w-full rounded-2xl shadow-2xl border-4 border-white/10 aspect-video" 
                          />
                        ) : (
                          <img 
                            src={historiasDelDia[currentDayStoryIdx].url} 
                            className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border-4 border-white/10" 
                            alt="Story" 
                          />
                        )}
                      </div>
                      <div className="mt-8 text-center text-white px-6">
                        <p className="text-romantic-300 font-black text-xl mb-2">
                          {new Date(historiasDelDia[currentDayStoryIdx].fecha + "T00:00:00").getFullYear()}
                        </p>
                        <p className="text-lg italic font-medium max-w-2xl">
                          "{historiasDelDia[currentDayStoryIdx].nota || "Un momento inolvidable"}"
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-[40px] p-10 flex flex-col items-center text-center max-w-md shadow-2xl"
                >
                  <div className="w-24 h-24 bg-romantic-100 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="text-romantic-500 w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-800 mb-4">¡Qué lindo es recordar!</h3>
                  <p className="text-gray-500 mb-8 font-medium">Hemos revivido {historiasDelDia.length} momentos de este día en años anteriores. ❤️</p>
                  
                  {/* Collage Preview (Simple representation) */}
                  <div className="grid grid-cols-3 gap-2 mb-8 w-full aspect-video overflow-hidden rounded-2xl border-2 border-romantic-50 p-2">
                    {historiasDelDia.slice(0, 6).map((img, i) => (
                      <div key={`mini-${i}`} className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                        <img src={img.url} className="w-full h-full object-cover" alt="mini" />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col w-full gap-3">
                    <button 
                      onClick={descargarCollage}
                      className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      <span>Descargar este collage</span>
                    </button>
                    <button 
                      onClick={() => setShowDayStoriesModal(false)}
                      className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Cerrar álbum del día
                    </button>
                  </div>
                </motion.div>
              )}

              <button 
                onClick={() => setShowDayStoriesModal(false)}
                className="absolute -top-12 right-0 sm:-right-12 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setShowUploadModal(false)}
              className="absolute inset-0 bg-romantic-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-romantic-500 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold">Nuevo Recuerdo</h3>
                </div>
                {!uploading && (
                  <button onClick={() => setShowUploadModal(false)} className="hover:bg-white/20 p-1 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 bg-romantic-50 p-3 rounded-2xl">
                  <div className="bg-white p-2 rounded-xl shadow-sm">
                    <ImageIcon className="text-romantic-400 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">
                      {selectedFiles.length} {selectedFiles.length === 1 
                        ? (isVideo(selectedFiles[0].name) ? "video seleccionado" : "foto seleccionada") 
                        : "archivos seleccionados"}
                    </p>
                    <p className="text-[10px] text-gray-400 italic">¡Vamos a ponerles detalles bonitos!</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-romantic-400 uppercase ml-2 tracking-wider">¿Cuándo pasó?</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="date" 
                        value={uploadData.fecha}
                        onChange={(e) => setUploadData({...uploadData, fecha: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-romantic-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-romantic-400 uppercase ml-2 tracking-wider">¿Dónde fue?</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Ej: Nuestra primera cita, En la playa..."
                        value={uploadData.ubicacion}
                        onChange={(e) => setUploadData({...uploadData, ubicacion: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-romantic-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-romantic-400 uppercase ml-2 tracking-wider">Escribe una nota linda</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
                      <textarea 
                        placeholder="Escribe algo que nunca quieras olvidar..."
                        value={uploadData.nota}
                        onChange={(e) => setUploadData({...uploadData, nota: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-romantic-300 min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={subirImagenes}
                  disabled={uploading}
                  className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Guardando para siempre...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5" />
                      <span>Guardar en Nuestra Vida</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Story Viewer (Instagram Style) */}
      <AnimatePresence>
        {selectedStoryIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black sm:bg-black/90 sm:p-6"
          >
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.7}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) setSelectedStoryIndex(null)
              }}
              initial={{ scale: 0.9, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 100, opacity: 0 }}
              className="relative w-full h-full max-w-lg bg-black overflow-hidden sm:rounded-3xl shadow-2xl"
            >
              {/* Progress Bars */}
              <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-50">
                {historiasOrdenadas.map((_, idx) => (
                  <div key={`bar-${idx}`} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: idx === selectedStoryIndex ? "100%" : idx < selectedStoryIndex ? "100%" : "0%" 
                      }}
                      transition={{ 
                        duration: idx === selectedStoryIndex ? 5 : 0, 
                        ease: "linear" 
                      }}
                      onAnimationComplete={() => {
                        if (idx === selectedStoryIndex) {
                          if (selectedStoryIndex < historiasOrdenadas.length - 1) {
                            setSelectedStoryIndex(selectedStoryIndex + 1)
                          } else {
                            setSelectedStoryIndex(null)
                          }
                        }
                      }}
                      className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    />
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-romantic-400 p-[2px] bg-white/10 overflow-hidden">
                    <img src={historiasOrdenadas[selectedStoryIndex].url} className="w-full h-full object-cover rounded-full" alt="Avatar" />
                  </div>
                  <div className="drop-shadow-md">
                    <p className="text-sm font-bold text-white">Nuestra Historia</p>
                    <p className="text-[10px] text-white/70 font-medium">
                      {new Date(historiasOrdenadas[selectedStoryIndex].fecha + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStoryIndex(null)}
                  className="p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Areas */}
              <div className="absolute inset-0 z-40 flex">
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => {
                    if (selectedStoryIndex > 0) setSelectedStoryIndex(selectedStoryIndex - 1)
                  }}
                />
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => {
                    if (selectedStoryIndex < historiasOrdenadas.length - 1) {
                      setSelectedStoryIndex(selectedStoryIndex + 1)
                    } else {
                      setSelectedStoryIndex(null)
                    }
                  }}
                />
              </div>

               {/* Main Media Container */}
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <AnimatePresence mode="wait">
                  {isVideo(historiasOrdenadas[selectedStoryIndex].url) ? (
                    <motion.video 
                      key={historiasOrdenadas[selectedStoryIndex].id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      src={historiasOrdenadas[selectedStoryIndex].url}
                      className="max-h-full w-full object-contain"
                      autoPlay
                      muted
                      playsInline
                      onEnded={() => {
                        if (selectedStoryIndex < historiasOrdenadas.length - 1) {
                          setSelectedStoryIndex(selectedStoryIndex + 1)
                        } else {
                          setSelectedStoryIndex(null)
                        }
                      }}
                    />
                  ) : (
                    <motion.img 
                      key={historiasOrdenadas[selectedStoryIndex].id}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      src={historiasOrdenadas[selectedStoryIndex].url} 
                      className="max-h-full w-full object-contain" 
                      alt="Full Story" 
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 pb-14 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white z-50 pointer-events-none">
                {historiasOrdenadas[selectedStoryIndex].ubicacion && (
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex justify-center mb-3"
                  >
                    <div className="flex items-center gap-1.5 text-romantic-300 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      <MapPin className="w-3 h-3" />
                      <span>{historiasOrdenadas[selectedStoryIndex].ubicacion}</span>
                    </div>
                  </motion.div>
                )}
                {historiasOrdenadas[selectedStoryIndex].nota && (
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center text-base sm:text-lg italic font-medium leading-tight font-serif drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-4"
                  >
                    "{historiasOrdenadas[selectedStoryIndex].nota}"
                  </motion.p>
                )}
                <div className="mt-6 flex justify-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      filter: ["drop-shadow(0 0 0px #f84a7e)", "drop-shadow(0 0 10px #f84a7e)", "drop-shadow(0 0 0px #f84a7e)"]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Heart className="w-8 h-8 text-romantic-500 fill-romantic-500 opacity-80" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Detail Viewer */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full max-h-[95vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-[80] bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex-1 overflow-y-auto pt-0 scrollbar-hide">
                {/* Main Media - Full Width Scrollable Container */}
                <div className="w-full bg-black flex items-center justify-center min-h-[300px]">
                  {isVideo(selectedImage.url) ? (
                    <VideoPlayer 
                      src={selectedImage.url} 
                      className="w-full h-auto block" 
                    />
                  ) : (
                    <img src={selectedImage.url} className="w-full h-auto block" alt="Recuerdo" />
                  )}
                </div>

                {/* Info Section */}
                <div className="p-6 sm:p-8 flex flex-col border-t border-romantic-50 bg-white">
                  {!isEditing ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-3 text-romantic-500">
                          <div className="bg-romantic-50 p-2 rounded-xl">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-romantic-300">Fecha</p>
                            <p className="text-sm font-bold text-gray-800">
                              {new Date(selectedImage.fecha + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {selectedImage.ubicacion && (
                          <div className="flex items-center gap-3 text-romantic-500">
                            <div className="bg-romantic-50 p-2 rounded-xl">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-romantic-300">Lugar</p>
                              <p className="text-sm font-bold text-gray-800 truncate">{selectedImage.ubicacion}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mb-8">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-romantic-300 mb-3 ml-1">Nota de Amor</p>
                        <div className="bg-romantic-50/50 p-5 rounded-2xl border border-romantic-100 italic relative">
                          <MessageSquare className="absolute -top-2 -left-2 w-5 h-5 text-romantic-200" />
                          <p className="text-gray-600 text-sm leading-relaxed">
                            "{selectedImage.nota || "Un momento que guardaré en mi corazón para siempre."}"
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-romantic-400 ml-1">Fecha del Recuerdo</label>
                          <input 
                            type="date"
                            value={editForm.fecha}
                            onChange={(e) => setEditForm({...editForm, fecha: e.target.value})}
                            className="w-full bg-romantic-50/50 border border-romantic-100 rounded-xl p-3 text-sm focus:outline-none focus:border-romantic-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-romantic-400 ml-1">¿Dónde fue?</label>
                          <input 
                            type="text"
                            value={editForm.ubicacion}
                            placeholder="Ej: Nuestra primera cita"
                            onChange={(e) => setEditForm({...editForm, ubicacion: e.target.value})}
                            className="w-full bg-romantic-50/50 border border-romantic-100 rounded-xl p-3 text-sm focus:outline-none focus:border-romantic-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-romantic-400 ml-1">Nota de amor (Corrige los errores aquí ❤️)</label>
                        <textarea 
                          rows="4"
                          value={editForm.nota}
                          onChange={(e) => setEditForm({...editForm, nota: e.target.value})}
                          className="w-full bg-romantic-50/50 border border-romantic-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-romantic-300 resize-none italic"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-4">
                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-3 w-full">
                        {!isEditing ? (
                          <>
                            <button
                              onClick={() => setIsEditing(true)}
                              className="py-4 rounded-2xl bg-romantic-50 text-romantic-500 text-xs font-bold hover:bg-romantic-100 transition-all flex items-center justify-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Editar Texto
                            </button>
                            <button
                              onClick={() => eliminarImagen(selectedImage.id, selectedImage.url)}
                              disabled={deletingId === selectedImage.id}
                              className="py-4 rounded-2xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                            >
                              {deletingId === selectedImage.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Eliminar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={actualizarImagen}
                              disabled={updating}
                              className="py-4 rounded-2xl bg-romantic-500 text-white text-xs font-bold hover:bg-romantic-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-romantic-100"
                            >
                              {updating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Guardar cambios
                            </button>
                            <button
                              onClick={() => setIsEditing(false)}
                              disabled={updating}
                              className="py-4 rounded-2xl bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <>
                        <div className="flex items-center gap-3 my-2">
                          <Heart className="w-8 h-8 text-romantic-500 fill-romantic-500 animate-pulse" />
                          <span className="text-romantic-600 font-bold text-lg tracking-tight">Para siempre</span>
                        </div>
                        
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = selectedImage.url;
                            const ext = isVideo(selectedImage.url) ? 'mp4' : 'jpg';
                            link.download = `recuerdo-${selectedImage.fecha}.${ext}`;
                            link.click();
                          }}
                          className="w-full py-4 rounded-2xl bg-gray-50 text-gray-500 text-sm font-bold hover:bg-romantic-50 hover:text-romantic-500 transition-all flex items-center justify-center gap-2 border border-gray-100"
                        >
                          <Download className="w-5 h-5" />
                          <span>Descargar {isVideo(selectedImage.url) ? 'video' : 'foto'} original</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange} 
        ref={fileInputRef}
        className="hidden" 
      />

      <footer className="mt-12 py-8 text-center text-gray-400 text-sm">
        <div className="flex items-center justify-center gap-1 mb-2">
          Hecho con <Heart className="w-3 h-3 text-romantic-400 fill-romantic-400" /> para nosotros
        </div>
        <p>© 2026 Nuestra Vida Juntos • {imagenes.length} recuerdos guardados</p>
      </footer>
    </div>
  )
}
