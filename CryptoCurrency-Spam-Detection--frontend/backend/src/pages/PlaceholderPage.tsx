type Props = {
  title: string
}

export function PlaceholderPage({ title }: Props) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="glass p-8">
        <div className="text-xl font-semibold text-gray-100">{title}</div>
        <div className="mt-2 text-sm text-gray-400">Coming soon.</div>
      </div>
    </div>
  )
}

