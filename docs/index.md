---
title: 首页
description: 聚焦 V8、JavaScriptCore 与 ChakraCore 的对象模型、JIT、调试链路和漏洞根因分析。
hide:
  - toc
---

<div class="home-simple">
  <header class="home-simple__hero">
    <div class="home-simple__eyebrow">JavaScript Engine Security</div>
    <h1>JavaScript 引擎安全研究笔记</h1>
    <p>
      围绕 V8、JavaScriptCore 与 ChakraCore，记录对象布局、JIT 优化、
      调试方法，以及从 PoC、崩溃现场到补丁语义的 Root Cause 分析。
    </p>
    <div class="home-simple__actions">
      <a class="home-simple__primary" href="v8/">从 V8 开始</a>
      <a href="jsc/CVE-2024-23222分析/">阅读精选分析 <span aria-hidden="true">→</span></a>
    </div>
    <div class="home-simple__scope" aria-label="研究范围">
      <span>V8</span>
      <span>JavaScriptCore</span>
      <span>ChakraCore</span>
      <span>15 篇研究笔记</span>
    </div>
  </header>

  <section class="home-simple__section">
    <header class="home-simple__section-head">
      <span>01 / Research tracks</span>
      <div>
        <h2>研究方向</h2>
        <p>按引擎进入完整脉络，每条路线都从基础机制延伸到漏洞案例。</p>
      </div>
    </header>
    <div class="home-simple__tracks">
      <a class="home-simple__track" href="v8/">
        <span class="home-simple__track-index">01</span>
        <span class="home-simple__track-copy">
          <strong>V8</strong>
          <small>对象与堆布局、指针压缩、JIT、调试和漏洞利用原语</small>
        </span>
        <span class="home-simple__track-count">8 篇</span>
        <span aria-hidden="true">→</span>
      </a>
      <a class="home-simple__track" href="jsc/">
        <span class="home-simple__track-index">02</span>
        <span class="home-simple__track-copy">
          <strong>JavaScriptCore</strong>
          <small>JSValue、DFG / FTL、并发 JIT、Linux 复现与补丁验证</small>
        </span>
        <span class="home-simple__track-count">5 篇</span>
        <span aria-hidden="true">→</span>
      </a>
      <a class="home-simple__track" href="chakracore/">
        <span class="home-simple__track-index">03</span>
        <span class="home-simple__track-copy">
          <strong>ChakraCore</strong>
          <small>构建调试、Type Handler、对象布局迁移与经典类型混淆</small>
        </span>
        <span class="home-simple__track-count">2 篇</span>
        <span aria-hidden="true">→</span>
      </a>
    </div>
  </section>

  <section class="home-simple__section">
    <header class="home-simple__section-head">
      <span>02 / Start here</span>
      <div>
        <h2>建议阅读顺序</h2>
        <p>先建立内存模型，再连接调试现场，最后进入漏洞因果链。</p>
      </div>
    </header>
    <ol class="home-simple__path">
      <li>
        <span>01</span>
        <div>
          <strong>理解对象与内存布局</strong>
          <p>从 elements、properties、heap space 和指针压缩建立基础模型。</p>
          <a href="v8/V8 数组的内存布局/">V8 数组的内存布局 →</a>
        </div>
      </li>
      <li>
        <span>02</span>
        <div>
          <strong>连接源码与运行现场</strong>
          <p>掌握构建参数、断点位置、内部打印和最小化复现方法。</p>
          <a href="v8/V8调试手册/">V8 调试手册 →</a>
        </div>
      </li>
      <li>
        <span>03</span>
        <div>
          <strong>还原漏洞根因</strong>
          <p>把对象生命周期、优化假设、线程交错和补丁约束串成因果链。</p>
          <a href="jsc/JavaScriptCore Root Cause分析要点/">Root Cause 分析要点 →</a>
        </div>
      </li>
    </ol>
  </section>

  <section class="home-simple__section">
    <header class="home-simple__section-head">
      <span>03 / Selected notes</span>
      <div>
        <h2>精选文章</h2>
        <p>优先阅读复现证据和根因链路比较完整的几篇分析。</p>
      </div>
    </header>
    <div class="home-simple__articles">
      <a href="jsc/CVE-2024-23222分析/">
        <span>JSC</span>
        <strong>CVE-2024-23222 Linux x86_64 复现与根因分析</strong>
        <small>并发属性读取、stale JSCell 与主线程最终校验</small>
        <span aria-hidden="true">↗</span>
      </a>
      <a href="v8/CVE-2025-12433分析/">
        <span>V8</span>
        <strong>CVE-2025-12433 分析</strong>
        <small>hole-check elision 与控制流 merge 状态传播</small>
        <span aria-hidden="true">↗</span>
      </a>
      <a href="v8/CVE-2021-30517分析/">
        <span>V8</span>
        <strong>CVE-2021-30517 分析</strong>
        <small>SuperIC confusion 与利用原语构造</small>
        <span aria-hidden="true">↗</span>
      </a>
      <a href="chakracore/CVE-2019-0567/">
        <span>Chakra</span>
        <strong>CVE-2019-0567 分析</strong>
        <small>InitProto 副作用与属性槽位布局错配</small>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  </section>
</div>
