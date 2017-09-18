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

## qs-lite
qs-lite是一个querystring的简化版本，支持内容有限，适合用在自己的url可控的项目中。



  [1]: https://www.npmjs.com/package/qs
  [2]: https://github.com/ljharb/qs.git