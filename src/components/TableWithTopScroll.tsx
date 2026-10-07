import React, { useEffect, useRef, useState } from 'react'

type Props = {
  children: React.ReactNode
  className?: string
}

/**
 * Envuelve una <table> y le agrega:
 *  - Una barra horizontal ARRIBA (fija, sticky) para desplazarse cómodamente.
 *  - Sincroniza el scroll entre la barra de arriba y la tabla.
 *  - Mantiene los encabezados <thead> fijos al hacer scroll vertical.
 *
 * Uso:
 *   <TableWithTopScroll>
 *     <table>...</table>
 *   </TableWithTopScroll>
 */
export default function TableWithTopScroll({ children, className = '' }: Props) {
  const topBarRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const [hasOverflow, setHasOverflow] = useState(false)

  // Detecta cuándo la tabla realmente necesita scroll horizontal
  useEffect(() => {
    const bottom = bottomRef.current
    if (!bottom) return
    const table = bottom.querySelector('table')
    if (!table) return

    const update = () => {
      const tableWidth = table.scrollWidth
      const containerWidth = bottom.clientWidth
      setContentWidth(tableWidth)
      setHasOverflow(tableWidth > containerWidth + 1)
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(table)
    ro.observe(bottom)

    // También al cambiar el tamaño de la ventana
    window.addEventListener('resize', update)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  })

  const syncTopToBottom = () => {
    if (!topBarRef.current || !bottomRef.current) return
    bottomRef.current.scrollLeft = topBarRef.current.scrollLeft
  }

  const syncBottomToTop = () => {
    if (!topBarRef.current || !bottomRef.current) return
    topBarRef.current.scrollLeft = bottomRef.current.scrollLeft
  }

  return (
    <div className={`table-top-scroll-wrapper ${className}`}>
      {/* Barra horizontal ARRIBA, sticky */}
      <div
        ref={topBarRef}
        className="table-top-scroll-bar"
        onScroll={syncTopToBottom}
        aria-hidden={!hasOverflow}
        style={{ display: hasOverflow ? 'block' : 'none' }}
      >
        <div style={{ width: `${contentWidth}px`, height: '1px' }} />
      </div>

      {/* Tabla con su propia barra horizontal oculta */}
      <div
        ref={bottomRef}
        className="table-top-scroll-content"
        onScroll={syncBottomToTop}
      >
        {children}
      </div>
    </div>
  )
}