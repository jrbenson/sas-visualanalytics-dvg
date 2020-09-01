import DataFrame = require( 'dataframe-js' )
import * as content from '../../sas-visualanalytics-thirdpartyvisualizations/src/util/content'
import * as messaging from '../../sas-visualanalytics-thirdpartyvisualizations/src/util/messaging'


// d8888b.  .d8b.  d8888b. .d8888. d888888b d8b   db  d888b 
// 88  `8D d8' `8b 88  `8D 88'  YP   `88'   888o  88 88' Y8b
// 88oodD' 88ooo88 88oobY' `8bo.      88    88V8o 88 88     
// 88~~~   88~~~88 88`8b     `Y8b.    88    88 V8o88 88  ooo
// 88      88   88 88 `88. db   8D   .88.   88  V888 88. ~8~
// 88      YP   YP 88   YD `8888Y' Y888888P VP   V8P  Y888P 


// ,---.                   
// |---',---.,---.,---..  ,
// |  \ |---'|   ||---' >< 
// `   ``---'`---|`---''  `
//         `---'         

const RE_DOUBLEBRACE = /{{([^}]+)}}/g
const RE_UNDERSCOREUNICODE = /_x([0-9A-Za-z]+)_/g
const RE_NOVALUEKEY = /(?:^|,)(\w+)(?:$|,)/g
const RE_NONJSONCHAR = /([^:,]+)/g
const RE_NUMBER = /[-+]?[0-9]*\.?[0-9]+/g



// interface VAMessage {
//     version: string,
//     resultName: string,
//     rowCount: number,
//     availableRowCount: number,
//     data: Array<[
       


// ,--.      |         
// |   |,---.|--- ,---.
// |   |,---||    ,---|
// `--' `---^`---'`---^

/**
 * Create a DataFrame instance from data in VA data message.
 *
 * @param {Object} message Message object from VA DDC data update.
 * @return {DataFrame} Data frame with proper type parsing applied.
 */
function parseData(message:any) {

    let data = new DataFrame(message.data, message.columns.map(function (x) { return x.label }))

    message.columns.forEach(column => {
        switch (column.type) {
            case 'number':
                data = data.cast(column.label, Number)
                break
            // case 'date':
            // case 'datetime':
            //     data = data.cast( column.label, ( val ) => Date.parse( val ) )
            //     break
        }
    })

    data.formats = {}
    data.formats.standard = parseFormats(message)
    data.formats.compact = parseFormats(message, true)

    // data.show( 20 )

    return data

}

const BASIC_FORMATS = {
    'DOLLAR': 'NLMNLUSD',
    'EURO': 'NLMNLEUR',
    'POUND': 'NLMNLGBP',
    'WON': 'NLMNLCNY',
    'YEN': 'NLMNLJPY',
}

/**
 * Pad a number into a string with leading zeros.
 *
 * @param {Number} number The number to convert to string and pad.
 * @param {Number} length The character lenght of the formatted string for the number.
 * @return {String} String with number in float format with padding front zeros.
 */
function zeroPad(number: number, length: number) {
    return Array(length + 1 - number.toString().length).join('0') + number
}

/**
 * Extracts the hours, minutes, and seconds from a duration in seconds.
 *
 * @param {Number} secs Number of seconds in the duration.
 * @return {Object} Object with durations in h, m, and s properties.
 */
function timeFromSeconds(secs:number) {
    secs = Math.round(secs)
    var hours = Math.floor(secs / (60 * 60))

    var divisor_for_minutes = secs % (60 * 60)
    var minutes = Math.floor(divisor_for_minutes / 60)

    var divisor_for_seconds = divisor_for_minutes % 60
    var seconds = Math.ceil(divisor_for_seconds)

    var obj = {
        h: hours,
        m: minutes,
        s: seconds
    }
    return obj
}

/**
 * Parse the format model from VA into an object with a format method.
 *
 * @param {Object} format Format from VA message.
 * @param {boolean} compact Controls whether format generates compacted output or not. 
 * @return {Object} Object with an appropriate format method.
 */
function parseFormat(column, compact = false) {

    const format = column.format

    if (column.type === 'number') {

        let format_opts: any = {
            maximumFractionDigits: format.precision,
            minimumFractionDigits: format.precision
        }
        if (compact) {
            format_opts.notation = 'compact'
            format_opts.maximumSignificantDigits = 3
        }

        for (let basic in BASIC_FORMATS) {
            if (format.name === basic) {
                format.name = BASIC_FORMATS[basic]
            }
        }

        if (format.name.startsWith('NLMNI')) {
            return {
                format: number => {
                    return format.name.replace('NLMNI', '') + (new Intl.NumberFormat(
                        navigator.language,
                        format_opts
                    )).format(number)
                }
            }
        } else if (format.name.startsWith('TIME')) {
            return {
                format: number => {
                    const parts = timeFromSeconds(number)
                    return ('' + parts.h).padStart(2, '0') + ':' + ('' + parts.m).padStart(2, '0') + ':' + ('' + parts.s).padStart(2, '0')
                }
            }
        } else if (format.name.startsWith('HOUR')) {
            return {
                format: number => {
                    const hours = Math.floor(number / (60 * 60))
                    return (new Intl.NumberFormat(
                        navigator.language
                    )).format(hours)
                }
            }
        } else if (format.name.startsWith('HHMM')) {
            return {
                format: number => {
                    const parts = timeFromSeconds(number)
                    return ('' + parts.h).padStart(2, '0') + ':' + ('' + parts.m).padStart(2, '0')
                }
            }
        } else if (format.name.startsWith('MMSS')) {
            return {
                format: number => {
                    const secs = Math.round(number)
                    const minutes = Math.floor(secs / 60)
                    const seconds = Math.ceil((secs % (60 * 60)) % 60)
                    return ('' + minutes).padStart(2, '0') + ':' + ('' + seconds).padStart(2, '0')
                }
            } 
        } else if (format.name.startsWith('NLMNL')) {
            format_opts.style = 'currency'
            format_opts.currency = format.name.replace('NLMNL', '')
        } else if (format.name.startsWith('PERCENT')) {
            format_opts.style = 'percent'
        } else if (format.name.startsWith('F')) {
            format_opts.useGrouping = false
        } else if (format.name.startsWith('BEST')) {
            delete format_opts.maximumFractionDigits
            format_opts.maximumSignificantDigits = format.width
            if (compact) {
                format_opts.maximumSignificantDigits = 3
            } 
        }
        return new Intl.NumberFormat(
            navigator.language,
            format_opts
        )
    } else if (column.type === 'date') {
        return {
            format: value => {
                return value
            }
        }
    }
    return { format: value => value }
}

/**
 * Parse the format models from VA into a list of objects with a format method.
 *
 * @param {Object} message Full message model from VA
 * @param {boolean} compact Controls whether format generates compacted output or not. 
 * @return {Object[]} List of objects with an appropriate format method.
 */
function parseFormats(message, compact = false) {
    let formats = {}
    message.columns.forEach(column => formats[column.label] = parseFormat(column, compact))
    return formats
}


// ,---..    ,,---.
// `---.|    ||  _.
//     | \  / |   |
// `---'  `'  `---'

/**
* Performs cleaning tasks on SVG to allow for better dynamic behavior.
*
* @param {Element} svg SVG element to perform cleaning on.
* @param {string[]} methods Values: all | text
*/
function cleanSVG(svg, methods = ['all']) {
    if (methods.includes('all') || methods.includes('text')) {
        svg.querySelectorAll('tspan').forEach(function (elem) {
            if (elem.parentElement.hasAttribute('x')) {
                elem.removeAttribute('x')
            }
            if (elem.parentElement.hasAttribute('y')) {
                elem.removeAttribute('y')
            }
        }) 
    }
}


// ,---.          |             
// `---.,   .,---.|--- ,---..  ,
//     ||   ||   ||    ,---| >< 
// `---'`---|`   '`---'`---^'  `
//     `---'                   

/**
* Converts unicode character back to orignal string.
*
* @param {string} text The text to decode.
*/
function decodeIllustrator(text) {
    return text.replace(
        RE_UNDERSCOREUNICODE,
        function (match, g1) {
            return String.fromCharCode(parseInt('0x' + g1))
        })
}

/**
* Encodes object literal into formal JSON syntax with quotes.
*
* @param {string} text The text to encode to proper JSON.
*/
function jsonEncodeLiteral(text) {
    return '{' + text.replace(
        RE_NOVALUEKEY,
        function (match, g1) {
            return match.replace(g1, g1 + ':true')
        }
    ).replace(
        RE_NONJSONCHAR,
        function (match, g1) {
            if (match !== 'true' && match !== 'false' && !RE_NUMBER.test(match)) {
                return '"' + match + '"'
            }
            return match
        }
    ) + '}'
}

/**
* Creates an object from a string in the format {{param|opt:val,opt:val}}.
*
* @param {string} text The text to decode.
*/
function parseSyntax(text) {
    let obj: { name: string, opts: any } = {
        name: '',
        opts: {}
    }

    text = decodeIllustrator(text)

    const matches = text.match(RE_DOUBLEBRACE)
    if (matches) {
        text = matches[0].slice(2, -2)
        if (text.includes('|')) {
            const name_opts = text.split('|')
            obj.name = name_opts[0]
            obj.opts = JSON.parse(jsonEncodeLiteral(name_opts[1]))
        } else if (text.includes(':')) {
            obj.opts = JSON.parse(jsonEncodeLiteral(text))
        } else {
            obj.name = text
        }
    }

    return obj
}




// db   db d88888b db      d8888b. d88888b d8888b. .d8888.
// 88   88 88'     88      88  `8D 88'     88  `8D 88'  YP
// 88ooo88 88ooooo 88      88oodD' 88ooooo 88oobY' `8bo.  
// 88~~~88 88~~~~~ 88      88~~~   88~~~~~ 88`8b     `Y8b.
// 88   88 88.     88booo. 88      88.     88 `88. db   8D
// YP   YP Y88888P Y88888P 88      Y88888P 88   YD `8888Y'

/**
* Test if page contained in an iFrame.
*
* @return {boolean} Indicator of iFrame containment.
*/
function inIframe() {
    try {
        return window.self !== window.top
    } catch (e) {
        return true
    }
}




// d8888b. db    db d8b   db  .d8b.  .88b  d88. d888888b  .o88b. .d8888.
// 88  `8D `8b  d8' 888o  88 d8' `8b 88'YbdP`88   `88'   d8P  Y8 88'  YP
// 88   88  `8bd8'  88V8o 88 88ooo88 88  88  88    88    8P      `8bo.  
// 88   88    88    88 V8o88 88~~~88 88  88  88    88    8b        `Y8b.
// 88  .8D    88    88  V888 88   88 88  88  88   .88.   Y8b  d8 db   8D
// Y8888D'    YP    VP   V8P YP   YP YP  YP  YP Y888888P  `Y88P' `8888Y'


/** 
* Base class for dynamics, which are called during update to apply data to the SVG.
*/
class Dynamic {

    element: SVGElement
    opts: any

    /**
    * Override with dynamic specific parsing and precomputation.
    * @param element The SVG element that the dynamic will act on.
    */
    constructor(element: SVGElement) {
        this.element = element
        this.opts = {}
    }

    /**
    * Override with static method for selecting viable elements for this dynamic from SVG.
    * @param svg {SVGElement} The root SVG element to start the search from.
    * @return Array of dynamics that match the desired pattern.
    */
    static getDynamics(svg, types = ['all']) {
        return []
    }

    /**
    * Override with static method for selecting viable elements for this dynamic from SVG.
    * @param {DataFrame} data The root SVG element to start the search from.
    */
    apply(data) {

    }
}

/**
* The dynamic text class replaces mustache style double brace tags with a value from the data.
*/
class DynamicText extends Dynamic {

    template: string

    constructor(element) {
        super(element)
        this.template = this.element.textContent
    }

    static getDynamics(svg, types = ['all']) {
        let elems = []
        svg.querySelectorAll('text').forEach(function (text) {
            if (text.children.length) {
                elems.push(...text.children)
            } else {
                elems.push(text)
            }
        })
        elems = elems.filter(e => e.textContent.match(RE_DOUBLEBRACE))
        return elems.map(e => new DynamicText(e))
    }

    apply(data) {
        this.element.textContent = this.template.replace(
            RE_DOUBLEBRACE,
            function (match, g1) {
                const syntax = parseSyntax(match)
                if (syntax.opts.hasOwnProperty('c') && syntax.opts.c) {
                    return getFormattedValue(data, 0, syntax.name, data.formats.compact)
                } else {
                    return getFormattedValue(data, 0, syntax.name, data.formats.standard)
                }
            }.bind({ data: data }))
    }
}

function getFormattedValue(data, row, column, formats) {
    const r = data.getRow(row)
    if (r !== undefined) {
        const val = r.get(column)
        if (val !== undefined) {
            if (formats[column]) {
                return formats[column].format(val)
            } else {
                return val
            }
        }
    }
    return '???'
}

/**
* The main class that controls the initialization and lifecycle of making the SVG
* dynamic and responding to message events from the VA Data-driven Content framework.
*/
class DynamicSVG extends Dynamic {

    message: any = {} // Data message to be received from VA
    resultName: string = '' // Result name required to send messages back to VA
    data: DataFrame = {} // DataFrame for data response
    dataFormats: any = {}
    dataFormatsCompact: any = {}

    initComplete: boolean = false // Flag to help delay update execution

    instanceSVG: string = '' // Repatable body of original SVG code
    dynamics: Dynamic[] = []

    /**
    * Attach to the indicate element DOM element and fill it with the target SVG. Also
    * perform all parsing and precomputation steps.
    * @param {Element} element The root DOM element to use for placement of SVG.
    */
    constructor(element) {

        super(element)

        this.opts = {
            svg: 'test.svg',
            clean: 'all',
            dynamics: 'all'
        } // Object to old options and define defaults

        this.init()
    }

    /**
     * Handle initialiation of page based on URL options.
     */
    init() {

        this.opts = { ...this.opts, ...messaging.getUrlParams() }

        fetch(this.opts.svg, { method: 'GET' })
            .then(response => response.text())
            .then(text => {
                this.element.innerHTML = text
                const svg = this.element.querySelector('svg')
                if (svg) {
                    cleanSVG(svg, this.opts.clean.split(','))

                    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
                    group.classList.add('__instance__')
                    group.id = '__instance_0001__'
                    group.append(...[...svg.children].filter(e => e.tagName !== 'style'))

                    svg.append(group)

                    this.dynamics = DynamicSVG.getDynamics(group)
                    this.instanceSVG = group.innerHTML
                }
                this.initComplete = true
            })
            .catch(error => console.error('Error: ', error))

        messaging.setOnDataReceivedCallback(this.onDataReceived.bind(this))
        content.setupResizeListener(this.draw.bind(this))

    }

    /**
     * Performs cleaning tasks on SVG to allow for better dynamic behavior.
     * @param {Element} svg SVG element to perform cleaning on.
     * @param {string[]=} types Values: all | text
     */
    static getDynamics(svg, types = ['all']) {
        let dynamics = []
        if (types.includes('all') || types.includes('text')) {
            dynamics.push(...DynamicText.getDynamics(svg))
        }
        return dynamics
    }

    /**
     * Applies the current _data to all dynamics.
     */
    apply() {
        if (!this.initComplete) {
            window.setTimeout(this.apply.bind(this), 100)
        } else {
            this.dynamics.forEach(d => d.apply(this.data))//, this.dataFormats, this.dataFormatsCompact ) )
        }
    }

    /**
     * Handle resize events or other layout changes.
     */
    draw() {
        return
    }

    /**
     * Callback to handle data update from VA DDC.
     * @param {Object} messageFromVA Message object from VA DDC data update.
     */
    onDataReceived(messageFromVA) {

        this.message = messageFromVA
        this.resultName = this.message.resultName
        this.data = parseData(this.message)
        //this.dataFormats = parseFormats( this.message )
        //this.dataFormatsCompact = parseFormats( this.message, true )

        this.apply()

    }

}



// d888888b d8b   db d888888b d888888b d888888b  .d8b.  db      d888888b d88888D d88888b
//   `88'   888o  88   `88'   `~~88~~'   `88'   d8' `8b 88        `88'   YP  d8' 88'    
//    88    88V8o 88    88       88       88    88ooo88 88         88       d8'  88ooooo
//    88    88 V8o88    88       88       88    88~~~88 88         88      d8'   88~~~~~
//   .88.   88  V888   .88.      88      .88.   88   88 88booo.   .88.    d8' db 88.    
// Y888888P VP   V8P Y888888P    YP    Y888888P YP   YP Y88888P Y888888P d88888P Y88888P

/**
 * DOM loaded callback to kick off initialization and callback registration.
 */
document.addEventListener("DOMContentLoaded", function () {

    let dynSVG = new DynamicSVG(document.body)

    // If run outside of VA assume in a testing scenario
    if (!inIframe()) {
        dynSVG.onDataReceived(SAMPLE_MESSAGE)
    }

})



// d888888b d88888b .d8888. d888888b d888888b d8b   db  d888b 
// `~~88~~' 88'     88'  YP `~~88~~'   `88'   888o  88 88' Y8b
//    88    88ooooo `8bo.      88       88    88V8o 88 88     
//    88    88~~~~~   `Y8b.    88       88    88 V8o88 88  ooo
//    88    88.     db   8D    88      .88.   88  V888 88. ~8~
//    YP    Y88888P `8888Y'    YP    Y888888P VP   V8P  Y888P 

const SAMPLE_SVG = `
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

const SAMPLE_MESSAGE = {
    version: "1",
    resultName: "result",
    rowCount: 19,
    availableRowCount: 19,
    data: [
        ["Technology", 180435, 54400, 834],
        ["Engineering", 80867, 12300, 432],
        ["Sales", 50000, 65004, 344],
        ["Operations", 60714, 48200, 543]
    ],
    columns: [
        {
            name: "bi76",
            label: "Department",
            type: "string"
        },
        {
            name: "bi77",
            label: "Revenue",
            type: "number",
            usage: "quantitative",
            aggregation: "totalCount",
            format: {
                name: "COMMA",
                width: 12,
                precision: 0,
                formatString: "COMMA12."
            }
        },
        {
            name: "bi78",
            label: "Expenses",
            type: "number",
            usage: "quantitative",
            aggregation: "totalCount",
            format: {
                name: "COMMA",
                width: 12,
                precision: 0,
                formatString: "COMMA12."
            }
        },
        {
            name: "bi79",
            label: "Employees",
            type: "number",
            usage: "quantitative",
            aggregation: "totalCount",
            format: {
                name: "COMMA",
                width: 12,
                precision: 0,
                formatString: "COMMA12."
            }
        }
    ]
}