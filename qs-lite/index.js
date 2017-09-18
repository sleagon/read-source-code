const type = x => Object.prototype.toString.call(x);
const c = x => encodeURIComponent(x);
const d = x => decodeURIComponent(x);

function stringify(obj, option = {}) {
    let deleteNull = option.deleteNull || true;
    let base = option.base || "?";
    let brackets = option.brackets ? "[]" : "";
    if (type(obj) !== "[object Object]") return base;
    Object.keys(obj).forEach(key => {
        switch (type(obj[key])) {
            case "[object Array]":
                Object.keys(obj[key])
                    .filter(k => !deleteNull || obj[key][k] != null)
                    .forEach(k => {
                        base += `${c(key)}${brackets}=${c(obj[key][k])}&`;
                    });
                break;
            case "[object String]":
            case "[object Number]":
                base += `${c(key)}=${c(obj[key])}&`;
                break;
            case "[object Null]":
            case "[object Undefined]":
                base += deleteNull ? "" : `${c(key)}=&`;
                break;
            default:
                break;
        }
    });
    return base.slice(0, -1);
}

function parse(url) {
    let query = {};
    if (type(url) !== "[object String]") return query;
    url = url[0] === "?" ? url.slice(1) : url;
    url
        .split("&")
        .map(q => q.split("="))
        .filter(x => x.length === 2)
        .forEach(([k, v]) => {
            k = d(k);
            v = d(v);
            k = k.slice(-2) === "[]" ? k.slice(0, -2) : k;
            v = v === "" ? null : v;
            query[k] = query.hasOwnProperty(k) ? [].concat(query[k], v) : v;
        });
    return query;
}

module.exports = {
    stringify,
    parse
};
