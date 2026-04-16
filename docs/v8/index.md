<div class="index-flow index-flow--overview-page">
  <header class="overview-hero">
    <div class="overview-hero__eyebrow">Engine Overview</div>
    <h1 class="overview-hero__title">V8</h1>
    <p class="overview-hero__summary">这里整理 V8 的对象模型、调试链路、JIT 与漏洞分析入口。</p>
  </header>

  <section class="overview-band">
    <article class="overview-band__panel">
      <div class="overview-band__eyebrow">快速开始</div>
      <h2 class="overview-band__title">调试入口与对象模型</h2>
      <ul class="overview-link-list">
        <li><a href="V8调试手册.md">V8 调试手册</a></li>
        <li><a href="V8 数组的内存布局.md">V8 数组的内存布局</a></li>
      </ul>
    </article>
    <article class="overview-band__panel">
      <div class="overview-band__eyebrow">当前重点</div>
      <h2 class="overview-band__title">对象模型、调试链路与近期案例</h2>
      <p class="overview-band__summary">可以先阅读对象表示与调试内容，再继续看近期案例。</p>
    </article>
  </section>

  <section class="overview-section">
    <div class="overview-section__eyebrow">推荐顺序</div>
    <div class="overview-grid">
      <article class="overview-card">
        <div class="overview-card__eyebrow">01 Foundation</div>
        <h3>先看对象与堆布局</h3>
        <ul class="overview-link-list">
          <li><a href="V8 数组的内存布局.md">V8 数组的内存布局</a></li>
          <li><a href="V8堆的内存布局.md">V8 堆的内存布局</a></li>
        </ul>
      </article>
      <article class="overview-card">
        <div class="overview-card__eyebrow">02 Debugging</div>
        <h3>再进入实际调试入口</h3>
        <ul class="overview-link-list">
          <li><a href="V8调试手册.md">V8 调试手册</a></li>
          <li><a href="V8指针压缩机制.md">V8 指针压缩机制</a></li>
        </ul>
      </article>
      <article class="overview-card">
        <div class="overview-card__eyebrow">03 Case Study</div>
        <h3>最后阅读漏洞案例</h3>
        <ul class="overview-link-list">
          <li><a href="CVE-2025-12433分析.md">CVE-2025-12433 分析</a></li>
          <li><a href="CVE-2025-13224分析.md">CVE-2025-13224 分析</a></li>
        </ul>
      </article>
    </div>
  </section>
</div>
