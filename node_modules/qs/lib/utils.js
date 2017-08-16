'use strict';

var has = Object.prototype.hasOwnProperty;

// hex映射表 e.g. 1 => %01, 20 => %14
var hexTable = (function () {
    var array = [];
    for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }

    return array;
}());

// 数组转对象，["a","b","c"] => {1: "a", 2: "b", 3: "c"}
exports.arrayToObject = function (source, options) {
    var obj = options && options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

exports.merge = function (target, source, options) {
    // target 目标[形式不明，看完该函数才知道]，目前是{}或者new Object(null)
    // source 解析得到一个结构体或者数组

    if (!source) {
        return target;
    }

    // 如果source非object，number活string之类的(暂时没发现什么时候会这样)
    // 补充：看到下面的回调发现确实有这种情况。
    if (typeof source !== 'object') {

        // 如果目标为数组
        if (Array.isArray(target)) {
            target.push(source);
        } else if (typeof target === 'object') {

            // 略 多次出现了已经
            if (options.plainObjects || options.allowPrototypes || !has.call(Object.prototype, source)) {
                // 这里的处理方式很奇特，把value作为key，键值设置为true。
                target[source] = true;
            }
        } else {
            // source和target 都不是对象，返回二者组成的数组（可能在某些前面没分析到的极端情况下会出现这种情况吧....）
            return [target, source];
        }

        // 返回结果
        return target;
    }

    if (typeof target !== 'object') {
        // source 为object, target不是, 同样组成数组， 
        return [target].concat(source);
    }

    // 后面的则相对正常，二者都是object
    var mergeTarget = target;

    // 如果target是数组而source不是数组，则需要把原数组改成结构体
    // 出现这个问题的大部分场景都是数组长度超过了option里的数组长度限制。
    if (Array.isArray(target) && !Array.isArray(source)) {

        // arrayToObject 没什么技巧的内容，仅仅是做了数组到结构体的转换
        mergeTarget = exports.arrayToObject(target, options);
    }

    // 二者都是数组
    if (Array.isArray(target) && Array.isArray(source)) {
        // 遍历源
        source.forEach(function (item, i) {
            // 如果发现目标在i这里已经有值了，则需要特殊处理
            if (has.call(target, i)) {
                // 如果占位值是一个非空对象
                if (target[i] && typeof target[i] === 'object') {
                    // 这里处理逻辑很特殊
                    // 并没有直接丢弃掉该值，而是把值作为新的源递归合并到目标中去。
                    // e.g. query="a[b][x]=1&a[c]=2&a[b]=3"
                    // 在处理a[b]=3的时候会触发该情况
                    // 进而出现上面source为非对象的情况。
                    target[i] = exports.merge(target[i], item, options);
                } else {
                    // 其他情况统一丢弃掉子index, 直接push到数组中
                    // query = "a[]=1&a[]=2&a[1]=3" 触发该情况
                    // 这个时候a[1]=3会被当做a[]=3处理
                    // 这时候顺序会比较关键，最好不要这么写。
                    target.push(item);
                }
            } else {
                // 如果没有，则直接赋值即可
                target[i] = item;
            }
        });
        return target;
    }

    // 8. 使用Object.keys来遍历对象（兼容结构体和数组）
    // target不是数组
    // 不论source是不是数组都可以使用Object.keys这一套逻辑处理
    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        // 如果发现target中有了，则需要合并
        if (has.call(acc, key)) {
            // 这个时候就有可能触发前面的target和value都不是object的场景。
            // 也可能不会触发，因为acc[key]也可能是数组或者对象
            acc[key] = exports.merge(acc[key], value, options);
        } else {
            // 没有则直接赋值
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};
// 深拷贝
// 最保险的做法还是JSON.pars(JSON.stringify(a))
// 这种做法只支持一层的拷贝，不过这里的场景就是一层
// 可以充分借鉴这里的reduce用法，但是不要照搬函数
// 11. 充分利用reduce函数
exports.assign = function assignSingleSource(target, source) {
    return Object.keys(source).reduce(function (acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
};

// 解码： + => ' ' 编码的时候正好相反
// 其余直接使用decodeURIComponent
exports.decode = function (str) {
    try {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    } catch (e) {
        return str;
    }
};


// url 编码
exports.encode = function (str) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    // 对于几种基本类型，非字符串直接转换成字符串
    var string = typeof str === 'string' ? str : String(str);

    var out = '';
    for (var i = 0; i < string.length; ++i) {
        // 获取码点
        var c = string.charCodeAt(i);

        // 落在base64中或者~.
        if (
            c === 0x2D    // -
            || c === 0x2E // .
            || c === 0x5F // _
            || c === 0x7E // ~
            || (c >= 0x30 && c <= 0x39) // 0-9
            || (c >= 0x41 && c <= 0x5A) // a-z
            || (c >= 0x61 && c <= 0x7A) // A-Z
        ) {
            out += string.charAt(i);
            continue;
        }
        
        // 小于128的直接利用ascii代替
        if (c < 0x80) {
            out = out + hexTable[c];
            continue;
        }

        // 后面的就不想看了，应该就是根据format里的两个标准规定的做转换
        if (c < 0x800) {
            out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
            out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
        out += hexTable[0xF0 | (c >> 18)]
            + hexTable[0x80 | ((c >> 12) & 0x3F)]
            + hexTable[0x80 | ((c >> 6) & 0x3F)]
            + hexTable[0x80 | (c & 0x3F)];
    }

    return out;
};

// 该函数用于压缩输出结果。
// 例如下面两个对象x和y
// a={m: 1, n: 2} b={p: 3, q: 4}
// x = {c: a, d: {e: a, f: b}, g: b}
// y = {c: {m: 1, n: 2}, d: {e: {m: 1, n: 2}, f: {p: 3, q: 4}}, g: {p: 3, q: 4}}
// x和y的内容相同，但是存储空间x<y，主要是由浅拷贝导致的，不过也会有一定的弊端，比如x.c.m=9会发现跟预期不符了。
// 9. 充分利用浅拷贝来压缩空间（需要的情况）
// 压缩只能针对结构体，这是由js的实现所决定的。类似的方案可以应用到go/python等其他语言中去。

// 不要试图做{}=={}，{}==={}，Object.is({},{})操作，
// 关于等号的说明可以参考下面文档： https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
// 可以引申出defineProperty，freeze，seal几个函数。
// 10. 合理使用defineProperty, freeze, seal几个函数。
// defineProperty: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
// freeze: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
// seal: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal
exports.compact = function (obj, references) {
    // obj为上文处理得到的结构体
    // reference看后面的分析




    // 如果不是object 或者是是null 无需压缩，直接返回，函数挑出点
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    var refs = references || [];
    var lookup = refs.indexOf(obj);

    // 如果发现references中有obj，直接返回
    if (lookup !== -1) {
        return refs[lookup];
    }

    // 没有则存入
    refs.push(obj);



    // 如果obj是数组
    if (Array.isArray(obj)) {
        var compacted = [];


        for (var i = 0; i < obj.length; ++i) {
            // 同样只处理对象
            if (obj[i] && typeof obj[i] === 'object') {
                // 递归操作，这就是上面为啥会需要判断
                compacted.push(exports.compact(obj[i], refs));
            } else if (typeof obj[i] !== 'undefined') {
                // 对于undefined则直接删除
                compacted.push(obj[i]);
            }
        }

        return compacted;
    }

    // obj 是对象
    var keys = Object.keys(obj);
    keys.forEach(function (key) {
        // 同样操作
        obj[key] = exports.compact(obj[key], refs);
    });

    // 返回压缩后的对象
    return obj;
};

// 12. 利用Object.prototype.toString.call的方式来更精确地判断一个对象的类型
// 关于prototype，参考文档：http://eloquentjavascript.net/06_object.html
exports.isRegExp = function (obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

// 只有nodejs里Buffer有isBuffer方法。
// 在c++中会经常用!!，在很多js包里也有看到。
exports.isBuffer = function (obj) {
    if (obj === null || typeof obj === 'undefined') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};
