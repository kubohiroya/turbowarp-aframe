# 最小デモ

`move-one-cube.sb3` は `move-one-cube/project.json` とSVGから決定的に生成します。

```bash
node scripts/build-samples.mjs
node scripts/build-samples.mjs --check
node --test scripts/verify-samples.mjs
node scripts/prepare-pages.mjs
```

公式Editorで同梱拡張のunsandboxed実行を許可し、緑の旗→立方体1個、Space→移動、緑の旗→初期化を確認します。WebGLとjsDelivr接続が必要です。停止ボタンでは描画は残り、次の緑旗で旧シーンを置換します。ブラウザのタブを閉じると描画資源が解放されます。本体の既定OFFフラグは変更しません。
