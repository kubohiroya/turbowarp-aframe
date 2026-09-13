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
- A-Frame host を検出した TurboWarp stage 近傍へ mount し、scene ready、DOM pointer/click、selector 単位の custom event をハットブロックで扱います。
- Three.js keyframe animation clip を定義し、vector / quaternion track を再生します。
- 当たり判定と AR 連携は Issue #1 に基づく次段階の API 境界として文書化しています。

## 要件と安全性

- Node.js 22 以上
- Corepack 経由の pnpm
- TurboWarp の unsandboxed extension support
- ブラウザ利用時は、生成済み拡張を使うページまたはプロジェクト環境で A-Frame を読み込むこと

unsandboxed 拡張はページ DOM を操作できます。信頼できる生成済み bundle だけを読み込んでください。

## runtime scene capability

複合的なunsandboxed機能拡張は、version付きruntime capabilityを通じてブロックと同じscene操作を利用できます。`Scratch.vm.runtime.turbowarpAFrameCapability`を取得し、最初に`requireVersion(1)`を呼んでから、次の同期メソッドを利用します。

```ts
interface AFrameRuntimeCapabilityV1 {
  readonly version: 1;
  requireVersion(version: number): AFrameRuntimeCapabilityV1;
  loadTemplate(id: string, source: string): void;
  createFromTemplate(template: string, instance: string, parent: string): void;
  setPosition(selector: string, x: number, y: number, z: number): void;
  setRotation(selector: string, x: number, y: number, z: number): void;
  emitEvent(type: string, selector: string, data: string): void;
  deleteSelector(selector: string): void;
  countSelector(selector: string): number;
}
```

このcapabilityが公開するのは宣言的templateとselectorだけです。private DOM node、A-Frame object、Three.js object、glTF内部実装は公開しません。未対応versionはfail closedし、機能拡張のdispose後に保持されたcapabilityを呼び出した場合も、すべて明示的に拒否します。

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
pnpm add --save-exact @kubohiroya/turbowarp-aframe@0.2.0
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
- `count selector [SELECTOR]`
- `event target id`
- `emit 3D event [TYPE] from selector [SELECTOR] with data [DATA]`
- `when 3D scene ready`
- `when event [TYPE] on selector [SELECTOR]`
- `create 3D animation clip [NAME] duration [DURATION]`
- `delete 3D animation clip [NAME]`
- `add vector keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES]`
- `add quaternion keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES]`
- `add euler rotation keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES] unit [UNIT]`
- `add position keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z]`
- `add scale keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z]`
- `add euler rotation keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z] unit [UNIT]`
- `play 3D animation clip [CLIP] on selector [SELECTOR] loop [LOOP]`
- `stop 3D animation clip [CLIP] on selector [SELECTOR]`
- `pause 3D animation clip [CLIP] on selector [SELECTOR]`
- `resume 3D animation clip [CLIP] on selector [SELECTOR]`
- `set 3D animation clip [CLIP] on selector [SELECTOR] time scale [SCALE]`
- `is 3D animation clip [CLIP] playing on selector [SELECTOR]?`

## シーンモデル

`#scene` が root ノードです。すべてのブロックは、この拡張が管理する 3D グラフに対して動作します。Scratch のスプライト、背景、クローン、現在の target は 3D ノードの identity として持ち込みません。

初期 selector は意図的に小さくしています。

- `#card`
- `.monster`
- `[data-zone=field]`
- `*`
- event ハット実行後の `@event` または `event target`

複数一致する selector に対して command ブロックは全件に適用します。template の parent や event emit の target のように 1 ノードが必要な場合は、グラフ挿入順の first match を使います。

## キーフレームアニメーション

animation ブロックは clip 定義を保存し、A-Frame と Three.js が利用可能な場合に `AFRAME.THREE.AnimationMixer` で一致 node の root `object3D` へ再生します。`VectorKeyframeTrack` は `.position` と `.scale`、`QuaternionKeyframeTrack` は `.quaternion` を対象にします。glTF 内部の bone、child object、material property は初期スコープ外です。

CSV 形式の track ブロックは Three.js に近い低レベル API です。教材や通常のブロック制作では、`add position keyframe...`、`add scale keyframe...`、`add euler rotation keyframe...` のように 1 keyframe ずつ追加するブロックを使います。同じ clip、同じ path、同じ time の keyframe は後から追加した値で置き換えます。

既存の `set selector [SELECTOR] rotation x [X] y [Y] z [Z]` は A-Frame の degree-based rotation attribute を設定します。Quaternion track は Three.js の object state を扱うため、Euler 補助ブロックでは `degrees` または `radians` を明示し、再生前に quaternion values へ変換します。

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
