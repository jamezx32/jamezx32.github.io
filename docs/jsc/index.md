<div class="index-flow index-flow--overview-page">
  <header class="overview-hero">
    <div class="overview-hero__eyebrow">Engine Overview</div>
    <h1 class="overview-hero__title">JSC</h1>
    <p class="overview-hero__summary">这里整理 JavaScriptCore 的 Root Cause 分析入口、值表示和调试方法，适合与 V8 对照阅读。</p>
  </header>

  <section class="overview-band">
    <article class="overview-band__panel">
      <div class="overview-band__eyebrow">快速开始</div>
      <h2 class="overview-band__title">Root Cause 方法与值表示</h2>
      <ul class="overview-link-list">
        <li><a href="JavaScriptCore Root Cause分析要点.md">JavaScriptCore Root Cause 分析要点</a></li>
        <li><a href="JavaScriptCore NAN-Boxing.md">JavaScriptCore NAN-Boxing</a></li>
      </ul>
    </article>
    <article class="overview-band__panel">
      <div class="overview-band__eyebrow">当前重点</div>
      <h2 class="overview-band__title">JSValue 表示与分析路径</h2>
      <p class="overview-band__summary">如果已经熟悉 V8，可以重点看 JSValue 表示和 Root Cause 方法。</p>
    </article>
  </section>

  <section class="overview-section">
    <div class="overview-section__eyebrow">推荐顺序</div>
    <div class="overview-grid overview-grid--two">
      <article class="overview-card">
        <div class="overview-card__eyebrow">01 Model</div>
        <h3>先看分析方法和值表示</h3>
        <ul class="overview-link-list">
          <li><a href="JavaScriptCore Root Cause分析要点.md">JavaScriptCore Root Cause 分析要点</a></li>
          <li><a href="JavaScriptCore NAN-Boxing.md">JavaScriptCore NAN-Boxing</a></li>
        </ul>
      </article>
      <article class="overview-card">
        <div class="overview-card__eyebrow">02 Debugging</div>
        <h3>再补充调试入口</h3>
        <ul class="overview-link-list">
          <li><a href="JavaScriptCore调试参数.md">JavaScriptCore 调试参数</a></li>
        </ul>
      </article>
    </div>
  </section>
</div>
