import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1]

// Fade / slide-in on view — Framer Motion replacement for GSAP reveal.
// Avoids scale so Recharts ResponsiveContainer stays stable.
export function MotionReveal({ children, className, delay = 0, y = 24, once = true, amount = 0.12 }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

// Header entrance (slightly lighter than card reveal).
export function MotionHeader({ children, className }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
