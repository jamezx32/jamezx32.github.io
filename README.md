<div align="center">

# SXY Research Notes

<p><strong>🚀 JavaScript Engine research notes for V8, JSC, ChakraCore, debugging workflows, memory layout, JIT internals, and CVE analysis.</strong></p>

<p>
  <a href="https://jamezx32.github.io/">🌐 Live Site</a> ·
  <a href="#-highlighted-writeups">🔍 Writeups</a> ·
  <a href="#-local-development">🛠️ Local Dev</a>
</p>

<p>
  <img alt="MkDocs" src="https://img.shields.io/badge/MkDocs-1.6.1-526CFE?style=flat-square&logo=mkdocs&logoColor=white">
  <img alt="Material for MkDocs" src="https://img.shields.io/badge/Material-9.7.6-4051B5?style=flat-square&logo=materialformkdocs&logoColor=white">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white">
  <img alt="GitHub Pages" src="https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?style=flat-square&logo=githubpages&logoColor=white">
</p>

</div>

这是一个基于 **MkDocs Material** 搭建的静态研究站点，主要用于记录 JavaScript 引擎相关知识、漏洞分析过程，以及源码阅读与调试环境配置。内容目前主要围绕 **V8 / JSC / ChakraCore** 展开，偏重对象布局、执行流程、调试链路、exploit 基础和 CVE case study。

## 🎯 Scope

- **V8**: object layout, heap layout, pointer compression, JIT, exploit-oriented case studies
- **JSC**: execution pipeline, optimization layers, debugging notes
- **ChakraCore**: execution flow, vulnerability analysis, root cause notes
- **Tooling**: `clangd`, source indexing, local debugging environment

## 🔍 Highlighted Writeups

| Writeup | Engine | Focus |
| --- | --- | --- |
| [CVE-2021-30517 Analysis](docs/v8/CVE-2021-30517分析.md) | V8 | SuperIC confusion, handler mismatch, exploit primitives |
| [CVE-2025-12433 Analysis](docs/v8/CVE-2025-12433分析.md) | V8 | layout reasoning, exploit primitives, root cause analysis |
| [CVE-2019-0567 Analysis](docs/chakracore/CVE-2019-0567.md) | ChakraCore | debugging notes, exploitation context, vulnerability analysis |
| [JavaScriptCore Root Cause Notes](docs/jsc/JavaScriptCore%20Root%20Cause分析要点.md) | JSC | architecture, optimization pipeline, object model |
| [JavaScriptCore NAN-Boxing](docs/jsc/JavaScriptCore%20NAN-Boxing.md) | JSC | JSValue representation, tagged immediates, hole semantics |
| [JavaScriptCore Debugging Flags](docs/jsc/JavaScriptCore调试参数.md) | JSC | dump flags, tier switching, gdb entry points |


## 🛠️ Local Development

```bash
pip install -r requirements.txt
mkdocs serve
```

Build static files:

```bash
mkdocs build
```

## 📦 Deployment

The site is deployed to **GitHub Pages** via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).  
Push to `main` will trigger a new build and deployment.

## ✨ Notes

This repository is maintained as an evolving research notebook rather than a finished book.  
The content will continue expanding around engine internals, exploit primitives, debug output analysis, and CVE case studies.

## 🙏 Acknowledgement

感谢 [@bjrjk](https://github.com/bjrjk)以及 [@aklnjakln](https://github.com/aklnjakln) 对我提供的帮助。
