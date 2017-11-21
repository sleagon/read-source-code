# 阅读源码系列

标签（空格分隔）： 个人

---



> 准备抽时间看几个好的包的源码

## qs [version: 6.5] [[npm][1] / [github][2]]
 - [x] 看完并注释源码
 - [x] 分析可能存在的问题
 - [x] 写一个简化版本（不需要考虑太多的场景）
***
1. 使用Object.create(null)
2. 巧用split第二个参数
3. 合并数组(兼容非数组)
4. 把a.b.c的形式转换成a[b][c]的形式
5. 通过多次执行exec来遍历str
6. 巧用has.call
7. 利用slice(1, -1)来截取[]以内的内容
8. 使用Object.keys来遍历对象（兼容结构体和数组）
9. 充分利用浅拷贝来压缩空间（需要的情况）
10. 合理使用defineProperty, freeze, seal几个函数
11. 充分利用reduce函数
12. 利用Object.prototype.toString.call的方式来更精确地判断一个对象的类型
***

### qs-lite
qs-lite是一个querystring的简化版本，支持内容有限，适合用在自己的url可控的项目中。



## request [version: 2.81.0] [[npm][3] / [github][4]]
 - [ ] 看完并注释源码

## eventemitter3 [version: 2.0.3] [[npm][5] / [github][6]]
- [x] 看完源码并注释

> eventemitter3基本就是在前段模拟了nodejs的events，只不过eventemitter提供了一个context的参数，这个参数可以自己绑定回调函数的this。代码写的比较通俗易懂，技巧性的东西相对较少。

***
1. 需要在return的时候附带点操作，使用return do sth here, returnValue;的形式。
***

  [1]: https://www.npmjs.com/package/qs
  [2]: https://github.com/ljharb/qs.git
  [3]: https://www.npmjs.com/package/request
  [4]: https://github.com/request/request/tree/master/lib
  [5]: https://www.npmjs.com/package/eventemitter3
  [6]: git://github.com/primus/eventemitter3.git