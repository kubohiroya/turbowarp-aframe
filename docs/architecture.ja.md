# アーキテクチャ

[English](architecture.md)

## 目的

TurboWarp-A-Frame は、TurboWarp プロジェクトから A-Frame ベースの宣言型 3D シーングラフを構築・操作するための拡張です。Scratch スプライトの 3D 互換レイヤーではありません。

スプライトと背景は script の置き場所として扱います。3D 側の identity は、この拡張が管理する node id、class、`data-*` 属性、A-Frame component 属性、template、selector、instance id、event で表します。

## ビルド出力

```text
src/index.ts + src/extension.ts
  -> vite-plugin-turbowarp-extension
  -> dist/turbowarp-aframe.js

src/config.ts + src/block-definitions.json
  -> extension-api-manifest Viteプラグイン
  -> dist/extension-manifest.json
```

生成される JavaScript は unsandboxed TurboWarp 拡張です。manifest は block API contract として互換性確認に使います。

## シーン初期化

`createScene` は root の `#scene` ノードを作り、ブラウザ DOM がある場合は `#tw-aframe-root > a-scene` を作成します。host は最初に検出できた TurboWarp stage wrapper または canvas の親へ mount し、stage らしい要素が見つからない場合だけ `document.body` に fallback します。

初期 layer は文字列です。Book/API 側で語彙を調整しても block shape を変えずに済むようにしています。

- `above-stage`: A-Frame を TurboWarp stage の上に重ねます。
- `below-stage`: host CSS が許す場合に A-Frame を stage の背面へ置きます。
- `camera-under-3d`: camera/video を 3D layer の下に置く想定です。

初期 mode も文字列です。

- `3d`: 通常の埋め込み 3D シーンです。
- `camera`: camera 合成を想定します。
- `ar-fallback`: AR 非対応端末向けの tracking なし 3D 代替表示です。
- `ar`: 将来の marker または WebXR ベース AR 用に予約します。

初期化後、`when 3D scene ready` が 1 回だけ発火します。

## シーングラフ

グラフは拡張内で管理します。対応する node kind は A-Frame tag に対応します。

- primitive: `box`, `sphere`, `plane`, `circle`, `cone`, `cylinder`
- media: `image`, `image-plane`, `text`, `model`
- scene service: `light`, `camera`
- structure: `group`, `empty`, `primitive`

`position`、`rotation`、その他 attribute は親 node に対する local attribute です。world 座標 helper は初期実装の外に置きます。

## セレクタ

初期 selector subset は意図的に限定します。

- `#id`
- `.class`
- `[data-key=value]`
- `*`
- event ハット実行後の `@event` または `event target`

command は一致したすべての node に適用します。1 node が必要な block は、グラフ挿入順の first match を使います。複数一致の挙動を決定的にし、Book 2 で説明しやすくするためです。

## テンプレートとインスタンス

template は次の形の JSON object です。

```json
{
  "type": "group",
  "id": "optional-child-id",
  "class": "monster",
  "data": {"zone": "field"},
  "attributes": {"position": "0 1 -3"},
  "children": []
}
```

`create template [TEMPLATE] as [INSTANCE] under [PARENT]` は template root id を明示された instance id に置き換え、子孫 id には instance id prefix を付けます。また root に `data-template` と `data-instance` を追加します。instance id の衝突は error です。親 node を削除すると子孫も削除します。

## イベント

runtime は hat polling 用の小さな event queue を持ちます。

- `scene-ready`
- `emit 3D event [TYPE] from selector [SELECTOR] with data [DATA]` による user event

`when event [TYPE] on selector [SELECTOR]` は一致する最初の queued event を消費します。`event target id` は直近に処理された event target を返します。

ブラウザ DOM element が存在する場合、`click`、`tap`、`pointerenter`、`pointerleave` は同じ queue に変換します。hat が指定した custom event type も既存 node と将来作成される node に listener を張ります。`emit 3D event` が dispatch する DOM `CustomEvent` は、自分自身を二重に queue へ積まないようにしています。

## 当たり判定スコープ

この初期コード slice では当たり判定は未実装です。最初の production model は次を想定します。

- selector または collision group の明示登録
- AABB または bounding sphere 判定
- octree より先に spatial hash または grid broad phase を検討
- `enters`、`touches`、`leaves` の event state
- カード、盤面 zone、monster、effect 程度の教材規模に合わせた更新頻度上限

## AR スコープ

AR tracking は将来の feature flag 対象です。評価順は次を想定します。

- WebXR: 対応 browser/device で信頼できる場合
- AR.js: marker ベース教材
- MindAR: image target 実験

非対応端末、camera 拒否、marker lost、位置 jitter、認識失敗では、通常 3D mode または `ar-fallback` に縮退し、授業の進行を止めない方針です。

## Book 2 API 境界

Book 2 では、scene 作成、template 読み込み、instance 作成、selector 操作、event、将来の collision group、将来の AR anchor attach までを小さな block set として扱います。A-Frame と Three.js の詳細は、発展課題または開発者向けドキュメントへ分離します。

## ロールバック

A-Frame 統合が重すぎる場合は、graph core を残したまま DOM backend を薄い Three.js renderer に置き換えられます。AR 認識が不安定な場合は AR を実験機能に留め、通常の 3D カードゲーム表現を主経路にします。当たり判定が重い場合は明示登録された group だけに限定し、更新頻度を落とします。
