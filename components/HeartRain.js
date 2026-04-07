"use client"
import { motion } from "framer-motion"
import { Heart } from "lucide-react"
import { useEffect, useState } from "react"

const HeartRain = () => {
  const [hearts, setHearts] = useState([])

  useEffect(() => {
    // Generar corazones aleatorios
    const newHearts = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 20,
      size: Math.random() * 20 + 10,
      opacity: Math.random() * 0.3 + 0.1
    }))
    setHearts(newHearts)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ y: -100, opacity: 0, rotate: 0 }}
          animate={{ 
            y: "110vh", 
            opacity: [0, heart.opacity, heart.opacity, 0],
            rotate: 360 
          }}
          transition={{
            duration: heart.duration,
            repeat: Infinity,
            delay: heart.delay,
            ease: "linear"
          }}
          style={{
            left: heart.left,
            position: "absolute",
          }}
        >
          <Heart 
            size={heart.size} 
            className="text-romantic-300 fill-romantic-200" 
            style={{ opacity: heart.opacity }}
          />
        </motion.div>
      ))}
    </div>
  )
}

export default HeartRain
