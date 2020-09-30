import { Data, Column, ColumnType } from './data'

export const RE_DOUBLEBRACE = /{{([^}]+)}}/g
export const RE_UNDERSCOREUNICODE = /_x([0-9A-Za-z]+)_/g
export const RE_NOVALUEKEY = /(?:^|,)(\w+)(?:$|,)/g
export const RE_NONJSONCHAR = /([^:,]+)/g
export const RE_NUMBER = /^[-+]?[0-9]*\.?[0-9]+$/g
export const RE_COLUMNID = /^[@#$][0-9]+$/g

const COL_ID_TYPE_PREFIXES: Record<string, ColumnType> = {
  '@': ColumnType.String,
  '#': ColumnType.Number,
  $: ColumnType.Date,
}

/**
 * Converts unicode character back to orignal string.
 *
 * @param text The text to decode.
 */
export function decodeIllustrator(text: string) {
  return text.replace(RE_UNDERSCOREUNICODE, function (match, g1) {
    return String.fromCharCode(parseInt('0x' + g1))
  })
}

/**
 * Encodes object literal into formal JSON syntax with quotes.
 *
 * @param text The text to encode to proper JSON.
 */
function jsonEncodeLiteral(text: string) {
  return (
    '{' +
    text
      .replace(RE_NOVALUEKEY, function (match, g1) {
        return match.replace(g1, trimChars(g1, [' ', '-']) + ':true')
      })
      .replace(RE_NONJSONCHAR, function (match, g1) {
        if (match !== 'true' && match !== 'false' && !RE_NUMBER.test(match)) {
          return '"' + trimChars(match, [' ', '-']) + '"'
        }
        return trimChars(match, [' ', '-'])
      }) +
    '}'
  )
}

/**
 * Trims any of the specified characters from the star and end of the text.
 *
 * @param text The text to trim.
 * @param chars List of characters to trim.
 */
function trimChars(text: string, chars: string[]) {
  var start = 0,
    end = text.length

  while (start < end && chars.indexOf(text[start]) >= 0) ++start

  while (end > start && chars.indexOf(text[end - 1]) >= 0) --end

  return start > 0 || end < text.length ? text.substring(start, end) : text
}

interface SyntaxParse {
  name: string
  opts: Record<string, string | number | boolean>
}

/**
 * Creates an object from a string in the format {{param|opt:val,opt:val}}.
 *
 * @param text The text to decode.
 */
export function syntax(text: string): SyntaxParse {
  let obj: SyntaxParse = {
    name: '',
    opts: {},
  }
  const matches = text.match(RE_DOUBLEBRACE)
  if (matches) {
    text = matches[0].slice(2, -2)
    if (text.includes('|')) {
      const name_opts = text.split('|')
      obj.name = trimChars(name_opts[0], [' ', '-'])
      obj.opts = JSON.parse(jsonEncodeLiteral(name_opts[1]))
    } else if (text.includes(':')) {
      obj.opts = JSON.parse(jsonEncodeLiteral(text))
    } else {
      obj.name = trimChars(text, [' ', '-'])
    }
  }

  return obj
}

export function elementsWithOptions(svg: Element, options: Array<string>) {
  return Array.from(svg.querySelectorAll<SVGElement>('*[id]'))
    .filter((e) => e.id?.match(RE_DOUBLEBRACE))
    .filter(function (e) {
      let syn = syntax(e.id)
      for (let option in syn.opts) {
        if (options.includes(option)) {
          return true
        }
      }
      return false
    })
}

export function elementsByName(svg: Element) {
  const elements = new Map()
  console.log( svg.querySelectorAll<SVGElement>('*[id]') )
  Array.from(svg.querySelectorAll<SVGElement>('*[id]'))
    .filter((e) => e.id?.match(RE_DOUBLEBRACE))
    .forEach(function (e) {
      console.log( e )
      let syn = syntax(e.id)
      if (syn.name) {
        elements.set(syn.name, e)
      }
    })
  return elements
}

export function firstObjectKey(object: Record<string, any>, keys: Array<string>) {
  for (let key of keys) {
    if (object.hasOwnProperty(key)) {
      return key
    }
  }
}

/**
 * Detects type from @, #, and $ prefixes for string, number, and time and position.
 *
 * @param data The column id to parse.
 */
export function columnIdentifier(col_id: string): [ColumnType, number] | undefined {
  let match = col_id.match(RE_COLUMNID)
  if (match) {
    const prefix = col_id.charAt(0)
    const index = col_id.substring(1)
    if (COL_ID_TYPE_PREFIXES.hasOwnProperty(prefix)) {
      return [COL_ID_TYPE_PREFIXES[prefix], Number.parseInt(index)]
    }
  }
}

/**
 * Returns column from data based on identifier.
 *
 * @param data The column id to lookup.
 */
export function columnFromData(col_str: string, data: Data) {
  const col_id = columnIdentifier(col_str)
  let col: Column | undefined
  if (col_id) {
    const [type, index] = col_id
    col = data.getColumn(index, type)
  } else {
    col = data.getColumn(col_str)
  }
  return col
}

/**
 * Extracts {{min}} and {{max}} tagged columns from data and converts to stats, or pulls {{0 100}} range directly
 *
 * @param data The data object to parse the stats from.
 */
export function dataStats(data: Data) {
  for (let col_name of data.cols) {
    if (col_name.match(RE_DOUBLEBRACE)) {
      const col = data.getColumn(col_name)
      if (col) {
        const stat = syntax(col_name).name.toLowerCase()
        const col_base_name = col_name.replace(RE_DOUBLEBRACE, '').trim()
        const stats = stat.split(' ')
        if (stats.length === 2 && stats[0].match(RE_NUMBER) && stats[0].match(RE_NUMBER)) {
          const [min, max] = stats.map(Number)
          data.renameColumn(col.name, col_base_name)
          data.setColumnStats(col_base_name, { min: min, max: max })
          // if( col_base_name === 'Expenses' ) {
          //   console.log( col_base_name, data.min(col_base_name), min )
          // }
        } else {
          const target_col = data.getColumn(col_base_name)
          if (target_col) {
            switch (stat) {
              case 'min':
                data.setColumnStats(target_col.name, { min: col.stats?.min })
                break
              case 'max':
                data.setColumnStats(target_col.name, { max: col.stats?.max })
                break
              case 'sum':
                data.setColumnStats(target_col.name, { sum: col.stats?.sum })
                break
              case 'avg':
                data.setColumnStats(target_col.name, { avg: col.stats?.avg })
                break
            }
            data.dropColumn(col.name)
          }
        }
      }
    }
  }

  return data
}
