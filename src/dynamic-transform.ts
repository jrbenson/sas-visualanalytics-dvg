import * as parse from './parse'
import { Data } from './data'
import Dynamic from './dynamic'
import DynamicSVG from './dynamic-svg'

interface Transform {
  keys: Array<string>
  get: (x: number, opts: Record<string, string | number | boolean>, guide?: Guide) => string
}

class Guide {
  element: SVGGraphicsElement
  tag: string
  linear: boolean
  constructor(element: SVGGraphicsElement) {
    this.element = element
    this.tag = this.element.tagName
    switch (this.tag) {
      case 'polyline':
      case 'path':
        this.linear = false
        break
      default:
        this.linear = true
    }
  }
  get(t: number) {
    switch (this.tag) {
      case 'polyline':
      case 'path':
      case 'line':
        const geom = this.element as SVGGeometryElement
        let cur_pos = geom.getPointAtLength(geom.getTotalLength() * t)
        let beg_pos = geom.getPointAtLength(0)
        return { x: cur_pos.x - beg_pos.x, y: cur_pos.y - beg_pos.y }
      default:
        const gbox = this.element.getBBox()
        return { x: gbox.width * t, y: gbox.height * t }
    }
    return { x: 0, y: 0 }
  }
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
        const key = parse.firstObjectKey(opts, ['rotateRatio', 'rr'])
        if (key) {
          limit = Number(opts[key])
        }
        return 'rotate(' + t * 360 * limit + 'deg)'
      },
    },
    {
      keys: ['position', 'p'],
      get: function (t, opts, guide?) {
        if (guide && guide.linear) {
          const coords = guide.get(t)
          return 'translate(' + coords.x + 'px,' + coords.y + 'px)'
        }
        return ''
      },
    },
    {
      keys: ['positionX', 'px'],
      get: function (t, opts, guide?) {
        if (guide && guide.linear) {
          const coords = guide.get(t)
          return 'translateX(' + coords.x + 'px)'
        }
        return ''
      },
    },
    {
      keys: ['positionY', 'py'],
      get: function (t, opts, guide?) {
        if (guide && guide.linear) {
          const coords = guide.get(t)
          return 'translateY(' + coords.y + 'px)'
        }
        return ''
      },
    },
  ]

  static getDynamics(svg: Element): Array<Dynamic> {
    const options = ([] as string[]).concat(...DynamicTransform.transforms.map((t) => t.keys))
    return parse.elementsWithOptions(svg, options).map((e) => new DynamicTransform(e))
  }

  bbox: { x: number; y: number; width: number; height: number }
  origin: { x: number; y: number }
  base_transforms: Array<string> = []
  guide: Guide | undefined = undefined
  nonlinear_pos_group: SVGGElement
  nonlinear_pos_ease: number = 0.0
  nonlinear_pos_beg_t: number = 0.0
  nonlinear_pos_cur_t: number = 0.0
  nonlinear_pos_end_t: number = 0.0
  nonlinear_pos_beg_time: number | undefined = undefined

  constructor(element: Element) {
    super(element)

    const svgElem = this.element as SVGGraphicsElement

    this.bbox = svgElem.getBBox()
    this.origin = this.getOrigin()
    this.base_transforms = this.getBaseTransforms()
    this.wrapWithGroup()
    this.nonlinear_pos_group = this.wrapWithGroup(false)

    svgElem.setAttribute('vector-effect', 'non-scaling-stroke')
    svgElem.style.transitionProperty = 'transform'
    svgElem.style.transitionDuration = '1s'
    svgElem.style.transitionTimingFunction = 'cubic-bezier(0.25, .1, 0.25, 1)'
    svgElem.style.transformOrigin = this.origin.x + 'px ' + this.origin.y + 'px'
  }

  getOrigin() {
    const svgElem = this.element as SVGGraphicsElement
    this.bbox = svgElem.getBBox()
    let origin_h = 0
    let origin_v = 0
    const key = parse.firstObjectKey(this.opts, ['origin', 'o'])
    if (key) {
      const origin_range = parse.range(this.opts[key]?.toString())
      if (origin_range[1] !== undefined) {
        origin_h = origin_range[0]
        origin_v = origin_range[1]
      } else if (origin_range[0] !== undefined) {
        origin_h = origin_v = origin_range[0]
      }
    }
    origin_h = this.bbox.x + this.bbox.width * origin_h
    origin_v = this.bbox.y + this.bbox.height * origin_v
    return { x: origin_h, y: origin_v }
  }

  wrapWithGroup(transferStyles: boolean = true) {
    const svgElem = this.element as SVGGraphicsElement
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgElem.insertAdjacentElement('afterend', group)
    group.append(svgElem)
    if (transferStyles) {
      if (svgElem.classList.length > 0) {
        group.classList.add(...svgElem.classList)
        svgElem.classList.remove(...svgElem.classList)
      }
      if (svgElem.style.cssText) {
        group.style.cssText = svgElem.style.cssText
        svgElem.style.cssText = ''
      }
      const cPath = svgElem.getAttribute('clip-path')
      if (cPath) {
        group.setAttribute('clip-path', cPath)
        svgElem.removeAttribute('clip-path')
      }
    }
    return group
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

  apply(data: Data, dynSVG: DynamicSVG) {
    const svgElem = this.element as SVGGraphicsElement

    const gkey = parse.firstObjectKey(this.opts, ['guide', 'g'])
    if (gkey && !this.guide) {
      this.guide = new Guide(dynSVG.refs.get(this.opts[gkey].toString()) as SVGGraphicsElement)
    }

    let transform_strs: Array<string> = []

    if (this.base_transforms.length > 0) {
      transform_strs.push('translate(' + -this.origin.x + 'px,' + -this.origin.y + 'px)')
      transform_strs.push(...this.base_transforms)
      transform_strs.push('translate(' + this.origin.x + 'px,' + this.origin.y + 'px)')
    }

    const pos_transforms = DynamicTransform.transforms.filter((t) => t.keys[0].startsWith('p'))
    const pos_keys = pos_transforms
      .map((t) => t.keys)
      .flat()
      .filter((k) => k.startsWith('p'))

    for (let transform of DynamicTransform.transforms) {
      const key = parse.firstObjectKey(this.opts, transform.keys)
      if (key) {
        const col_str = this.opts[key].toString()
        const col = parse.columnFromData(col_str, data)
        if (col?.stats) {
          const val = data.get(0, col.name) as number
          if (val !== undefined) {
            const norm = (val - col.stats.min) / (col.stats.max - col.stats.min)
            if (this.guide) {
              transform_strs.push(transform.get(norm, this.opts, this.guide))
            } else {
              transform_strs.push(transform.get(norm, this.opts))
            }
            if (pos_keys.includes(key) && this.guide && !this.guide.linear) {
              this.nonlinear_pos_beg_t = this.nonlinear_pos_cur_t
              this.nonlinear_pos_end_t = norm
              this.nonlinear_pos_beg_time = undefined
              requestAnimationFrame(this.animNonLinearPos)
            }
          }
        }
      }
    }

    svgElem.style.transform = transform_strs.join(' ')
  }

  animNonLinearPos = (time: number) => {
    if (this.nonlinear_pos_beg_time === undefined) {
      this.nonlinear_pos_beg_time = time
    }
    const elapsed = time - this.nonlinear_pos_beg_time
    const x = elapsed / 1000
    const r = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
    const t = this.nonlinear_pos_beg_t + r * (this.nonlinear_pos_end_t - this.nonlinear_pos_beg_t)
    this.nonlinear_pos_cur_t = t

    if (this.guide) {
      const coord = this.guide.get(t)
      this.nonlinear_pos_group.style.transform = 'translate(' + coord.x + 'px,' + coord.y + 'px)'
    }

    if (elapsed < 1000) {
      window.requestAnimationFrame(this.animNonLinearPos)
    }
  }
}
