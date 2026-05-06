# JavaScriptCore Linux 编译要点

## 概述

JavaScriptCore 是 WebKit 项目的一部分。Linux 环境下编译 `jsc` 需要获取完整 WebKit 源码，并通过 WebKit 提供的构建脚本启用 `--jsc-only`。

本文记录 Linux 下常用的 JSC 编译依赖、工具链配置和构建命令。

## 获取源码

```bash
git clone git@github.com:WebKit/WebKit.git
cd WebKit
```

如需复现固定版本，可切换到指定 commit：

```bash
git checkout xxx
```

## 安装依赖

Ubuntu / Debian 环境可安装以下基础依赖：

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  cmake \
  git \
  python3 \
  autoconf \
  bison \
  gperf \
  ruby \
  gcc \
  g++ \
  libicu-dev \
  libsqlite3-dev \
  libxml2-dev \
  libcurl4-openssl-dev \
  libpng-dev
```

## 安装 Clang

构建旧版本 WebKit 时，建议使用与目标 commit 时间接近的 Clang 版本。以按照 Clang 18为例：

```bash
wget https://apt.llvm.org/llvm.sh
chmod +x llvm.sh
sudo ./llvm.sh 18 all
```

安装完成后可检查编译器版本：

```bash
clang-18 --version
clang++-18 --version
```

## Debug 构建

Debug 版本适合源码调试和断点分析。以下命令只构建 JavaScriptCore，并关闭 fatal warnings：

```bash
Tools/Scripts/build-webkit \
  --jsc-only \
  --debug \
  --cmakeargs="-DDEVELOPER_MODE_FATAL_WARNINGS=OFF"
```

生成 `compile_commands.json`：

```bash
Tools/Scripts/build-webkit \
  --jsc-only \
  --debug \
  --cmakeargs="-DDEVELOPER_MODE_FATAL_WARNINGS=OFF -DCMAKE_EXPORT_COMPILE_COMMANDS=1"
```

指定并行编译线程数：

```bash
Tools/Scripts/build-webkit \
  --jsc-only \
  --debug \
  --cmakeargs="-DDEVELOPER_MODE_FATAL_WARNINGS=OFF -DCMAKE_EXPORT_COMPILE_COMMANDS=1" \
  --makeargs="-j16"
```

## 指定 Clang 构建

使用 Clang 18 构建 Debug 版本：

```bash
CC=clang-18 CXX=clang++-18 \
Tools/Scripts/build-webkit \
  --jsc-only \
  --debug \
  --cmakeargs="-DDEVELOPER_MODE_FATAL_WARNINGS=OFF -DCMAKE_EXPORT_COMPILE_COMMANDS=1" \
  --makeargs="-j16"
```

## 带符号且关闭断言的 Debug 构建

该配置保留 Debug 符号，同时通过 `NDEBUG` 与 `RELEASE_WITHOUT_OPTIMIZATIONS` 关闭断言，适合需要减少断言干扰但仍需调试符号的场景。

```bash
CC=clang-18 CXX=clang++-18 \
WEBKIT_OUTPUTDIR=ReleaseAssertionDebugBuild \
CFLAGS="-DNDEBUG -DRELEASE_WITHOUT_OPTIMIZATIONS" \
CXXFLAGS="-DNDEBUG -DRELEASE_WITHOUT_OPTIMIZATIONS -stdlib=libc++" \
Tools/Scripts/build-webkit \
  --jsc-only \
  --debug \
  --cmakeargs="-G \"Unix Makefiles\" -DDEVELOPER_MODE_FATAL_WARNINGS=OFF -DCMAKE_EXPORT_COMPILE_COMMANDS=1 -DCMAKE_EXE_LINKER_FLAGS='-stdlib=libc++ -lc++abi'" \
  --makeargs="-j32"
```

也可在 `Source/cmake/OptionsJSCOnly.cmake` 中固定添加：

```cmake
add_definitions(-DNDEBUG)
add_definitions(-DRELEASE_WITHOUT_OPTIMIZATIONS)
```

## 静态链接构建

静态链接 JSC 可通过 `ENABLE_STATIC_JSC` 启用：

```bash
WEBKIT_OUTPUTDIR=$WEBKIT_PATH/WebKitBuild/ \
Tools/Scripts/build-webkit \
  --jsc-only \
  --debug \
  --cmakeargs="-DENABLE_STATIC_JSC=ON -DUSE_THIN_ARCHIVES=OFF"
```

## Release 构建

不指定 `--debug` 时默认构建 Release 版本：

```bash
WEBKIT_OUTPUTDIR=$WEBKIT_PATH/WebKitBuild/ \
Tools/Scripts/build-webkit \
  --jsc-only
```

关闭 fatal warnings：

```bash
Tools/Scripts/build-webkit \
  --jsc-only \
  --cmakeargs="-DDEVELOPER_MODE_FATAL_WARNINGS=OFF"
```

## Fuzzilli 构建

Fuzzilli 构建通常需要静态 JSC 与 sanitizer coverage：

```bash
WEBKIT_OUTPUTDIR=FuzzBuild \
Tools/Scripts/build-jsc \
  --jsc-only \
  --debug \
  --cmakeargs="-DENABLE_STATIC_JSC=ON -DCMAKE_EXPORT_COMPILE_COMMANDS=1 -DCMAKE_C_COMPILER='/usr/bin/clang' -DCMAKE_CXX_COMPILER='/usr/bin/clang++' -DCMAKE_CXX_FLAGS='-fsanitize-coverage=trace-pc-guard -DENABLE_FUZZILLI=1 -lrt' -DCMAKE_C_FLAGS='-fsanitize-coverage=trace-pc-guard -DENABLE_FUZZILLI=1 -lrt'"
```

部分版本需要在 `Source/JavaScriptCore/shell/CMakeLists.txt` 中显式添加编译参数：

```cmake
function(WEBKIT_ADD_COMPILER_FLAGS_NO_CHECK _compiler _kind _subject)
    foreach (_flag IN LISTS ARGN)
        set_property(${_kind} ${_subject} APPEND PROPERTY COMPILE_OPTIONS "${_flag}")
    endforeach ()
endfunction()

WEBKIT_ADD_COMPILER_FLAGS_NO_CHECK(CXX TARGET JavaScriptCore -fsanitize-coverage=trace-pc-guard -DENABLE_FUZZILLI=1)
WEBKIT_ADD_COMPILER_FLAGS_NO_CHECK(CXX TARGET jsc -fsanitize-coverage=trace-pc-guard -DENABLE_FUZZILLI=1)
```

在 `Source/JavaScriptCore/Sources.txt` 中加入：

```text
fuzzilli/Fuzzilli.cpp
```

Linux 下如遇缺失声明，可在 `Source/JavaScriptCore/fuzzilli/Fuzzilli.cpp` 中补充：

```cpp
#include <unistd.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
```

随后构建：

```bash
Tools/Scripts/build-webkit \
  --jsc-only \
  --debug \
  --no-fatal-warnings \
  --cmakeargs="-DENABLE_STATIC_JSC=ON -DCMAKE_C_COMPILER='/usr/bin/clang' -DCMAKE_CXX_COMPILER='/usr/bin/clang++'"
```

## 构建产物

构建完成后，`jsc` 通常位于对应输出目录的 `bin` 目录中，例如：

```bash
WebKitBuild/Debug/bin/jsc
ReleaseAssertionDebugBuild/bin/jsc
FuzzBuild/Debug/bin/jsc
```

可通过以下命令验证：

```bash
./WebKitBuild/Debug/bin/jsc -e 'print("ok")'
```
