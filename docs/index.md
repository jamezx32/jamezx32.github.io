<div class="hero" markdown="1">
<div class="hero-eyebrow">JavaScript Engine Research Notes</div>
<div class="hero-title">SXY Research Notes</div>
<div class="hero-subtitle">
  记录 V8、JSC、ChakraCore 的对象布局、调试过程、JIT 行为与 CVE Root Cause 分析。
</div>
<div class="hero-actions">
  <a class="hero-action hero-action--primary" href="v8/">从 V8 开始</a>
  <a class="hero-action" href="v8/V8调试手册/">调试手册</a>
  <a class="hero-action" href="v8/CVE-2025-12433%E5%88%86%E6%9E%90/">直接看案例</a>
</div>
</div>


## 最近更新

- [V8 调试手册](v8/V8调试手册.md)
- [CVE-2025-13224 分析](v8/CVE-2025-13224分析.md)
- [CVE-2025-12433 分析](v8/CVE-2025-12433分析.md)
- [JavaScriptCore 调试参数](jsc/JavaScriptCore调试参数.md)

## 学习路径

<div class="home-grid" markdown="1">

<div class="home-card" markdown="1">
### 1. 先看内存表示

- [V8 数组的内存布局](v8/V8 数组的内存布局.md)
- [V8 堆的内存布局](v8/V8堆的内存布局.md)
- [V8 指针压缩机制](v8/V8指针压缩机制.md)
</div>

<div class="home-card" markdown="1">
### 2. 再看调试与执行

- [V8 调试手册](v8/V8调试手册.md)
- [JIT 基础](v8/jit.md)
- [JavaScriptCore Root Cause 分析要点](jsc/JavaScriptCore%20Root%20Cause分析要点.md)
</div>

<div class="home-card" markdown="1">
### 3. 最后看漏洞案例

- [CVE-2025-12433 分析](v8/CVE-2025-12433分析.md)
- [CVE-2025-13224 分析](v8/CVE-2025-13224分析.md)
- [CVE-2021-30517 分析](v8/CVE-2021-30517分析.md)
</div>

</div>

## 专题入口

<div class="home-grid" markdown="1">

<div class="home-card" markdown="1">
### V8

- [总览](v8/index.md)
- [调试手册](v8/V8调试手册.md)
- [漏洞分析](v8/CVE-2025-12433分析.md)
</div>

<div class="home-card" markdown="1">
### JSC

- [总览](jsc/index.md)
- [Root Cause 分析要点](jsc/JavaScriptCore%20Root%20Cause分析要点.md)
- [调试参数](jsc/JavaScriptCore调试参数.md)
</div>

<div class="home-card" markdown="1">
### ChakraCore

- [总览](chakracore/index.md)
- [CVE-2019-0567 分析](chakracore/CVE-2019-0567.md)
</div>

</div>
