import * as parse from './parse'
import { Data } from './data'

/**
 * Base class for dynamics, which are called during update to apply data to the SVG.
 */
export default class Dynamic {
  element: Element
  opts: Record<string, string | number | boolean>

  /**
   * Override with dynamic specific parsing and precomputation.
   * @param element The SVG element that the dynamic will act on.
   */
  constructor(element: Element) {
    this.element = element
    this.opts = parse.syntax(element.id).opts
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





