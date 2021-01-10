import * as ddc from 'sas-va-ddc'
import { parseVAFormats, Formatter } from './formats'

type Value = string | number | Date | undefined

export enum ColumnType {
  String,
  Number,
  Date,
}

interface Stats {
  min: number
  max: number
  sum: number
  avg: number
  manual?: boolean
}

export interface Column {
  name: string
  type: ColumnType
  format: { std?: Formatter; cmp?: Formatter }
  stats?: Stats
}

export class Row {
  private _values: Array<Value> = []
  private _cols_map: Map<string, number> = new Map()

  constructor(data: Array<Value>, columns: Array<string>) {
    for (let i = 0; i < columns.length; i += 1) {
      if (i < data.length) {
        this._values.push(data[i])
        this._cols_map.set(columns[i], i)
      }
    }
  }

  get(column: string | number) {
    if (typeof column === 'string') {
      if (this._cols_map.has(column)) {
        const index = this._cols_map.get(column)
        if (index != undefined) {
          return this._values[index]
        }
      }
    } else {
      return this._values[column]
    }
  }

  set(column: string | number, value: Value) {
    if (typeof column === 'string') {
      if (this._cols_map.has(column)) {
        const index = this._cols_map.get(column)
        if (index != undefined) {
          this._values[index] = value
        }
      }
    } else {
      this._values[column] = value
    }
  }

  delete(column: string | number) {
    if (typeof column === 'string') {
      if (this._cols_map.has(column)) {
        const index = this._cols_map.get(column)
        if (index != undefined) {
          this._values.splice(index, 1)
          for (let [col_name, col_index] of this._cols_map) {
            if (col_index > index) {
              this._cols_map.set(col_name, col_index - 1)
            }
          }
          this._cols_map.delete(column)
        }
      }
    } else {
      if (column >= 0 && column < this._values.length) {
        this._values.splice(column, 1)
        const key = Array.from(this._cols_map.keys())[column]
        for (let [col_name, col_index] of this._cols_map) {
          if (col_index > column) {
            this._cols_map.set(col_name, col_index - 1)
          }
        }
        this._cols_map.delete(key)
      }
    }
  }

  renameColumn(column: string | number, name: string) {
    if (typeof column === 'string') {
      const index = this._cols_map.get(column)
      if (index !== undefined) {
        this._cols_map.set(name, index)
        this._cols_map.delete(column)
      }
    } else {
      const key = Array.from(this._cols_map.keys())[column]
      this._cols_map.set(name, column)
      this._cols_map.delete(key)
    }
  }
}

export class Data {
  private _rows: Array<Row> = []
  private _cols: Array<Column> = []
  private _cols_map: Map<string, number> = new Map()

  constructor(data: Array<Array<Value>>, columns: Array<string>) {
    for (let row_data of data) {
      this._rows.push(new Row(row_data, columns))
    }

    let types: string[] = []
    let first_row = data[0]
    if (first_row) {
      types = data[0].map((d) => typeof d)
    }
    this._cols = columns.map((c, i) => ({
      name: c,
      type: types[i] === 'string' ? ColumnType.String : ColumnType.Number,
      format: {},
    }))
    columns.forEach((c, i) => this._cols_map.set(c, i))

    this.calcColumnStats()
  }

  get cols() {
    return Array.from(this._cols_map.keys())
  }

  get rows() {
    return this._rows
  }

  get(row: number, column: string | number): Value {
    const r = this._rows[row]
    const col = this.getColumn(column)
    if (r && col) {
      return r.get(col.name)
    }
  }

  set(row: number, column: string | number, value: Value) {
    if (row < this._rows.length) {
      const r = this._rows[row]
      const col = this.getColumn(column)
      if (col) {
        r.set(col.name, value)
      }
    }
  }

  getColumn(column: string | number, type?: ColumnType) {
    if (type === undefined) {
      if (typeof column === 'string') {
        if (this._cols_map.has(column)) {
          const index = this._cols_map.get(column)
          if (index != undefined) {
            return this._cols[index]
          }
        }
      } else {
        return this._cols[column]
      }
    } else {
      if (typeof column === 'number') {
        const selected_cols = this._cols.filter((c) => c.type === type)
        return selected_cols[column]
      }
    }
  }

  renameColumn(column: string | number, name: string) {
    const col = this.getColumn(column)
    if (col) {
      const index = this._cols_map.get(col.name)
      if (index !== undefined) {
        for (let row of this._rows) {
          row.renameColumn(column, name)
        }
        this._cols_map.set(name, index)
        this._cols_map.delete(col.name)
        col.name = name
      }
    }
  }

  getRow(row: number): Row | undefined {
    if (row < this._rows.length) {
      return this._rows[row]
    }
  }

  getFormatted(row: number, column: string | number, compact = false): string {
    const col = this.getColumn(column)
    if (col) {
      const val = this.get(row, col.name)
      if (val !== undefined) {
        if (compact && col.format.cmp) {
          return col.format.cmp?.format(val) as string
        } else if (col.format.std) {
          return col.format.std?.format(val) as string
        } else {
          return val.toString()
        }
      }
    }
    return '???'
  }

  setColumnFormat(column: string | number, format: Formatter, compact = false) {
    const col = this.getColumn(column)
    if (col) {
      if (compact) {
        col.format.cmp = format
      } else {
        col.format.std = format
      }
    }
  }

  setColumnFormats(columns: Array<string | number>, formats: Array<Formatter>, compact = false) {
    for (let i = 0; i < columns.length; i += 1) {
      if (i < formats.length) {
        this.setColumnFormat(columns[i], formats[i], compact)
      }
    }
  }

  min(column: string | number) {
    return this.getColumn(column)?.stats?.min
  }

  max(column: string | number) {
    return this.getColumn(column)?.stats?.max
  }

  sum(column: string | number) {
    return this.getColumn(column)?.stats?.sum
  }

  avg(column: string | number) {
    return this.getColumn(column)?.stats?.avg
  }

  calcColumnStats(columns: Array<string> = []) {
    if (columns.length <= 0) {
      columns = this._cols.map((c) => c.name)
    }
    function hasManualStats(column: Column) {
      if (column.stats && column.stats.manual && column.stats.manual === true) {
        return true
      }
      return false
    }
    const selected_cols = this._cols.filter(
      (c) => columns.includes(c.name) && c.type === ColumnType.Number && !hasManualStats(c)
    )
    selected_cols.forEach(
      (col) =>
        (col.stats = {
          min: Number.MAX_VALUE,
          max: Number.MIN_VALUE,
          sum: 0,
          avg: 0,
        })
    )
    for (let row of this._rows) {
      for (let col of selected_cols) {
        if (col && col.stats) {
          const val = row.get(col.name) as number
          if (val < col.stats.min) {
            col.stats.min = val
          }
          if (val > col.stats.max) {
            col.stats.max = val
          }
          col.stats.sum += val
        }
      }
    }
    for (let col of selected_cols) {
      if (col && col.stats) {
        col.stats.avg = col.stats.sum / this._rows.length
      }
    }
  }

  setColumnStats(column: string | number, stats: { min?: number; max?: number; avg?: number; sum?: number }) {
    const col = this.getColumn(column)
    if (col) {
      if (!col.stats) {
        col.stats = {
          min: Number.MAX_VALUE,
          max: Number.MIN_VALUE,
          sum: 0,
          avg: 0,
        }
      }
      if (stats.min !== undefined) {
        col.stats.min = stats.min
      }
      if (stats.max !== undefined) {
        col.stats.max = stats.max
      }
      if (stats.sum !== undefined) {
        col.stats.sum = stats.sum
      }
      if (stats.avg !== undefined) {
        col.stats.avg = stats.avg
      }
      col.stats.manual = true
    }
  }

  dropColumn(column: string | number) {
    const col = this.getColumn(column)
    if (col) {
      for (const row of this._rows) {
        row.delete(col.name)
      }
      const dropped_index = this._cols_map.get(col.name)
      if (dropped_index != undefined) {
        for (let [col_name, col_index] of this._cols_map) {
          if (col_index > dropped_index) {
            this._cols_map.set(col_name, col_index - 1)
          }
        }
      }
      this._cols_map.delete(col.name)
      this._cols = this._cols.filter((c) => c.name !== col.name)
      //console.log( column, this._cols )
    }
  }

  castColumn(column: string | number, type: ColumnType) {
    const col = this.getColumn(column)
    if (col) {
      col.type = type
      switch (type) {
        case ColumnType.String:
          for (let row of this._rows) {
            row.set(col.name, String(row.get(col.name)))
          }
          break
        case ColumnType.Number:
          for (let row of this._rows) {
            row.set(col.name, Number(row.get(col.name)))
          }
          this.calcColumnStats([col.name])
          break
        case ColumnType.Date:
          break
      }
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
      message.columns.map((x: ddc.VAColumn) => x.label)
    )

    message.columns.forEach((column: ddc.VAColumn) => {
      switch (column.type) {
        case 'number':
          data.castColumn(column.label, ColumnType.Number)
          break
        // case 'date':
        // case 'datetime':
        //     data = data.cast( column.label, ( val ) => Date.parse( val ) )
        //     break
      }
    })

    const stdFormats = parseVAFormats(message)
    for (let col in stdFormats) {
      data.setColumnFormat(col, stdFormats[col])
    }

    const cmpFormats = parseVAFormats(message, true)
    for (let col in cmpFormats) {
      data.setColumnFormat(col, cmpFormats[col], true)
    }

    return data
  }
}
