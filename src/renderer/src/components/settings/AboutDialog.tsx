import { useState, useEffect, useCallback } from 'react'
import { Dialog } from '@/components/ui/dialog'
import icoPng from '@/assets/ico.png'
import { useAppInfoStore } from '@/stores/appInfoStore'

function ParticleField() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 6,
    duration: Math.random() * 8 + 6,
    opacity: Math.random() * 0.35 + 0.08,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white/70"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `about-particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function AnimatedLogo() {
  return (
    <div className="relative flex items-center justify-center mb-6">
      <div className="about-logo-glow" />
      <div className="relative z-10 about-logo-ring about-logo-ring-1" />
      <div className="relative z-10 about-logo-ring about-logo-ring-2" />
      <div className="relative z-10 about-logo-ring about-logo-ring-3" />
      <div className="about-logo-container">
        <img src={icoPng} alt="ShareNet" className="about-logo-img" />
      </div>
    </div>
  )
}

function InfoRow({ label, value, delay }: { label: string; value: string; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`about-info-row ${visible ? 'about-info-visible' : ''}`}
    >
      <span className="about-info-label">{label}</span>
      <span className="about-info-value">{value}</span>
    </div>
  )
}

function TechBadge({ name, version, color, delay }: { name: string; version?: string; color: string; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`about-tech-badge ${visible ? 'about-badge-visible' : ''}`}
      style={{ '--badge-color': color } as React.CSSProperties}
    >
      <span className="about-badge-dot" style={{ background: color }} />
      <span className="about-badge-name">{name}</span>
      {version && <span className="about-badge-version">{version}</span>}
    </div>
  )
}

export function AboutDialog() {
  const [open, setOpen] = useState(false)
  const appInfo = useAppInfoStore((s) => s.appInfo)

  const handleShowAbout = useCallback(() => {
    setOpen(true)
  }, [])

  useEffect(() => {
    window.electronAPI?.onShowAbout(handleShowAbout)
    return () => {
      window.electronAPI?.removeAllListeners('show-about')
    }
  }, [handleShowAbout])

  if (!appInfo) return null

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="about-overlay" />
        <Dialog.Content className="about-content" hideCloseButton>
          <div className="about-mesh-bg">
            <ParticleField />
          </div>

          <div className="about-inner">
            <AnimatedLogo />

            <h1 className="about-title">
              <span className="about-title-text">{appInfo.name}</span>
              <span className="about-title-sub">{appInfo.description}</span>
            </h1>

            <div className="about-divider">
              <span className="about-divider-line" />
              <span className="about-divider-icon">&#10022;</span>
              <span className="about-divider-line" />
            </div>

            <div className="about-info-grid">
              <InfoRow label="版本" value={`v${appInfo.version}`} delay={300} />
              <InfoRow label="作者" value={appInfo.author} delay={400} />
              <InfoRow label="许可" value={appInfo.license} delay={500} />
              <InfoRow label="平台" value={appInfo.platformLabel} delay={600} />
            </div>

            <div className="about-tech-section">
              {appInfo.techStack.map((tech, index) => (
                <TechBadge
                  key={tech.name}
                  name={tech.name}
                  version={tech.version}
                  color={tech.color}
                  delay={700 + index * 100}
                />
              ))}
            </div>

            <p className="about-copyright">
              &copy; {new Date().getFullYear()} {appInfo.name}. All rights reserved.
            </p>
          </div>

          <Dialog.Close className="about-close-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
