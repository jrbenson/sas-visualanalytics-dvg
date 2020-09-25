import DynamicSVG from './dynamic-svg'
import * as util from './util'

/**
 * DOM loaded callback to kick off initialization and callback registration.
 */
document.addEventListener('DOMContentLoaded', function () {
  let dynSVG = new DynamicSVG(document.body)

  // If run outside of VA assume in a testing scenario
  if (!util.inIframe()) {
    dynSVG.onDataReceived(util.SAMPLE_MESSAGE_2)
  }
})