import * as ddc from 'sas-va-ddc'
import Dynamic from './dynamic'
import DynamicText from './dynamic-text'
import DynamicTransform from './dynamic-transform'
import { Data } from './data'
import * as util from './util'
import * as parse from './parse'

/**
 * The main class that controls the initialization and lifecycle of making the SVG
 * dynamic and responding to message events from the VA Data-driven Content framework.
 */
export default class DynamicSVG extends Dynamic {
  message: ddc.VAMessage = { resultName: '', version: '', rowCount: 0, availableRowCount: 0, data: [], columns: [] } // Data message to be received from VA
  resultName: string = '' // Result name required to send messages back to VA
  data: Data = new Data([], []) // DataFrame for data response

  initComplete: boolean = false // Flag to help delay update execution

  instanceSVG: string = '' // Repatable body of original SVG code
  dynamics: Dynamic[] = []

  /**
   * Attach to the indicate element DOM element and fill it with the target SVG. Also
   * perform all parsing and precomputation steps.
   * @param element The root DOM element to use for placement of SVG.
   */
  constructor(element: Element) {
    super(element)

    this.opts = {
      svg: 'test.svg',
      clean: 'all',
      dynamics: 'all',
    }

    this.init()
  }

  /**
   * Handle initialiation of page based on URL options.
   */
  init() {
    this.opts = { ...this.opts, ...ddc.getUrlParams() }

    fetch(this.opts.svg.toString(), { method: 'GET' })
      .then((response) => response.text())
      .then((text) => {
        this.element.innerHTML = text
        const svg = this.element.querySelector('svg')
        if (svg) {
          util.cleanSVG(svg, this.opts.clean.toString().split(','))

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
   * @param svg SVG element to perform cleaning on.
   * @param types Values: all | text
   */
  static getDynamics(svg: Element, types: string[] | undefined = ['all']): Array<Dynamic> {
    let dynamics: Array<Dynamic> = []
    if (types.includes('all') || types.includes('text')) {
      dynamics.push(...DynamicText.getDynamics(svg))
    }
    if (types.includes('all') || types.includes('shapes')) {
      dynamics.push(...DynamicTransform.getDynamics(svg))
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
   * @param message Message object from VA DDC data update.
   */
  onDataReceived(message: ddc.VAMessage): void {
    //console.log(JSON.stringify(message))
    this.message = message
    this.resultName = this.message.resultName
    this.data = Data.fromVA(this.message)

    this.data = parse.dataStats( this.data )

    this.apply()

  }
}
