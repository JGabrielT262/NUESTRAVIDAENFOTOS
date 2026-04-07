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
  EyeOff
} from "lucide-react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import confetti from "canvas-confetti"
import HeartRain from "@/components/HeartRain"

export default function Home() {
  const [imagenes, setImagenes] = useState([])
  const [authorized, setAuthorized] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [recuerdoDelDia, setRecuerdoDelDia] = useState(null)
  const [selectedStory, setSelectedStory] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  
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

  const fileInputRef = useRef(null)
  
  // Keys from env
  const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY || "floriyjesusporsiempre"
  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "jesus26244640"

  useEffect(() => {
    setIsClient(true)
    
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

  async function obtenerImagenes() {
    try {
      const { data, error } = await supabase
        .from("fotos")
        .select("*")
        .order("fecha", { ascending: false })

      if (error) throw error
      setImagenes(data || [])
    } catch (err) {
      console.error("Error fetching images:", err)
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
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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

      <main className="max-w-5xl mx-auto px-6 pt-8">
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
              
              {imagenes.slice(0, 10).map((img, i) => (
                <motion.div 
                  key={`story-${img.id}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer"
                  onClick={() => setSelectedStory(img)}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] bg-gradient-to-tr from-romantic-300 via-romantic-500 to-romantic-600 shadow-md text-[0px]">
                    <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100">
                      <img src={img.url} className="w-full h-full object-cover" alt="Story" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 truncate w-full text-center px-1">
                    {new Date(img.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  </span>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Welcome Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-12 text-center sm:text-left flex flex-col md:flex-row gap-8 items-center md:items-start"
        >
          <div className="flex-1">
            <h2 className="text-4xl font-extrabold text-gray-800 flex items-center justify-center sm:justify-start gap-3 leading-tight">
              Nuestra historia en fotos <Sparkles className="text-romantic-400 w-8 h-8" />
            </h2>
            <p className="text-gray-500 mt-3 text-lg">Guardando cada lugar, cada fecha y cada sentimiento.</p>
            
            <div className="flex items-center gap-4 mt-6 justify-center sm:justify-start">
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-romantic-100 flex items-center gap-2">
                <span className="text-romantic-500 font-bold">{imagenes.length}</span>
                <span className="text-gray-400 text-sm">Momentos</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-romantic-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-romantic-400" />
                <span className="text-gray-400 text-sm">Para siempre</span>
              </div>
            </div>
          </div>

          {/* Recuerdo del día Card */}
          {recuerdoDelDia && (
            <motion.div 
              initial={{ rotate: 2, scale: 0.9, opacity: 0 }}
              animate={{ rotate: -2, scale: 1, opacity: 1 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              onClick={() => setSelectedImage(recuerdoDelDia)}
              className="w-64 bg-white p-3 rounded-xl shadow-xl border-4 border-white transform transition-all cursor-pointer group"
            >
              <div className="aspect-square overflow-hidden rounded-lg mb-2 relative">
                <img src={recuerdoDelDia.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Recuerdo" />
                <div className="absolute top-2 right-2 bg-romantic-500/90 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                  Recuerdo del día
                </div>
              </div>
              <div className="px-1">
                <p className="text-romantic-600 text-xs font-bold mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(recuerdoDelDia.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-gray-600 text-[11px] italic line-clamp-2">"{recuerdoDelDia.nota || "Te amo mucho"}"</p>
              </div>
            </motion.div>
          )}
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
                  className="relative cursor-pointer"
                  onClick={() => setSelectedImage(img)}
                >
                  <img 
                    src={img.url} 
                    className="w-full h-auto object-cover rounded-t-3xl transition-transform duration-500 group-hover:scale-105" 
                    alt="Recuerdo"
                    loading="lazy"
                  />
                  
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-romantic-500" />
                    <span className="text-[10px] font-bold text-gray-700">
                      {new Date(img.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
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
                    <p className="text-sm font-bold text-gray-700">{selectedFiles.length} {selectedFiles.length === 1 ? "foto seleccionada" : "fotos seleccionadas"}</p>
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

      {/* Fullscreen Story Viewer */}
      <AnimatePresence>
        {selectedStory && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 sm:p-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-full h-full max-w-lg bg-romantic-900 flex flex-col overflow-hidden sm:rounded-3xl"
            >
              <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
                <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    transition={{ duration: 5 }}
                    onAnimationComplete={() => setSelectedStory(null)}
                    className="h-full bg-white"
                  />
                </div>
              </div>

              <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-romantic-400 overflow-hidden">
                    <img src={selectedStory.url} className="w-full h-full object-cover" alt="Avatar" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Nuestra Historia</p>
                    <p className="text-[10px] opacity-70">
                      {new Date(selectedStory.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStory(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center bg-black">
                <img src={selectedStory.url} className="max-h-full w-auto object-contain" alt="Full Story" />
              </div>

              <div className="p-6 bg-gradient-to-t from-black/80 to-transparent text-white pt-20">
                {selectedStory.ubicacion && (
                  <div className="flex items-center gap-2 mb-2 text-romantic-300">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-bold">{selectedStory.ubicacion}</span>
                  </div>
                )}
                {selectedStory.nota && (
                  <p className="text-base italic font-medium leading-relaxed">"{selectedStory.nota}"</p>
                )}
                <div className="mt-6 flex justify-center">
                  <Heart className="w-8 h-8 text-romantic-500 fill-romantic-500 animate-pulse" />
                </div>
              </div>
            </motion.div>
          </div>
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
              className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src={selectedImage.url} className="max-w-full max-h-full object-contain" alt="Recuerdo" />
              </div>

              <div className="w-full md:w-80 bg-white p-8 flex flex-col justify-between border-l border-romantic-50">
                <div>
                  <div className="flex items-center gap-2 text-romantic-500 mb-6">
                    <div className="bg-romantic-50 p-2 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-romantic-300">Fecha</p>
                      <p className="text-sm font-bold text-gray-800">
                        {new Date(selectedImage.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {selectedImage.ubicacion && (
                    <div className="flex items-center gap-2 text-romantic-500 mb-6">
                      <div className="bg-romantic-50 p-2 rounded-xl">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-romantic-300">Lugar</p>
                        <p className="text-sm font-bold text-gray-800">{selectedImage.ubicacion}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-romantic-300 ml-1">Nota de amor</p>
                    <div className="bg-romantic-50/50 p-4 rounded-2xl border border-romantic-100 italic text-gray-600 text-sm leading-relaxed relative">
                      <MessageSquare className="absolute -top-2 -left-2 w-4 h-4 text-romantic-200" />
                      "{selectedImage.nota || "Un momento inolvidable juntos..."}"
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-center gap-4">
                  {isAdmin && (
                    <button
                      onClick={() => eliminarImagen(selectedImage.id, selectedImage.url)}
                      disabled={deletingId === selectedImage.id}
                      className="w-full py-3 rounded-2xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 mb-2"
                    >
                      {deletingId === selectedImage.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Eliminar Recuerdo
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <Heart className="w-6 h-6 text-romantic-500 fill-romantic-500 animate-pulse" />
                    <span className="text-romantic-600 font-bold text-sm tracking-tighter">Para siempre</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedImage.url;
                      link.download = `recuerdo-${selectedImage.fecha}.jpg`;
                      link.click();
                    }}
                    className="w-full py-3 rounded-2xl bg-gray-50 text-gray-500 text-xs font-bold hover:bg-romantic-50 hover:text-romantic-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar esta foto
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        multiple
        accept="image/*"
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
