const qs = require("qs");

//let str = "c[1]=1&c[2]=2&c[3]=2&c[4]=2&c[5]=2&c[6]=2&c[7]=2&c[8]=2&c[9]=2&c[10]=2&c[11]=2&c[12]=2&c[13]=2&c[14]=2&c[15]=2&c[16]=2&c[17]=2&c[18]=2&c[19]=2&c[20]=2&c[21]=2";
// let str = "a=1&a=2&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3&a=3";
// let str = "a[1]=2&a[2]=3&a[1]=4"
let str = "a[b][x]=1&a[c]=2&a[b]=3";
let result = qs.parse(str);
// let obj = {a:1, a:2, b:3, c:4, d: null};
let obj = {
  a: 2,
  b: 3,
  c: 4,
  d: null,
  e: [1, null, 2],
  f: [1, undefined, 2],
  g: undefined
};
let st = qs.stringify(obj, {
  strictNullHandling: true,
  encodeValuesOnly: true,
  skipNulls: true
});

console.log(result);
