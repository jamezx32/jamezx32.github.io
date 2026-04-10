# JavaScriptCore 调试参数

这篇笔记把平时看 JSC 常用的启动参数、`gdb` 命令和几个小脚本整理到一起，主要目的是把“先把输出打开、把层次切开、把断点打准”这几件事收成一个固定入口。

---

## 最常用的一组启动参数

```bash
/home/sxy/tmp/WebKit/ReleaseAssertionDebugBuild/bin/jsc \
  /home/sxy/JsC/WebKit/test.js \
  -d \
  --useConcurrentJIT=0 \
  --useConcurrentGC=0 \
  --verboseCompilation=1 \
  --verboseOSR=1 \
  --dumpGraphAtEachPhase=1 \
  >stdout.jscdump 2>stderr.jscdump
```

这组参数的作用基本够覆盖平时排查 DFG / FTL 问题的第一轮观察：

| 参数 | 作用 |
|---|---|
| -d | 输出字节码 |
| --useConcurrentJIT=0 | 关闭并行 JIT，方便复现和对照输出 |
| --useConcurrentGC=0 | 关闭并行 GC，减少调试噪声 |
| --verboseCompilation=1 | 输出编译层面的详细信息 |
| --verboseOSR=1 | 输出 OSR 相关信息 |
| --dumpGraphAtEachPhase=1 | dump 优化阶段图，适合先看 DFG / FTL 变换 |

如果一开始还不确定问题出在哪层，先把这组参数跑起来，通常就能知道代码有没有进优化、进了哪一层、每一阶段的图长什么样。

---

## `gdb` 里最常用的启动方式

先启动 `gdb`：

```bash
gdb /home/sxy/tmp/WebKit/ReleaseAssertionDebugBuild/bin/jsc
```

再在 `gdb` 里带参数运行脚本：

```gdb
(gdb) run /home/sxy/tmp/44308/test/test1.js \
  --dumpGraphAtEachPhase=true \
  --useConcurrentJIT=false \
  --dumpDisassembly=true \
  --useConcurrentGC=false \
  2>Graph.jscDump
```

平时比较常用的一类断点是先在自己关心的 helper 或内置打印函数上拦一下，例如：

```gdb
(gdb) b functionDescribe
```

这样做的好处是，先把“对象长什么样”看清楚，再决定后面要不要继续跟 JIT 图或机器码。

---

## `describe()` 和对象形态

笔记里留了一段很典型的输出：

```text
>>> var a ={};
undefined
>>> print(describe(a));
Object: 0x7f54e1464180 with butterfly (nil)(base=0xfffffffffffffff8)
(Structure 0x7f5300005d00:[0x5d00/23808, Object, (0/6, 0/0){}, NonArray,
Unknown, Proto:0x7f5523014798, Leaf]), StructureID: 23808
```

这里通常先看三件事：

- 对象地址本身
- `butterfly` 有没有分配、指向哪里
- `Structure` 和 indexing type 当前是什么

笔记里顺手记了两个常见的 indexing type：

```text
0x0000a240 NonArrayWithContiguous
0x0000a160 NonArrayWithDouble
```

这些值单独看意义不大，但一旦和数组模式切换、属性访问或者漏洞利用链放在一起，就会变得很关键。

---

## 数组索引和命名属性的最小观察例子

下面这个例子很适合在 `describe()`、断点和结构切换时一起看：

```javascript
const a = [];
a[0] = 1;                // 索引键，进入 elements / indexed storage
a["0"] = 2;              // "0" 仍然按索引键处理
a.x = 3;                 // 命名属性，进入 property 路径
a[-1] = 4;               // 不是合法数组索引，走命名属性
a[4294967295] = 5;       // 超出数组索引上限，走命名属性
```

这个例子的价值不在于行为本身，而在于它很适合拿来确认 JSC 当前把哪些键放进 indexed storage，哪些键留在普通属性区。看对象模型或做 Root Cause 时，这种边界经常决定后面的 `Structure` 和 `Butterfly` 怎么变化。

---

## 常用 dump 脚本

### `jsc_dump`

```bash
#!/bin/bash
./jsc "$@" -d 2>ByteCode.jscDump
./jsc "$@" --verboseCompilation=true 2>Compilation.jscDump
./jsc "$@" --verboseOSR=true 2>OSR.jscDump
./jsc "$@" --verboseCFA=true 2>CFA.jscDump
./jsc "$@" --dumpGeneratedBytecodes=true 2>GeneratedBytecodes.jscDump
./jsc "$@" --dumpDisassembly=true 2>Disassembly.jscDump
./jsc "$@" --dumpFTLDisassembly=true 2>FTLDisassembly.jscDump
./jsc "$@" --dumpGraphAtEachPhase=true --useConcurrentJIT=false --useConcurrentGC=false 2>Graph.jscDump
```

这个脚本适合做第一轮全量采样。优点是省事，基本把字节码、编译日志、OSR、CFA、图和反汇编都拆成了单独文件；缺点是输出很多，更适合先跑一遍再对比，不适合每次都用。

### `jsc_diff_test`

```bash
#!/bin/bash
./jsc "$@" --useLLInt=true  --useJIT=false --useBaselineJIT=false --useDFGJIT=false --useFTLJIT=false
./jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=true  --useDFGJIT=false --useFTLJIT=false
./jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=true  --useFTLJIT=false
./jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=false --useFTLJIT=true
./jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=true  --useFTLJIT=true
```

这个脚本适合快速切执行层。PoC 如果只在某一层触发，这里一般很快就能分出来是 LLInt、Baseline、DFG、FTL 还是 DFG+FTL 的问题。

也可以把输出分别重定向到不同文件，方便直接做 diff：

```bash
#!/bin/bash
WebKitBuild/Debug/bin/jsc "$@" --useLLInt=true  --useJIT=false --useBaselineJIT=false --useDFGJIT=false --useFTLJIT=false > LLInt.txt
WebKitBuild/Debug/bin/jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=true  --useDFGJIT=false --useFTLJIT=false > BaseLine.txt
WebKitBuild/Debug/bin/jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=true  --useFTLJIT=false > DFG.txt
WebKitBuild/Debug/bin/jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=false --useFTLJIT=true > FTL.txt
WebKitBuild/Debug/bin/jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=true  --useFTLJIT=true > DFGFTL.txt
```

### `Debug.sh`

```bash
#!/bin/sh
gdb ./jsc -ex "run --useConcurrentJIT=false exp.js"
```

这个脚本比较简单，但平时拿来快速起一个关并发 JIT 的调试环境很方便。

---

## `.jscdump` 常用组合

如果主要想看图和优化阶段，可以直接用下面这组：

```bash
./jsc PoC.js \
  -d \
  --useConcurrentJIT=0 \
  --useConcurrentGC=0 \
  --verboseCompilation=1 \
  --verboseOSR=1 \
  --dumpGraphAtEachPhase=1 \
  >stdout.jscdump 2>stderr.jscdump
```

如果要进一步拆 DFG / FTL / B3 / Air，可以开得更细：

```bash
./jsc PoC.js \
  -d \
  --useConcurrentJIT=0 \
  --useConcurrentGC=0 \
  --verboseCompilation=1 \
  --verboseOSR=1 \
  --dumpDFGGraphAtEachPhase=1 \
  --dumpDFGFTLGraphAtEachPhase=1 \
  --dumpB3GraphAtEachPhase=1 \
  --dumpAirGraphAtEachPhase=1 \
  >stdout.jscdump 2>stderr.jscdump
```

这组参数比较适合已经知道问题在优化链路里，接下来要判断它究竟是 DFG、FTL、B3 还是 Air 哪一层把语义做坏了。

---

## 其它常用命令模板

下面这些命令的共同用途，是把阈值、图输出和反汇编一起打开，方便快速复现实验：

```bash
./jsc -d -f test2.js \
  --verboseOSR=1 \
  --useConcurrentJIT=0 \
  --verboseCFA=0 \
  --dumpDFGGraphAtEachPhase=1 \
  --dumpGraphAtEachPhase=1 \
  --verboseCompilation=1 \
  >out-`date +%s`.log 2>err_`date +%s`.log
```

```bash
./jsc -d -f /home/jiming/code/CVE-2019-8518.js \
  --verboseOSR=1 \
  --useConcurrentJIT=0 \
  --thresholdForFTLOptimizeAfterWarmUp=1000 \
  --verboseCFA=0 \
  --dumpDFGGraphAtEachPhase=1 \
  --dumpDisassembly=1 \
  --verboseCompilation=1 \
  2>/home/jiming/code/err.dumpjsc
```

```bash
./jsc -f /home/jiming/note/SafeToExecute/poc.js \
  --useConcurrentJIT=0 \
  --thresholdForOptimizeSoon=10 \
  --useConcurrentGC=0 \
  --thresholdForJITAfterWarmUp=10 \
  --thresholdForOptimizeAfterWarmUp=100 \
  --thresholdForFTLOptimizeAfterWarmUp=1000 \
  --dumpGraphAtEachPhase=1 \
  --verboseDFGBytecodeParsing=1 \
  --dumpBytecodeAtDFGTime=1 \
  2>/home/jiming/note/SafeToExecute/poc.jscdump
```

这些命令没有统一“标准答案”，但思路比较固定：先关并发、再压优化阈值、最后按需要开图、开字节码和开反汇编。

---

## 小结

如果只是准备开始调 JSC，第一步通常不是急着翻源码，而是先把字节码、图、反汇编和执行层切换开关整理好。参数一旦收顺，后面看 DFG / FTL、做 Root Cause 或复现 PoC，入口会稳定很多。
