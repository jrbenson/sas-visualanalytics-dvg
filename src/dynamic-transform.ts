import * as parse from './parse'
import { Data } from './data'
import Dynamic from './dynamic'

interface Transform {
  name: string
  short: string
  get: (x: number, opts: Record<string, string | number | boolean>, guide?: SVGGraphicsElement) => string
}

/**
 * The dynamic text class replaces mustache style double brace tags with a value from the data.
 */
export default class DynamicTransform extends Dynamic {
  orig_bbox: DOMRect
  origin_h = 0
  origin_v = 0

  static transforms: Array<Transform> = [
    {
      name: 'scale',
      short: 's',
      get: function (t, opts) {
        return 'scale(' + t + ',' + t + ')'
      },
    },
    {
      name: 'scaleX',
      short: 'sx',
      get: function (t, opts) {
        return 'scaleX(' + t + ')'
      },
    },
    {
      name: 'scaleY',
      short: 'sy',
      get: function (t, opts) {
        return 'scaleY(' + t + ')'
      },
    },
    {
      name: 'rotate',
      short: 'r',
      get: function (t, opts) {
        return 'rotate(' + t * 360 + 'deg)'
      },
    },
  ]

  constructor(element: Element) {
    super(element)

    this.orig_bbox = (this.element as SVGGraphicsElement).getBBox()
    this.prepElement()
  }

  static getDynamics(svg: Element, types = ['all']): Array<Dynamic> {
    return Array.from(svg.querySelectorAll('g,rect,circle,line,polygon'))
      .filter((e) => e.id?.match(parse.RE_DOUBLEBRACE))
      .map((e) => new DynamicTransform(e))
  }

  private prepElement() {
    const svgElem = this.element as SVGGraphicsElement
    this.orig_bbox = svgElem.getBBox()
    svgElem.style.transitionProperty = 'transform, fill, color'
    svgElem.style.transitionDuration = '1s'
    let origin_h = 0
    let origin_v = 0
    const origin_opts = this.opts['origin']?.toString().split('-')
    if (origin_opts) {
      if (origin_opts.length > 1) {
        origin_h = Number(origin_opts[0])
        origin_v = Number(origin_opts[1])
      } else {
        origin_h = origin_v = Number(origin_opts[0])
      }
    } else {
      //console.log(svgElem.id)
    }
    this.origin_h = this.orig_bbox.x + this.orig_bbox.width * origin_h
    this.origin_v = this.orig_bbox.y + this.orig_bbox.height * origin_v
    svgElem.style.transformOrigin = this.origin_h + 'px ' + this.origin_v + 'px'
  }

  apply(data: Data) {
    const svgElem = this.element as SVGGraphicsElement

    let transform_strs: Array<string> = []

    transform_strs.push('translate(' + -this.origin_h + 'px,' + -this.origin_v + 'px)')

    if (svgElem.transform.baseVal.numberOfItems > 0) {
      for (let i = 0; i < svgElem.transform.baseVal.numberOfItems; i += 1) {
        const transform = svgElem.transform.baseVal.getItem(i)
        transform_strs.push(
          'matrix(' +
            transform.matrix.a +
            ',' +
            transform.matrix.b +
            ',' +
            transform.matrix.c +
            ',' +
            transform.matrix.d +
            ',' +
            transform.matrix.e +
            ',' +
            transform.matrix.f +
            ')'
        )
      }
    }

    transform_strs.push('translate(' + this.origin_h + 'px,' + this.origin_v + 'px)')

    for (let transform of DynamicTransform.transforms) {
      let key
      if (this.opts.hasOwnProperty(transform.name)) {
        key = transform.name
      } else if (this.opts.hasOwnProperty(transform.short)) {
        key = transform.short
      }
      if (key) {
        const col_str = this.opts[key].toString()
        const col = parse.columnFromData(col_str, data)
        if (col?.stats) {
          const val = data.get(0, col.name) as number
          if (val) {
            const norm = (val - col.stats.min) / (col.stats.max - col.stats.min)
            transform_strs.push(transform.get(norm, this.opts))
          }
        }
      }
    }

    svgElem.style.transform = transform_strs.join(' ')
  }
}
