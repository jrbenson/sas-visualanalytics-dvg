System.register("dynsvg", ["dataframe-js", "../../sas-visualanalytics-thirdpartyvisualizations/src/util/content", "../../sas-visualanalytics-thirdpartyvisualizations/src/util/messaging"], function (exports_1, context_1) {
    "use strict";
    var DataFrame, content, messaging, RE_DOUBLEBRACE, RE_UNDERSCOREUNICODE, RE_NOVALUEKEY, RE_NONJSONCHAR, RE_NUMBER, BASIC_FORMATS, Dynamic, DynamicText, DynamicSVG, SAMPLE_SVG, SAMPLE_MESSAGE;
    var __moduleName = context_1 && context_1.id;
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
    function parseData(message) {
        let data = new DataFrame(message.data, message.columns.map(function (x) { return x.label; }));
        message.columns.forEach(column => {
            switch (column.type) {
                case 'number':
                    data = data.cast(column.label, Number);
                    break;
                // case 'date':
                // case 'datetime':
                //     data = data.cast( column.label, ( val ) => Date.parse( val ) )
                //     break
            }
        });
        data.formats = {};
        data.formats.standard = parseFormats(message);
        data.formats.compact = parseFormats(message, true);
        // data.show( 20 )
        return data;
    }
    /**
     * Pad a number into a string with leading zeros.
     *
     * @param {Number} number The number to convert to string and pad.
     * @param {Number} length The character lenght of the formatted string for the number.
     * @return {String} String with number in float format with padding front zeros.
     */
    function zeroPad(number, length) {
        return Array(length + 1 - number.toString().length).join('0') + number;
    }
    /**
     * Extracts the hours, minutes, and seconds from a duration in seconds.
     *
     * @param {Number} secs Number of seconds in the duration.
     * @return {Object} Object with durations in h, m, and s properties.
     */
    function timeFromSeconds(secs) {
        secs = Math.round(secs);
        var hours = Math.floor(secs / (60 * 60));
        var divisor_for_minutes = secs % (60 * 60);
        var minutes = Math.floor(divisor_for_minutes / 60);
        var divisor_for_seconds = divisor_for_minutes % 60;
        var seconds = Math.ceil(divisor_for_seconds);
        var obj = {
            h: hours,
            m: minutes,
            s: seconds
        };
        return obj;
    }
    /**
     * Parse the format model from VA into an object with a format method.
     *
     * @param {Object} format Format from VA message.
     * @param {boolean} compact Controls whether format generates compacted output or not.
     * @return {Object} Object with an appropriate format method.
     */
    function parseFormat(column, compact = false) {
        const format = column.format;
        if (column.type === 'number') {
            let format_opts = {
                maximumFractionDigits: format.precision,
                minimumFractionDigits: format.precision
            };
            if (compact) {
                format_opts.notation = 'compact';
                format_opts.maximumSignificantDigits = 3;
            }
            for (let basic in BASIC_FORMATS) {
                if (format.name === basic) {
                    format.name = BASIC_FORMATS[basic];
                }
            }
            if (format.name.startsWith('NLMNI')) {
                return {
                    format: number => {
                        return format.name.replace('NLMNI', '') + (new Intl.NumberFormat(navigator.language, format_opts)).format(number);
                    }
                };
            }
            else if (format.name.startsWith('TIME')) {
                return {
                    format: number => {
                        const parts = timeFromSeconds(number);
                        return ('' + parts.h).padStart(2, '0') + ':' + ('' + parts.m).padStart(2, '0') + ':' + ('' + parts.s).padStart(2, '0');
                    }
                };
            }
            else if (format.name.startsWith('HOUR')) {
                return {
                    format: number => {
                        const hours = Math.floor(number / (60 * 60));
                        return (new Intl.NumberFormat(navigator.language)).format(hours);
                    }
                };
            }
            else if (format.name.startsWith('HHMM')) {
                return {
                    format: number => {
                        const parts = timeFromSeconds(number);
                        return ('' + parts.h).padStart(2, '0') + ':' + ('' + parts.m).padStart(2, '0');
                    }
                };
            }
            else if (format.name.startsWith('MMSS')) {
                return {
                    format: number => {
                        const secs = Math.round(number);
                        const minutes = Math.floor(secs / 60);
                        const seconds = Math.ceil((secs % (60 * 60)) % 60);
                        return ('' + minutes).padStart(2, '0') + ':' + ('' + seconds).padStart(2, '0');
                    }
                };
            }
            else if (format.name.startsWith('NLMNL')) {
                format_opts.style = 'currency';
                format_opts.currency = format.name.replace('NLMNL', '');
            }
            else if (format.name.startsWith('PERCENT')) {
                format_opts.style = 'percent';
            }
            else if (format.name.startsWith('F')) {
                format_opts.useGrouping = false;
            }
            else if (format.name.startsWith('BEST')) {
                delete format_opts.maximumFractionDigits;
                format_opts.maximumSignificantDigits = format.width;
                if (compact) {
                    format_opts.maximumSignificantDigits = 3;
                }
            }
            return new Intl.NumberFormat(navigator.language, format_opts);
        }
        else if (column.type === 'date') {
            return {
                format: value => {
                    return value;
                }
            };
        }
        return { format: value => value };
    }
    /**
     * Parse the format models from VA into a list of objects with a format method.
     *
     * @param {Object} message Full message model from VA
     * @param {boolean} compact Controls whether format generates compacted output or not.
     * @return {Object[]} List of objects with an appropriate format method.
     */
    function parseFormats(message, compact = false) {
        let formats = {};
        message.columns.forEach(column => formats[column.label] = parseFormat(column, compact));
        return formats;
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
                    elem.removeAttribute('x');
                }
                if (elem.parentElement.hasAttribute('y')) {
                    elem.removeAttribute('y');
                }
            });
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
        return text.replace(RE_UNDERSCOREUNICODE, function (match, g1) {
            return String.fromCharCode(parseInt('0x' + g1));
        });
    }
    /**
    * Encodes object literal into formal JSON syntax with quotes.
    *
    * @param {string} text The text to encode to proper JSON.
    */
    function jsonEncodeLiteral(text) {
        return '{' + text.replace(RE_NOVALUEKEY, function (match, g1) {
            return match.replace(g1, g1 + ':true');
        }).replace(RE_NONJSONCHAR, function (match, g1) {
            if (match !== 'true' && match !== 'false' && !RE_NUMBER.test(match)) {
                return '"' + match + '"';
            }
            return match;
        }) + '}';
    }
    /**
    * Creates an object from a string in the format {{param|opt:val,opt:val}}.
    *
    * @param {string} text The text to decode.
    */
    function parseSyntax(text) {
        let obj = {
            name: '',
            opts: {}
        };
        text = decodeIllustrator(text);
        const matches = text.match(RE_DOUBLEBRACE);
        if (matches) {
            text = matches[0].slice(2, -2);
            if (text.includes('|')) {
                const name_opts = text.split('|');
                obj.name = name_opts[0];
                obj.opts = JSON.parse(jsonEncodeLiteral(name_opts[1]));
            }
            else if (text.includes(':')) {
                obj.opts = JSON.parse(jsonEncodeLiteral(text));
            }
            else {
                obj.name = text;
            }
        }
        return obj;
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
            return window.self !== window.top;
        }
        catch (e) {
            return true;
        }
    }
    function getFormattedValue(data, row, column, formats) {
        const r = data.getRow(row);
        if (r !== undefined) {
            const val = r.get(column);
            if (val !== undefined) {
                if (formats[column]) {
                    return formats[column].format(val);
                }
                else {
                    return val;
                }
            }
        }
        return '???';
    }
    return {
        setters: [
            function (DataFrame_1) {
                DataFrame = DataFrame_1;
            },
            function (content_1) {
                content = content_1;
            },
            function (messaging_1) {
                messaging = messaging_1;
            }
        ],
        execute: function () {
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
            RE_DOUBLEBRACE = /{{([^}]+)}}/g;
            RE_UNDERSCOREUNICODE = /_x([0-9A-Za-z]+)_/g;
            RE_NOVALUEKEY = /(?:^|,)(\w+)(?:$|,)/g;
            RE_NONJSONCHAR = /([^:,]+)/g;
            RE_NUMBER = /[-+]?[0-9]*\.?[0-9]+/g;
            BASIC_FORMATS = {
                'DOLLAR': 'NLMNLUSD',
                'EURO': 'NLMNLEUR',
                'POUND': 'NLMNLGBP',
                'WON': 'NLMNLCNY',
                'YEN': 'NLMNLJPY',
            };
            // d8888b. db    db d8b   db  .d8b.  .88b  d88. d888888b  .o88b. .d8888.
            // 88  `8D `8b  d8' 888o  88 d8' `8b 88'YbdP`88   `88'   d8P  Y8 88'  YP
            // 88   88  `8bd8'  88V8o 88 88ooo88 88  88  88    88    8P      `8bo.  
            // 88   88    88    88 V8o88 88~~~88 88  88  88    88    8b        `Y8b.
            // 88  .8D    88    88  V888 88   88 88  88  88   .88.   Y8b  d8 db   8D
            // Y8888D'    YP    VP   V8P YP   YP YP  YP  YP Y888888P  `Y88P' `8888Y'
            /**
            * Base class for dynamics, which are called during update to apply data to the SVG.
            */
            Dynamic = class Dynamic {
                /**
                * Override with dynamic specific parsing and precomputation.
                * @param element The SVG element that the dynamic will act on.
                */
                constructor(element) {
                    this.element = element;
                    this.opts = {};
                }
                /**
                * Override with static method for selecting viable elements for this dynamic from SVG.
                * @param svg {SVGElement} The root SVG element to start the search from.
                * @return Array of dynamics that match the desired pattern.
                */
                static getDynamics(svg, types = ['all']) {
                    return [];
                }
                /**
                * Override with static method for selecting viable elements for this dynamic from SVG.
                * @param {DataFrame} data The root SVG element to start the search from.
                */
                apply(data) {
                }
            };
            /**
            * The dynamic text class replaces mustache style double brace tags with a value from the data.
            */
            DynamicText = class DynamicText extends Dynamic {
                constructor(element) {
                    super(element);
                    this.template = this.element.textContent;
                }
                static getDynamics(svg, types = ['all']) {
                    let elems = [];
                    svg.querySelectorAll('text').forEach(function (text) {
                        if (text.children.length) {
                            elems.push(...text.children);
                        }
                        else {
                            elems.push(text);
                        }
                    });
                    elems = elems.filter(e => e.textContent.match(RE_DOUBLEBRACE));
                    return elems.map(e => new DynamicText(e));
                }
                apply(data) {
                    this.element.textContent = this.template.replace(RE_DOUBLEBRACE, function (match, g1) {
                        const syntax = parseSyntax(match);
                        if (syntax.opts.hasOwnProperty('c') && syntax.opts.c) {
                            return getFormattedValue(data, 0, syntax.name, data.formats.compact);
                        }
                        else {
                            return getFormattedValue(data, 0, syntax.name, data.formats.standard);
                        }
                    }.bind({ data: data }));
                }
            };
            /**
            * The main class that controls the initialization and lifecycle of making the SVG
            * dynamic and responding to message events from the VA Data-driven Content framework.
            */
            DynamicSVG = class DynamicSVG extends Dynamic {
                /**
                * Attach to the indicate element DOM element and fill it with the target SVG. Also
                * perform all parsing and precomputation steps.
                * @param {Element} element The root DOM element to use for placement of SVG.
                */
                constructor(element) {
                    super(element);
                    this.message = {}; // Data message to be received from VA
                    this.resultName = ''; // Result name required to send messages back to VA
                    this.data = {}; // DataFrame for data response
                    this.dataFormats = {};
                    this.dataFormatsCompact = {};
                    this.initComplete = false; // Flag to help delay update execution
                    this.instanceSVG = ''; // Repatable body of original SVG code
                    this.dynamics = [];
                    this.opts = {
                        svg: 'test.svg',
                        clean: 'all',
                        dynamics: 'all'
                    }; // Object to old options and define defaults
                    this.init();
                }
                /**
                 * Handle initialiation of page based on URL options.
                 */
                init() {
                    this.opts = Object.assign(Object.assign({}, this.opts), messaging.getUrlParams());
                    fetch(this.opts.svg, { method: 'GET' })
                        .then(response => response.text())
                        .then(text => {
                        this.element.innerHTML = text;
                        const svg = this.element.querySelector('svg');
                        if (svg) {
                            cleanSVG(svg, this.opts.clean.split(','));
                            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                            group.classList.add('__instance__');
                            group.id = '__instance_0001__';
                            group.append(...[...svg.children].filter(e => e.tagName !== 'style'));
                            svg.append(group);
                            this.dynamics = DynamicSVG.getDynamics(group);
                            this.instanceSVG = group.innerHTML;
                        }
                        this.initComplete = true;
                    })
                        .catch(error => console.error('Error: ', error));
                    messaging.setOnDataReceivedCallback(this.onDataReceived.bind(this));
                    content.setupResizeListener(this.draw.bind(this));
                }
                /**
                 * Performs cleaning tasks on SVG to allow for better dynamic behavior.
                 * @param {Element} svg SVG element to perform cleaning on.
                 * @param {string[]=} types Values: all | text
                 */
                static getDynamics(svg, types = ['all']) {
                    let dynamics = [];
                    if (types.includes('all') || types.includes('text')) {
                        dynamics.push(...DynamicText.getDynamics(svg));
                    }
                    return dynamics;
                }
                /**
                 * Applies the current _data to all dynamics.
                 */
                apply() {
                    if (!this.initComplete) {
                        window.setTimeout(this.apply.bind(this), 100);
                    }
                    else {
                        this.dynamics.forEach(d => d.apply(this.data)); //, this.dataFormats, this.dataFormatsCompact ) )
                    }
                }
                /**
                 * Handle resize events or other layout changes.
                 */
                draw() {
                    return;
                }
                /**
                 * Callback to handle data update from VA DDC.
                 * @param {Object} messageFromVA Message object from VA DDC data update.
                 */
                onDataReceived(messageFromVA) {
                    this.message = messageFromVA;
                    this.resultName = this.message.resultName;
                    this.data = parseData(this.message);
                    //this.dataFormats = parseFormats( this.message )
                    //this.dataFormatsCompact = parseFormats( this.message, true )
                    this.apply();
                }
            };
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
                let dynSVG = new DynamicSVG(document.body);
                // If run outside of VA assume in a testing scenario
                if (!inIframe()) {
                    dynSVG.onDataReceived(SAMPLE_MESSAGE);
                }
            });
            // d888888b d88888b .d8888. d888888b d888888b d8b   db  d888b 
            // `~~88~~' 88'     88'  YP `~~88~~'   `88'   888o  88 88' Y8b
            //    88    88ooooo `8bo.      88       88    88V8o 88 88     
            //    88    88~~~~~   `Y8b.    88       88    88 V8o88 88  ooo
            //    88    88.     db   8D    88      .88.   88  V888 88. ~8~
            //    YP    Y88888P `8888Y'    YP    Y888888P VP   V8P  Y888P 
            SAMPLE_SVG = `
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
`;
            SAMPLE_MESSAGE = {
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
            };
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluc3ZnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2R5bnN2Zy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBMkJBLHdCQUF3QjtJQUN4Qix1QkFBdUI7SUFDdkIsMEJBQTBCO0lBQzFCLHdCQUF3QjtJQUN4QixpQ0FBaUM7SUFDakMsb0JBQW9CO0lBSXBCLHVCQUF1QjtJQUN2Qix1QkFBdUI7SUFDdkIsdUJBQXVCO0lBQ3ZCLHVCQUF1QjtJQUV2Qjs7Ozs7T0FLRztJQUNILFNBQVMsU0FBUyxDQUFDLE9BQVc7UUFFMUIsSUFBSSxJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTVGLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzdCLFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRTtnQkFDakIsS0FBSyxRQUFRO29CQUNULElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7b0JBQ3RDLE1BQUs7Z0JBQ1QsZUFBZTtnQkFDZixtQkFBbUI7Z0JBQ25CLHFFQUFxRTtnQkFDckUsWUFBWTthQUNmO1FBQ0wsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVsRCxrQkFBa0I7UUFFbEIsT0FBTyxJQUFJLENBQUE7SUFFZixDQUFDO0lBVUQ7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QUU7NEJBQ0osSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFFLEVBQUU7NEJBQ1QsU0FBUyxFQUFFLENBQUM7NEJBQ1osWUFBWSxFQUFFLFVBQVU7eUJBQzNCO3FCQUNKO29CQUNEO3dCQUNJLElBQUksRUFBRSxNQUFNO3dCQUNaLEtBQUssRUFBRSxVQUFVO3dCQUNqQixJQUFJLEVBQUUsUUFBUTt3QkFDZCxLQUFLLEVBQUUsY0FBYzt3QkFDckIsV0FBVyxFQUFFLFlBQVk7d0JBQ3pCLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsT0FBTzs0QkFDYixLQUFLLEVBQUUsRUFBRTs0QkFDVCxTQUFTLEVBQUUsQ0FBQzs0QkFDWixZQUFZLEVBQUUsVUFBVTt5QkFDM0I7cUJBQ0o7b0JBQ0Q7d0JBQ0ksSUFBSSxFQUFFLE1BQU07d0JBQ1osS0FBSyxFQUFFLFdBQVc7d0JBQ2xCLElBQUksRUFBRSxRQUFRO3dCQUNkLEtBQUssRUFBRSxjQUFjO3dCQUNyQixXQUFXLEVBQUUsWUFBWTt3QkFDekIsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxPQUFPOzRCQUNiLEtBQUssRUFBRSxFQUFFOzRCQUNULFNBQVMsRUFBRSxDQUFDOzRCQUNaLFlBQVksRUFBRSxVQUFVO3lCQUMzQjtxQkFDSjtpQkFDSjthQUNKLENBQUE7UUFBQSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IERhdGFGcmFtZSA9IHJlcXVpcmUoICdkYXRhZnJhbWUtanMnIClcbmltcG9ydCAqIGFzIGNvbnRlbnQgZnJvbSAnLi4vLi4vc2FzLXZpc3VhbGFuYWx5dGljcy10aGlyZHBhcnR5dmlzdWFsaXphdGlvbnMvc3JjL3V0aWwvY29udGVudCdcbmltcG9ydCAqIGFzIG1lc3NhZ2luZyBmcm9tICcuLi8uLi9zYXMtdmlzdWFsYW5hbHl0aWNzLXRoaXJkcGFydHl2aXN1YWxpemF0aW9ucy9zcmMvdXRpbC9tZXNzYWdpbmcnXG5cblxuLy8gZDg4ODhiLiAgLmQ4Yi4gIGQ4ODg4Yi4gLmQ4ODg4LiBkODg4ODg4YiBkOGIgICBkYiAgZDg4OGIgXG4vLyA4OCAgYDhEIGQ4JyBgOGIgODggIGA4RCA4OCcgIFlQICAgYDg4JyAgIDg4OG8gIDg4IDg4JyBZOGJcbi8vIDg4b29kRCcgODhvb284OCA4OG9vYlknIGA4Ym8uICAgICAgODggICAgODhWOG8gODggODggICAgIFxuLy8gODh+fn4gICA4OH5+fjg4IDg4YDhiICAgICBgWThiLiAgICA4OCAgICA4OCBWOG84OCA4OCAgb29vXG4vLyA4OCAgICAgIDg4ICAgODggODggYDg4LiBkYiAgIDhEICAgLjg4LiAgIDg4ICBWODg4IDg4LiB+OH5cbi8vIDg4ICAgICAgWVAgICBZUCA4OCAgIFlEIGA4ODg4WScgWTg4ODg4OFAgVlAgICBWOFAgIFk4ODhQIFxuXG5cbi8vICwtLS0uICAgICAgICAgICAgICAgICAgIFxuLy8gfC0tLScsLS0tLiwtLS0uLC0tLS4uICAsXG4vLyB8ICBcXCB8LS0tJ3wgICB8fC0tLScgPjwgXG4vLyBgICAgYGAtLS0nYC0tLXxgLS0tJycgIGBcbi8vICAgICAgICAgYC0tLScgICAgICAgICBcblxuY29uc3QgUkVfRE9VQkxFQlJBQ0UgPSAve3soW159XSspfX0vZ1xuY29uc3QgUkVfVU5ERVJTQ09SRVVOSUNPREUgPSAvX3goWzAtOUEtWmEtel0rKV8vZ1xuY29uc3QgUkVfTk9WQUxVRUtFWSA9IC8oPzpefCwpKFxcdyspKD86JHwsKS9nXG5jb25zdCBSRV9OT05KU09OQ0hBUiA9IC8oW146LF0rKS9nXG5jb25zdCBSRV9OVU1CRVIgPSAvWy0rXT9bMC05XSpcXC4/WzAtOV0rL2dcblxuXG5cbi8vIGludGVyZmFjZSBWQU1lc3NhZ2Uge1xuLy8gICAgIHZlcnNpb246IHN0cmluZyxcbi8vICAgICByZXN1bHROYW1lOiBzdHJpbmcsXG4vLyAgICAgcm93Q291bnQ6IG51bWJlcixcbi8vICAgICBhdmFpbGFibGVSb3dDb3VudDogbnVtYmVyLFxuLy8gICAgIGRhdGE6IEFycmF5PFtcbiAgICAgICBcblxuXG4vLyAsLS0uICAgICAgfCAgICAgICAgIFxuLy8gfCAgIHwsLS0tLnwtLS0gLC0tLS5cbi8vIHwgICB8LC0tLXx8ICAgICwtLS18XG4vLyBgLS0nIGAtLS1eYC0tLSdgLS0tXlxuXG4vKipcbiAqIENyZWF0ZSBhIERhdGFGcmFtZSBpbnN0YW5jZSBmcm9tIGRhdGEgaW4gVkEgZGF0YSBtZXNzYWdlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIE1lc3NhZ2Ugb2JqZWN0IGZyb20gVkEgRERDIGRhdGEgdXBkYXRlLlxuICogQHJldHVybiB7RGF0YUZyYW1lfSBEYXRhIGZyYW1lIHdpdGggcHJvcGVyIHR5cGUgcGFyc2luZyBhcHBsaWVkLlxuICovXG5mdW5jdGlvbiBwYXJzZURhdGEobWVzc2FnZTphbnkpIHtcblxuICAgIGxldCBkYXRhID0gbmV3IERhdGFGcmFtZShtZXNzYWdlLmRhdGEsIG1lc3NhZ2UuY29sdW1ucy5tYXAoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHgubGFiZWwgfSkpXG5cbiAgICBtZXNzYWdlLmNvbHVtbnMuZm9yRWFjaChjb2x1bW4gPT4ge1xuICAgICAgICBzd2l0Y2ggKGNvbHVtbi50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhLmNhc3QoY29sdW1uLmxhYmVsLCBOdW1iZXIpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIC8vIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgLy8gY2FzZSAnZGF0ZXRpbWUnOlxuICAgICAgICAgICAgLy8gICAgIGRhdGEgPSBkYXRhLmNhc3QoIGNvbHVtbi5sYWJlbCwgKCB2YWwgKSA9PiBEYXRlLnBhcnNlKCB2YWwgKSApXG4gICAgICAgICAgICAvLyAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICBkYXRhLmZvcm1hdHMgPSB7fVxuICAgIGRhdGEuZm9ybWF0cy5zdGFuZGFyZCA9IHBhcnNlRm9ybWF0cyhtZXNzYWdlKVxuICAgIGRhdGEuZm9ybWF0cy5jb21wYWN0ID0gcGFyc2VGb3JtYXRzKG1lc3NhZ2UsIHRydWUpXG5cbiAgICAvLyBkYXRhLnNob3coIDIwIClcblxuICAgIHJldHVybiBkYXRhXG5cbn1cblxuY29uc3QgQkFTSUNfRk9STUFUUyA9IHtcbiAgICAnRE9MTEFSJzogJ05MTU5MVVNEJyxcbiAgICAnRVVSTyc6ICdOTE1OTEVVUicsXG4gICAgJ1BPVU5EJzogJ05MTU5MR0JQJyxcbiAgICAnV09OJzogJ05MTU5MQ05ZJyxcbiAgICAnWUVOJzogJ05MTU5MSlBZJyxcbn1cblxuLyoqXG4gKiBQYWQgYSBudW1iZXIgaW50byBhIHN0cmluZyB3aXRoIGxlYWRpbmcgemVyb3MuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG51bWJlciBUaGUgbnVtYmVyIHRvIGNvbnZlcnQgdG8gc3RyaW5nIGFuZCBwYWQuXG4gKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIFRoZSBjaGFyYWN0ZXIgbGVuZ2h0IG9mIHRoZSBmb3JtYXR0ZWQgc3RyaW5nIGZvciB0aGUgbnVtYmVyLlxuICogQHJldHVybiB7U3RyaW5nfSBTdHJpbmcgd2l0aCBudW1iZXIgaW4gZmxvYXQgZm9ybWF0IHdpdGggcGFkZGluZyBmcm9udCB6ZXJvcy5cbiAqL1xuZnVuY3Rpb24gemVyb1BhZChudW1iZXI6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIpIHtcbiAgICByZXR1cm4gQXJyYXkobGVuZ3RoICsgMSAtIG51bWJlci50b1N0cmluZygpLmxlbmd0aCkuam9pbignMCcpICsgbnVtYmVyXG59XG5cbi8qKlxuICogRXh0cmFjdHMgdGhlIGhvdXJzLCBtaW51dGVzLCBhbmQgc2Vjb25kcyBmcm9tIGEgZHVyYXRpb24gaW4gc2Vjb25kcy5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gc2VjcyBOdW1iZXIgb2Ygc2Vjb25kcyBpbiB0aGUgZHVyYXRpb24uXG4gKiBAcmV0dXJuIHtPYmplY3R9IE9iamVjdCB3aXRoIGR1cmF0aW9ucyBpbiBoLCBtLCBhbmQgcyBwcm9wZXJ0aWVzLlxuICovXG5mdW5jdGlvbiB0aW1lRnJvbVNlY29uZHMoc2VjczpudW1iZXIpIHtcbiAgICBzZWNzID0gTWF0aC5yb3VuZChzZWNzKVxuICAgIHZhciBob3VycyA9IE1hdGguZmxvb3Ioc2VjcyAvICg2MCAqIDYwKSlcblxuICAgIHZhciBkaXZpc29yX2Zvcl9taW51dGVzID0gc2VjcyAlICg2MCAqIDYwKVxuICAgIHZhciBtaW51dGVzID0gTWF0aC5mbG9vcihkaXZpc29yX2Zvcl9taW51dGVzIC8gNjApXG5cbiAgICB2YXIgZGl2aXNvcl9mb3Jfc2Vjb25kcyA9IGRpdmlzb3JfZm9yX21pbnV0ZXMgJSA2MFxuICAgIHZhciBzZWNvbmRzID0gTWF0aC5jZWlsKGRpdmlzb3JfZm9yX3NlY29uZHMpXG5cbiAgICB2YXIgb2JqID0ge1xuICAgICAgICBoOiBob3VycyxcbiAgICAgICAgbTogbWludXRlcyxcbiAgICAgICAgczogc2Vjb25kc1xuICAgIH1cbiAgICByZXR1cm4gb2JqXG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGZvcm1hdCBtb2RlbCBmcm9tIFZBIGludG8gYW4gb2JqZWN0IHdpdGggYSBmb3JtYXQgbWV0aG9kLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtYXQgRm9ybWF0IGZyb20gVkEgbWVzc2FnZS5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gY29tcGFjdCBDb250cm9scyB3aGV0aGVyIGZvcm1hdCBnZW5lcmF0ZXMgY29tcGFjdGVkIG91dHB1dCBvciBub3QuIFxuICogQHJldHVybiB7T2JqZWN0fSBPYmplY3Qgd2l0aCBhbiBhcHByb3ByaWF0ZSBmb3JtYXQgbWV0aG9kLlxuICovXG5mdW5jdGlvbiBwYXJzZUZvcm1hdChjb2x1bW4sIGNvbXBhY3QgPSBmYWxzZSkge1xuXG4gICAgY29uc3QgZm9ybWF0ID0gY29sdW1uLmZvcm1hdFxuXG4gICAgaWYgKGNvbHVtbi50eXBlID09PSAnbnVtYmVyJykge1xuXG4gICAgICAgIGxldCBmb3JtYXRfb3B0czogYW55ID0ge1xuICAgICAgICAgICAgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiBmb3JtYXQucHJlY2lzaW9uLFxuICAgICAgICAgICAgbWluaW11bUZyYWN0aW9uRGlnaXRzOiBmb3JtYXQucHJlY2lzaW9uXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbXBhY3QpIHtcbiAgICAgICAgICAgIGZvcm1hdF9vcHRzLm5vdGF0aW9uID0gJ2NvbXBhY3QnXG4gICAgICAgICAgICBmb3JtYXRfb3B0cy5tYXhpbXVtU2lnbmlmaWNhbnREaWdpdHMgPSAzXG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBiYXNpYyBpbiBCQVNJQ19GT1JNQVRTKSB7XG4gICAgICAgICAgICBpZiAoZm9ybWF0Lm5hbWUgPT09IGJhc2ljKSB7XG4gICAgICAgICAgICAgICAgZm9ybWF0Lm5hbWUgPSBCQVNJQ19GT1JNQVRTW2Jhc2ljXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZvcm1hdC5uYW1lLnN0YXJ0c1dpdGgoJ05MTU5JJykpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0OiBudW1iZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0Lm5hbWUucmVwbGFjZSgnTkxNTkknLCAnJykgKyAobmV3IEludGwuTnVtYmVyRm9ybWF0KFxuICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLmxhbmd1YWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0X29wdHNcbiAgICAgICAgICAgICAgICAgICAgKSkuZm9ybWF0KG51bWJlcilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0Lm5hbWUuc3RhcnRzV2l0aCgnVElNRScpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdDogbnVtYmVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSB0aW1lRnJvbVNlY29uZHMobnVtYmVyKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKCcnICsgcGFydHMuaCkucGFkU3RhcnQoMiwgJzAnKSArICc6JyArICgnJyArIHBhcnRzLm0pLnBhZFN0YXJ0KDIsICcwJykgKyAnOicgKyAoJycgKyBwYXJ0cy5zKS5wYWRTdGFydCgyLCAnMCcpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdC5uYW1lLnN0YXJ0c1dpdGgoJ0hPVVInKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IG51bWJlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihudW1iZXIgLyAoNjAgKiA2MCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAobmV3IEludGwuTnVtYmVyRm9ybWF0KFxuICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLmxhbmd1YWdlXG4gICAgICAgICAgICAgICAgICAgICkpLmZvcm1hdChob3VycylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0Lm5hbWUuc3RhcnRzV2l0aCgnSEhNTScpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdDogbnVtYmVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSB0aW1lRnJvbVNlY29uZHMobnVtYmVyKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKCcnICsgcGFydHMuaCkucGFkU3RhcnQoMiwgJzAnKSArICc6JyArICgnJyArIHBhcnRzLm0pLnBhZFN0YXJ0KDIsICcwJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0Lm5hbWUuc3RhcnRzV2l0aCgnTU1TUycpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdDogbnVtYmVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VjcyA9IE1hdGgucm91bmQobnVtYmVyKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihzZWNzIC8gNjApXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlY29uZHMgPSBNYXRoLmNlaWwoKHNlY3MgJSAoNjAgKiA2MCkpICUgNjApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoJycgKyBtaW51dGVzKS5wYWRTdGFydCgyLCAnMCcpICsgJzonICsgKCcnICsgc2Vjb25kcykucGFkU3RhcnQoMiwgJzAnKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gXG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0Lm5hbWUuc3RhcnRzV2l0aCgnTkxNTkwnKSkge1xuICAgICAgICAgICAgZm9ybWF0X29wdHMuc3R5bGUgPSAnY3VycmVuY3knXG4gICAgICAgICAgICBmb3JtYXRfb3B0cy5jdXJyZW5jeSA9IGZvcm1hdC5uYW1lLnJlcGxhY2UoJ05MTU5MJywgJycpXG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0Lm5hbWUuc3RhcnRzV2l0aCgnUEVSQ0VOVCcpKSB7XG4gICAgICAgICAgICBmb3JtYXRfb3B0cy5zdHlsZSA9ICdwZXJjZW50J1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdC5uYW1lLnN0YXJ0c1dpdGgoJ0YnKSkge1xuICAgICAgICAgICAgZm9ybWF0X29wdHMudXNlR3JvdXBpbmcgPSBmYWxzZVxuICAgICAgICB9IGVsc2UgaWYgKGZvcm1hdC5uYW1lLnN0YXJ0c1dpdGgoJ0JFU1QnKSkge1xuICAgICAgICAgICAgZGVsZXRlIGZvcm1hdF9vcHRzLm1heGltdW1GcmFjdGlvbkRpZ2l0c1xuICAgICAgICAgICAgZm9ybWF0X29wdHMubWF4aW11bVNpZ25pZmljYW50RGlnaXRzID0gZm9ybWF0LndpZHRoXG4gICAgICAgICAgICBpZiAoY29tcGFjdCkge1xuICAgICAgICAgICAgICAgIGZvcm1hdF9vcHRzLm1heGltdW1TaWduaWZpY2FudERpZ2l0cyA9IDNcbiAgICAgICAgICAgIH0gXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBJbnRsLk51bWJlckZvcm1hdChcbiAgICAgICAgICAgIG5hdmlnYXRvci5sYW5ndWFnZSxcbiAgICAgICAgICAgIGZvcm1hdF9vcHRzXG4gICAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvbHVtbi50eXBlID09PSAnZGF0ZScpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZvcm1hdDogdmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7IGZvcm1hdDogdmFsdWUgPT4gdmFsdWUgfVxufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBmb3JtYXQgbW9kZWxzIGZyb20gVkEgaW50byBhIGxpc3Qgb2Ygb2JqZWN0cyB3aXRoIGEgZm9ybWF0IG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBGdWxsIG1lc3NhZ2UgbW9kZWwgZnJvbSBWQVxuICogQHBhcmFtIHtib29sZWFufSBjb21wYWN0IENvbnRyb2xzIHdoZXRoZXIgZm9ybWF0IGdlbmVyYXRlcyBjb21wYWN0ZWQgb3V0cHV0IG9yIG5vdC4gXG4gKiBAcmV0dXJuIHtPYmplY3RbXX0gTGlzdCBvZiBvYmplY3RzIHdpdGggYW4gYXBwcm9wcmlhdGUgZm9ybWF0IG1ldGhvZC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VGb3JtYXRzKG1lc3NhZ2UsIGNvbXBhY3QgPSBmYWxzZSkge1xuICAgIGxldCBmb3JtYXRzID0ge31cbiAgICBtZXNzYWdlLmNvbHVtbnMuZm9yRWFjaChjb2x1bW4gPT4gZm9ybWF0c1tjb2x1bW4ubGFiZWxdID0gcGFyc2VGb3JtYXQoY29sdW1uLCBjb21wYWN0KSlcbiAgICByZXR1cm4gZm9ybWF0c1xufVxuXG5cbi8vICwtLS0uLiAgICAsLC0tLS5cbi8vIGAtLS0ufCAgICB8fCAgXy5cbi8vICAgICB8IFxcICAvIHwgICB8XG4vLyBgLS0tJyAgYCcgIGAtLS0nXG5cbi8qKlxuKiBQZXJmb3JtcyBjbGVhbmluZyB0YXNrcyBvbiBTVkcgdG8gYWxsb3cgZm9yIGJldHRlciBkeW5hbWljIGJlaGF2aW9yLlxuKlxuKiBAcGFyYW0ge0VsZW1lbnR9IHN2ZyBTVkcgZWxlbWVudCB0byBwZXJmb3JtIGNsZWFuaW5nIG9uLlxuKiBAcGFyYW0ge3N0cmluZ1tdfSBtZXRob2RzIFZhbHVlczogYWxsIHwgdGV4dFxuKi9cbmZ1bmN0aW9uIGNsZWFuU1ZHKHN2ZywgbWV0aG9kcyA9IFsnYWxsJ10pIHtcbiAgICBpZiAobWV0aG9kcy5pbmNsdWRlcygnYWxsJykgfHwgbWV0aG9kcy5pbmNsdWRlcygndGV4dCcpKSB7XG4gICAgICAgIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCd0c3BhbicpLmZvckVhY2goZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgICAgIGlmIChlbGVtLnBhcmVudEVsZW1lbnQuaGFzQXR0cmlidXRlKCd4JykpIHtcbiAgICAgICAgICAgICAgICBlbGVtLnJlbW92ZUF0dHJpYnV0ZSgneCcpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZWxlbS5wYXJlbnRFbGVtZW50Lmhhc0F0dHJpYnV0ZSgneScpKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5yZW1vdmVBdHRyaWJ1dGUoJ3knKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSBcbiAgICB9XG59XG5cblxuLy8gLC0tLS4gICAgICAgICAgfCAgICAgICAgICAgICBcbi8vIGAtLS0uLCAgIC4sLS0tLnwtLS0gLC0tLS4uICAsXG4vLyAgICAgfHwgICB8fCAgIHx8ICAgICwtLS18ID48IFxuLy8gYC0tLSdgLS0tfGAgICAnYC0tLSdgLS0tXicgIGBcbi8vICAgICBgLS0tJyAgICAgICAgICAgICAgICAgICBcblxuLyoqXG4qIENvbnZlcnRzIHVuaWNvZGUgY2hhcmFjdGVyIGJhY2sgdG8gb3JpZ25hbCBzdHJpbmcuXG4qXG4qIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IFRoZSB0ZXh0IHRvIGRlY29kZS5cbiovXG5mdW5jdGlvbiBkZWNvZGVJbGx1c3RyYXRvcih0ZXh0KSB7XG4gICAgcmV0dXJuIHRleHQucmVwbGFjZShcbiAgICAgICAgUkVfVU5ERVJTQ09SRVVOSUNPREUsXG4gICAgICAgIGZ1bmN0aW9uIChtYXRjaCwgZzEpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnNlSW50KCcweCcgKyBnMSkpXG4gICAgICAgIH0pXG59XG5cbi8qKlxuKiBFbmNvZGVzIG9iamVjdCBsaXRlcmFsIGludG8gZm9ybWFsIEpTT04gc3ludGF4IHdpdGggcXVvdGVzLlxuKlxuKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBUaGUgdGV4dCB0byBlbmNvZGUgdG8gcHJvcGVyIEpTT04uXG4qL1xuZnVuY3Rpb24ganNvbkVuY29kZUxpdGVyYWwodGV4dCkge1xuICAgIHJldHVybiAneycgKyB0ZXh0LnJlcGxhY2UoXG4gICAgICAgIFJFX05PVkFMVUVLRVksXG4gICAgICAgIGZ1bmN0aW9uIChtYXRjaCwgZzEpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaC5yZXBsYWNlKGcxLCBnMSArICc6dHJ1ZScpXG4gICAgICAgIH1cbiAgICApLnJlcGxhY2UoXG4gICAgICAgIFJFX05PTkpTT05DSEFSLFxuICAgICAgICBmdW5jdGlvbiAobWF0Y2gsIGcxKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2ggIT09ICd0cnVlJyAmJiBtYXRjaCAhPT0gJ2ZhbHNlJyAmJiAhUkVfTlVNQkVSLnRlc3QobWF0Y2gpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdcIicgKyBtYXRjaCArICdcIidcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtYXRjaFxuICAgICAgICB9XG4gICAgKSArICd9J1xufVxuXG4vKipcbiogQ3JlYXRlcyBhbiBvYmplY3QgZnJvbSBhIHN0cmluZyBpbiB0aGUgZm9ybWF0IHt7cGFyYW18b3B0OnZhbCxvcHQ6dmFsfX0uXG4qXG4qIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IFRoZSB0ZXh0IHRvIGRlY29kZS5cbiovXG5mdW5jdGlvbiBwYXJzZVN5bnRheCh0ZXh0KSB7XG4gICAgbGV0IG9iajogeyBuYW1lOiBzdHJpbmcsIG9wdHM6IGFueSB9ID0ge1xuICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgb3B0czoge31cbiAgICB9XG5cbiAgICB0ZXh0ID0gZGVjb2RlSWxsdXN0cmF0b3IodGV4dClcblxuICAgIGNvbnN0IG1hdGNoZXMgPSB0ZXh0Lm1hdGNoKFJFX0RPVUJMRUJSQUNFKVxuICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICAgIHRleHQgPSBtYXRjaGVzWzBdLnNsaWNlKDIsIC0yKVxuICAgICAgICBpZiAodGV4dC5pbmNsdWRlcygnfCcpKSB7XG4gICAgICAgICAgICBjb25zdCBuYW1lX29wdHMgPSB0ZXh0LnNwbGl0KCd8JylcbiAgICAgICAgICAgIG9iai5uYW1lID0gbmFtZV9vcHRzWzBdXG4gICAgICAgICAgICBvYmoub3B0cyA9IEpTT04ucGFyc2UoanNvbkVuY29kZUxpdGVyYWwobmFtZV9vcHRzWzFdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0ZXh0LmluY2x1ZGVzKCc6JykpIHtcbiAgICAgICAgICAgIG9iai5vcHRzID0gSlNPTi5wYXJzZShqc29uRW5jb2RlTGl0ZXJhbCh0ZXh0KSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9iai5uYW1lID0gdGV4dFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9ialxufVxuXG5cblxuXG4vLyBkYiAgIGRiIGQ4ODg4OGIgZGIgICAgICBkODg4OGIuIGQ4ODg4OGIgZDg4ODhiLiAuZDg4ODguXG4vLyA4OCAgIDg4IDg4JyAgICAgODggICAgICA4OCAgYDhEIDg4JyAgICAgODggIGA4RCA4OCcgIFlQXG4vLyA4OG9vbzg4IDg4b29vb28gODggICAgICA4OG9vZEQnIDg4b29vb28gODhvb2JZJyBgOGJvLiAgXG4vLyA4OH5+fjg4IDg4fn5+fn4gODggICAgICA4OH5+fiAgIDg4fn5+fn4gODhgOGIgICAgIGBZOGIuXG4vLyA4OCAgIDg4IDg4LiAgICAgODhib29vLiA4OCAgICAgIDg4LiAgICAgODggYDg4LiBkYiAgIDhEXG4vLyBZUCAgIFlQIFk4ODg4OFAgWTg4ODg4UCA4OCAgICAgIFk4ODg4OFAgODggICBZRCBgODg4OFknXG5cbi8qKlxuKiBUZXN0IGlmIHBhZ2UgY29udGFpbmVkIGluIGFuIGlGcmFtZS5cbipcbiogQHJldHVybiB7Ym9vbGVhbn0gSW5kaWNhdG9yIG9mIGlGcmFtZSBjb250YWlubWVudC5cbiovXG5mdW5jdGlvbiBpbklmcmFtZSgpIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gd2luZG93LnNlbGYgIT09IHdpbmRvdy50b3BcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgfVxufVxuXG5cblxuXG4vLyBkODg4OGIuIGRiICAgIGRiIGQ4YiAgIGRiICAuZDhiLiAgLjg4YiAgZDg4LiBkODg4ODg4YiAgLm84OGIuIC5kODg4OC5cbi8vIDg4ICBgOEQgYDhiICBkOCcgODg4byAgODggZDgnIGA4YiA4OCdZYmRQYDg4ICAgYDg4JyAgIGQ4UCAgWTggODgnICBZUFxuLy8gODggICA4OCAgYDhiZDgnICA4OFY4byA4OCA4OG9vbzg4IDg4ICA4OCAgODggICAgODggICAgOFAgICAgICBgOGJvLiAgXG4vLyA4OCAgIDg4ICAgIDg4ICAgIDg4IFY4bzg4IDg4fn5+ODggODggIDg4ICA4OCAgICA4OCAgICA4YiAgICAgICAgYFk4Yi5cbi8vIDg4ICAuOEQgICAgODggICAgODggIFY4ODggODggICA4OCA4OCAgODggIDg4ICAgLjg4LiAgIFk4YiAgZDggZGIgICA4RFxuLy8gWTg4ODhEJyAgICBZUCAgICBWUCAgIFY4UCBZUCAgIFlQIFlQICBZUCAgWVAgWTg4ODg4OFAgIGBZODhQJyBgODg4OFknXG5cblxuLyoqIFxuKiBCYXNlIGNsYXNzIGZvciBkeW5hbWljcywgd2hpY2ggYXJlIGNhbGxlZCBkdXJpbmcgdXBkYXRlIHRvIGFwcGx5IGRhdGEgdG8gdGhlIFNWRy5cbiovXG5jbGFzcyBEeW5hbWljIHtcblxuICAgIGVsZW1lbnQ6IFNWR0VsZW1lbnRcbiAgICBvcHRzOiBhbnlcblxuICAgIC8qKlxuICAgICogT3ZlcnJpZGUgd2l0aCBkeW5hbWljIHNwZWNpZmljIHBhcnNpbmcgYW5kIHByZWNvbXB1dGF0aW9uLlxuICAgICogQHBhcmFtIGVsZW1lbnQgVGhlIFNWRyBlbGVtZW50IHRoYXQgdGhlIGR5bmFtaWMgd2lsbCBhY3Qgb24uXG4gICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50OiBTVkdFbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcbiAgICAgICAgdGhpcy5vcHRzID0ge31cbiAgICB9XG5cbiAgICAvKipcbiAgICAqIE92ZXJyaWRlIHdpdGggc3RhdGljIG1ldGhvZCBmb3Igc2VsZWN0aW5nIHZpYWJsZSBlbGVtZW50cyBmb3IgdGhpcyBkeW5hbWljIGZyb20gU1ZHLlxuICAgICogQHBhcmFtIHN2ZyB7U1ZHRWxlbWVudH0gVGhlIHJvb3QgU1ZHIGVsZW1lbnQgdG8gc3RhcnQgdGhlIHNlYXJjaCBmcm9tLlxuICAgICogQHJldHVybiBBcnJheSBvZiBkeW5hbWljcyB0aGF0IG1hdGNoIHRoZSBkZXNpcmVkIHBhdHRlcm4uXG4gICAgKi9cbiAgICBzdGF0aWMgZ2V0RHluYW1pY3Moc3ZnLCB0eXBlcyA9IFsnYWxsJ10pIHtcbiAgICAgICAgcmV0dXJuIFtdXG4gICAgfVxuXG4gICAgLyoqXG4gICAgKiBPdmVycmlkZSB3aXRoIHN0YXRpYyBtZXRob2QgZm9yIHNlbGVjdGluZyB2aWFibGUgZWxlbWVudHMgZm9yIHRoaXMgZHluYW1pYyBmcm9tIFNWRy5cbiAgICAqIEBwYXJhbSB7RGF0YUZyYW1lfSBkYXRhIFRoZSByb290IFNWRyBlbGVtZW50IHRvIHN0YXJ0IHRoZSBzZWFyY2ggZnJvbS5cbiAgICAqL1xuICAgIGFwcGx5KGRhdGEpIHtcblxuICAgIH1cbn1cblxuLyoqXG4qIFRoZSBkeW5hbWljIHRleHQgY2xhc3MgcmVwbGFjZXMgbXVzdGFjaGUgc3R5bGUgZG91YmxlIGJyYWNlIHRhZ3Mgd2l0aCBhIHZhbHVlIGZyb20gdGhlIGRhdGEuXG4qL1xuY2xhc3MgRHluYW1pY1RleHQgZXh0ZW5kcyBEeW5hbWljIHtcblxuICAgIHRlbXBsYXRlOiBzdHJpbmdcblxuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQpIHtcbiAgICAgICAgc3VwZXIoZWxlbWVudClcbiAgICAgICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMuZWxlbWVudC50ZXh0Q29udGVudFxuICAgIH1cblxuICAgIHN0YXRpYyBnZXREeW5hbWljcyhzdmcsIHR5cGVzID0gWydhbGwnXSkge1xuICAgICAgICBsZXQgZWxlbXMgPSBbXVxuICAgICAgICBzdmcucXVlcnlTZWxlY3RvckFsbCgndGV4dCcpLmZvckVhY2goZnVuY3Rpb24gKHRleHQpIHtcbiAgICAgICAgICAgIGlmICh0ZXh0LmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGVsZW1zLnB1c2goLi4udGV4dC5jaGlsZHJlbilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbXMucHVzaCh0ZXh0KVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICBlbGVtcyA9IGVsZW1zLmZpbHRlcihlID0+IGUudGV4dENvbnRlbnQubWF0Y2goUkVfRE9VQkxFQlJBQ0UpKVxuICAgICAgICByZXR1cm4gZWxlbXMubWFwKGUgPT4gbmV3IER5bmFtaWNUZXh0KGUpKVxuICAgIH1cblxuICAgIGFwcGx5KGRhdGEpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnRleHRDb250ZW50ID0gdGhpcy50ZW1wbGF0ZS5yZXBsYWNlKFxuICAgICAgICAgICAgUkVfRE9VQkxFQlJBQ0UsXG4gICAgICAgICAgICBmdW5jdGlvbiAobWF0Y2gsIGcxKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ludGF4ID0gcGFyc2VTeW50YXgobWF0Y2gpXG4gICAgICAgICAgICAgICAgaWYgKHN5bnRheC5vcHRzLmhhc093blByb3BlcnR5KCdjJykgJiYgc3ludGF4Lm9wdHMuYykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0Rm9ybWF0dGVkVmFsdWUoZGF0YSwgMCwgc3ludGF4Lm5hbWUsIGRhdGEuZm9ybWF0cy5jb21wYWN0KVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRGb3JtYXR0ZWRWYWx1ZShkYXRhLCAwLCBzeW50YXgubmFtZSwgZGF0YS5mb3JtYXRzLnN0YW5kYXJkKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0uYmluZCh7IGRhdGE6IGRhdGEgfSkpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRGb3JtYXR0ZWRWYWx1ZShkYXRhLCByb3csIGNvbHVtbiwgZm9ybWF0cykge1xuICAgIGNvbnN0IHIgPSBkYXRhLmdldFJvdyhyb3cpXG4gICAgaWYgKHIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCB2YWwgPSByLmdldChjb2x1bW4pXG4gICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKGZvcm1hdHNbY29sdW1uXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXRzW2NvbHVtbl0uZm9ybWF0KHZhbClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAnPz8/J1xufVxuXG4vKipcbiogVGhlIG1haW4gY2xhc3MgdGhhdCBjb250cm9scyB0aGUgaW5pdGlhbGl6YXRpb24gYW5kIGxpZmVjeWNsZSBvZiBtYWtpbmcgdGhlIFNWR1xuKiBkeW5hbWljIGFuZCByZXNwb25kaW5nIHRvIG1lc3NhZ2UgZXZlbnRzIGZyb20gdGhlIFZBIERhdGEtZHJpdmVuIENvbnRlbnQgZnJhbWV3b3JrLlxuKi9cbmNsYXNzIER5bmFtaWNTVkcgZXh0ZW5kcyBEeW5hbWljIHtcblxuICAgIG1lc3NhZ2U6IGFueSA9IHt9IC8vIERhdGEgbWVzc2FnZSB0byBiZSByZWNlaXZlZCBmcm9tIFZBXG4gICAgcmVzdWx0TmFtZTogc3RyaW5nID0gJycgLy8gUmVzdWx0IG5hbWUgcmVxdWlyZWQgdG8gc2VuZCBtZXNzYWdlcyBiYWNrIHRvIFZBXG4gICAgZGF0YTogRGF0YUZyYW1lID0ge30gLy8gRGF0YUZyYW1lIGZvciBkYXRhIHJlc3BvbnNlXG4gICAgZGF0YUZvcm1hdHM6IGFueSA9IHt9XG4gICAgZGF0YUZvcm1hdHNDb21wYWN0OiBhbnkgPSB7fVxuXG4gICAgaW5pdENvbXBsZXRlOiBib29sZWFuID0gZmFsc2UgLy8gRmxhZyB0byBoZWxwIGRlbGF5IHVwZGF0ZSBleGVjdXRpb25cblxuICAgIGluc3RhbmNlU1ZHOiBzdHJpbmcgPSAnJyAvLyBSZXBhdGFibGUgYm9keSBvZiBvcmlnaW5hbCBTVkcgY29kZVxuICAgIGR5bmFtaWNzOiBEeW5hbWljW10gPSBbXVxuXG4gICAgLyoqXG4gICAgKiBBdHRhY2ggdG8gdGhlIGluZGljYXRlIGVsZW1lbnQgRE9NIGVsZW1lbnQgYW5kIGZpbGwgaXQgd2l0aCB0aGUgdGFyZ2V0IFNWRy4gQWxzb1xuICAgICogcGVyZm9ybSBhbGwgcGFyc2luZyBhbmQgcHJlY29tcHV0YXRpb24gc3RlcHMuXG4gICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgVGhlIHJvb3QgRE9NIGVsZW1lbnQgdG8gdXNlIGZvciBwbGFjZW1lbnQgb2YgU1ZHLlxuICAgICovXG4gICAgY29uc3RydWN0b3IoZWxlbWVudCkge1xuXG4gICAgICAgIHN1cGVyKGVsZW1lbnQpXG5cbiAgICAgICAgdGhpcy5vcHRzID0ge1xuICAgICAgICAgICAgc3ZnOiAndGVzdC5zdmcnLFxuICAgICAgICAgICAgY2xlYW46ICdhbGwnLFxuICAgICAgICAgICAgZHluYW1pY3M6ICdhbGwnXG4gICAgICAgIH0gLy8gT2JqZWN0IHRvIG9sZCBvcHRpb25zIGFuZCBkZWZpbmUgZGVmYXVsdHNcblxuICAgICAgICB0aGlzLmluaXQoKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbml0aWFsaWF0aW9uIG9mIHBhZ2UgYmFzZWQgb24gVVJMIG9wdGlvbnMuXG4gICAgICovXG4gICAgaW5pdCgpIHtcblxuICAgICAgICB0aGlzLm9wdHMgPSB7IC4uLnRoaXMub3B0cywgLi4ubWVzc2FnaW5nLmdldFVybFBhcmFtcygpIH1cblxuICAgICAgICBmZXRjaCh0aGlzLm9wdHMuc3ZnLCB7IG1ldGhvZDogJ0dFVCcgfSlcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLnRleHQoKSlcbiAgICAgICAgICAgIC50aGVuKHRleHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSB0ZXh0XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ZnID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ3N2ZycpXG4gICAgICAgICAgICAgICAgaWYgKHN2Zykge1xuICAgICAgICAgICAgICAgICAgICBjbGVhblNWRyhzdmcsIHRoaXMub3B0cy5jbGVhbi5zcGxpdCgnLCcpKVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdnJylcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXAuY2xhc3NMaXN0LmFkZCgnX19pbnN0YW5jZV9fJylcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXAuaWQgPSAnX19pbnN0YW5jZV8wMDAxX18nXG4gICAgICAgICAgICAgICAgICAgIGdyb3VwLmFwcGVuZCguLi5bLi4uc3ZnLmNoaWxkcmVuXS5maWx0ZXIoZSA9PiBlLnRhZ05hbWUgIT09ICdzdHlsZScpKVxuXG4gICAgICAgICAgICAgICAgICAgIHN2Zy5hcHBlbmQoZ3JvdXApXG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5keW5hbWljcyA9IER5bmFtaWNTVkcuZ2V0RHluYW1pY3MoZ3JvdXApXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VTVkcgPSBncm91cC5pbm5lckhUTUxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0Q29tcGxldGUgPSB0cnVlXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IGNvbnNvbGUuZXJyb3IoJ0Vycm9yOiAnLCBlcnJvcikpXG5cbiAgICAgICAgbWVzc2FnaW5nLnNldE9uRGF0YVJlY2VpdmVkQ2FsbGJhY2sodGhpcy5vbkRhdGFSZWNlaXZlZC5iaW5kKHRoaXMpKVxuICAgICAgICBjb250ZW50LnNldHVwUmVzaXplTGlzdGVuZXIodGhpcy5kcmF3LmJpbmQodGhpcykpXG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBjbGVhbmluZyB0YXNrcyBvbiBTVkcgdG8gYWxsb3cgZm9yIGJldHRlciBkeW5hbWljIGJlaGF2aW9yLlxuICAgICAqIEBwYXJhbSB7RWxlbWVudH0gc3ZnIFNWRyBlbGVtZW50IHRvIHBlcmZvcm0gY2xlYW5pbmcgb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXT19IHR5cGVzIFZhbHVlczogYWxsIHwgdGV4dFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXREeW5hbWljcyhzdmcsIHR5cGVzID0gWydhbGwnXSkge1xuICAgICAgICBsZXQgZHluYW1pY3MgPSBbXVxuICAgICAgICBpZiAodHlwZXMuaW5jbHVkZXMoJ2FsbCcpIHx8IHR5cGVzLmluY2x1ZGVzKCd0ZXh0JykpIHtcbiAgICAgICAgICAgIGR5bmFtaWNzLnB1c2goLi4uRHluYW1pY1RleHQuZ2V0RHluYW1pY3Moc3ZnKSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZHluYW1pY3NcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBjdXJyZW50IF9kYXRhIHRvIGFsbCBkeW5hbWljcy5cbiAgICAgKi9cbiAgICBhcHBseSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmluaXRDb21wbGV0ZSkge1xuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQodGhpcy5hcHBseS5iaW5kKHRoaXMpLCAxMDApXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmR5bmFtaWNzLmZvckVhY2goZCA9PiBkLmFwcGx5KHRoaXMuZGF0YSkpLy8sIHRoaXMuZGF0YUZvcm1hdHMsIHRoaXMuZGF0YUZvcm1hdHNDb21wYWN0ICkgKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlc2l6ZSBldmVudHMgb3Igb3RoZXIgbGF5b3V0IGNoYW5nZXMuXG4gICAgICovXG4gICAgZHJhdygpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgdG8gaGFuZGxlIGRhdGEgdXBkYXRlIGZyb20gVkEgRERDLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlRnJvbVZBIE1lc3NhZ2Ugb2JqZWN0IGZyb20gVkEgRERDIGRhdGEgdXBkYXRlLlxuICAgICAqL1xuICAgIG9uRGF0YVJlY2VpdmVkKG1lc3NhZ2VGcm9tVkEpIHtcblxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlRnJvbVZBXG4gICAgICAgIHRoaXMucmVzdWx0TmFtZSA9IHRoaXMubWVzc2FnZS5yZXN1bHROYW1lXG4gICAgICAgIHRoaXMuZGF0YSA9IHBhcnNlRGF0YSh0aGlzLm1lc3NhZ2UpXG4gICAgICAgIC8vdGhpcy5kYXRhRm9ybWF0cyA9IHBhcnNlRm9ybWF0cyggdGhpcy5tZXNzYWdlIClcbiAgICAgICAgLy90aGlzLmRhdGFGb3JtYXRzQ29tcGFjdCA9IHBhcnNlRm9ybWF0cyggdGhpcy5tZXNzYWdlLCB0cnVlIClcblxuICAgICAgICB0aGlzLmFwcGx5KClcblxuICAgIH1cblxufVxuXG5cblxuLy8gZDg4ODg4OGIgZDhiICAgZGIgZDg4ODg4OGIgZDg4ODg4OGIgZDg4ODg4OGIgIC5kOGIuICBkYiAgICAgIGQ4ODg4ODhiIGQ4ODg4OEQgZDg4ODg4YlxuLy8gICBgODgnICAgODg4byAgODggICBgODgnICAgYH5+ODh+ficgICBgODgnICAgZDgnIGA4YiA4OCAgICAgICAgYDg4JyAgIFlQICBkOCcgODgnICAgIFxuLy8gICAgODggICAgODhWOG8gODggICAgODggICAgICAgODggICAgICAgODggICAgODhvb284OCA4OCAgICAgICAgIDg4ICAgICAgIGQ4JyAgODhvb29vb1xuLy8gICAgODggICAgODggVjhvODggICAgODggICAgICAgODggICAgICAgODggICAgODh+fn44OCA4OCAgICAgICAgIDg4ICAgICAgZDgnICAgODh+fn5+flxuLy8gICAuODguICAgODggIFY4ODggICAuODguICAgICAgODggICAgICAuODguICAgODggICA4OCA4OGJvb28uICAgLjg4LiAgICBkOCcgZGIgODguICAgIFxuLy8gWTg4ODg4OFAgVlAgICBWOFAgWTg4ODg4OFAgICAgWVAgICAgWTg4ODg4OFAgWVAgICBZUCBZODg4ODhQIFk4ODg4ODhQIGQ4ODg4OFAgWTg4ODg4UFxuXG4vKipcbiAqIERPTSBsb2FkZWQgY2FsbGJhY2sgdG8ga2ljayBvZmYgaW5pdGlhbGl6YXRpb24gYW5kIGNhbGxiYWNrIHJlZ2lzdHJhdGlvbi5cbiAqL1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IGR5blNWRyA9IG5ldyBEeW5hbWljU1ZHKGRvY3VtZW50LmJvZHkpXG5cbiAgICAvLyBJZiBydW4gb3V0c2lkZSBvZiBWQSBhc3N1bWUgaW4gYSB0ZXN0aW5nIHNjZW5hcmlvXG4gICAgaWYgKCFpbklmcmFtZSgpKSB7XG4gICAgICAgIGR5blNWRy5vbkRhdGFSZWNlaXZlZChTQU1QTEVfTUVTU0FHRSlcbiAgICB9XG5cbn0pXG5cblxuXG4vLyBkODg4ODg4YiBkODg4ODhiIC5kODg4OC4gZDg4ODg4OGIgZDg4ODg4OGIgZDhiICAgZGIgIGQ4ODhiIFxuLy8gYH5+ODh+ficgODgnICAgICA4OCcgIFlQIGB+fjg4fn4nICAgYDg4JyAgIDg4OG8gIDg4IDg4JyBZOGJcbi8vICAgIDg4ICAgIDg4b29vb28gYDhiby4gICAgICA4OCAgICAgICA4OCAgICA4OFY4byA4OCA4OCAgICAgXG4vLyAgICA4OCAgICA4OH5+fn5+ICAgYFk4Yi4gICAgODggICAgICAgODggICAgODggVjhvODggODggIG9vb1xuLy8gICAgODggICAgODguICAgICBkYiAgIDhEICAgIDg4ICAgICAgLjg4LiAgIDg4ICBWODg4IDg4LiB+OH5cbi8vICAgIFlQICAgIFk4ODg4OFAgYDg4ODhZJyAgICBZUCAgICBZODg4ODg4UCBWUCAgIFY4UCAgWTg4OFAgXG5cbmNvbnN0IFNBTVBMRV9TVkcgPSBgXG48P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz5cbjxzdmcgd2lkdGg9XCIzMDBweFwiIGhlaWdodD1cIjI0MHB4XCIgdmlld0JveD1cIjAgMCAyMDAgMjQwXCIgdmVyc2lvbj1cIjEuMVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIj5cbiAgICA8ZyBpZD1cInRlc3QyXCIgc3Ryb2tlPVwibm9uZVwiIHN0cm9rZS13aWR0aD1cIjFcIiBmaWxsPVwibm9uZVwiIGZpbGwtcnVsZT1cImV2ZW5vZGRcIj5cbiAgICAgICAgPHRleHQgaWQ9XCJ7e2NvbG9yOlJldmVudWV9fVwiIGZvbnQtZmFtaWx5PVwic2Fucy1zZXJpZlwiIGZvbnQtc2l6ZT1cIjE2XCIgZm9udC13ZWlnaHQ9XCJub3JtYWxcIiBmaWxsPVwiIzMyMzEzMFwiPlxuICAgICAgICAgICAgPHRzcGFuIHg9XCIyNFwiIHk9XCI0NFwiPlJldmVudWU6IHt7UmV2ZW51ZX19PC90c3Bhbj5cbiAgICAgICAgICAgIDx0c3BhbiB4PVwiMjRcIiB5PVwiNjVcIj5FeHBlbnNlczoge3tFeHBlbnNlc319PC90c3Bhbj5cbiAgICAgICAgPC90ZXh0PlxuICAgICAgICA8cmVjdCBpZD1cIlJlY3RhbmdsZS17e2NvbG9yOkV4cGVuc2VzLHNjYWxlOiMyfX1cIiBmaWxsPVwiIzc2QTVGNVwiIHg9XCIyNFwiIHk9XCI5MVwiIHdpZHRoPVwiMTYwXCIgaGVpZ2h0PVwiMTYxXCI+PC9yZWN0PlxuICAgIDwvZz5cbjwvc3ZnPlxuYFxuXG5jb25zdCBTQU1QTEVfTUVTU0FHRSA9IHtcbiAgICB2ZXJzaW9uOiBcIjFcIixcbiAgICByZXN1bHROYW1lOiBcInJlc3VsdFwiLFxuICAgIHJvd0NvdW50OiAxOSxcbiAgICBhdmFpbGFibGVSb3dDb3VudDogMTksXG4gICAgZGF0YTogW1xuICAgICAgICBbXCJUZWNobm9sb2d5XCIsIDE4MDQzNSwgNTQ0MDAsIDgzNF0sXG4gICAgICAgIFtcIkVuZ2luZWVyaW5nXCIsIDgwODY3LCAxMjMwMCwgNDMyXSxcbiAgICAgICAgW1wiU2FsZXNcIiwgNTAwMDAsIDY1MDA0LCAzNDRdLFxuICAgICAgICBbXCJPcGVyYXRpb25zXCIsIDYwNzE0LCA0ODIwMCwgNTQzXVxuICAgIF0sXG4gICAgY29sdW1uczogW1xuICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcImJpNzZcIixcbiAgICAgICAgICAgIGxhYmVsOiBcIkRlcGFydG1lbnRcIixcbiAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogXCJiaTc3XCIsXG4gICAgICAgICAgICBsYWJlbDogXCJSZXZlbnVlXCIsXG4gICAgICAgICAgICB0eXBlOiBcIm51bWJlclwiLFxuICAgICAgICAgICAgdXNhZ2U6IFwicXVhbnRpdGF0aXZlXCIsXG4gICAgICAgICAgICBhZ2dyZWdhdGlvbjogXCJ0b3RhbENvdW50XCIsXG4gICAgICAgICAgICBmb3JtYXQ6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBcIkNPTU1BXCIsXG4gICAgICAgICAgICAgICAgd2lkdGg6IDEyLFxuICAgICAgICAgICAgICAgIHByZWNpc2lvbjogMCxcbiAgICAgICAgICAgICAgICBmb3JtYXRTdHJpbmc6IFwiQ09NTUExMi5cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcImJpNzhcIixcbiAgICAgICAgICAgIGxhYmVsOiBcIkV4cGVuc2VzXCIsXG4gICAgICAgICAgICB0eXBlOiBcIm51bWJlclwiLFxuICAgICAgICAgICAgdXNhZ2U6IFwicXVhbnRpdGF0aXZlXCIsXG4gICAgICAgICAgICBhZ2dyZWdhdGlvbjogXCJ0b3RhbENvdW50XCIsXG4gICAgICAgICAgICBmb3JtYXQ6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBcIkNPTU1BXCIsXG4gICAgICAgICAgICAgICAgd2lkdGg6IDEyLFxuICAgICAgICAgICAgICAgIHByZWNpc2lvbjogMCxcbiAgICAgICAgICAgICAgICBmb3JtYXRTdHJpbmc6IFwiQ09NTUExMi5cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcImJpNzlcIixcbiAgICAgICAgICAgIGxhYmVsOiBcIkVtcGxveWVlc1wiLFxuICAgICAgICAgICAgdHlwZTogXCJudW1iZXJcIixcbiAgICAgICAgICAgIHVzYWdlOiBcInF1YW50aXRhdGl2ZVwiLFxuICAgICAgICAgICAgYWdncmVnYXRpb246IFwidG90YWxDb3VudFwiLFxuICAgICAgICAgICAgZm9ybWF0OiB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJDT01NQVwiLFxuICAgICAgICAgICAgICAgIHdpZHRoOiAxMixcbiAgICAgICAgICAgICAgICBwcmVjaXNpb246IDAsXG4gICAgICAgICAgICAgICAgZm9ybWF0U3RyaW5nOiBcIkNPTU1BMTIuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF1cbn0iXX0=