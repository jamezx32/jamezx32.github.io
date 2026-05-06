# JavaScriptCore NAN-Boxing

## 概述

JavaScriptCore 在 64 位平台启用 `USE(JSVALUE64)` 时，使用 NaN-encoded 表示 `JSValue`。该表示方式利用 IEEE 754 双精度浮点数的 NaN payload 空间，将 Cell 指针、`int32`、`double`、`boolean`、`null`、`undefined` 等值编码到同一个 64 bit 机器字中。

该机制用于在运行时保持统一的 `JSValue` 表示，同时为 JIT 和 runtime helper 提供快速类型判断能力。

## 基本布局

高位模式可概括如下：

```text
Pointer {  0000:PPPP:PPPP:PPPP
         / 0002:****:****:****
Double  {         ...
         \ FFFC:****:****:****
Integer {  FFFE:0000:IIII:IIII
```

| 类型 | 高位模式 | 说明 |
|---|---|---|
| Pointer / tagged immediate | `0x0000` 区间 | Cell 指针或特殊 immediate |
| Double | 普通 double 区间与 `0xFFFC` 区间 | 通过偏移编码避开指针和整数标签 |
| Int32 | `0xFFFE:0000:IIII:IIII` | 32 位有符号整数 |

JSC 依赖 NaN 空间中大量不会被普通双精度数值占用的位模式，用于容纳非 double 类型的标签和值。

## NaN Payload 编码

双精度浮点数在指数位全为 1 且尾数非 0 时表示 NaN。JSC 使用其中一部分 NaN payload 空间编码非 double 类型，并保留普通 double 的可表示范围。

该设计使 `double`、`int32`、Cell 指针和特殊 immediate 可通过高位标签区分，避免在常见路径中引入额外对象封装。

## Double 编码

`double` 进入 `JSValue` 时不会直接保存原始 IEEE 754 bit pattern。JSC 会对其 64 bit 表示执行偏移编码，使编码后的 double 不与指针区间或 `int32` 标签区间冲突。

读取 `double` 时需要执行反向转换。调试寄存器、栈槽或 dump 输出时，应先确认当前值是否仍处于 `JSValue` 编码形式。

## Int32 与特殊 Immediate

`int32` 使用 `0xFFFE` 高位标签，低 32 bit 保存有符号整数值。该布局支持快速判断和解码。

特殊 immediate 使用固定编码：

| 值 | 编码 |
|---|---|
| `false` | `0x06` |
| `true` | `0x07` |
| `undefined` | `0x0a` |
| `null` | `0x02` |

这些编码用于区分 Cell 指针和立即数，并支持 `null`、`undefined`、布尔值的快速判断。

## `0x0` 与 Hole

合法 `JSValue` 不使用 `0x0` 表示普通 JavaScript 值。该模式通常用于表示 array hole、空结果或 C++ 层的 no value 状态。

分析稀疏数组、`Butterfly` 元素区或未初始化值时，`0x0` 应按 hole / no value 语义处理，不应直接解释为 `null`。

## 调试检查项

- 当前 64 bit 值是否为编码后的 `JSValue`
- 高位标签是否落入 Cell 指针、`int32` 或 `double` 区间
- `0x0` 是否表示 hole / no value
- Cell 指针是否需要结合 `JSCell`、`Structure`、`Butterfly` 继续解析
- JIT 图、寄存器值和对象布局中的类型假设是否一致

## 参考

1. [腾讯云开发者社区：JavaScriptCore NaN Boxing 简介](https://cloud.tencent.com/developer/news/820076)
2. `Source/JavaScriptCore/runtime/JSCJSValue.h`，commit `7e485991f408cd0d38734297936fc449c260fc2f`
