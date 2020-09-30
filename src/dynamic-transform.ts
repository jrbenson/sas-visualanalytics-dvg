import * as parse from './parse'
import { Data } from './data'
import Dynamic from './dynamic'

interface Transform {
  keys: Array<string>
  get: (x: number, opts: Record<string, string | number | boolean>, guide?: SVGGraphicsElement) => string
}

/**
 * The dynamic text class replaces mustache style double brace tags with a value from the data.
 */
export default class DynamicTransform extends Dynamic {
  static transforms: Array<Transform> = [
    {
      keys: ['scale', 's'],
      get: function (t, opts, guide?) {
        return 'scale(' + t + ',' + t + ')'
      },
    },
    {
      keys: ['scaleX', 'sx'],
      get: function (t, opts, guide?) {
        return 'scaleX(' + t + ')'
      },
    },
    {
      keys: ['scaleY', 'sy'],
      get: function (t, opts, guide?) {
        return 'scaleY(' + t + ')'
      },
    },
    {
      keys: ['rotate', 'r'],
      get: function (t, opts, guide?) {
        let limit = 1.0
        const key = parse.firstObjectKey(opts, ['rotateLimit', 'rl'])
        if (key) {
          limit = Number(opts[key])
        }
        return 'rotate(' + t * 360 * limit + 'deg)'
      },
    },
    {
      keys: ['postion', 'p'],
      get: function (t, opts, guide?) {
        console.log( guide )
        return 'translate(' + t + 'px,' + t + 'px)'
      },
    },
    {
      keys: ['positionX', 'px'],
      get: function (t, opts, guide?) {
        return 'translateX(' + t + 'px)'
      },
    },
    {
      keys: ['positionY', 'py'],
      get: function (t, opts, guide?) {
        return 'translateY(' + t + 'px)'
      },
    },
  ]

  static getDynamics(svg: Element, types = ['all']): Array<Dynamic> {
    const options = ([] as string[]).concat(...DynamicTransform.transforms.map((t) => t.keys))
    return parse.elementsWithOptions(svg, options).map((e) => new DynamicTransform(e))
  }

  bbox: { x: number; y: number; width: number; height: number }
  origin: { x: number; y: number }
  base_transforms: Array<string> = []
  named_elems: Map<string,Element>

  constructor(element: Element) {
    super(element)

    const svgElem = this.element as SVGGraphicsElement

    this.bbox = svgElem.getBBox()
    this.origin = this.getOrigin()
    this.base_transforms = this.getBaseTransforms()
    this.wrapWithGroup()

    svgElem.setAttribute('vector-effect', 'non-scaling-stroke')
    svgElem.style.transitionProperty = 'transform'
    svgElem.style.transitionDuration = '1s'
    svgElem.style.transformOrigin = this.origin.x + 'px ' + this.origin.y + 'px'

    this.named_elems = parse.elementsByName(element)
  }

  getOrigin() {
    const svgElem = this.element as SVGGraphicsElement
    this.bbox = svgElem.getBBox()
    let origin_h = 0
    let origin_v = 0
    const key = parse.firstObjectKey(this.opts, ['origin', 'o'])
    if (key) {
      const origin_opts = this.opts[key]?.toString().split('-')
      if (origin_opts) {
        if (origin_opts.length > 1) {
          origin_h = Number(origin_opts[0])
          origin_v = Number(origin_opts[1])
        } else {
          origin_h = origin_v = Number(origin_opts[0])
        }
      }
    }
    origin_h = this.bbox.x + this.bbox.width * origin_h
    origin_v = this.bbox.y + this.bbox.height * origin_v
    return { x: origin_h, y: origin_v }
  }

  wrapWithGroup() {
    const svgElem = this.element as SVGGraphicsElement
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgElem.insertAdjacentElement('afterend', group)
    group.append(svgElem)
    group.classList.add(...svgElem.classList)
    svgElem.classList.remove(...svgElem.classList)
    group.style.cssText = svgElem.style.cssText
    svgElem.style.cssText = ''
    const cPath = svgElem.getAttribute('clip-path')
    if (cPath) {
      group.setAttribute('clip-path', cPath)
      svgElem.removeAttribute('clip-path')
    }
  }

  getBaseTransforms() {
    let base_transforms = []
    const svgElem = this.element as SVGGraphicsElement
    if (svgElem.transform.baseVal.numberOfItems > 0) {
      for (let i = 0; i < svgElem.transform.baseVal.numberOfItems; i += 1) {
        const transform = svgElem.transform.baseVal.getItem(i)
        base_transforms.push(
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
    return base_transforms
  }

  apply(data: Data) {
    const svgElem = this.element as SVGGraphicsElement

    let transform_strs: Array<string> = []

    if (this.base_transforms.length > 0) {
      transform_strs.push('translate(' + -this.origin.x + 'px,' + -this.origin.y + 'px)')
      transform_strs.push(...this.base_transforms)
      transform_strs.push('translate(' + this.origin.x + 'px,' + this.origin.y + 'px)')
    }

    for (let transform of DynamicTransform.transforms) {
      const key = parse.firstObjectKey(this.opts, transform.keys)
      if (key) {
        const col_str = this.opts[key].toString()
        const col = parse.columnFromData(col_str, data)
        if (col?.stats) {
          const val = data.get(0, col.name) as number
          if (val) {
            const norm = (val - col.stats.min) / (col.stats.max - col.stats.min)
            const gkey = parse.firstObjectKey(this.opts, ['guide', 'g'])
            let guide = undefined
            if ( gkey ) {
              guide = this.named_elems.get( this.opts[gkey].toString() ) as SVGGraphicsElement
            }
            if ( guide ) {
              transform_strs.push(transform.get(norm, this.opts, guide))
            } else {
              transform_strs.push(transform.get(norm, this.opts))
            }
          }
        }
      }
    }

    svgElem.style.transform = transform_strs.join(' ')
  }
}
