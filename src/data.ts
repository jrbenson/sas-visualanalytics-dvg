import * as ddc from 'sas-va-ddc'

type Value = string | number | Date | undefined

export class Row {
  private values: Map<string, Value> = new Map()

  constructor(data: Array<Value>, columns: Array<string>) {
    for (let i = 0; i < columns.length; i += 1) {
      if (i < data.length) {
        this.values.set(columns[i], data[i])
      }
    }
  }

  set(column: string, value: Value) {
    this.values.set(column, value)
  }

  get(column: string) {
    return this.values.get(column)
  }
}

export class Data {
  private rows: Array<Row> = []
  private cols: Array<string> = []
  private frmt: { std: Map<string, Formatter>; cmp: Map<string, Formatter> } = {
    std: new Map(),
    cmp: new Map(),
  }

  constructor(data: Array<Array<Value>>, columns: Array<string>) {
    for (let row_data of data) {
      this.rows.push(new Row(row_data, columns))
    }
    this.cols = columns
  }

  setColumnFormat(column: string, format: Formatter, compact = false) {
    if (this.cols.includes(column)) {
      if (compact) {
        this.frmt.cmp.set(column, format)
      } else {
        this.frmt.std.set(column, format)
      }
    }
  }

  setColumnFormats(columns: Array<string>, formats: Array<Formatter>, compact = false) {
    for (let i = 0; i < columns.length; i += 1) {
      if (i < formats.length) {
        this.setColumnFormat(columns[i], formats[i], compact)
      }
    }
  }

  castColumn(column: string, typeFunction: Function) {
    if (this.cols.includes(column)) {
      for (let row of this.rows) {
        row.set(column, typeFunction(row.get(column)))
      }
    }
  }

  set(row: number, column: string, value: Value) {
    if (row < this.rows.length) {
      const r = this.rows[row]
      return r.set(column, value)
    }
  }

  get(row: number, column: string, compact = false): string {
    const val = this.getRaw(row, column)
    if (val !== undefined) {
      if (compact && this.frmt.cmp.has(column)) {
        return this.frmt.cmp.get(column)?.format(val) as string
      } else if (this.frmt.std.has(column)) {
        return this.frmt.std.get(column)?.format(val) as string
      } else {
        return val.toString()
      }
    }
    return '???'
  }

  getRaw(row: number, column: string): Value {
    if (row < this.rows.length) {
      const r = this.rows[row]
      return r.get(column)
    }
  }

  /**
   * Create a Data instance from data in VA data message.
   *
   * @param message Message object from VA DDC data update.
   * @return Data frame with proper type parsing applied.
   */
  static fromVA(message: ddc.VAMessage): Data {
    let data = new Data(
      message.data,
      message.columns.map((x: any) => x.label)
    )

    message.columns.forEach((column: any) => {
      switch (column.type) {
        case 'number':
          data.castColumn(column.label, Number)
          break
        // case 'date':
        // case 'datetime':
        //     data = data.cast( column.label, ( val ) => Date.parse( val ) )
        //     break
      }
    })

    const stdFormats = parseFormats(message);
    for ( let col in stdFormats ) {
      data.setColumnFormat( col, stdFormats[col] )
    }

    const cmpFormats = parseFormats(message, true);
    for ( let col in cmpFormats ) {
      data.setColumnFormat( col, cmpFormats[col] )
    }

    return data
  }
}

const BASIC_FORMATS: Record<string, string> = {
  DOLLAR: 'NLMNLUSD',
  EURO: 'NLMNLEUR',
  POUND: 'NLMNLGBP',
  WON: 'NLMNLCNY',
  YEN: 'NLMNLJPY',
}

/**
 * Extracts the hours, minutes, and seconds from a duration in seconds.
 *
 * @param {Number} secs Number of seconds in the duration.
 * @return {Object} Object with durations in h, m, and s properties.
 */
function timeFromSeconds(secs: number): { h: number; m: number; s: number } {
  secs = Math.round(secs)
  var hours = Math.floor(secs / (60 * 60))

  var divisor_for_minutes = secs % (60 * 60)
  var minutes = Math.floor(divisor_for_minutes / 60)

  var divisor_for_seconds = divisor_for_minutes % 60
  var seconds = Math.ceil(divisor_for_seconds)

  var obj = {
    h: hours,
    m: minutes,
    s: seconds,
  }
  return obj
}

// TODO: Figure out why return signature has to include 'undefined'
interface Formatter {
  format: (value: number | string | Date) => string | undefined
}

// Hack to get around ES2020 standard not having notation.
interface FormatterOptions extends Intl.NumberFormatOptions {
  notation?: string
}

/**
 * Parse the format model from VA into an object with a format method.
 *
 * @param {Object} format Format from VA message.
 * @param {boolean} compact Controls whether format generates compacted output or not.
 * @return {Formatter} Object with an appropriate format method.
 */
function parseFormat(column: ddc.VAColumn, compact: boolean = false): Formatter {
  const format = column.format
  if (format) {
    if (column.type === 'number') {
      let format_opts: FormatterOptions = {
        maximumFractionDigits: format.precision,
        minimumFractionDigits: format.precision,
      }
      if (compact) {
        format_opts.notation = 'compact'
        format_opts.maximumSignificantDigits = 3
      }

      for (let basic in BASIC_FORMATS) {
        if (format.name === basic) {
          format.name = BASIC_FORMATS[basic]
        }
      }

      if (format.name.startsWith('NLMNI')) {
        return {
          format: (value: number | string | Date) => {
            if (typeof value === 'number') {
              return (
                format.name.replace('NLMNI', '') + new Intl.NumberFormat(navigator.language, format_opts).format(value)
              )
            }
          },
        }
      } else if (format.name.startsWith('TIME')) {
        return {
          format: (value: number | string | Date) => {
            if (typeof value === 'number') {
              const parts = timeFromSeconds(value)
              return (
                ('' + parts.h).padStart(2, '0') +
                ':' +
                ('' + parts.m).padStart(2, '0') +
                ':' +
                ('' + parts.s).padStart(2, '0')
              )
            }
            return '???'
          },
        }
      } else if (format.name.startsWith('HOUR')) {
        return {
          format: (value: number | string | Date) => {
            if (typeof value === 'number') {
              const hours = Math.floor(value / (60 * 60))
              return new Intl.NumberFormat(navigator.language).format(hours)
            }
            return '???'
          },
        }
      } else if (format.name.startsWith('HHMM')) {
        return {
          format: (value: number | string | Date) => {
            if (typeof value === 'number') {
              const parts = timeFromSeconds(value)
              return ('' + parts.h).padStart(2, '0') + ':' + ('' + parts.m).padStart(2, '0')
            }
            return '???'
          },
        }
      } else if (format.name.startsWith('MMSS')) {
        return {
          format: (value: number | string | Date) => {
            if (typeof value === 'number') {
              const secs = Math.round(value)
              const minutes = Math.floor(secs / 60)
              const seconds = Math.ceil((secs % (60 * 60)) % 60)
              return ('' + minutes).padStart(2, '0') + ':' + ('' + seconds).padStart(2, '0')
            }
            return '???'
          },
        }
      } else if (format.name.startsWith('NLMNL')) {
        format_opts.style = 'currency'
        format_opts.currency = format.name.replace('NLMNL', '')
      } else if (format.name.startsWith('PERCENT')) {
        format_opts.style = 'percent'
      } else if (format.name.startsWith('F')) {
        format_opts.useGrouping = false
      } else if (format.name.startsWith('BEST')) {
        delete format_opts.maximumFractionDigits
        format_opts.maximumSignificantDigits = format.width
        if (compact) {
          format_opts.maximumSignificantDigits = 3
        }
      }
      return {
        format: (value: number | string | Date) => {
          if (typeof value === 'number') {
            return new Intl.NumberFormat(navigator.language, format_opts).format(value)
          }
          return '???'
        },
      }
    } else if (column.type === 'date') {
      return {
        format: (value: number | string | Date) => {
          if (typeof value === 'string') {
            return value
          }
          return '???'
        },
      }
    }
  }
  return {
    format: (value: number | string | Date) => {
      if (typeof value === 'string') {
        return value
      }
      return '???'
    },
  }
}

/**
 * Parse the format models from VA into a list of objects with a format method.
 *
 * @param {Object} message Full message model from VA
 * @param {boolean} compact Controls whether format generates compacted output or not.
 * @return {Object[]} List of objects with an appropriate format method.
 */
function parseFormats(message: ddc.VAMessage, compact: boolean = false): Record<string, Formatter> {
  let formats: Record<string, Formatter> = {}
  message.columns.forEach((column) => (formats[column.label] = parseFormat(column, compact)))
  return formats
}
