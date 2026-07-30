---
title: V8 研究路线
description: V8 对象模型、堆布局、JIT、调试与漏洞案例的结构化阅读入口。
hide:
  - toc
---

<div class="index-flow index-flow--overview-page">
  <header class="overview-hero overview-hero--v8">
    <div class="overview-hero__content">
      <div class="overview-hero__eyebrow">Engine Track · 01</div>
      <h1 class="overview-hero__title">V8</h1>
      <p class="overview-hero__summary">从对象表示和堆布局开始，连接到调试工具、JIT 行为与真实漏洞案例。这里是当前内容最完整的一条研究路线。</p>
      <div class="overview-hero__actions">
        <a class="overview-button overview-button--primary" href="V8 数组的内存布局/">从对象布局开始</a>
        <a class="overview-button" href="V8调试手册/">打开调试手册</a>
      </div>
    </div>
    <div class="overview-hero__facts">
      <span><strong>8</strong> 篇主题笔记</span>
      <span><strong>3</strong> 个 CVE 案例</span>
      <span><strong>4</strong> 个核心方向</span>
    </div>
  </header>

  <section class="overview-section">
    <header class="overview-section__heading">
      <div class="overview-section__eyebrow">Recommended Path</div>
      <h2>建议阅读顺序</h2>
      <p>每一步都为下一步补齐必要的内存模型、调试能力或漏洞推理方法。</p>
    </header>
    <div class="overview-path">
      <article class="overview-path__step">
        <span class="overview-path__index">01</span>
        <div>
          <span class="overview-path__label">Foundation</span>
          <h3>对象、数组与堆布局</h3>
          <p>理解 elements、properties、heap space 以及对象在内存中的真实组织方式。</p>
          <ul class="overview-link-list">
            <li><a href="V8 数组的内存布局/">V8 数组的内存布局</a></li>
            <li><a href="V8堆的内存布局/">V8 堆的内存布局</a></li>
            <li><a href="V8指针压缩机制/">V8 指针压缩机制</a></li>
          </ul>
        </div>
      </article>
      <article class="overview-path__step">
        <span class="overview-path__index">02</span>
        <div>
          <span class="overview-path__label">Execution</span>
          <h3>JIT 与调试链路</h3>
          <p>把静态结构连接到 bytecode、优化阶段和运行时现场。</p>
          <ul class="overview-link-list">
            <li><a href="jit/">V8 JIT 基础</a></li>
            <li><a href="V8调试手册/">V8 调试手册</a></li>
          </ul>
        </div>
      </article>
      <article class="overview-path__step">
        <span class="overview-path__index">03</span>
        <div>
          <span class="overview-path__label">Case Study</span>
          <h3>漏洞与利用原语</h3>
          <p>围绕类型混淆、hole 状态和优化错误，还原从 PoC 到补丁的因果链。</p>
          <ul class="overview-link-list">
            <li><a href="CVE-2021-30517分析/">CVE-2021-30517</a></li>
            <li><a href="CVE-2025-12433分析/">CVE-2025-12433</a></li>
            <li><a href="CVE-2025-13224分析/">CVE-2025-13224</a></li>
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
      <a class="overview-article" href="V8调试手册/">
        <span class="overview-article__type">Handbook</span>
        <strong>V8 调试手册</strong>
        <p>构建、内部函数、断点与常用观察入口。</p>
        <span class="overview-article__cta">开始阅读 →</span>
      </a>
      <a class="overview-article" href="CVE-2025-12433分析/">
        <span class="overview-article__type">Root Cause</span>
        <strong>CVE-2025-12433</strong>
        <p>hole-check elision 与控制流 merge 状态传播。</p>
        <span class="overview-article__cta">查看分析 →</span>
      </a>
      <a class="overview-article" href="CVE-2021-30517分析/">
        <span class="overview-article__type">Exploit</span>
        <strong>CVE-2021-30517</strong>
        <p>SuperIC confusion 与 exploit primitive 构造。</p>
        <span class="overview-article__cta">查看分析 →</span>
      </a>
    </div>
  </section>
</div>
