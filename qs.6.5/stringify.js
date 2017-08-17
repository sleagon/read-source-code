'use strict';

var utils = require('./utils');
var formats = require('./formats');

// 对于数组的处理逻辑
var arrayPrefixGenerators = {
    // a[] 形式  [长度不受限，不过顺序需要保持]
    brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
        return prefix + '[]';
    },
    // a[1] 形式 [不需要担心顺序问题，但是过长会出现解析失败，需要主动调整options里的arrayLimit字段]
    indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
        return prefix + '[' + key + ']';
    },
    // a 形式  [类似brackets，不推荐这么写]
    repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
        return prefix;
    }
};

var toISO = Date.prototype.toISOString;

var defaults = {
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    encodeValuesOnly: false,
    serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var stringify = function stringify( // eslint-disable-line func-name-matching
    object, // 值
    prefix, // 父节点键名
    generateArrayPrefix,
    strictNullHandling,
    skipNulls,
    encoder,
    filter,
    sort,
    allowDots,
    serializeDate,
    formatter,
    encodeValuesOnly
) {
    // 编码后的数据插入点
    var obj = object;

    // 
    if (typeof filter === 'function') {
        //  过滤子成员
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        // Date 转字符串 支持自定义
        obj = serializeDate(obj);
    } else if (obj === null) {
        // strictNullHandling 表示需要处理null
        if (strictNullHandling) {
            // encoder第二个参数主要是为了用户定义的encoder调用的

            // 这几个条件判断的作用：
            // a, strictNullHandling表示需要处理null键
            // b, encodeValuesOnly表示只编码值，不编码key, 空对象直接返回键值
            // 例如：strictNullHandling = true; 则{a:null,b:1} => "a&b=1"
            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder) : prefix;
        }

        // 如果不处理null，则置为空字符串，方便后面处理
        obj = '';
    }

    // 基本类型[需要注意Buffer，同样可以转换为String，需要注意的是ArrayBuffer并没有isBuffer]
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {

        // 有encoder，则编码
        if (encoder) {

            // 编码
            var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder);
            // 按标准规范
            return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
    }

    // 其他类型

    // 结果
    var values = [];

    // 防范a=undefined出现，因为null===undefined 为false
    // 这么做的原因是所有的undefined的直接忽略了，而null的则按上面的处理逻辑来。
    // 尽量避免undefined
    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;

    // 数组过滤（上面已经处理了函数的情况）
    if (Array.isArray(filter)) {
        objKeys = filter;
    } else {

        // 其他情况忽略，直接选所有
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    // 遍历
    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        // 忽略掉null对象
        if (skipNulls && obj[key] === null) {
            continue;
        }

        // 递归处理数组
        if (Array.isArray(obj)) {
            values = values.concat(stringify(
                obj[key],
                generateArrayPrefix(prefix, key),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        } else {

            // 递归调用，直到从上面的几个跳出点为止
            values = values.concat(stringify(
                obj[key],
                prefix + (allowDots ? '.' + key : '[' + key + ']'),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly
            ));
        }
    }

    return values;
};

module.exports = function (object, opts) {
    // 输入
    var obj = object;
    
    // 深拷贝
    var options = opts ? utils.assign({}, opts) : {};

    // 检查option
    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
    var encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
    var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
    var encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
    if (typeof options.format === 'undefined') {
        options.format = formats.default;
    } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
        throw new TypeError('Unknown format option provided.');
    }

    // 选择标准
    var formatter = formats.formatters[options.format];
    var objKeys;
    var filter;

    // 看上去是过滤某些字段，支持函数和数组
    if (typeof options.filter === 'function') {
        filter = options.filter;
        // 过滤obj
        obj = filter('', obj);
    } else if (Array.isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    var keys = [];

    // obj必须是非空object
    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    // arrayFormat 方式
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
        // 支持options.indices = true之类的写法
        arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    // 选定
    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    // 如果之前没给keys，则全取
    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    // key 排序
    if (sort) {
        objKeys.sort(sort);
    }

    // 循环处理所有的key
    // 这里的objKeys是过滤以后的key[函数的在上面已经处理了]
    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        // 忽略null
        if (skipNulls && obj[key] === null) {
            continue;
        }

        // 做成数组
        keys = keys.concat(stringify(
            obj[key],
            key,
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encode ? encoder : null,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly
        ));
    }

    // delimiter 为连接符
    var joined = keys.join(delimiter);

    // 是否加前缀
    var prefix = options.addQueryPrefix === true ? '?' : '';

    // 避免"?"
    return joined.length > 0 ? prefix + joined : '';
};
