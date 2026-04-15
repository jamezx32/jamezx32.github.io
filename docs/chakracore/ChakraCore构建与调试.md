# ChakraCore 构建与调试

这份笔记从 `CVE-2019-0567` 复现记录中抽出通用部分，单独整理 ChakraCore 的构建、运行和调试方法。与具体漏洞触发路径、利用链和对象布局绑定较强的内容，仍保留在原分析文档中，不在这里展开。

---

## 调试环境

| 项目 | 内容 |
|---|---|
| 目标引擎 | ChakraCore |
| Linux 环境 | Ubuntu / GDB / clang / cmake |
| Windows 环境 | Visual Studio 2022 / v143 |
| 常用启动器 | `ch` |

---

## Linux 构建

### 编译依赖

```bash
sudo apt install build-essential cmake clang libicu-dev libunwind-dev uuid-dev
```

### CMake / Toolchain

常见工具链配置：

- C Compiler: `/usr/bin/clang`
- C++ Compiler: `/usr/bin/clang++`

### 常见 CMake 选项

不同版本的 ChakraCore，CMake 选项会略有差异。下面是我在旧版本复现时实际使用过的参数，可作为起点：

**v1.4.1**

```bash
-DICU_SETTINGS_RESET=1 -DSHARED_LIBRARY_SH=1 -DCC_TARGETS_AMD64_SH=1
```

**v1.10.0**

```bash
-DICU_SETTINGS_RESET=1 -DSHARED_LIBRARY_SH=1 -DCC_USES_SYSTEM_ARCH_SH=1 -DINTL_ICU_SH=1
```

如果版本更高，建议先查看源码根目录下的构建说明或直接检查 `CMakeLists.txt` 中相关选项。

---

## 运行方式

Debug 版本：

```bash
/home/sxy/ChakraCore/cmake-build-debug/ch /home/sxy/ChakraCore/Test.js
```

Release 版本：

```bash
/home/sxy/ChakraCore/out/Release/ch /home/sxy/ChakraCore/Test.js
```

如果只做功能验证，Release 版本更接近日常执行路径；如果需要跟踪符号、看调用栈和对象状态，优先使用 Debug 版本。

---

## GDB 基础设置

调试前建议先设置：

```gdb
(gdb) set pagination off
(gdb) set breakpoint pending on
(gdb) set print asm-demangle on
```

这些设置的作用分别是：

- 关闭分页，便于连续查看汇编、调用栈和内存输出
- 允许先在未来才会解析出的符号上打断点
- 提升反汇编和符号显示的可读性

---

## 通用调试路径

### 1. 先从宿主回调入口拦截

在 `ch` / `WScript` 环境下，`print` 或 `WScript.Echo` 是很稳定的观察点。调试时可以先在：

```gdb
b WScriptJsrt::EchoCallback
```

这里打断点的价值在于：

- 触发稳定，不依赖某个具体漏洞路径
- 可以在输出发生前停住
- 便于从参数中直接取出 JS 层对象地址

### 2. 从调用栈确认当前是否已进入 JIT 代码

断住后先看：

```gdb
bt
```

如果当前路径已经进入 JIT 代码，调用栈中通常会出现匿名地址、`??`，或者：

```txt
Js::JavascriptFunction::CallFunction<true>(function=..., entryPoint=0x..., args=..., useLargeArgCount=false)
```

其中 `entryPoint` 就是当前 JIT 函数入口地址。这个地址后续可以直接用于反汇编。

### 3. 直接反汇编当前 JIT 函数

拿到 `entryPoint` 后，可直接查看附近机器码：

```gdb
x/120i *entryPoint
```

这一步适合做几类事情：

- 确认某个 JS 函数是否已被编译为本地代码
- 观察属性访问、调用、分支和内存写入的大致位置
- 给关键写入或关键调用点下原生断点

### 4. 在原生写入点或调用点下断

如果已经通过反汇编定位到关键指令，例如一条对象字段写入：

```txt
0x...: mov    QWORD PTR [rax], r10
```

可以直接在对应偏移下断：

```gdb
b *entryPoint+0x173
```

这种方式不依赖源码级符号，更适合在 JIT 函数内部逐条确认寄存器和内存变化。

---

## 从 `print` 参数中取出 JS 对象

在 `WScript.Echo("HIT", obj)` 这类路径下，断在 `EchoCallback` 后，可以直接从参数数组中取出 JS 对象地址：

```gdb
(gdb) set $argv = (void**)arguments
(gdb) p/x $argv[1]
```

如果已知对象类型，也可以进一步强转并查看字段：

```gdb
(gdb) set $p = (Js::RecyclableObject*)$argv[1]
```

当需要确认某个具体类的成员偏移时，可以直接用空指针取偏移：

```gdb
(gdb) p/x (size_t)&((Js::JavascriptProxy*)0)->target
(gdb) p/d sizeof(Js::JavascriptProxy)
```

这里的做法并不局限于 `JavascriptProxy`。调试其他 ChakraCore 对象时，也可以用相同方式确认结构体大小和成员偏移。

---

## 模块与地址观察

### 查看进程映射

```gdb
info proc mappings
```

可用于查看当前进程中主程序、`libChakraCore.so`、`libc.so` 等模块的映射范围。

### 查看共享库信息

```gdb
info sharedlibrary
```

这条命令适合快速确认符号是否加载、共享库是否已映射。但需要注意，`info sharedlibrary` 中显示的 `From` 并不总是模块真正的 image base，做基址推导时应结合泄露地址、符号 RVA、`readelf` 或 `objdump` 交叉验证。

### 查看符号运行时地址

```gdb
info address system
info address memmove
```

这类命令适合确认符号当前是否可见，以及它们在运行时的实际地址。

---

## 常用单步命令

```gdb
s / step      进入函数内部并执行当前行；无源码信息时可退化为 stepi
n / next      执行到下一行，不进入当前函数
finish        运行到当前函数返回
si / stepi    单条汇编指令步进
ni / nexti    单条汇编指令跳过
```

如果当前主要在 JIT 代码里工作，`si` / `ni` 往往比源码级 `step` / `next` 更实用。

---

## 建议的调试顺序

1. 先用 Debug 版本运行目标脚本，确保符号完整。
2. 在 `WScriptJsrt::EchoCallback` 或其他稳定宿主回调上打断点。
3. 通过 `bt` 确认是否已经进入 JIT 路径，并记录 `entryPoint`。
4. 用 `x/120i *entryPoint` 反汇编 JIT 代码，定位关键原生指令。
5. 在关键偏移处下断，结合寄存器和内存变化继续向下跟。
6. 需要验证对象内部状态时，从参数数组中直接取 JS 对象地址并读取结构体字段。

---

## 参考资料

1. [ChakraCore 仓库](https://github.com/chakra-core/ChakraCore)

