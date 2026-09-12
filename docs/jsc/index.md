---
title: JavaScriptCore 研究路线
description: JavaScriptCore 值表示、DFG/FTL、调试与漏洞根因分析的结构化入口。
hide:
  - toc
---

<div class="index-flow index-flow--overview-page">
  <header class="overview-hero overview-hero--jsc">
    <div class="overview-hero__content">
      <div class="overview-hero__eyebrow">Engine Track · 02</div>
      <h1 class="overview-hero__title">JavaScriptCore</h1>
      <p class="overview-hero__summary">围绕 JSValue 表示、DFG/FTL 优化管线与并发 JIT 展开，强调 Linux 复现、线程交互和补丁有效性验证。</p>
      <div class="overview-hero__actions">
        <a class="overview-button overview-button--primary" href="JavaScriptCore NAN-Boxing/">从值表示开始</a>
        <a class="overview-button" href="CVE-2024-23222分析/">阅读最新案例</a>
      </div>
    </div>
    <div class="overview-hero__facts">
      <span><strong>9</strong> 篇主题笔记</span>
      <span><strong>DFG / FTL</strong> 优化管线</span>
      <span><strong>Linux</strong> 复现路径</span>
    </div>
  </header>

  <section class="overview-section">
    <header class="overview-section__heading">
      <div class="overview-section__eyebrow">Recommended Path</div>
      <h2>建议阅读顺序</h2>
      <p>先解决“值如何表示、代码如何构建”，再进入调试参数与并发漏洞现场。</p>
    </header>
    <div class="overview-path">
      <article class="overview-path__step">
        <span class="overview-path__index">01</span>
        <div>
          <span class="overview-path__label">Representation</span>
          <h3>值表示与对象模型</h3>
          <p>理解 JSValue、NaN-boxing、tag 与 payload，是阅读 JIT 与 GC 代码的基础。</p>
          <ul class="overview-link-list">
            <li><a href="JavaScriptCore NAN-Boxing/">JavaScriptCore NAN-Boxing</a></li>
            <li><a href="JavaScriptCore Root Cause分析要点/">Root Cause 分析要点</a></li>
          </ul>
        </div>
      </article>
      <article class="overview-path__step">
        <span class="overview-path__index">02</span>
        <div>
          <span class="overview-path__label">Environment</span>
          <h3>构建与调试入口</h3>
          <p>建立 Linux 构建、JIT tier 控制和内部状态输出的稳定实验环境。</p>
          <ul class="overview-link-list">
            <li><a href="JavaScriptCore Linux编译/">Linux 编译要点</a></li>
            <li><a href="JavaScriptCore调试参数/">调试参数</a></li>
          </ul>
        </div>
      </article>
      <article class="overview-path__step">
        <span class="overview-path__index">03</span>
        <div>
          <span class="overview-path__label">Case Study</span>
          <h3>漏洞根因分析案例</h3>
          <p>从 DFG 优化键缺陷到并发 JIT 时序，还原从 PoC 到补丁的因果链。</p>
          <ul class="overview-link-list">
            <li><a href="CVE-2023-41993分析/">CVE-2023-41993 完整分析</a></li>
            <li><a href="CVE-2024-23222分析/">CVE-2024-23222 完整分析</a></li>
          </ul>
        </div>
      </article>
      <article class="overview-path__step">
        <span class="overview-path__index">04</span>
        <div>
          <span class="overview-path__label">Exploitation</span>
          <h3>利用基础</h3>
          <p>从原语走向 ROP：库基址泄露、调用约定与寄存器的命令行工作流。</p>
          <ul class="overview-link-list">
            <li><a href="JavaScriptCore 库基址泄露/">JavaScriptCore 库基址泄露</a></li>
            <li><a href="调用约定与寄存器/">调用约定与寄存器</a></li>
            <li><a href="JavaScriptCore ROP 链/">ROP 链</a></li>
          </ul>
        </div>
      </article>
    </div>
  </section>

  <section class="overview-section">
    <header class="overview-section__heading">
      <div class="overview-section__eyebrow">Featured Notes</div>
      <h2>重点文章</h2>
    </header>
    <div class="overview-article-grid">
      <a class="overview-article overview-article--featured" href="CVE-2024-23222分析/">
        <span class="overview-article__type">Featured · Root Cause</span>
        <strong>CVE-2024-23222</strong>
        <p>从并发属性读取到 stale cell，再到主线程最终校验。</p>
        <span class="overview-article__cta">查看完整复现 →</span>
      </a>
      <a class="overview-article" href="JavaScriptCore Root Cause分析要点/">
        <span class="overview-article__type">Methodology</span>
        <strong>Root Cause 分析要点</strong>
        <p>对象模型、优化层级与漏洞分析路径。</p>
        <span class="overview-article__cta">打开方法笔记 →</span>
      </a>
      <a class="overview-article" href="JavaScriptCore调试参数/">
        <span class="overview-article__type">Reference</span>
        <strong>JavaScriptCore 调试参数</strong>
        <p>tier 切换、dump 选项与关键调试入口。</p>
        <span class="overview-article__cta">查看参数 →</span>
      </a>
    </div>
  </section>
</div>
