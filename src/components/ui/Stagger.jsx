import { motion } from 'framer-motion'

const EASE = [0.2, 0.8, 0.2, 1]

const containerVariants = {
  hidden: {},
  show: (stagger = 0.045) => ({ transition: { staggerChildren: stagger, delayChildren: 0.02 } }),
}

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE } },
}

/**
 * Staggered entrance for a group of children (each child should be a <StaggerItem>).
 * `inView` defers the animation until the group scrolls into view (once).
 * Respects the user's reduced-motion preference via <MotionConfig reducedMotion="user">.
 */
export function Stagger({ as = 'div', inView = false, stagger = 0.045, className, children, ...props }) {
  const Component = motion[as]
  return (
    <Component
      variants={containerVariants}
      custom={stagger}
      initial="hidden"
      {...(inView ? { whileInView: 'show', viewport: { once: true, margin: '0px 0px -60px 0px' } } : { animate: 'show' })}
      className={className}
      {...props}
    >
      {children}
    </Component>
  )
}

export function StaggerItem({ as = 'div', className, children, ...props }) {
  const Component = motion[as]
  return (
    <Component variants={staggerItemVariants} className={className} {...props}>
      {children}
    </Component>
  )
}
