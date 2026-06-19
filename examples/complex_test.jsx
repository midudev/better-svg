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
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      {...props}
      height={size}
      onClick={() => console.log('SVG Clicked')}
      stroke={color}
      strokeWidth={2}
      style={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transformOrigin: 'center'
      }}
      width={size}
      fontStyle="italic"
      viewBox="0 0 24 24"
    >
      <title>Complex Icon Test</title>
      <circle cx="12" cy="12" r={size / 4} />
      <path
        d="M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        strokeOpacity={0.8}
      />
      <text
        x="12"
        y="20"
        fill="currentColor"
        style={{ opacity: 0.9 }}
        fontFamily="Arial"
        fontSize="8"
        fontStyle="normal"
        textAnchor="middle"
      >
        OK
      </text>
    </svg>
  )
}
