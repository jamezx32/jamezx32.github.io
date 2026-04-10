# JavaScriptCore NAN-Boxing

这篇笔记整理的是 JavaScriptCore 在 64 位平台上的 `JSValue` 表示。后面看 JSC 的对象布局、寄存器值、JIT 输出或者 exploit 原语时，`NaN-boxing` 基本都会反复碰到。

---

## 背景

在 64 位平台上，如果开启 `USE(JSVALUE64)`，JSC 会使用 NaN-encoded 的方式来表示 `JSValue`。它利用 IEEE754 双精度浮点数里一部分不会被正常数值占用的 NaN 空间，把指针、整数和几个特殊 immediate 一起编码进 64 bit。

这样做的目的很直接：JavaScript 层看到的是统一的 `JSValue`，底层则可以在同一个机器字里同时表示 Cell 指针、`int32`、`double`、`boolean`、`null`、`undefined` 等类型。

---

## 64 位下的基本布局

原始说明里把高位模式概括成下面这样：

```text
Pointer {  0000:PPPP:PPPP:PPPP
         / 0002:****:****:****
Double  {         ...
         \ FFFC:****:****:****
Integer {  FFFE:0000:IIII:IIII
```

可以先按三大类去记：

| 类型 | 高位模式 | 含义 |
|---|---|---|
| Pointer / tagged immediate | 0x0000 一段 | 指向堆对象，或者编码成特殊 immediate |
| Double | 普通 double 区间，以及 0xFFFC 一段 | 通过额外加减偏移来避开指针 / 整数标签 |
| Int32 | 0xFFFE:0000:IIII:IIII | 32 位有符号整数 |

JSC 依赖的一点是：双精度 NaN 空间里有大量不会被普通数值占用的位模式，而这些空间又足够容纳指针和整数标签。

---

## 为什么可以拿 NaN 空间来编码

双精度浮点数里，顶部若干位满足特定条件时会表示 NaN。JSC 这里使用的是带 payload 的 NaN 空间，也就是“硬件和标准库通常不会主动拿来产生普通计算结果”的那一部分位模式。这样既能保留 double，又能把剩余空间拿来表示其它类型。

原始说明里提到，JSC 依赖的是以 `0xFFFC` 和 `0xFFFE` 开头的那一段 NaN 范围，并假定正常双精度数不会落进去。于是 `double`、`int32` 和 Cell 指针就能靠高位标签分出来。

---

## Double 是怎么编码的

JSC 对 `double` 的处理不是“原样塞进去”，而是会先做一次整数加法，把 `2^49` 加到这个 64 bit 表示上。做完这一步之后，编码后的 `double` 就不会和 `0x0000` 指针区间或者 `0xFFFE` 整数区间撞上。

后面如果还要继续按浮点数使用，再把这一步反过来做回来。也就是说，`double` 的关键不只是“值长什么样”，而是“它进入 `JSValue` 之前会先经过一次重新编码”。

这也是调试里经常容易看错的点。寄存器里看到的 `JSValue` 并不一定就是“把这个 64 bit 直接按 IEEE754 解出来”的结果，它有可能还处在 JSC 自己的编码形式里。

---

## Int32 和特殊 immediate

`int32` 使用的是 `0xFFFE` 这一类高位标签。这样做的好处是区分简单，JIT 和 runtime helper 都可以很快判断“当前值是不是一个 32 位整数”。

除了整数和 Cell 指针，JSC 还把几个常见的特殊值编码成固定的非法指针值：

| 值 | 编码 |
|---|---|
| false | 0x06 |
| true | 0x07 |
| undefined | 0x0a |
| null | 0x02 |

这些值的设计不是随便挑出来的。原始说明里提到，它们会配合若干 tag bit，让 JSC 能更快地区分“真实 Cell 指针”和“立即数”，同时也方便快速判断 `null` / `undefined` 这一类值。

---

## `0x0` 和 hole

JSC 里不会把合法的 `JSValue` 编码成 `0x0`。这个模式通常被保留给“没有值”的场景使用，比如 array hole，或者 C++ 层的空结果。调试数组、稀疏元素、butterfly 数据区时，碰到 `0x0` 往往就要先想到 hole / no value，而不是直接把它当成普通 `null`。

这点在漏洞分析里也很常见。某些 bug 不是把一个对象指针直接读出来，而是把 hole、未初始化值或者错误 tag 的 `JSValue` 带到了后续路径里，最后才在更远的位置出问题。

---

## 调试时怎么读这些值

### 先分清当前看到的是“值”还是“编码后的 JSValue”

在 C++ 源码里、JIT 寄存器里、dump 输出里看到的内容，不一定已经被还原成人类直觉里的 JavaScript 值。有时它还是 NaN-boxing 之后的内部表示，这时要先看高位 tag，而不是急着把它当成普通 `double` 或普通地址解释。

### 再看它落在哪个标签区间

如果高位模式落在指针区，重点看它是不是一个 Cell；如果落在 `0xFFFE` 一类整数区，优先按 `int32` 看；如果看起来像 double，也要先确认是不是编码后的 double，而不是直接按 IEEE754 读。

### 最后再结合对象模型

`NaN-boxing` 只解决“一个 64 bit 值代表什么”的问题，不能单独解释对象布局。真正做 Root Cause 时，还要继续把它和 `JSCell`、`Structure`、`Butterfly` 一起看，才能知道这个值为什么会出现在这里。

---

## 参考

1. [腾讯云开发者社区：JavaScriptCore NaN Boxing 简介](https://cloud.tencent.com/developer/news/820076)
2. `Source/JavaScriptCore/runtime/JSCJSValue.h`，commit `7e485991f408cd0d38734297936fc449c260fc2f`
