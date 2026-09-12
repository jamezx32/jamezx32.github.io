---
description: 在 JSC 利用中泄露 libJavaScriptCore.so 与 libc.so 的基址：Structure anchor 链、gdb 量 delta、/proc 探测量 anchor、ELF 头自校验与 debug/release 的坑。
---

# JavaScriptCore 库基址泄露

## 概述

任意读写原语到手之后，下一步几乎总是要调用引擎之外的代码——ROP 链要跳 libc 里的 gadget，shellcode 要调 `system`、`execve` 或引擎内部的函数。这些目标的绝对地址由两部分决定：

```text
运行时地址 = 库的加载基址（每次启动随机） + 目标在库内的静态偏移（固定）
```

ASLR 决定了基址必须运行时泄露，静态偏移可以离线求解。这套方法我在 Safari 11.0.1 / 11.0.2（Ubuntu 20.04 x86-64）上完整走通：

- **泄露链**：`describe()` 拿 Structure 地址 → `read64` 读 Structure 里的 anchor 指针 → libJSC 基址 → 减一个版本常量 delta → libc 基址；
- **偏移量取**：delta 用 gdb 量、anchor 偏移用 `/proc/PID/mem` 探测，anchor 消失时换原生函数链；
- **自校验**：用 ELF 头字节验证算出来的基址真的指向一个 ELF 映像；
- **坑**：read64 的浮点精度边界、debug 与 release 是两个不同二进制。

先澄清两个库的身份。`jsc` 主程序本体很小（约 320KB），真正的引擎代码在 `libJavaScriptCore.so` 里（release 约 19MB，debug 约 147MB）——利用中说"泄露 JSC 基址"指的就是这个 so。`libc.so.6` 是系统 C 库，`system`、syscall 包装等都在里面：

```bash
$ ldd cmake-build-release/bin/jsc | grep -E 'JavaScriptCore|libc'
    libJavaScriptCore.so => .../cmake-build-release/lib/libJavaScriptCore.so
    libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
```

## 基址与偏移模型

静态偏移有两个来源，都在生成期（写 exploit 之前）解决：

**符号偏移**——用 `nm -D` 从动态符号表解析。注意输出可能带版本后缀（`system@@GLIBC_2.2.5`），比较时按第一个 `@` 截断；`system` 与 `__libc_system` 是同一地址：

```bash
$ nm -D /lib/x86_64-linux-gnu/libc.so.6 | grep -E " (T|W) (system|__libc_system)"
0000000000052290 T __libc_system
0000000000052290 W system        # → system = libc + 0x52290
```

**字节偏移**——gadget 没有符号，要在可执行段里搜字节序列。正确做法是解析 ELF program headers、只扫 `PT_LOAD + PF_X` 段（数据段里的同款字节跳进去不可执行）。例如 `pop rdi ; ret` 的编码是 `5f c3`，在 glibc 2.31 里落在 `0x23b6a`；结果用 ROPgadget 的完整 dump 交叉验证。

由此得到整个利用的分工原则：**静态脚本做搜索，exp 只做地址计算**——生成期把所有偏移解出来写死成常量，运行期拿到泄露的基址后只做一次 `base + offset` 加法，不做任何内存扫描。这样 exp 里需要"动态"的部分被压缩到最小的泄露链本身。

## 泄露链：Structure 到 libc

JSC 侧的起点是 `describe()`（用法见 [JavaScriptCore 调试参数](JavaScriptCore调试参数.md)）——它能把对象的 Structure 地址打印出来，等价于一个现成的 addrof。Structure 是 JSC 的内部元对象（字段表，见 [CVE-2023-41993 分析](CVE-2023-41993分析.md) 的前置知识），它的字段里藏着指向 libJSC 自身代码/数据区的指针，称其为 **anchor**：

```text
describe(obj)
  → Structure 地址
  → read64(structure + 0x268) / read64(structure + 0x2d8)
  → anchor（落在 libJSC 映射区间内的指针）

JSC base = anchor − anchorOff        （anchor 指向的 libJSC 偏移，逐版本实测）
libc base = JSC base − delta         （两库加载基址之差，逐版本实测）
```

本例（Safari 11.0.x，Ubuntu 20.04，glibc 2.31）的实测常量：

| 版本 | anchor 结构偏移 | anchorOff（+0x268 / +0x2d8） | delta（libJSC − libc） |
|---|---|---|---|
| Safari 11.0.1 | 0x268 / 0x2d8 | 0xc37230 / 0xc37640 | 0x2509000 |
| Safari 11.0.2 | 0x268 / 0x2d8 | 0xc37f20 / 0xc38330 | 0x2509000 |
| Safari 11.0.3 | anchor 消失（见下） | —（改走函数链） | 0x40a000 |

两个跨版本规律值得记：

- **结构偏移（0x268/0x2d8）比 anchorOff 稳定**——Structure 的字段布局很少动，变的是 anchor 指向的 libJSC 内部位置。跨版本适配时先假设结构偏移不变，只重量 anchorOff；
- **delta 在同一次构建序列下恒定**——动态库的加载顺序由链接与依赖关系决定，ASLR 随机的是整组映射的起点，不改变映射之间的相对距离。所以 delta 是版本常量，不是运行时变量；但换个构建（11.0.3）它就变了（0x2509000 → 0x40a000），必须按版本存。

拿到两个基址后，运行期地址全部是一次加法：`gadget = libc + 0x23b6a`、`system = libc + 0x52290`。

## 偏移量取

### delta：gdb 量映射距离

```bash
gdb -q -batch -ex 'break main' -ex run -ex 'info proc mappings' \
    --args cmake-build-release/bin/jsc -e 1
# libJavaScriptCore 第一行基址 0x7ffff6f8b000
# libc-2.31      第一行基址 0x7ffff4a82000
# delta = 0x2509000
```

gdb 下 ASLR 默认关闭，映射顺序确定，量出来的是"顺序距离"；真实运行时同序加载，距离不变。对拿不准的版本，可以用下面 `/proc` 法在真实运行时复核。

### anchor：自旋 + /proc 探测

思路：让 exploit 在打印 Structure 地址后原地自旋几十秒，父进程从外部读它的内存，把 Structure 附近落在 libJSC 区间内的指针值记下来：

```text
1. exp 里:打印 describe 拿到的 Structure 地址 → while(Date.now()-t<25000){} 自旋
2. 父进程:读 /proc/PID/maps  → libJSC 映射区间 [base, base+size)
3. 父进程:读 /proc/PID/mem   → dump Structure ±32KB 的每个 qword
4. 值落在 libJSC 区间内的,记为候选 anchor(记录 结构偏移 → libJSC 偏移)
5. 跑两轮,只取两轮完全一致的候选——单轮结果可能是中途被改写的临时指针
```

这个方法不受 gdb 干扰、看到的是真实运行时布局；写成脚本后换引擎版本只需要改一处路径。`/proc/PID/mem` 的好处是能按地址精确读，不用暂停目标进程。

### anchor 消失时：原生函数链

Safari 11.0.3 上 Structure ±32KB 内不再有任何 libJSC 指针——anchor 方案整体失效。备选思路是**从原生函数对象走指针链**：以 `Math.sin` 这类内建函数为起点，对对象图做广度优先搜索，每层用 `read64` 展开，寻找指向 libJSC 的字段：

```text
11.0.3:Math.sin → fn+0x10 → +0xb8 → libJSC+0x4209   (两轮一致,稳定)
11.0.1/2:对应链是 fn+0x10 → +0x70 → +0x30 → libJSC+0x14a30(链形状不同)
```

链的形状逐版本不同，但"内建函数对象内部一定挂着指向代码区的指针"这个事实是稳定的——搜索脚本通用，链本身按版本记录。这类链同样要先在 `/proc` 探测阶段验证两轮一致性，再固化进 exp。

## ELF 自校验

算出基址后应当自证它真的指向一个 ELF 映像，而不是带 tag 或算错的值。直觉做法是读首 8 字节比对 `\x7fELF` 头，但实测有两个坑：

1. **OSABI 字节不是 0**。libc 的 ELF 头第 7 字节 OSABI=3（GNU），期望值写成全零版本号本身就是错的（`xxd -l 16 libc.so` 可验证）；
2. **read64 的浮点精度**。`read64` 把两个 u32 拼成 double 再转回整数，JS 的位运算是 32 位的，拼接路径在值 ≥ 2^53 时舍入——整个首 qword（如 `0x03010102464c457f`）恰好超界，读回来低位失真（`0x…457f` 变 `0x…4580`）。

修复：改读 `base + 4` 的 3 个字节，期望 `02 01 01`——含义是 ELF64 / 小端 / 版本 1，值极小必然精确，同时绕开 OSABI 字节。两个版本、libc 和 libJSC 都通过。

顺带把精度边界记清楚，它是所有 JSC 读原语设计的隐形约束：**指针永远安全**（用户空间地址 < 2^48，远低于 2^53），所以 anchor、基址、对象指针都能用 `read64` 直读；**任意 8 字节不安全**（代码字节、大立即数经常 ≥ 2^53），需要精确值时得换无损视图（如 Uint32Array 重定向）——这也是泄露链坚持"只读指针"的原因之一。

## debug 与 release 的坑

同一个源码树的两套构建是**两个完全不同的二进制**：debug 的 libJavaScriptCore.so 约 147MB、release 约 19MB，md5 不同，符号排布、代码偏移全部不同。由此三条纪律：

- **libJSC 的偏移（anchorOff、函数偏移）必须在 release 构建上量**，debug 里量到的对 release 运行时无效；
- **libc 没有这个问题**——`ldd` 对 debug/release 引擎解析到的是同一个 `/lib/x86_64-linux-gnu/libc.so.6`，偏移天然与构建无关。这是 gadget 和 `system` 都从 libc 拿、不从 libJSC 拿的另一个理由（第一个理由是 libc 里 gadget 密度更高）；
- 量偏移的脚本要显式接收引擎路径参数，避免"量的是 A 构建、跑的是 B 构建"的静默错位——两个构建下跑一遍、输出应当一致（libc 类）或明确记录来源（libJSC 类）。

## 工具箱

| 目的 | 命令 |
|---|---|
| 定位引擎依赖的库 | `ldd <jsc>` |
| 符号偏移 | `nm -D <lib> \| grep <symbol>`（截断 `@@` 版本后缀） |
| 反汇编验证 gadget | `objdump -d --start-address=0x… --stop-address=0x… <lib>` |
| 量库基址 / delta | `gdb -batch -ex 'break main' -ex run -ex 'info proc mappings' --args <jsc>` |
| 真实运行时布局 | exp 自旋 → 读 `/proc/PID/maps`、`/proc/PID/mem` |
| ELF 头确认 | `xxd -l 16 <lib>`（注意 OSABI=3） |
| gadget 全量 dump | `ROPgadget --binary <lib>`（与自写字节扫描器交叉验证） |

## 相关阅读

- [调用约定与寄存器](调用约定与寄存器.md)：拿到基址之后布置 ROP 链、理解 `pop rdi` 与栈对齐的底层规则。
- [CVE-2023-41993 分析](CVE-2023-41993分析.md)：`describe()`、Structure 字段表与 GetterSetter 泄漏——本文泄露链的起点对象。
- [CVE-2024-23222 分析](CVE-2024-23222分析.md)：JSC DFG 并发 JIT 案例，同一套调试环境。
- [JavaScriptCore 调试参数](JavaScriptCore调试参数.md)：`describe()` 输出与调试开关汇总。
- [V8 调试手册](../v8/V8调试手册.md)：V8 侧对应的 `%DebugPrint` 与 gdb 工作流。
