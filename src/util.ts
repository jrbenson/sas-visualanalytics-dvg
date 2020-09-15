/**
 * Test if page contained in an iFrame.
 *
 * @return Indicator of iFrame containment.
 */
export function inIframe(): boolean {
  try {
    return window.self !== window.top
  } catch (e) {
    return true
  }
}

/**
 * Performs cleaning tasks on SVG to allow for better dynamic behavior.
 *
 * @param {Element} svg SVG element to perform cleaning on.
 * @param {string[]} methods Values: all | text
 */
export function cleanSVG(svg: Element, methods: string[] = ['all']) {
    if (methods.includes('all') || methods.includes('text')) {
      svg.querySelectorAll('tspan').forEach(function (elem) {
        if (elem.parentElement && elem.parentElement.hasAttribute('x')) {
          elem.removeAttribute('x')
        }
        if (elem.parentElement && elem.parentElement.hasAttribute('y')) {
          elem.removeAttribute('y')
        }
      })
    }
  }


export const SAMPLE_SVG = `
<?xml version="1.0" encoding="UTF-8"?>
<svg width="300px" height="240px" viewBox="0 0 200 240" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="test2" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <text id="{{color:Revenue}}" font-family="sans-serif" font-size="16" font-weight="normal" fill="#323130">
            <tspan x="24" y="44">Revenue: {{Revenue}}</tspan>
            <tspan x="24" y="65">Expenses: {{Expenses}}</tspan>
        </text>
        <rect id="Rectangle-{{color:Expenses,scale:#2}}" fill="#76A5F5" x="24" y="91" width="160" height="161"></rect>
    </g>
</svg>
`


export const SAMPLE_MESSAGE = {
  version: '1',
  resultName: 'result',
  rowCount: 19,
  availableRowCount: 19,
  data: [
    ['Technology', 180435, 54400, 834],
    ['Engineering', 80867, 12300, 432],
    ['Sales', 50000, 65004, 344],
    ['Operations', 60714, 48200, 543],
  ],
  columns: [
    {
      name: 'bi76',
      label: 'Department',
      type: 'string',
    },
    {
      name: 'bi77',
      label: 'Revenue',
      type: 'number',
      usage: 'quantitative',
      aggregation: 'totalCount',
      format: {
        name: 'COMMA',
        width: 12,
        precision: 0,
        formatString: 'COMMA12.',
      },
    },
    {
      name: 'bi78',
      label: 'Expenses',
      type: 'number',
      usage: 'quantitative',
      aggregation: 'totalCount',
      format: {
        name: 'COMMA',
        width: 12,
        precision: 0,
        formatString: 'COMMA12.',
      },
    },
    {
      name: 'bi79',
      label: 'Employees',
      type: 'number',
      usage: 'quantitative',
      aggregation: 'totalCount',
      format: {
        name: 'COMMA',
        width: 12,
        precision: 0,
        formatString: 'COMMA12.',
      },
    },
  ],
}

