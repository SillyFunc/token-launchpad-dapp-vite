export function sanitizeInteger(raw: string) {
  return raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

export function sanitizeDecimal(raw: string, maxDecimals = 18) {
  let value = raw.replace(/[^\d.]/g, '')
  const dot = value.indexOf('.')
  if (dot >= 0) {
    value = `${value.slice(0, dot + 1)}${value
      .slice(dot + 1)
      .replace(/\./g, '')
      .slice(0, maxDecimals)}`
  }
  const dotIndex = value.indexOf('.')
  const integer = (dotIndex >= 0 ? value.slice(0, dotIndex) : value).replace(
    /^0+(?=\d)/,
    '',
  )
  return dotIndex >= 0 ? `${integer || '0'}${value.slice(dotIndex)}` : integer
}
