// JSX example

export const Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

export const Icon2 = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

export const ComplicatedComponent = () => {
  return (
    <svg
      className="w-4 h-4 text-white/70"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  )
}

export const ConditionalComponent = (props) => {
  return (
    <div
      className={cn(
        'w-6 h-6 flex items-center justify-center font-bold text-xs',
        ok ? ' text-green-400' : 'text-red-400'
      )}
    >
      {ok ? (
        <svg width="2em" height="2em" viewBox="0 0 24 24">
          <title xmlns="">check-box-solid</title>
          <path
            fill="currentColor"
            d="M22 2V1H2v1H1v20h1v1h20v-1h1V2zM5 11h1v-1h1V9h1v1h1v1h1v1h2v-1h1v-1h1V9h1V8h1V7h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-1H9v-1H8v-1H7v-1H6v-1H5z"
          />
        </svg>
      ) : (
        <svg width="2em" height="2em" viewBox="0 0 24 24">
          <title xmlns="">times-circle-solid</title>
          <path
            fill="currentColor"
            d="M22 9V7h-1V5h-1V4h-1V3h-2V2h-2V1H9v1H7v1H5v1H4v1H3v2H2v2H1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1V9zm-8 7v-1h-1v-1h-2v1h-1v1H9v1H8v-1H7v-1h1v-1h1v-1h1v-2H9v-1H8V9H7V8h1V7h1v1h1v1h1v1h2V9h1V8h1V7h1v1h1v1h-1v1h-1v1h-1v2h1v1h1v1h1v1h-1v1h-1v-1z"
          />
        </svg>
      )}
    </div>
  )
}
