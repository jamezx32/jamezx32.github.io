# ChakraCore 构建与调试

## 概述

本文记录 ChakraCore 的常用构建、运行和调试流程。内容覆盖 Linux 构建、`ch` 启动方式、GDB 基础设置、JIT 代码定位、对象地址提取和模块地址观察。

## 环境要求

| 项目 | 内容 |
|---|---|
| 目标引擎 | ChakraCore |
| Linux 环境 | Ubuntu / GDB / clang / cmake |
| Windows 环境 | Visual Studio 2022 / v143 |
| Shell 启动器 | `ch` |

## Linux 构建

### 安装依赖

```bash
sudo apt install build-essential cmake clang libicu-dev libunwind-dev uuid-dev
```

### 配置 Toolchain

常用编译器配置：

```text
C Compiler: /usr/bin/clang
C++ Compiler: /usr/bin/clang++
```

### CMake 选项

ChakraCore 不同版本的 CMake 选项可能存在差异。构建前应优先参考源码根目录中的构建说明，并检查 `CMakeLists.txt` 中的实际选项。

旧版本常用配置如下。

`v1.4.1`：

```bash
-DICU_SETTINGS_RESET=1 -DSHARED_LIBRARY_SH=1 -DCC_TARGETS_AMD64_SH=1
```

`v1.10.0`：

```bash
-DICU_SETTINGS_RESET=1 -DSHARED_LIBRARY_SH=1 -DCC_USES_SYSTEM_ARCH_SH=1 -DINTL_ICU_SH=1
```

## 运行 `ch`

Debug 构建产物示例：

```bash
/home/sxy/ChakraCore/cmake-build-debug/ch /home/sxy/ChakraCore/Test.js
```

Release 构建产物示例：

```bash
/home/sxy/ChakraCore/out/Release/ch /home/sxy/ChakraCore/Test.js
```

Release 版本适合功能验证和接近日常执行路径的复现。Debug 版本适合符号调试、调用栈检查和对象状态观察。

## GDB 基础设置

```gdb
(gdb) set pagination off
(gdb) set breakpoint pending on
(gdb) set print asm-demangle on
```

| 设置 | 作用 |
|---|---|
| `set pagination off` | 关闭分页，便于连续输出调用栈、汇编和内存 |
| `set breakpoint pending on` | 允许对尚未加载的符号设置断点 |
| `set print asm-demangle on` | 提升 C++ 符号和反汇编输出可读性 |

## 宿主回调断点

`ch` / `WScript` 环境中，`print` 或 `WScript.Echo` 是稳定的观察点。可在宿主回调处设置断点：

```gdb
b WScriptJsrt::EchoCallback
```

该断点适用于：

- 在输出发生前暂停执行
- 从回调参数中提取 JavaScript 对象地址
- 从稳定入口回溯到当前 JIT 或 runtime 路径

## JIT 代码定位

断在宿主回调后，先查看调用栈：

```gdb
bt
```

若已进入 JIT 代码，调用栈中可能出现匿名地址、`??`，或如下形式：

```text
Js::JavascriptFunction::CallFunction<true>(function=..., entryPoint=0x..., args=..., useLargeArgCount=false)
```

`entryPoint` 是当前 JIT 函数入口地址，可用于反汇编：

```gdb
x/120i *entryPoint
```

该反汇编结果可用于确认属性访问、分支、调用和内存写入位置。

## 原生断点

定位关键 JIT 指令后，可在入口地址加偏移处设置断点：

```gdb
b *entryPoint+0x173
```

例如对象字段写入指令：

```text
0x...: mov    QWORD PTR [rax], r10
```

该方式不依赖源码级符号，适用于逐条确认 JIT 代码中的寄存器和内存变化。

## 提取 JS 对象地址

在 `WScript.Echo("HIT", obj)` 路径中，断在 `EchoCallback` 后可从参数数组中提取对象地址：

```gdb
(gdb) set $argv = (void**)arguments
(gdb) p/x $argv[1]
```

已知对象类型时，可转换为对应 C++ 指针：

```gdb
(gdb) set $p = (Js::RecyclableObject*)$argv[1]
```

确认结构体成员偏移：

```gdb
(gdb) p/x (size_t)&((Js::JavascriptProxy*)0)->target
(gdb) p/d sizeof(Js::JavascriptProxy)
```

同一方法也适用于其他 ChakraCore 运行时对象。

## 模块与符号地址

查看进程映射：

```gdb
info proc mappings
```

查看共享库加载状态：

```gdb
info sharedlibrary
```

查看符号运行时地址：

```gdb
info address system
info address memmove
```

`info sharedlibrary` 中的 `From` 不一定等于模块 image base。执行模块基址推导时，应结合泄露地址、符号 RVA、`info proc mappings`、`readelf` 或 `objdump` 交叉验证。

## 单步命令

| 命令 | 说明 |
|---|---|
| `s` / `step` | 进入函数并执行当前源码行；无源码信息时可退化为 `stepi` |
| `n` / `next` | 执行到下一源码行，不进入当前函数 |
| `finish` | 运行到当前函数返回 |
| `si` / `stepi` | 单条汇编指令步进 |
| `ni` / `nexti` | 单条汇编指令跳过 |

JIT 代码调试中，`si` / `ni` 通常比源码级 `step` / `next` 更直接。

## 推荐流程

1. 使用 Debug 版本运行目标脚本，确认符号完整。
2. 在 `WScriptJsrt::EchoCallback` 或其他稳定宿主回调上设置断点。
3. 使用 `bt` 确认是否进入 JIT 路径，并记录 `entryPoint`。
4. 使用 `x/120i *entryPoint` 反汇编 JIT 代码。
5. 在关键 JIT 偏移处设置原生断点。
6. 结合寄存器、内存和对象字段确认运行时状态。
7. 需要检查对象布局时，从回调参数中提取 JS 对象地址并读取 C++ 字段。

## 参考资料

1. [ChakraCore 仓库](https://github.com/chakra-core/ChakraCore)
