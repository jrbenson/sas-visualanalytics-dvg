import * as parse from './parse'
import * as svg from './svg'
import { Data } from './data'
import Easer from './easer'
import Dynamic from './dynamic'
import DynamicSVG from './dynamic-svg'

interface Style {
  keys: Array<string>
  set: (e: SVGGraphicsElement, t: number, dynStyle: DynamicStyle) => void
}

export default class DynamicStyle extends Dynamic {
  static styles: Array<Style> = [
    {
      keys: ['fill', 'f'],
      set: function (e, t, dynStyle) {
        e.style.fill = '#ff0000'
      },
    },
    {
      keys: ['line', 'l'],
      set: function (e, t, dynStyle) {
        e.style.stroke = '#ff0000'
      },
    },
    {
      keys: ['alpha', 'a'],
      set: function (e, t, dynStyle) {
        e.style.opacity = (dynStyle.baseAlpha * t).toString()
      },
    },
  ]

  static getDynamics(svg: Element): Array<Dynamic> {
    const options = ([] as string[]).concat(...DynamicStyle.styles.map((s) => s.keys))
    return parse.elementsWithOptions(svg, options).map((e) => new DynamicStyle(e))
  }

  baseAlpha: number = 1.0
  // baseFill: string
  // baseStroke: string

  constructor(element: Element) {
    super(element)

    const svgElem = this.element as SVGGraphicsElement

    let transProps = svgElem.style.transitionProperty.split(',')
    transProps.push('fill')
    transProps.push('stroke')
    transProps.push('opacity')
    console.log( transProps )
    svgElem.style.transitionProperty = transProps.join(',')
    svgElem.style.transitionDuration = '1s'

    this.setBaseStyles()
  }

  setBaseStyles() {
    const svgElem = this.element as SVGGraphicsElement
    if ( svgElem.hasAttribute('opacity') ) {
      this.baseAlpha = Number( svgElem.getAttribute('opacity') )
    }
  }

  apply(data: Data, dynSVG: DynamicSVG) {
    const svgElem = this.element as SVGGraphicsElement
    for (let style of DynamicStyle.styles) {
      const key = parse.firstObjectKey(this.opts, style.keys)
      if (key) {
        const col_str = this.opts[key].toString()
        const col = parse.columnFromData(col_str, data)
        if (col?.stats) {
          const val = data.get(0, col.name) as number
          if (val !== undefined) {
            const norm = (val - col.stats.min) / (col.stats.max - col.stats.min)
            style.set(svgElem, norm, this)
          }
        }
      }
    }
  }
}
