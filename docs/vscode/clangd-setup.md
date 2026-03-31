

# VS Code 中配置 clangd（以 V8 为例）


本文以 **V8 工程** 为例说明，但整体思路同样适用于其他需要编译数据库的 C/C++ 项目。

---

## 一、安装 clangd

先通过 `apt` 安装 clangd：

```bash
sudo apt update
sudo apt install clangd
```

安装完成后，确认版本：

```bash
clangd --version
```

如果系统中安装的是特定版本，例如 `clangd-21`，也可以进一步确认其路径：

```bash
which clangd-21
```

---

## 二、安装 VS Code 插件

在 VS Code 中，只安装下面这个插件即可：

- **clangd**（LLVM 官方插件）

需要注意的是，如果你已经安装了 **C/C++（Microsoft）** 扩展，后续很可能会和 clangd 的语义分析能力发生冲突。因此推荐：

- 要么仅使用 clangd
- 要么至少禁用 Microsoft C/C++ 扩展提供的 IntelliSense

---

## 三、生成编译数据库 `compile_commands.json`

这是 clangd 能否正常工作的关键步骤。

进入 V8 根目录：

```bash
cd ~/v8/v8
```

执行：

```bash
gn gen out/x64.release --export-compile-commands
```

执行完成后，确认编译数据库已经生成：

```bash
ls out/x64.release/compile_commands.json
```

如果这里没有看到文件，那么 clangd 后续通常无法正确解析项目。

---

## 四、配置 VS Code 的 `settings.json`

在 V8 根目录（cd ~/v8/v8）下创建：

```text
.vscode/settings.json
```

写入以下内容：

```json
{
  "clangd.path": "/usr/bin/clangd",
  "clangd.arguments": [
    "--background-index",
    "--header-insertion=never",
    "--compile-commands-dir=out/x64.release"
  ]
}
```

如果你实际使用的是 `clangd-21`，则把路径改成：

```json
"clangd.path": "/usr/bin/clangd-21"
```

### 这些参数分别在做什么

- `--background-index`：让 clangd 在后台建立索引，便于后续跳转和补全
- `--header-insertion=never`：避免自动插入头文件时改动源码
- `--compile-commands-dir=...`：明确告诉 clangd 去哪里找编译数据库

---



## 五、处理 clangd 与 Microsoft C/C++ 扩展的冲突

如果 VS Code 弹出类似下面的提示：

> Microsoft C++ 扩展与 clangd 冲突

建议直接选择：

```text
Disable IntelliSense
```

如果没有弹窗，也可以手动处理：

- 禁用 Microsoft 的 **C/C++** 扩展
- 或至少关闭它的 IntelliSense 功能

clangd 和 Microsoft C/C++ 扩展都试图提供：

- 跳转定义
- 代码补全
- 类型推断
- 错误提示

如果两者同时工作，经常会出现：

- 跳转结果不一致
- 补全来源混乱
- 诊断信息重复或冲突

因此，建议让 clangd 成为唯一的语义分析来源。

---

## 六、重启 clangd

配置完成后，建议手动重启一次语言服务。

在 VS Code 中按：

```text
Ctrl + Shift + P
```

输入并执行：

```text
clangd: Restart language server
```

这样可以确保最新配置已经生效。

---

## 七、验证是否配置成功

### 方法 1：命令行检查

在项目根目录执行：

```bash
clangd --check=src/objects/map.cc --compile-commands-dir=out/x64.release
```

如果没有出现大量明显的解析错误，通常说明 clangd 已经能够正确读取项目编译参数。

### 方法 2：在编辑器中检查

打开 V8 源码文件后，重点观察下面几项是否正常：

- `F12` 能否跳转定义
- 鼠标悬停时能否显示类型信息
- 自动补全是否正常工作
- 交叉引用是否可用

如果这些功能都已经可用，说明 clangd 基本已经配置成功。

---

## 注意

下面这三个条件，缺任何一个，clangd 都很可能表现异常。

### 1. 打开的是项目根目录

你在 VS Code 中打开的目录应该是：

```bash
~/v8/v8
```

而不是更上层目录，也不是某个子目录。

### 2. `compile_commands.json` 确实存在

也就是下面这个文件必须存在：

```bash
out/x64.release/compile_commands.json
```

### 3. 只让 clangd 负责语义分析

不要让 clangd 和 Microsoft C/C++ 扩展同时争夺同一套语言服务能力。

