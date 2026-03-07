import { useEffect, useRef } from 'react'

function Bolle() {
    const canvasRef = useRef(null)
    const bolleRef = useRef([])
    const animRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        const colori = [
            '#7ab870',   // verde medio
            '#5a9e50',   // verde più scuro
            '#a8c5a0',   // verde chiaro
            '#90c285',   // verde brillante
            '#c5dcc0',   // verde pastello
            '#ffffff'    // bianco
        ]

        bolleRef.current = Array.from({ length: 25 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 120 + 40,          // ← più grandi (era 80+20)
            dx: (Math.random() - 0.5) * 1.5,      // ← più lente, più eleganti
            dy: (Math.random() - 0.5) * 1.5,
            alpha: Math.random() * 0.35 + 0.25,   // ← più opache (era 0.4+0.1 ma troppo basse)
            color: colori[Math.floor(Math.random() * colori.length)]
        }))

        const anima = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            bolleRef.current.forEach(b => {
                ctx.save()
                ctx.globalAlpha = b.alpha

                // Gradiente radiale per effetto "vetro/bolla"
                const gradient = ctx.createRadialGradient(
                    b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1,  // luce interna
                    b.x, b.y, b.r
                )
                gradient.addColorStop(0, '#ffffff')   // centro chiaro
                gradient.addColorStop(0.4, b.color)   // colore principale
                gradient.addColorStop(1, b.color + '88') // bordo leggermente trasparente

                ctx.beginPath()
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
                ctx.fillStyle = gradient
                ctx.fill()
                ctx.restore()

                b.x += b.dx
                b.y += b.dy

                if (b.x - b.r < 0 || b.x + b.r > canvas.width) b.dx *= -1
                if (b.y - b.r < 0 || b.y + b.r > canvas.height) b.dy *= -1
            })
            animRef.current = requestAnimationFrame(anima)
        }
        anima()

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(animRef.current)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed', top: 0, left: 0,
                width: '100vw', height: '100vh',
                zIndex: 0, pointerEvents: 'none',
                filter: 'blur(4px)'   // ← blur quasi eliminato (era 10px)
            }}
        />
    )
}

export default Bolle
