(function () {
    'use strict';

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
     * @param secs Number of seconds in the duration.
     * @return Object with durations in h, m, and s properties.
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
    function parseVAFormat(column, compact = false) {
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
     * @param message Full message model from VA
     * @param compact Controls whether format generates compacted output or not.
     * @return List of column names to appropriate formatting method.
     */
    function parseVAFormats(message, compact = false) {
        let formats = {};
        message.columns.forEach((column) => (formats[column.label] = parseVAFormat(column, compact)));
        return formats;
    }

    var ColumnType;
    (function (ColumnType) {
        ColumnType[ColumnType["String"] = 0] = "String";
        ColumnType[ColumnType["Number"] = 1] = "Number";
        ColumnType[ColumnType["Date"] = 2] = "Date";
    })(ColumnType || (ColumnType = {}));
    class Row {
        constructor(data, columns) {
            this._values = [];
            this._cols_map = new Map();
            for (let i = 0; i < columns.length; i += 1) {
                if (i < data.length) {
                    this._values.push(data[i]);
                    this._cols_map.set(columns[i], i);
                }
            }
        }
        get(column) {
            if (typeof column === 'string') {
                if (this._cols_map.has(column)) {
                    const index = this._cols_map.get(column);
                    if (index != undefined) {
                        return this._values[index];
                    }
                }
            }
            else {
                return this._values[column];
            }
        }
        set(column, value) {
            if (typeof column === 'string') {
                if (this._cols_map.has(column)) {
                    const index = this._cols_map.get(column);
                    if (index != undefined) {
                        this._values[index] = value;
                    }
                }
            }
            else {
                this._values[column] = value;
            }
        }
        delete(column) {
            if (typeof column === 'string') {
                if (this._cols_map.has(column)) {
                    const index = this._cols_map.get(column);
                    if (index != undefined) {
                        this._values.splice(index, 1);
                        for (let [col_name, col_index] of this._cols_map) {
                            if (col_index > index) {
                                this._cols_map.set(col_name, col_index - 1);
                            }
                        }
                        this._cols_map.delete(column);
                    }
                }
            }
            else {
                if (column >= 0 && column < this._values.length) {
                    this._values.splice(column, 1);
                    const key = Array.from(this._cols_map.keys())[column];
                    for (let [col_name, col_index] of this._cols_map) {
                        if (col_index > column) {
                            this._cols_map.set(col_name, col_index - 1);
                        }
                    }
                    this._cols_map.delete(key);
                }
            }
        }
        renameColumn(column, name) {
            if (typeof column === 'string') {
                const index = this._cols_map.get(column);
                if (index !== undefined) {
                    this._cols_map.set(name, index);
                    this._cols_map.delete(column);
                }
            }
            else {
                const key = Array.from(this._cols_map.keys())[column];
                this._cols_map.set(name, column);
                this._cols_map.delete(key);
            }
        }
    }
    class Data {
        constructor(data, columns) {
            this._rows = [];
            this._cols = [];
            this._cols_map = new Map();
            for (let row_data of data) {
                this._rows.push(new Row(row_data, columns));
            }
            let types = [];
            let first_row = data[0];
            if (first_row) {
                types = data[0].map((d) => typeof d);
            }
            this._cols = columns.map((c, i) => ({
                name: c,
                type: types[i] === 'string' ? ColumnType.String : ColumnType.Number,
                format: {},
            }));
            columns.forEach((c, i) => this._cols_map.set(c, i));
            this.calcColumnStats();
        }
        get cols() {
            return Array.from(this._cols_map.keys());
        }
        get rows() {
            return this._rows;
        }
        get(row, column) {
            const r = this._rows[row];
            const col = this.getColumn(column);
            if (r && col) {
                return r.get(col.name);
            }
        }
        set(row, column, value) {
            if (row < this._rows.length) {
                const r = this._rows[row];
                const col = this.getColumn(column);
                if (col) {
                    r.set(col.name, value);
                }
            }
        }
        getColumn(column, type) {
            if (type === undefined) {
                if (typeof column === 'string') {
                    if (this._cols_map.has(column)) {
                        const index = this._cols_map.get(column);
                        if (index != undefined) {
                            return this._cols[index];
                        }
                    }
                }
                else {
                    return this._cols[column];
                }
            }
            else {
                if (typeof column === 'number') {
                    const selected_cols = this._cols.filter((c) => c.type === type);
                    return selected_cols[column];
                }
            }
        }
        renameColumn(column, name) {
            const col = this.getColumn(column);
            if (col) {
                const index = this._cols_map.get(col.name);
                if (index !== undefined) {
                    for (let row of this._rows) {
                        row.renameColumn(column, name);
                    }
                    this._cols_map.set(name, index);
                    this._cols_map.delete(col.name);
                    col.name = name;
                }
            }
        }
        getRow(row) {
            if (row < this._rows.length) {
                return this._rows[row];
            }
        }
        getFormatted(row, column, compact = false) {
            const col = this.getColumn(column);
            if (col) {
                const val = this.get(row, col.name);
                if (val !== undefined) {
                    if (compact && col.format.cmp) {
                        return col.format.cmp?.format(val);
                    }
                    else if (col.format.std) {
                        return col.format.std?.format(val);
                    }
                    else {
                        return val.toString();
                    }
                }
            }
            return '???';
        }
        setColumnFormat(column, format, compact = false) {
            const col = this.getColumn(column);
            if (col) {
                if (compact) {
                    col.format.cmp = format;
                }
                else {
                    col.format.std = format;
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
        min(column) {
            return this.getColumn(column)?.stats?.min;
        }
        max(column) {
            return this.getColumn(column)?.stats?.max;
        }
        sum(column) {
            return this.getColumn(column)?.stats?.sum;
        }
        avg(column) {
            return this.getColumn(column)?.stats?.avg;
        }
        calcColumnStats(columns = []) {
            if (columns.length <= 0) {
                columns = this._cols.map((c) => c.name);
            }
            function hasManualStats(column) {
                if (column.stats && column.stats.manual && column.stats.manual === true) {
                    return true;
                }
                return false;
            }
            const selected_cols = this._cols.filter((c) => columns.includes(c.name) && c.type === ColumnType.Number && !hasManualStats(c));
            selected_cols.forEach((col) => (col.stats = {
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE,
                sum: 0,
                avg: 0,
            }));
            for (let row of this._rows) {
                for (let col of selected_cols) {
                    if (col && col.stats) {
                        const val = row.get(col.name);
                        if (val < col.stats.min) {
                            col.stats.min = val;
                        }
                        if (val > col.stats.max) {
                            col.stats.max = val;
                        }
                        col.stats.sum += val;
                    }
                }
            }
            for (let col of selected_cols) {
                if (col && col.stats) {
                    col.stats.avg = col.stats.sum / this._rows.length;
                }
            }
        }
        setColumnStats(column, stats) {
            const col = this.getColumn(column);
            if (col) {
                if (!col.stats) {
                    col.stats = {
                        min: Number.MAX_VALUE,
                        max: Number.MIN_VALUE,
                        sum: 0,
                        avg: 0,
                    };
                }
                if (stats.min !== undefined) {
                    col.stats.min = stats.min;
                }
                if (stats.max !== undefined) {
                    col.stats.max = stats.max;
                }
                if (stats.sum !== undefined) {
                    col.stats.sum = stats.sum;
                }
                if (stats.avg !== undefined) {
                    col.stats.avg = stats.avg;
                }
                col.stats.manual = true;
            }
        }
        dropColumn(column) {
            const col = this.getColumn(column);
            if (col) {
                for (const row of this._rows) {
                    row.delete(col.name);
                }
                const dropped_index = this._cols_map.get(col.name);
                if (dropped_index != undefined) {
                    for (let [col_name, col_index] of this._cols_map) {
                        if (col_index > dropped_index) {
                            this._cols_map.set(col_name, col_index - 1);
                        }
                    }
                }
                this._cols_map.delete(col.name);
                this._cols = this._cols.filter((c) => c.name !== col.name);
                //console.log( column, this._cols )
            }
        }
        castColumn(column, type) {
            const col = this.getColumn(column);
            if (col) {
                col.type = type;
                switch (type) {
                    case ColumnType.String:
                        for (let row of this._rows) {
                            row.set(col.name, String(row.get(col.name)));
                        }
                        break;
                    case ColumnType.Number:
                        for (let row of this._rows) {
                            row.set(col.name, Number(row.get(col.name)));
                        }
                        this.calcColumnStats([col.name]);
                        break;
                    case ColumnType.Date:
                        break;
                }
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
                        data.castColumn(column.label, ColumnType.Number);
                        break;
                    // case 'date':
                    // case 'datetime':
                    //     data = data.cast( column.label, ( val ) => Date.parse( val ) )
                    //     break
                }
            });
            const stdFormats = parseVAFormats(message);
            for (let col in stdFormats) {
                data.setColumnFormat(col, stdFormats[col]);
            }
            const cmpFormats = parseVAFormats(message, true);
            for (let col in cmpFormats) {
                data.setColumnFormat(col, cmpFormats[col], true);
            }
            return data;
        }
    }

    const RE_DOUBLEBRACE = /{{([^}]+)}}/g;
    const RE_UNDERSCOREUNICODE = /_x([0-9A-Za-z]+)_/g;
    const RE_NOVALUEKEY = /(?:^|,)(\w+)(?:$|,)/g;
    const RE_NONJSONCHAR = /([^:,]+)/g;
    const RE_NUMBER = /^[-+]?[0-9]*\.?[0-9]+$/g;
    const RE_COLUMNID = /^[@#$][0-9]+$/g;
    const COL_ID_TYPE_PREFIXES = {
        '@': ColumnType.String,
        '#': ColumnType.Number,
        $: ColumnType.Date,
    };
    /**
     * Converts unicode character back to orignal string.
     *
     * @param text The text to decode.
     */
    function decodeIllustrator(text) {
        return text.replace(RE_UNDERSCOREUNICODE, function (match, g1) {
            return String.fromCharCode(parseInt('0x' + g1));
        });
    }
    /**
     * Encodes object literal into formal JSON syntax with quotes.
     *
     * @param text The text to encode to proper JSON.
     */
    function jsonEncodeLiteral(text) {
        return ('{' +
            text
                .replace(RE_NOVALUEKEY, function (match, g1) {
                return match.replace(g1, trimChars(g1, [' ', '-']) + ':true');
            })
                .replace(RE_NONJSONCHAR, function (match, g1) {
                if (match !== 'true' && match !== 'false' && !RE_NUMBER.test(match)) {
                    return '"' + trimChars(match, [' ', '-']) + '"';
                }
                return trimChars(match, [' ', '-']);
            }) +
            '}');
    }
    /**
     * Trims any of the specified characters from the star and end of the text.
     *
     * @param text The text to trim.
     * @param chars List of characters to trim.
     */
    function trimChars(text, chars) {
        var start = 0, end = text.length;
        while (start < end && chars.indexOf(text[start]) >= 0)
            ++start;
        while (end > start && chars.indexOf(text[end - 1]) >= 0)
            --end;
        return start > 0 || end < text.length ? text.substring(start, end) : text;
    }
    /**
     * Creates an object from a string in the format {{param|opt:val,opt:val}}.
     *
     * @param text The text to decode.
     */
    function syntax(text) {
        let obj = {
            name: '',
            opts: {},
        };
        const matches = text.match(RE_DOUBLEBRACE);
        if (matches) {
            text = matches[0].slice(2, -2);
            if (text.includes('|')) {
                const name_opts = text.split('|');
                obj.name = trimChars(name_opts[0], [' ', '-']);
                obj.opts = JSON.parse(jsonEncodeLiteral(name_opts[1]));
            }
            else if (text.includes(':')) {
                obj.opts = JSON.parse(jsonEncodeLiteral(text));
            }
            else {
                obj.name = trimChars(text, [' ', '-']);
            }
        }
        return obj;
    }
    function elementsWithOptions(svg, options) {
        return Array.from(svg.querySelectorAll('*[id]'))
            .filter((e) => e.id?.match(RE_DOUBLEBRACE))
            .filter(function (e) {
            let syn = syntax(e.id);
            for (let option in syn.opts) {
                if (options.includes(option)) {
                    return true;
                }
            }
            return false;
        });
    }
    function elementsByName(svg) {
        const elements = new Map();
        console.log(svg.querySelectorAll('*[id]'));
        Array.from(svg.querySelectorAll('*[id]'))
            .filter((e) => e.id?.match(RE_DOUBLEBRACE))
            .forEach(function (e) {
            console.log(e);
            let syn = syntax(e.id);
            if (syn.name) {
                elements.set(syn.name, e);
            }
        });
        return elements;
    }
    function firstObjectKey(object, keys) {
        for (let key of keys) {
            if (object.hasOwnProperty(key)) {
                return key;
            }
        }
    }
    /**
     * Detects type from @, #, and $ prefixes for string, number, and time and position.
     *
     * @param data The column id to parse.
     */
    function columnIdentifier(col_id) {
        let match = col_id.match(RE_COLUMNID);
        if (match) {
            const prefix = col_id.charAt(0);
            const index = col_id.substring(1);
            if (COL_ID_TYPE_PREFIXES.hasOwnProperty(prefix)) {
                return [COL_ID_TYPE_PREFIXES[prefix], Number.parseInt(index)];
            }
        }
    }
    /**
     * Returns column from data based on identifier.
     *
     * @param data The column id to lookup.
     */
    function columnFromData(col_str, data) {
        const col_id = columnIdentifier(col_str);
        let col;
        if (col_id) {
            const [type, index] = col_id;
            col = data.getColumn(index, type);
        }
        else {
            col = data.getColumn(col_str);
        }
        return col;
    }
    /**
     * Extracts {{min}} and {{max}} tagged columns from data and converts to stats, or pulls {{0 100}} range directly
     *
     * @param data The data object to parse the stats from.
     */
    function dataStats(data) {
        for (let col_name of data.cols) {
            if (col_name.match(RE_DOUBLEBRACE)) {
                const col = data.getColumn(col_name);
                if (col) {
                    const stat = syntax(col_name).name.toLowerCase();
                    const col_base_name = col_name.replace(RE_DOUBLEBRACE, '').trim();
                    const stats = stat.split(' ');
                    if (stats.length === 2 && stats[0].match(RE_NUMBER) && stats[0].match(RE_NUMBER)) {
                        const [min, max] = stats.map(Number);
                        data.renameColumn(col.name, col_base_name);
                        data.setColumnStats(col_base_name, { min: min, max: max });
                        // if( col_base_name === 'Expenses' ) {
                        //   console.log( col_base_name, data.min(col_base_name), min )
                        // }
                    }
                    else {
                        const target_col = data.getColumn(col_base_name);
                        if (target_col) {
                            switch (stat) {
                                case 'min':
                                    data.setColumnStats(target_col.name, { min: col.stats?.min });
                                    break;
                                case 'max':
                                    data.setColumnStats(target_col.name, { max: col.stats?.max });
                                    break;
                                case 'sum':
                                    data.setColumnStats(target_col.name, { sum: col.stats?.sum });
                                    break;
                                case 'avg':
                                    data.setColumnStats(target_col.name, { avg: col.stats?.avg });
                                    break;
                            }
                            data.dropColumn(col.name);
                        }
                    }
                }
            }
        }
        return data;
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
            this.opts = syntax(element.id).opts;
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
            const svgElem = this.element;
            const bbox = svgElem.getBBox();
            const key = firstObjectKey(this.opts, ['align', 'a']);
            if (key) {
                svgElem.setAttribute('text-anchor', this.opts[key].toString());
                switch (this.opts[key]) {
                    case 'start':
                        break;
                    case 'middle':
                        svgElem.setAttribute('x', (bbox.x + (bbox.width / 2)) + 'px');
                        break;
                    case 'end':
                        svgElem.setAttribute('x', (bbox.x + bbox.width) + 'px');
                        break;
                }
            }
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
                    const syntax$1 = syntax(match);
                    const col_id = columnIdentifier(syntax$1.name);
                    let col;
                    if (col_id) {
                        const [type, index] = col_id;
                        col = data.getColumn(index, type);
                    }
                    else {
                        col = data.getColumn(syntax$1.name);
                    }
                    if (col) {
                        if (syntax$1.opts.hasOwnProperty('name') && syntax$1.opts.name) {
                            return col.name;
                        }
                        else {
                            if (syntax$1.opts.hasOwnProperty('c') && syntax$1.opts.c) {
                                return data.getFormatted(0, col.name, true);
                            }
                            else {
                                return data.getFormatted(0, col.name);
                            }
                        }
                    }
                    else {
                        return '???';
                    }
                }.bind({ data: data }));
            }
        }
    }

    /**
     * The dynamic text class replaces mustache style double brace tags with a value from the data.
     */
    class DynamicTransform extends Dynamic {
        constructor(element) {
            super(element);
            this.base_transforms = [];
            const svgElem = this.element;
            this.bbox = svgElem.getBBox();
            this.origin = this.getOrigin();
            this.base_transforms = this.getBaseTransforms();
            this.wrapWithGroup();
            svgElem.setAttribute('vector-effect', 'non-scaling-stroke');
            svgElem.style.transitionProperty = 'transform';
            svgElem.style.transitionDuration = '1s';
            svgElem.style.transformOrigin = this.origin.x + 'px ' + this.origin.y + 'px';
            this.named_elems = elementsByName(element);
        }
        static getDynamics(svg, types = ['all']) {
            const options = [].concat(...DynamicTransform.transforms.map((t) => t.keys));
            return elementsWithOptions(svg, options).map((e) => new DynamicTransform(e));
        }
        getOrigin() {
            const svgElem = this.element;
            this.bbox = svgElem.getBBox();
            let origin_h = 0;
            let origin_v = 0;
            const key = firstObjectKey(this.opts, ['origin', 'o']);
            if (key) {
                const origin_opts = this.opts[key]?.toString().split('-');
                if (origin_opts) {
                    if (origin_opts.length > 1) {
                        origin_h = Number(origin_opts[0]);
                        origin_v = Number(origin_opts[1]);
                    }
                    else {
                        origin_h = origin_v = Number(origin_opts[0]);
                    }
                }
            }
            origin_h = this.bbox.x + this.bbox.width * origin_h;
            origin_v = this.bbox.y + this.bbox.height * origin_v;
            return { x: origin_h, y: origin_v };
        }
        wrapWithGroup() {
            const svgElem = this.element;
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            svgElem.insertAdjacentElement('afterend', group);
            group.append(svgElem);
            group.classList.add(...svgElem.classList);
            svgElem.classList.remove(...svgElem.classList);
            group.style.cssText = svgElem.style.cssText;
            svgElem.style.cssText = '';
            const cPath = svgElem.getAttribute('clip-path');
            if (cPath) {
                group.setAttribute('clip-path', cPath);
                svgElem.removeAttribute('clip-path');
            }
        }
        getBaseTransforms() {
            let base_transforms = [];
            const svgElem = this.element;
            if (svgElem.transform.baseVal.numberOfItems > 0) {
                for (let i = 0; i < svgElem.transform.baseVal.numberOfItems; i += 1) {
                    const transform = svgElem.transform.baseVal.getItem(i);
                    base_transforms.push('matrix(' +
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
                        ')');
                }
            }
            return base_transforms;
        }
        apply(data) {
            const svgElem = this.element;
            let transform_strs = [];
            if (this.base_transforms.length > 0) {
                transform_strs.push('translate(' + -this.origin.x + 'px,' + -this.origin.y + 'px)');
                transform_strs.push(...this.base_transforms);
                transform_strs.push('translate(' + this.origin.x + 'px,' + this.origin.y + 'px)');
            }
            for (let transform of DynamicTransform.transforms) {
                const key = firstObjectKey(this.opts, transform.keys);
                if (key) {
                    const col_str = this.opts[key].toString();
                    const col = columnFromData(col_str, data);
                    if (col?.stats) {
                        const val = data.get(0, col.name);
                        if (val) {
                            const norm = (val - col.stats.min) / (col.stats.max - col.stats.min);
                            const gkey = firstObjectKey(this.opts, ['guide', 'g']);
                            let guide = undefined;
                            if (gkey) {
                                guide = this.named_elems.get(this.opts[gkey].toString());
                            }
                            if (guide) {
                                transform_strs.push(transform.get(norm, this.opts, guide));
                            }
                            else {
                                transform_strs.push(transform.get(norm, this.opts));
                            }
                        }
                    }
                }
            }
            svgElem.style.transform = transform_strs.join(' ');
        }
    }
    DynamicTransform.transforms = [
        {
            keys: ['scale', 's'],
            get: function (t, opts, guide) {
                return 'scale(' + t + ',' + t + ')';
            },
        },
        {
            keys: ['scaleX', 'sx'],
            get: function (t, opts, guide) {
                return 'scaleX(' + t + ')';
            },
        },
        {
            keys: ['scaleY', 'sy'],
            get: function (t, opts, guide) {
                return 'scaleY(' + t + ')';
            },
        },
        {
            keys: ['rotate', 'r'],
            get: function (t, opts, guide) {
                let limit = 1.0;
                const key = firstObjectKey(opts, ['rotateLimit', 'rl']);
                if (key) {
                    limit = Number(opts[key]);
                }
                return 'rotate(' + t * 360 * limit + 'deg)';
            },
        },
        {
            keys: ['postion', 'p'],
            get: function (t, opts, guide) {
                console.log(guide);
                return 'translate(' + t + 'px,' + t + 'px)';
            },
        },
        {
            keys: ['positionX', 'px'],
            get: function (t, opts, guide) {
                return 'translateX(' + t + 'px)';
            },
        },
        {
            keys: ['positionY', 'py'],
            get: function (t, opts, guide) {
                return 'translateY(' + t + 'px)';
            },
        },
    ];

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
     * @param svg SVG element to perform cleaning on.
     * @param methods Values: all | text
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
        if (methods.includes('all') || methods.includes('decode')) {
            svg.querySelectorAll('*[id]').forEach(function (elem) {
                elem.id = decodeIllustrator(elem.id);
            });
        }
    }
    const SAMPLE_MESSAGE_2 = {
        version: '1',
        resultName: 'dd91',
        rowCount: 1,
        availableRowCount: 1,
        data: [['Bead', 'Dec', 112.81571032867849, 1329.474768526684]],
        columns: [
            { name: 'bi100', label: 'Department', type: 'string' },
            {
                name: 'bi101',
                label: 'Date',
                type: 'date',
                usage: 'categorical',
                format: { name: 'MONTH', width: 3, precision: 0, formatString: 'MONTH3' },
            },
            {
                name: 'bi102',
                label: 'Expenses {{0 300}}',
                type: 'number',
                usage: 'quantitative',
                aggregation: 'average',
                format: { name: 'DOLLAR', width: 15, precision: 2, formatString: 'DOLLAR15.2' },
            },
            {
                name: 'bi103',
                label: 'Revenue {{0.5 4820.50}}',
                type: 'number',
                usage: 'quantitative',
                aggregation: 'average',
                format: { name: 'DOLLAR', width: 15, precision: 2, formatString: 'DOLLAR15.2' },
            },
        ],
    };

    /**
     * The main class that controls the initialization and lifecycle of making the SVG
     * dynamic and responding to message events from the VA Data-driven Content framework.
     */
    class DynamicSVG extends Dynamic {
        /**
         * Attach to the indicate element DOM element and fill it with the target SVG. Also
         * perform all parsing and precomputation steps.
         * @param element The root DOM element to use for placement of SVG.
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
            };
            this.init();
        }
        /**
         * Handle initialiation of page based on URL options.
         */
        init() {
            this.opts = { ...this.opts, ...getUrlParams() };
            const htmlElement = this.element;
            htmlElement.style.opacity = '0';
            fetch(this.opts.svg.toString(), { method: 'GET' })
                .then((response) => response.text())
                .then((text) => {
                const htmlElement = this.element;
                htmlElement.innerHTML = text;
                const svg = htmlElement.querySelector('svg');
                if (svg) {
                    cleanSVG(svg, this.opts.clean.toString().split(','));
                    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    group.classList.add('__instance__');
                    group.id = '__instance_0001__';
                    group.append(...[...svg.children].filter((e) => e.tagName !== 'style'));
                    svg.append(group);
                    this.dynamics = DynamicSVG.getDynamics(group);
                    this.instanceSVG = group.innerHTML;
                }
                this.initComplete = true;
                htmlElement.style.transition = 'opacity 0.5s ease 1s';
                htmlElement.style.opacity = '1';
            })
                .catch((error) => console.error('Error: ', error));
            setOnDataReceivedCallback(this.onDataReceived.bind(this));
            setupResizeListener(this.draw.bind(this));
        }
        /**
         * Performs cleaning tasks on SVG to allow for better dynamic behavior.
         * @param svg SVG element to perform cleaning on.
         * @param types Values: all | text
         */
        static getDynamics(svg, types = ['all']) {
            let dynamics = [];
            if (types.includes('all') || types.includes('text')) {
                dynamics.push(...DynamicText.getDynamics(svg));
            }
            if (types.includes('all') || types.includes('shapes')) {
                dynamics.push(...DynamicTransform.getDynamics(svg));
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
                this.dynamics.forEach((d) => d.apply(this.data));
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
         * @param message Message object from VA DDC data update.
         */
        onDataReceived(message) {
            //console.log(JSON.stringify(message))
            this.message = message;
            this.resultName = this.message.resultName;
            this.data = Data.fromVA(this.message);
            this.data = dataStats(this.data);
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
            dynSVG.onDataReceived(SAMPLE_MESSAGE_2);
        }
    });

}());
