# 固定入力エディターの契約

対応GUIの起動時に`blockEditorDialogs=1&blockEditorFixedInputs=1`を指定して再読込した場合だけ利用できる。固定入力フラグは既定OFF。旧GUIにoptional登録APIがなければ既存動作を維持する。

| ブロック | 引数 | UI |
|---|---|---|
| `createScene` | `LAYER` | enum |
| `setPosition` | `X` | number |
| `setPosition` | `Y` | number |
| `setPosition` | `Z` | number |
| `moveBy` | `X` | number |
| `moveBy` | `Y` | number |
| `moveBy` | `Z` | number |
| `setRotation` | `X` | number |
| `setRotation` | `Y` | number |
| `setRotation` | `Z` | number |
| `createAnimationClip` | `DURATION` | number |
| `addVectorKeyframeTrack` | `PATH` | enum |
| `addQuaternionKeyframeTrack` | `PATH` | enum |
| `addEulerRotationKeyframeTrack` | `PATH` | enum |
| `addEulerRotationKeyframeTrack` | `UNIT` | enum |
| `addPositionKeyframe` | `TIME` | number |
| `addPositionKeyframe` | `X` | number |
| `addPositionKeyframe` | `Y` | number |
| `addPositionKeyframe` | `Z` | number |
| `addScaleKeyframe` | `TIME` | number |
| `addScaleKeyframe` | `X` | number |
| `addScaleKeyframe` | `Y` | number |
| `addScaleKeyframe` | `Z` | number |
| `addEulerRotationKeyframe` | `TIME` | number |
| `addEulerRotationKeyframe` | `X` | number |
| `addEulerRotationKeyframe` | `Y` | number |
| `addEulerRotationKeyframe` | `Z` | number |
| `addEulerRotationKeyframe` | `UNIT` | enum |
| `playAnimationClip` | `LOOP` | 保存対象外・読取専用 |
| `setAnimationTimeScale` | `SCALE` | number |
| `setVrmBoneRotation` | `X` | number |
| `setVrmBoneRotation` | `Y` | number |
| `setVrmBoneRotation` | `Z` | number |
| `setVrmExpression` | `WEIGHT` | number |

旧template SOURCEのSchemaを数値・位置・回転の正本へ流用しない。DURATIONは有限かつ>=-1で、-0.5も有効。keyframe TIMEは>=0。その他は有限値を保持し、WEIGHTは0〜1のSchemaに狭めず、既存VRM runtimeのclampを維持する。LAYER/PATH/UNITは固定選択で、既存trim・大小文字aliasは表示投影のみ。BOOLEAN socketのLOOPは保存対象外であり、reporterを評価・置換しない。旧opcode・公開API・serializer・保存データを維持する。

Schemaの正本は`schemas/block-editor-fixed-inputs.schema.json`。各登録は実在する`#/$defs/<opcode>/properties/<argument>` fragmentをsourceとして保持し、旧SOURCE Schemaと区別する。`src/extension.ts`およびpure normalizerがruntime契約の正本であり、UI候補や棚卸しだけを受理根拠にしない。外部Schema取得を行わない。

新number入力にはNP-finite-new-input-v1を適用し、有限なJSON数値表記だけを保存する。既存rawは未編集ならalias・空白・未知値・旧数値表記もそのまま保持し、表示投影では書き換えない。空白や非有限など投影不能な旧値は読取専用で、明示的な有効値への修復だけを許す。接続reporterは評価・置換しない。対象外の引数はpatchしない。

同じ画面では未保存draftと無効bufferを保持し、保存失敗後も保持する。取消・dispose・project/target/登録失効で破棄し、再openは現在rawから始める。getInfoに存在するopcodeだけ登録し、APIまたはopcode集合の変化ではcleanupして再登録する。部分登録失敗・runtime終了・disposeでcleanupする。

共通依存はGit commit `485f0e550e622235624b5e9176820161aeeba252`へmanifest・lock・実解決を揃える。型とpure数値parserだけを利用し、runtime bundleと公開型の依存閉包をpack consumerで確認する。既存SourceForms/Descendantsと共存する。

切戻しは固定入力フラグをOFFにして再読込する。依存を戻すときはmanifest・lock・実解決を一組で戻す。旧sb3の移行は不要。ローカル検証のみで、commit・push・Issue・PR・merge・Pages・npm公開を含まない。
