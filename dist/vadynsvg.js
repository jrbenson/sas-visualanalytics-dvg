(function () {
    'use strict';

    /**
     * Test if page contained in an iFrame.
     *
     * @return Indicator of iFrame containment.
     */
    function inIframe() {
        try {
            return window.self !== window.top;
        }
        catch (e) {
            return true;
        }
    }
    /**
     * Performs cleaning tasks on SVG to allow for better dynamic behavior.
     *
     * @param {Element} svg SVG element to perform cleaning on.
     * @param {string[]} methods Values: all | text
     */
    function cleanSVG(svg, methods = ['all']) {
        if (methods.includes('all') || methods.includes('text')) {
            svg.querySelectorAll('tspan').forEach(function (elem) {
                if (elem.parentElement && elem.parentElement.hasAttribute('x')) {
                    elem.removeAttribute('x');
                }
                if (elem.parentElement && elem.parentElement.hasAttribute('y')) {
                    elem.removeAttribute('y');
                }
            });
        }
    }
    const SAMPLE_MESSAGE = {
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
    };

    /*
    Copyright 2018 SAS Institute Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
    */
    var _timeoutID;
    function setupResizeListener(callback) {
        const resizeEndEvent = document.createEvent('Event');
        resizeEndEvent.initEvent('resizeEndEvent', false, true);
        //redraw graph when window resize is completed
        window.addEventListener('resizeEndEvent', function () {
            callback();
        });
        //create trigger to resizeEnd event
        window.addEventListener('resize', function () {
            if (_timeoutID) {
                clearTimeout(_timeoutID);
            }
            _timeoutID = setTimeout(function () {
                window.dispatchEvent(resizeEndEvent);
            }, 25);
        });
    }

    /*
    Copyright 2018 SAS Institute Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
    */
    function setOnDataReceivedCallback(callback) {
        //   const onMessage = function (evt: any) {
        //     if (evt && evt.data && evt.data.hasOwnProperty('data')) {
        //       callback(evt.data)
        //     }
        //   }
        window.addEventListener('message', (event) => {
            if (event && event.data && event.data.hasOwnProperty('data')) {
                callback(event.data);
            }
        }, false);
    }
    function getUrlParams() {
        let params = {};
        const search = window.location.search.slice(window.location.search.indexOf('?') + 1);
        search.split('&').forEach((pair) => {
            if (!pair.includes('=')) {
                params[pair] = '';
            }
            else {
                params[decodeURIComponent(pair.substr(0, pair.indexOf('=')))] = decodeURIComponent(pair.substr(pair.indexOf('=') + 1));
            }
        });
        return params;
    }

    const RE_DOUBLEBRACE = /{{([^}]+)}}/g;
    const RE_UNDERSCOREUNICODE = /_x([0-9A-Za-z]+)_/g;
    const RE_NOVALUEKEY = /(?:^|,)(\w+)(?:$|,)/g;
    const RE_NONJSONCHAR = /([^:,]+)/g;
    const RE_NUMBER = /[-+]?[0-9]*\.?[0-9]+/g;
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
        return ('{' +
            text
                .replace(RE_NOVALUEKEY, function (match, g1) {
                return match.replace(g1, g1 + ':true');
            })
                .replace(RE_NONJSONCHAR, function (match, g1) {
                if (match !== 'true' && match !== 'false' && !RE_NUMBER.test(match)) {
                    return '"' + match + '"';
                }
                return match;
            }) +
            '}');
    }
    /**
     * Creates an object from a string in the format {{param|opt:val,opt:val}}.
     *
     * @param {string} text The text to decode.
     */
    function parseSyntax(text) {
        let obj = {
            name: '',
            opts: {},
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

    class Row {
        constructor(data, columns) {
            this.values = new Map();
            for (let i = 0; i < columns.length; i += 1) {
                if (i < data.length) {
                    this.values.set(columns[i], data[i]);
                }
            }
        }
        set(column, value) {
            this.values.set(column, value);
        }
        get(column) {
            return this.values.get(column);
        }
    }
    class Data {
        constructor(data, columns) {
            this.rows = [];
            this.cols = [];
            this.frmt = {
                std: new Map(),
                cmp: new Map(),
            };
            for (let row_data of data) {
                this.rows.push(new Row(row_data, columns));
            }
            this.cols = columns;
        }
        setColumnFormat(column, format, compact = false) {
            if (this.cols.includes(column)) {
                if (compact) {
                    this.frmt.cmp.set(column, format);
                }
                else {
                    this.frmt.std.set(column, format);
                }
            }
        }
        setColumnFormats(columns, formats, compact = false) {
            for (let i = 0; i < columns.length; i += 1) {
                if (i < formats.length) {
                    this.setColumnFormat(columns[i], formats[i], compact);
                }
            }
        }
        castColumn(column, typeFunction) {
            if (this.cols.includes(column)) {
                for (let row of this.rows) {
                    row.set(column, typeFunction(row.get(column)));
                }
            }
        }
        set(row, column, value) {
            if (row < this.rows.length) {
                const r = this.rows[row];
                return r.set(column, value);
            }
        }
        get(row, column, compact = false) {
            const val = this.getRaw(row, column);
            if (val !== undefined) {
                if (compact && this.frmt.cmp.has(column)) {
                    return this.frmt.cmp.get(column)?.format(val);
                }
                else if (this.frmt.std.has(column)) {
                    return this.frmt.std.get(column)?.format(val);
                }
                else {
                    return val.toString();
                }
            }
            return '???';
        }
        getRaw(row, column) {
            if (row < this.rows.length) {
                const r = this.rows[row];
                return r.get(column);
            }
        }
        /**
         * Create a Data instance from data in VA data message.
         *
         * @param message Message object from VA DDC data update.
         * @return Data frame with proper type parsing applied.
         */
        static fromVA(message) {
            let data = new Data(message.data, message.columns.map((x) => x.label));
            message.columns.forEach((column) => {
                switch (column.type) {
                    case 'number':
                        data.castColumn(column.label, Number);
                        break;
                    // case 'date':
                    // case 'datetime':
                    //     data = data.cast( column.label, ( val ) => Date.parse( val ) )
                    //     break
                }
            });
            const stdFormats = parseFormats(message);
            for (let col in stdFormats) {
                data.setColumnFormat(col, stdFormats[col]);
            }
            const cmpFormats = parseFormats(message, true);
            for (let col in cmpFormats) {
                data.setColumnFormat(col, cmpFormats[col]);
            }
            return data;
        }
    }
    const BASIC_FORMATS = {
        DOLLAR: 'NLMNLUSD',
        EURO: 'NLMNLEUR',
        POUND: 'NLMNLGBP',
        WON: 'NLMNLCNY',
        YEN: 'NLMNLJPY',
    };
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
            s: seconds,
        };
        return obj;
    }
    /**
     * Parse the format model from VA into an object with a format method.
     *
     * @param {Object} format Format from VA message.
     * @param {boolean} compact Controls whether format generates compacted output or not.
     * @return {Formatter} Object with an appropriate format method.
     */
    function parseFormat(column, compact = false) {
        const format = column.format;
        if (format) {
            if (column.type === 'number') {
                let format_opts = {
                    maximumFractionDigits: format.precision,
                    minimumFractionDigits: format.precision,
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
                        format: (value) => {
                            if (typeof value === 'number') {
                                return (format.name.replace('NLMNI', '') + new Intl.NumberFormat(navigator.language, format_opts).format(value));
                            }
                        },
                    };
                }
                else if (format.name.startsWith('TIME')) {
                    return {
                        format: (value) => {
                            if (typeof value === 'number') {
                                const parts = timeFromSeconds(value);
                                return (('' + parts.h).padStart(2, '0') +
                                    ':' +
                                    ('' + parts.m).padStart(2, '0') +
                                    ':' +
                                    ('' + parts.s).padStart(2, '0'));
                            }
                            return '???';
                        },
                    };
                }
                else if (format.name.startsWith('HOUR')) {
                    return {
                        format: (value) => {
                            if (typeof value === 'number') {
                                const hours = Math.floor(value / (60 * 60));
                                return new Intl.NumberFormat(navigator.language).format(hours);
                            }
                            return '???';
                        },
                    };
                }
                else if (format.name.startsWith('HHMM')) {
                    return {
                        format: (value) => {
                            if (typeof value === 'number') {
                                const parts = timeFromSeconds(value);
                                return ('' + parts.h).padStart(2, '0') + ':' + ('' + parts.m).padStart(2, '0');
                            }
                            return '???';
                        },
                    };
                }
                else if (format.name.startsWith('MMSS')) {
                    return {
                        format: (value) => {
                            if (typeof value === 'number') {
                                const secs = Math.round(value);
                                const minutes = Math.floor(secs / 60);
                                const seconds = Math.ceil((secs % (60 * 60)) % 60);
                                return ('' + minutes).padStart(2, '0') + ':' + ('' + seconds).padStart(2, '0');
                            }
                            return '???';
                        },
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
                return {
                    format: (value) => {
                        if (typeof value === 'number') {
                            return new Intl.NumberFormat(navigator.language, format_opts).format(value);
                        }
                        return '???';
                    },
                };
            }
            else if (column.type === 'date') {
                return {
                    format: (value) => {
                        if (typeof value === 'string') {
                            return value;
                        }
                        return '???';
                    },
                };
            }
        }
        return {
            format: (value) => {
                if (typeof value === 'string') {
                    return value;
                }
                return '???';
            },
        };
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
        message.columns.forEach((column) => (formats[column.label] = parseFormat(column, compact)));
        return formats;
    }

    /**
     * Base class for dynamics, which are called during update to apply data to the SVG.
     */
    class Dynamic {
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
        apply(data) { }
    }
    /**
     * The dynamic text class replaces mustache style double brace tags with a value from the data.
     */
    class DynamicText extends Dynamic {
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
            elems = elems.filter((e) => e.textContent && e.textContent.match(RE_DOUBLEBRACE));
            return elems.map((e) => new DynamicText(e));
        }
        apply(data) {
            if (this.template) {
                this.element.textContent = this.template.replace(RE_DOUBLEBRACE, function (match) {
                    const syntax = parseSyntax(match);
                    if (syntax.opts.hasOwnProperty('c') && syntax.opts.c) {
                        return data.get(0, syntax.name, true);
                    }
                    else {
                        return data.get(0, syntax.name);
                    }
                }.bind({ data: data }));
            }
        }
    }
    /**
     * The main class that controls the initialization and lifecycle of making the SVG
     * dynamic and responding to message events from the VA Data-driven Content framework.
     */
    class DynamicSVG extends Dynamic {
        /**
         * Attach to the indicate element DOM element and fill it with the target SVG. Also
         * perform all parsing and precomputation steps.
         * @param {Element} element The root DOM element to use for placement of SVG.
         */
        constructor(element) {
            super(element);
            this.message = { resultName: '', version: '', rowCount: 0, availableRowCount: 0, data: [], columns: [] }; // Data message to be received from VA
            this.resultName = ''; // Result name required to send messages back to VA
            this.data = new Data([], []); // DataFrame for data response
            this.initComplete = false; // Flag to help delay update execution
            this.instanceSVG = ''; // Repatable body of original SVG code
            this.dynamics = [];
            this.opts = {
                svg: 'test.svg',
                clean: 'all',
                dynamics: 'all',
            }; // Object to old options and define defaults
            this.init();
        }
        /**
         * Handle initialiation of page based on URL options.
         */
        init() {
            this.opts = { ...this.opts, ...getUrlParams() };
            fetch(this.opts.svg, { method: 'GET' })
                .then((response) => response.text())
                .then((text) => {
                this.element.innerHTML = text;
                const svg = this.element.querySelector('svg');
                if (svg) {
                    cleanSVG(svg, this.opts.clean.split(','));
                    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    group.classList.add('__instance__');
                    group.id = '__instance_0001__';
                    group.append(...[...svg.children].filter((e) => e.tagName !== 'style'));
                    svg.append(group);
                    this.dynamics = DynamicSVG.getDynamics(group);
                    this.instanceSVG = group.innerHTML;
                }
                this.initComplete = true;
            })
                .catch((error) => console.error('Error: ', error));
            setOnDataReceivedCallback(this.onDataReceived.bind(this));
            setupResizeListener(this.draw.bind(this));
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
                this.dynamics.forEach((d) => d.apply(this.data)); //, this.dataFormats, this.dataFormatsCompact ) )
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
            this.data = Data.fromVA(this.message);
            //this.dataFormats = parseFormats( this.message )
            //this.dataFormatsCompact = parseFormats( this.message, true )
            this.apply();
        }
    }

    /**
     * DOM loaded callback to kick off initialization and callback registration.
     */
    document.addEventListener('DOMContentLoaded', function () {
        let dynSVG = new DynamicSVG(document.body);
        // If run outside of VA assume in a testing scenario
        if (!inIframe()) {
            dynSVG.onDataReceived(SAMPLE_MESSAGE);
        }
    });

}());
