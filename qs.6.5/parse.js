'use strict';

var utils = require('./utils');

var has = Object.prototype.hasOwnProperty;

var defaults = {
    allowDots: false,
    allowPrototypes: false,
    arrayLimit: 20,
    decoder: utils.decode,
    delimiter: '&',
    depth: 5,
    parameterLimit: 1000,
    plainObjects: false,
    strictNullHandling: false
};

var parseValues = function parseQueryStringValues(str, options) {
    // 结果
    var obj = {};

    // 去掉开头的问号
    var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;

    // 最大支持长度
    var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;

    // split 第二个参数表示最大参数数目，undefined表示不限制(不能用Infinity)
    var parts = cleanStr.split(options.delimiter, limit); // 2. 巧用split第二个参数

    //遍历各个分割后的字符串
    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i];


        //找到类似a[1]=2,a[]=3的=所在位置，由于]的存在，需要+1
        var bracketEqualsPos = part.indexOf(']=');

        //如果没找到就说明不是数组的形式
        var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

        var key, val;
        if (pos === -1) {//该段没有发现=
            // 对整个解码作为key
            key = options.decoder(part, defaults.decoder);
            // 设置默认值
            val = options.strictNullHandling ? null : '';
        } else {

            // 解码key 和 value
            key = options.decoder(part.slice(0, pos), defaults.decoder);
            val = options.decoder(part.slice(pos + 1), defaults.decoder);
        }

        // 判断是否有同名的，如果有同名的则作为数组处理
        if (has.call(obj, key)) {
            obj[key] = [].concat(obj[key]).concat(val); // 3. 合并数组(兼容非数组)
        } else {//没有则直接赋值
            obj[key] = val;
        }
    }


    // 循环处理所有的字段，可以初步得到解析以后的结构体。
    // e.g. "?a=1&a=2&a=3&b[]=1&b[]=2&b[]=2&c[1]=1&c[2]=2&c[3]=3&d=1" =>
    // {a: [1, 2, 3], b[]: [1, 2, 3], c[1]: 1, c[2]: 2, c[3]: 3, d:1}
    return obj;
};

var parseObject = function parseObjectRecursive(chain, val, options) {

    // 空数组直接返回，作为递归的跳出点
    if (!chain.length) {
        return val;
    }


    // 第一个为根key
    var root = chain.shift();

    // 结果
    var obj;

    // 如果遇到了[][1]字样的字段，则在这里做特殊处理
    if (root === '[]') {
        // 处理的结果为数组
        obj = [];
        obj = obj.concat(parseObject(chain, val, options));
    } else {// 其他形式的
        // 结果为对象
        obj = options.plainObjects ? Object.create(null) : {};

        // 剥离root的括号，因为在递归调用中必然会出现root为[...]的形式。
        var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;

        // 如果发现root是数字则处理成数组
        var index = parseInt(cleanRoot, 10);

        // 判断是否是数字，条件如下
        // a, 必须为合法数字
        // b, 不能是chain的第一个，即跟节点
        // c, 避免是从toString导出的, 能恢复
        // d, option设置了解析数组
        // e, 数组长度在允许的长度以内
        // 这里设置一个长度限制的主要原因是避免空间占用，比如有个query如下：`?a[1000]=1&b[1000]=2&c[1000]=3`
        // 如果不设置长度限制这里会生成三个长度为1000的数组，显然不合理。默认arrayLimit=20
        if (
            !isNaN(index) //...
            && root !== cleanRoot 
            && String(index) === cleanRoot
            && index >= 0
            && (options.parseArrays && index <= options.arrayLimit)
        ) {
            // 这里返回的同样是数组，需要注意的是这里已经排除了根节点，所以必然是在回调中出现，最终的返回仍然是结构体。
            obj = [];
            obj[index] = parseObject(chain, val, options);
        } else {
            // 如果不需要做特殊处理就直接作为结构体处理。
            obj[cleanRoot] = parseObject(chain, val, options);
        }
    }

    // 返回结果（可能是数组或者结构体）
    return obj;
};

var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
    //没key 直接返回
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    //4. 把a.b.c的形式转换成a[b][c]的形式
    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    // 5. 通过多次执行exec来遍历str
    // 参考： http://devdocs.io/javascript/global_objects/regexp/exec
    // 注意下面的brackets和child只差了一个g标识。
    // regex会有一个lastIndex标识上一次找到的位置，如果带g标识则每次查找会更新lastIndex，如果不带g则不会更新
    // regex并不知道在处理谁，如果加了exec标识，不要用同一个regex重复处理多个对象，因为lastIndex会导致结果跟预期不符。
    // 如果必须要这么做则尽量不要定义变量，而是直接写；或者记得在合适的地方把lastIndex重置为0。
    var brackets = /(\[[^[\]]*])/;
    var child = /(\[[^[\]]*])/g;


    //找到第一个[]的位置(必须[]成对),例如: abcde[a[][cd]的结果就会是5
    var segment = brackets.exec(key);

    //截取得到上面的abcde这一部分
    var parent = segment ? key.slice(0, segment.index) : key;

    //存储解析出来的key，比如a[b][c][d] => [a, b, c]
    var keys = [];
    if (parent) {
        
        // 6. 巧用has.call
        // 如果不是plainObjects，则需要判断parent键值是否在Object.prototype里，避免覆盖。比如parent="toString"如果不判断就会被覆盖,
        // 所以需要这里做特殊处理。
        // has.call可以避免很多TypeError，比如我们常用a.reverse，但是一旦a=1或者a是其他没有reverse的对象，
        // 而使用reverse = String.prototype.reverse; reverse.call(1)就不会报错，不过会有一定的副作用，
        // 需要正确应对。
        if (!options.plainObjects && has.call(Object.prototype, parent)) {

            // 一旦发现类似"toString"这样的key，但是设置里设置了不允许覆盖，则直接返回。
            if (!options.allowPrototypes) {
                return;
            }
        }

        // key合法
        keys.push(parent);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;

    // 开始遍历子健部分，即a[b][c][d]里的b c d部分
    // 这里设置了遍历的深度
    // 对于带g的标识的，可以采用这种遍历，务必要带g标识。具体参考5中的文档
    while ((segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;

        // 同6做判断
        // 7. 利用slice(1, -1)来截取[]以内的内容。
        // 注意：由于child这里带了括号，所以segemen[1]是括号里的内容。
        // 关于slice作为负值的参考文档： http://devdocs.io/javascript/global_objects/array/slice
        // 几个常用的slice
        // 截取最后一个: slice(-1)
        // 截取后两个: slice(-2)...
        // 截取倒数第二个: slice(-2, -1)
        // 截取1~n-2个: slice(1, -1)
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        // 推入截取以后的key: [b] => b
        keys.push(segment[1]);
    }


    // 如果达到最大深度，则（才）会出现segment非null的现象，会剩下一坨类似[f][g]...[x]的片段，
    // 之前的a.b.c => a[b][c]过程保证了后面的必定这样的格式。
    if (segment) {
        // 剩下的统一作为key。肯定含有[]。
        keys.push('[' + key.slice(segment.index) + ']');
    }
    
    // keys为分解以后的key数组，e.g. [a, b, c,..., [e[f][g]]]
    // value为对应的值

    // 需要注意的是a[],b[]的形式这里已经变成了a, b.
    return parseObject(keys, val, options);
};

module.exports = function (str, opts) {
    var options = opts ? utils.assign({}, opts) : {};

    if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    options.ignoreQueryPrefix = options.ignoreQueryPrefix === true;
    options.delimiter = typeof options.delimiter === 'string' || utils.isRegExp(options.delimiter) ? options.delimiter : defaults.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : defaults.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults.decoder;
    options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : defaults.allowDots;
    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults.plainObjects;
    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults.allowPrototypes;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults.parameterLimit;
    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;

    // 1. 使用Object.create(null)
    // plainObject vs object, Object.create(null) vs {} 二者并不完全相等.
    // 可以在这里找到相关信息: https://stackoverflow.com/questions/32262809/is-it-bad-practice-to-use-object-createnull-versus
    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    // 得到初步的结构体，需要进一步处理，主要集中在嵌套的结构体和数组
    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;


    // 结果
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    // keys, 入a, b[], c[1], d
    var keys = Object.keys(tempObj);

    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        
        //把上面的非标准的key-value 处理成标准的key-value
        var newObj = parseKeys(key, tempObj[key], options);

        // 把最新的结果并入结果中
        obj = utils.merge(obj, newObj, options);
    }

    // 从merge可以看到，到此为止，所有的query已经被处理成了结构体（必然是结构体）
    return utils.compact(obj);
};
