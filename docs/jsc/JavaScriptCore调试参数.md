# JavaScriptCore 调试参数

## 概述

JavaScriptCore shell `jsc` 支持通过启动参数输出字节码、编译日志、OSR 信息、优化图和反汇编。调试 JIT 问题时，建议先关闭并发 JIT 与并发 GC，保证输出顺序和复现行为稳定。

## 基础启动参数

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

| 参数 | 说明 |
|---|---|
| `-d` | 输出字节码 |
| `--useConcurrentJIT=0` | 关闭并发 JIT |
| `--useConcurrentGC=0` | 关闭并发 GC |
| `--verboseCompilation=1` | 输出编译日志 |
| `--verboseOSR=1` | 输出 OSR 日志 |
| `--dumpGraphAtEachPhase=1` | 输出各优化阶段的图 |

该参数组合适用于第一轮定位，可确认代码是否进入 JIT、进入的优化层级，以及各阶段图的变化。

## GDB 调试

启动 `gdb`：

```bash
gdb /home/sxy/tmp/WebKit/ReleaseAssertionDebugBuild/bin/jsc
```

在 `gdb` 中运行脚本并传入 JSC 参数：

```gdb
(gdb) run /home/sxy/tmp/44308/test/test1.js \
  --dumpGraphAtEachPhase=true \
  --useConcurrentJIT=false \
  --dumpDisassembly=true \
  --useConcurrentGC=false \
  2>Graph.jscDump
```

常用断点示例：

```gdb
(gdb) b functionDescribe
```

该断点可用于观察对象描述信息，再根据对象状态决定是否继续分析 JIT 图或机器码。

## `describe()` 输出

`describe()` 可输出对象地址、`Butterfly`、`Structure`、indexing type 等运行时信息。

```text
>>> var a ={};
undefined
>>> print(describe(a));
Object: 0x7f54e1464180 with butterfly (nil)(base=0xfffffffffffffff8)
(Structure 0x7f5300005d00:[0x5d00/23808, Object, (0/6, 0/0){}, NonArray,
Unknown, Proto:0x7f5523014798, Leaf]), StructureID: 23808
```

示例 indexing type：

```text
0x0000a240 NonArrayWithContiguous
0x0000a160 NonArrayWithDouble
```

## 数组索引与命名属性

```javascript
const a = [];
a[0] = 1;                // 索引键，进入 elements / indexed storage
a["0"] = 2;              // "0" 仍按索引键处理
a.x = 3;                 // 命名属性，进入 property 路径
a[-1] = 4;               // 非法数组索引，进入命名属性路径
a[4294967295] = 5;       // 超出数组索引上限，进入命名属性路径
```

## Dump 脚本

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

该脚本将字节码、编译日志、OSR、CFA、生成字节码、反汇编和优化图拆分到独立文件，适用于第一轮全量采样。

### `jsc_diff_test`

```bash
#!/bin/bash
./jsc "$@" --useLLInt=true  --useJIT=false --useBaselineJIT=false --useDFGJIT=false --useFTLJIT=false
./jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=true  --useDFGJIT=false --useFTLJIT=false
./jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=true  --useFTLJIT=false
./jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=false --useFTLJIT=true
./jsc "$@" --useLLInt=false --useJIT=true  --useBaselineJIT=false --useDFGJIT=true  --useFTLJIT=true
```

该脚本用于按执行层级对比行为，可区分 LLInt、Baseline、DFG、FTL、DFG+FTL 路径。

输出重定向示例：

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

## 常用 `.jscdump` 参数组合

输出字节码、编译日志、OSR 和优化图：

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

分别输出 DFG、FTL、B3、Air 图：

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

## 命令模板

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
