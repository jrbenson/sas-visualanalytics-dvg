import * as parse from './parse'
import { Data } from './data'
import Dynamic from './dynamic'
import DynamicSVG from './dynamic-svg'

/**
 * The dynamic text class replaces mustache style double brace tags with a value from the data.
 */
export default class DynamicText extends Dynamic {
  template: string | null

  constructor(element: Element) {
    super(element)
    this.template = this.element.textContent

    const svgElem = this.element as SVGGraphicsElement
    const bbox = svgElem.getBBox()
    let anchor = undefined
    let key = parse.firstObjectKey(this.opts, ['align', 'a'])
    if (key) {
      anchor = this.opts[key].toString()
    } else {
      const p = this.element.parentElement
      if (p) {
        const pOpts = parse.syntax(p.id)?.opts
        if (pOpts) {
          key = parse.firstObjectKey(pOpts, ['align', 'a'])
          if (key) {
            anchor = pOpts[key].toString()
          }
        }
      }
    }
    if (anchor !== undefined) {
      svgElem.setAttribute('text-anchor', anchor)
      switch (anchor) {
        case 'start':
          break
        case 'middle':
          svgElem.setAttribute('x', bbox.x + bbox.width / 2 + 'px')
          break
        case 'end':
          svgElem.setAttribute('x', bbox.x + bbox.width + 'px')
          break
      }
    }
  }

  static getDynamics(svg: Element): Array<Dynamic> {
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

  apply(data: Data, dynSVG: DynamicSVG) {
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
