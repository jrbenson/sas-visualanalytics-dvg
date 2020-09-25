import * as parse from './parse'
import { Data } from './data'
import Dynamic from './dynamic'

/**
 * The dynamic text class replaces mustache style double brace tags with a value from the data.
 */
export default class DynamicText extends Dynamic {
  template: string | null

  constructor(element: Element) {
    super(element)
    this.template = this.element.textContent
  }

  static getDynamics(svg: Element, types = ['all']): Array<Dynamic> {
    let elems: Array<Element> = []
    svg.querySelectorAll('text').forEach(function (text) {
      if (text.children.length) {
        elems.push(...text.children)
      } else {
        elems.push(text)
      }
    })
    elems = elems.filter((e) => e.textContent && e.textContent.match(parse.RE_DOUBLEBRACE))
    return elems.map((e) => new DynamicText(e))
  }

  apply(data: Data) {
    if (this.template) {
      this.element.textContent = this.template.replace(
        parse.RE_DOUBLEBRACE,
        function (match: string) {
          const syntax = parse.syntax(match)
          const col_id = parse.columnIdentifier(syntax.name)
          let col
          if (col_id) {
            const [type, index] = col_id
            col = data.getColumn(index, type)
          } else {
            col = data.getColumn(syntax.name)
          }
          if (col) {
            if (syntax.opts.hasOwnProperty('name') && syntax.opts.name) {
              return col.name
            } else {
              if (syntax.opts.hasOwnProperty('c') && syntax.opts.c) {
                return data.getFormatted(0, col.name, true)
              } else {
                return data.getFormatted(0, col.name)
              }
            }
          } else {
            return '???'
          }
        }.bind({ data: data })
      )
    }
  }
}
