import * as ddc from 'sas-va-ddc'
import * as util from './util'
import * as parse from './parse'
import { Data } from './data'

/**
 * Base class for dynamics, which are called during update to apply data to the SVG.
 */
class Dynamic {
  element: Element
  opts: any

  /**
   * Override with dynamic specific parsing and precomputation.
   * @param element The SVG element that the dynamic will act on.
   */
  constructor(element: Element) {
    this.element = element
    this.opts = {}
  }

  /**
   * Override with static method for selecting viable elements for this dynamic from SVG.
   * @param svg {SVGElement} The root SVG element to start the search from.
   * @return Array of dynamics that match the desired pattern.
   */
  static getDynamics(svg: Element, types = ['all']): Array<Dynamic> {
    return []
  }

  /**
   * Override with static method for selecting viable elements for this dynamic from SVG.
   * @param {DataFrame} data The root SVG element to start the search from.
   */
  apply(data: Data) {}
}

/**
 * The dynamic text class replaces mustache style double brace tags with a value from the data.
 */
class DynamicText extends Dynamic {
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
          const syntax = parse.parseSyntax(match)
          if (syntax.opts.hasOwnProperty('c') && syntax.opts.c) {
            return data.get( 0, syntax.name, true)
          } else {
            return data.get( 0, syntax.name)
          }
        }.bind({ data: data })
      )
    }
  }
}

/**
 * The main class that controls the initialization and lifecycle of making the SVG
 * dynamic and responding to message events from the VA Data-driven Content framework.
 */
export class DynamicSVG extends Dynamic {
  message: ddc.VAMessage = { resultName: '', version: '', rowCount: 0, availableRowCount: 0, data: [], columns: [] } // Data message to be received from VA
  resultName: string = '' // Result name required to send messages back to VA
  data: Data = new Data([], []) // DataFrame for data response

  initComplete: boolean = false // Flag to help delay update execution

  instanceSVG: string = '' // Repatable body of original SVG code
  dynamics: Dynamic[] = []

  /**
   * Attach to the indicate element DOM element and fill it with the target SVG. Also
   * perform all parsing and precomputation steps.
   * @param {Element} element The root DOM element to use for placement of SVG.
   */
  constructor(element: Element) {
    super(element)

    this.opts = {
      svg: 'test.svg',
      clean: 'all',
      dynamics: 'all',
    } // Object to old options and define defaults

    this.init()
  }

  /**
   * Handle initialiation of page based on URL options.
   */
  init() {
    this.opts = { ...this.opts, ...ddc.getUrlParams() }

    fetch(this.opts.svg, { method: 'GET' })
      .then((response) => response.text())
      .then((text) => {
        this.element.innerHTML = text
        const svg = this.element.querySelector('svg')
        if (svg) {
          util.cleanSVG(svg, this.opts.clean.split(','))

          const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
          group.classList.add('__instance__')
          group.id = '__instance_0001__'
          group.append(...[...svg.children].filter((e) => e.tagName !== 'style'))

          svg.append(group)

          this.dynamics = DynamicSVG.getDynamics(group)
          this.instanceSVG = group.innerHTML
        }
        this.initComplete = true
      })
      .catch((error) => console.error('Error: ', error))

    ddc.setOnDataReceivedCallback(this.onDataReceived.bind(this))
    ddc.setupResizeListener(this.draw.bind(this))
  }

  /**
   * Performs cleaning tasks on SVG to allow for better dynamic behavior.
   * @param {Element} svg SVG element to perform cleaning on.
   * @param {string[]=} types Values: all | text
   */
  static getDynamics(svg: Element, types: string[] | undefined = ['all']): Array<Dynamic> {
    let dynamics: Array<Dynamic> = []
    if (types.includes('all') || types.includes('text')) {
      dynamics.push(...DynamicText.getDynamics(svg))
    }
    return dynamics
  }

  /**
   * Applies the current _data to all dynamics.
   */
  apply(): void {
    if (!this.initComplete) {
      window.setTimeout(this.apply.bind(this), 100)
    } else {
      this.dynamics.forEach((d) => d.apply(this.data)) //, this.dataFormats, this.dataFormatsCompact ) )
    }
  }

  /**
   * Handle resize events or other layout changes.
   */
  draw(): void {
    return
  }

  /**
   * Callback to handle data update from VA DDC.
   * @param {Object} messageFromVA Message object from VA DDC data update.
   */
  onDataReceived(messageFromVA: ddc.VAMessage): void {
    this.message = messageFromVA
    this.resultName = this.message.resultName
    this.data = Data.fromVA(this.message)
    //this.dataFormats = parseFormats( this.message )
    //this.dataFormatsCompact = parseFormats( this.message, true )

    this.apply()
  }
}
