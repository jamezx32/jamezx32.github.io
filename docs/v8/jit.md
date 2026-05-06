# V8 JIT 基础

## 概述

V8 使用分层执行模型。JavaScript 源码先编译为 Ignition bytecode，再根据执行热度和运行时反馈进入更高层级的编译器。

```text
JavaScript source -> Ignition bytecode -> Sparkplug -> Maglev -> TurboFan
```

## Ignition

Ignition 是 V8 的解释器。它将 JavaScript 函数编译为紧凑的 bytecode，并执行这些 bytecode。

![V8 compilation pipeline with Ignition enabled](https://v8.dev/_img/ignition-interpreter/ignition-pipeline.png)

Ignition 执行过程中会收集运行时反馈，包括对象形状、属性访问模式、操作数类型等信息。这些反馈会被后续编译器用于生成专门化代码。

常用观察参数：

```bash
--print-bytecode
--print-bytecode-filter=<function-name>
```

## Sparkplug

Sparkplug 是 non-optimizing JavaScript compiler。它以 Ignition bytecode 为输入，快速生成与解释执行语义等价的机器码。

Sparkplug 的目标是降低 bytecode decoding 和 dispatch overhead，而不是执行复杂优化。该层适合在优化编译完成前提供较低成本的性能提升。

## Maglev

Maglev 是 fast optimizing compiler，位于 Sparkplug 与 TurboFan 之间。它在编译速度和代码质量之间提供中间层级的优化。

![V8 tiering with Maglev](https://v8.dev/_img/maglev/I-IS-IT-IST-ISTM.svg)

Maglev 基于 bytecode 和运行时反馈构建中间表示，并根据已观察到的类型和对象形状生成专门化代码。当假设在运行时失效时，代码会触发 deoptimization 并回退到较低执行层级。

## TurboFan

TurboFan 是 V8 的顶层 optimizing compiler，用于生成峰值性能代码。TurboFan 会利用类型信息、对象形状信息和控制流信息执行激进优化。

该层常见分析对象包括优化图、类型推断、deoptimization point、lowering 结果和最终机器码。

常用观察参数：

```bash
--trace-opt
--trace-deopt
--trace-turbo
```

## Turboshaft

Turboshaft 是 V8 顶层优化管线中的 IR 和编译基础设施演进，不表示新的独立执行 tier。执行分层中顶层优化编译器仍可按 TurboFan 理解。

## 调试对应关系

| 层级 | 关注点 | 常用参数 |
|---|---|---|
| Ignition | bytecode、寄存器、accumulator 语义 | `--print-bytecode` |
| Sparkplug | baseline code 生成 | 以当前版本 `--help` 为准 |
| Maglev | 中层优化、deopt | `--trace-opt`、Maglev 相关 trace 参数 |
| TurboFan | 优化图、机器码、deopt 点 | `--trace-opt`、`--trace-deopt`、`--trace-turbo` |

## 参考资料

1. [Firing up the Ignition interpreter](https://v8.dev/blog/ignition-interpreter)
2. [Sparkplug — a non-optimizing JavaScript compiler](https://v8.dev/blog/sparkplug)
3. [Maglev - V8’s Fastest Optimizing JIT](https://v8.dev/blog/maglev)
