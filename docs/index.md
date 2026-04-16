<div class="index-flow index-flow--home">
  <section class="home-hero">
    <div class="home-hero__main">
      <div class="home-hero__eyebrow">JavaScript Engine Research Notes</div>
       <h3 ></h3>
      <h1 class="home-hero__title">SXY JavaScript 引擎研究笔记</h1>
       <h3 ></h3>
      <p class="home-hero__summary">
        记录 V8、JavaScriptCore 和 ChakraCore 的对象布局、调试链路、
        JIT 行为与 CVE Root Cause 分析。
        <h3 ></h3>
      </p>
      <div class="home-hero__actions">
        <a class="home-hero__action home-hero__action--primary" href="v8/">从 V8 总览开始</a>
        <a class="home-hero__action" href="jsc/">查看 JSC 总览</a>
      </div>
    </div>
    <aside class="home-hero__aside">
      <div class="home-panel home-panel--start">
        <div class="home-panel__eyebrow">从哪里开始</div>
        <ol class="home-start-list">
          <li class="home-start-list__item">
            <span class="home-start-list__step">01</span>
            <div>
              <a href="v8/">先看 V8 总览</a>
              <p>先建立对象模型、堆布局和主要入口的整体认识。</p>
            </div>
          </li>
          <li class="home-start-list__item">
            <span class="home-start-list__step">02</span>
            <div>
              <a href="v8/V8调试手册/">继续阅读调试手册</a>
              <p>将结构理解连接到实际调试流程中。</p>
            </div>
          </li>
          <li class="home-start-list__item">
            <span class="home-start-list__step">03</span>
            <div>
              <a href="v8/CVE-2025-12433分析/">最后阅读漏洞案例</a>
              <p>再阅读真实案例，对照 exploit 与补丁分析。</p>
            </div>
          </li>
        </ol>
      </div>
    </aside>
  </section>

  <section class="home-engines">
    <div class="home-section-heading">
      <div class="home-section-heading__eyebrow">主要方向</div>
    </div>
    <div class="home-engine-grid">
      <article class="home-engine-card home-engine-card--featured">
        <div class="home-engine-card__eyebrow">Engine</div>
        <h3 class="home-engine-card__title">V8</h3>
        <p class="home-engine-card__summary">当前内容最完整，适合先建立对象模型与调试链路，再进入漏洞案例。</p>
        <ul class="home-engine-card__links">
          <li><a href="v8/">V8 总览</a></li>
          <li><a href="v8/V8调试手册/">V8 调试手册</a></li>
          <li><a href="v8/CVE-2025-12433分析/">CVE-2025-12433 分析</a></li>
        </ul>
      </article>
      <article class="home-engine-card">
        <div class="home-engine-card__eyebrow">Engine</div>
        <h3 class="home-engine-card__title">JSC</h3>
        <p class="home-engine-card__summary">适合补充值表示与 Root Cause 视角，也便于与 V8 对照阅读。</p>
        <ul class="home-engine-card__links">
          <li><a href="jsc/">JSC 总览</a></li>
          <li><a href="jsc/JavaScriptCore Root Cause分析要点/">Root Cause 分析要点</a></li>
        </ul>
      </article>
      <article class="home-engine-card">
        <div class="home-engine-card__eyebrow">Engine</div>
        <h3 class="home-engine-card__title">ChakraCore</h3>
        <p class="home-engine-card__summary">内容较少，但保留了构建流程与历史案例，适合做横向对照。</p>
        <ul class="home-engine-card__links">
          <li><a href="chakracore/">ChakraCore 总览</a></li>
          <li><a href="chakracore/ChakraCore构建与调试/">ChakraCore 构建与调试</a></li>
        </ul>
      </article>
    </div>
  </section>

  <section class="home-strip">
    <article class="home-strip__block">
      <div class="home-strip__eyebrow">重点入口</div>
      <h2 class="home-strip__title">对象布局、Root Cause 与调试参数</h2>
      <ul class="home-inline-list">
        <li><a href="v8/V8 数组的内存布局/">V8 数组的内存布局</a></li>
        <li><a href="jsc/JavaScriptCore Root Cause分析要点/">JSC Root Cause 分析要点</a></li>
        <li><a href="jsc/JavaScriptCore调试参数/">JSC 调试参数</a></li>
        <li><a href="chakracore/ChakraCore构建与调试/">ChakraCore 构建与调试</a></li>
      </ul>
    </article>
  </section>
</div>
