---
title: ChakraCore 研究路线
description: ChakraCore 构建调试与经典类型混淆漏洞案例的阅读入口。
hide:
  - toc
---

<div class="index-flow index-flow--overview-page">
  <header class="overview-hero overview-hero--chakra">
    <div class="overview-hero__content">
      <div class="overview-hero__eyebrow">Engine Track · 03</div>
      <h1 class="overview-hero__title">ChakraCore</h1>
      <p class="overview-hero__summary">以构建调试流程和经典漏洞为核心，观察 type handler、inline slots 与 aux slots 变化带来的 JIT 假设失效。</p>
      <div class="overview-hero__actions">
        <a class="overview-button overview-button--primary" href="ChakraCore构建与调试/">配置调试环境</a>
        <a class="overview-button" href="CVE-2019-0567/">阅读漏洞案例</a>
      </div>
    </div>
    <div class="overview-hero__facts">
      <span><strong>2</strong> 篇核心笔记</span>
      <span><strong>Type Handler</strong> 对象布局</span>
      <span><strong>JIT</strong> Side Effect</span>
    </div>
  </header>

  <section class="overview-section">
    <header class="overview-section__heading">
      <div class="overview-section__eyebrow">Recommended Path</div>
      <h2>两步完成主线阅读</h2>
      <p>先搭建可以验证对象与 JIT 状态的环境，再进入具体漏洞因果链。</p>
    </header>
    <div class="overview-path overview-path--two">
      <article class="overview-path__step">
        <span class="overview-path__index">01</span>
        <div>
          <span class="overview-path__label">Environment</span>
          <h3>构建与调试</h3>
          <p>准备 Windows/Linux 调试环境，建立源码、断点和运行时状态之间的连接。</p>
          <ul class="overview-link-list">
            <li><a href="ChakraCore构建与调试/">ChakraCore 构建与调试</a></li>
          </ul>
        </div>
      </article>
      <article class="overview-path__step">
        <span class="overview-path__index">02</span>
        <div>
          <span class="overview-path__label">Case Study</span>
          <h3>经典类型混淆案例</h3>
          <p>分析 InitProto 副作用如何引发 type transition，并使 JIT 继续使用过期布局。</p>
          <ul class="overview-link-list">
            <li><a href="CVE-2019-0567/">CVE-2019-0567 分析</a></li>
          </ul>
        </div>
      </article>
    </div>
  </section>
</div>
