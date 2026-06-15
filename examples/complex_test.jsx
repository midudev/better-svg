export const ComplexIcon = ({
  size = 24,
  className,
  color = 'currentColor',
  ...props
}) => {
  const handleClick = () => console.log('clicked')

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      // 1. Props dinámicas numéricas
      width={size}
      height={size}
      viewBox="0 0 24 24"
      // 2. Mezcla de comillas simples y dobles
      fill="none"
      stroke={color}
      // 3. Valores numéricos directos en expresiones
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      // 4. className dinámico con template string (se mantiene como expresión)
      className={`icon ${className}`}
      // 5. Objeto style complejo (debe preservarse y no romperse por SVGO)
      style={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transformOrigin: 'center'
      }}
      // 6. Event handlers (Arrow function inline)
      onClick={() => console.log('SVG Clicked')}
      // 7. Atributos "peligrosos" que contienen "style" en el nombre (Test de regresión)
      fontStyle="italic"
      // 8. Spread attributes
      {...props}
    >
      <title>Complex Icon Test</title>

      {/* 9. Elemento auto-cerrado con cálculo en prop */}
      <circle cx="12" cy="12" r={size / 4} strokeDasharray="4 4" />

      {/* 10. Path con opacidad numérica */}
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        strokeOpacity={0.8}
      />

      {/* 11. Grupo con styles anidados y atributos de fuente */}
      <g style={{ opacity: 0.9 }}>
        <text
          x="12"
          y="20"
          textAnchor="middle"
          fontFamily="Arial"
          fontSize="8"
          // El atributo fontStyle aquí es crítico para verificar que no se renombra incorrectamente
          fontStyle="normal"
          fill="currentColor"
        >
          OK
        </text>
      </g>
    </svg>
  )
}
