export const RE_DOUBLEBRACE = /{{([^}]+)}}/g
export const RE_UNDERSCOREUNICODE = /_x([0-9A-Za-z]+)_/g
export const RE_NOVALUEKEY = /(?:^|,)(\w+)(?:$|,)/g
export const RE_NONJSONCHAR = /([^:,]+)/g
export const RE_NUMBER = /[-+]?[0-9]*\.?[0-9]+/g

/**
 * Converts unicode character back to orignal string.
 *
 * @param {string} text The text to decode.
 */
function decodeIllustrator(text: string) {
  return text.replace(RE_UNDERSCOREUNICODE, function (match, g1) {
    return String.fromCharCode(parseInt('0x' + g1))
  })
}

/**
 * Encodes object literal into formal JSON syntax with quotes.
 *
 * @param {string} text The text to encode to proper JSON.
 */
function jsonEncodeLiteral(text: string) {
  return (
    '{' +
    text
      .replace(RE_NOVALUEKEY, function (match, g1) {
        return match.replace(g1, g1 + ':true')
      })
      .replace(RE_NONJSONCHAR, function (match, g1) {
        if (match !== 'true' && match !== 'false' && !RE_NUMBER.test(match)) {
          return '"' + match + '"'
        }
        return match
      }) +
    '}'
  )
}

interface SyntaxParse {
  name: string
  opts: Record<string, string | number | boolean>
}

/**
 * Creates an object from a string in the format {{param|opt:val,opt:val}}.
 *
 * @param {string} text The text to decode.
 */
export function parseSyntax(text: string): SyntaxParse {
  let obj: SyntaxParse = {
    name: '',
    opts: {},
  }

  text = decodeIllustrator(text)

  const matches = text.match(RE_DOUBLEBRACE)
  if (matches) {
    text = matches[0].slice(2, -2)
    if (text.includes('|')) {
      const name_opts = text.split('|')
      obj.name = name_opts[0]
      obj.opts = JSON.parse(jsonEncodeLiteral(name_opts[1]))
    } else if (text.includes(':')) {
      obj.opts = JSON.parse(jsonEncodeLiteral(text))
    } else {
      obj.name = text
    }
  }

  return obj
}