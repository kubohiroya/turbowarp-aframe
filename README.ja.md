# TurboWarp-A-Frame

[English](README.md)

TurboWarp-A-Frame は、TurboWarp のブロックから宣言型の A-Frame シーングラフを構築する unsandboxed 拡張です。

Scratch のスプライトや背景を 3D オブジェクトとして扱うのではなく、3D シーン定義とイベント処理を置く場所として扱います。3D ノードは id、class、data 属性、A-Frame 属性、template、selector、event で操作します。

## できること

- TurboWarp から埋め込み A-Frame シーンを作成します。
- primitive、image、text、model、light、camera、group ノードを親子構造で作成します。
- `#id`、`.class`、`[data-key=value]` の限定セレクタでノードを選びます。
- local `position`、`rotation`、class、`data-*`、visible、A-Frame component 属性を操作します。
- JSON template を読み込み、instance id を明示して部分シーングラフを生成します。
- ブロックで作ったシーングラフを YAML DSL として書き出し、同じ YAML DSL を読み込んで編集可能なシーングラフとして復元します。
- A-Frame host を検出した TurboWarp stage 近傍へ mount し、scene ready、DOM pointer/click、selector 単位の custom event をハットブロックで扱います。
- 当たり判定と AR 連携は Issue #1 に基づく次段階の API 境界として文書化しています。

## 要件と安全性

- Node.js 22 以上
- Corepack 経由の pnpm
- TurboWarp の unsandboxed extension support
- ブラウザ利用時は、生成済み拡張を使うページまたはプロジェクト環境で A-Frame を読み込むこと

unsandboxed 拡張はページ DOM を操作できます。信頼できる生成済み bundle だけを読み込んでください。

## インストール

```bash
corepack enable
pnpm install --frozen-lockfile
```

## クイックスタート

```bash
pnpm run build
```

TurboWarp では `dist/turbowarp-aframe.js` を unsandboxed custom extension として読み込みます。

package として参照する場合は version を固定します。

```bash
pnpm add --save-exact @kubohiroya/turbowarp-aframe@0.1.0
```

## ブロック概要

英語 README の `Block reference` は `src/block-definitions.json` から生成されます。主な初期 API は次の通りです。

- `create 3D scene with layer [LAYER] mode [MODE]`
- `load template [ID] from JSON [SOURCE]`
- `create [TYPE] node id [ID] under [PARENT]`
- `create template [TEMPLATE] as [INSTANCE] under [PARENT]`
- `set selector [SELECTOR] position x [X] y [Y] z [Z]`
- `move selector [SELECTOR] by x [X] y [Y] z [Z]`
- `set selector [SELECTOR] rotation x [X] y [Y] z [Z]`
- `add class [CLASS] to selector [SELECTOR]`
- `set selector [SELECTOR] data [KEY] to [VALUE]`
- `set selector [SELECTOR] attribute [NAME] to [VALUE]`
- `delete selector [SELECTOR]`
- `load 3D scene YAML [SOURCE]`
- `3D scene YAML`
- `count selector [SELECTOR]`
- `event target id`
- `emit 3D event [TYPE] from selector [SELECTOR] with data [DATA]`
- `when 3D scene ready`
- `when event [TYPE] on selector [SELECTOR]`

## シーンモデル

`#scene` が root ノードです。すべてのブロックは、この拡張が管理する 3D グラフに対して動作します。Scratch のスプライト、背景、クローン、現在の target は 3D ノードの identity として持ち込みません。

初期 selector は意図的に小さくしています。

- `#card`
- `.monster`
- `[data-zone=field]`
- `*`
- event ハット実行後の `@event` または `event target`

複数一致する selector に対して command ブロックは全件に適用します。template の parent や event emit の target のように 1 ノードが必要な場合は、グラフ挿入順の first match を使います。

## YAML DSL

`3D scene YAML` は、ブロックで構築した現在の graph を書き出します。`load 3D scene YAML [SOURCE]` は同じ DSL 形状から graph を置き換えるため、ブロック中心の制作とテキスト中心の編集を往復できます。

```yaml
formatVersion: 1
options:
  layer: above-stage
  mode: 3d
root:
  children:
    - type: box
      id: card
      class: monster
      data:
        zone: field
      attributes:
        position: 0 1 -3
        material: "color: #4cffb0"
```

YAML を parse した後の構造は [schemas/aframe-scene-yaml.schema.json](schemas/aframe-scene-yaml.schema.json) で定義します。再利用する node/template の形は [schemas/aframe-template.schema.json](schemas/aframe-template.schema.json) です。

## アーキテクチャ

```text
src/index.ts + src/extension.ts
  -> vite-plugin-turbowarp-extension
  -> dist/turbowarp-aframe.js

src/config.ts + src/block-definitions.json
  -> extension-api-manifest Viteプラグイン
  -> dist/extension-manifest.json
```

Issue #1 のアーキテクチャ、初期/将来スコープ、ロールバック、AR 代替経路は [docs/architecture.ja.md](docs/architecture.ja.md) を参照してください。

## 開発

```bash
pnpm run check
```

この check は型検査、lint、test、README 生成検証、`dist/` 再現性、repository policy 検証、npm package dry-run を実行します。

## ライセンス

SPDX-License-Identifier: MPL-2.0
