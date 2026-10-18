> 現在のCI修正・依存artifactの検証は [editor-schema-ci-fix-20261018.ja.md](editor-schema-ci-fix-20261018.ja.md) / [JSON](editor-schema-ci-fix-20261018.json) を参照。以下の旧pin・検証結果は採取時の履歴として保持する。

# 段階1: A-Frame固定Schema

> 現在のGit依存固定・実解決・検証結果は[editor-schema-publication.ja.md](editor-schema-publication.ja.md)と同名JSONを参照。以下は依存更新前の採取履歴として保持する。

追跡: https://github.com/kubohiroya/turbowarp-aframe/issues/19 。共通親はextension-data-editor #18。

`./editor-schema`はtemplateSchemaBundle、validateTemplateInput、validateTemplateNode、decodeTemplateSourceを公開する。拡張本体やDOMをimportしない。decodeはJSONのsource/raw dataを保持し、検証は値のString化やclass重複除去を行わない。

互換Schemaの正本はschemas/block-editor-template-compat.schema.json。所有条件はsrc/template-validation.tsで、旧runtime validatorの受理条件と例外文面をそのまま抽出した。runtimeも同じ関数へ委譲する。既存schemas/aframe-template.schema.jsonは厳しい参考Schemaとして保持し、必須ゲートにはしない。空type/id、重複class/classes、配列/object属性値、children再帰を受理する。空白だけのrecord keyの拒否はowner層が担当する。

共通型はGit commit a1ab4f4f5b384eef08ef26e544186ee9d8ad4543へ固定し、lockfileとpnpmのbuild許可も同じartifactを指す。GitHub archiveではexport-substのrevisionをbuild-infoへ記録する。pnpmのGit prepareは明示許可が必要なため、固定tarball matcherをpnpm-workspace.yamlへ追加した。

確認: 型検査、互換fixtureと既存runtime対象テスト35件、既存Vite build＋独立JS/型/resource emit、srcなし隔離package importとDOMなし・skipLibCheck:falseのconsumer型検査が成功。既存strict Schemaは変更していない。

段階2のフォーム登録・source encode・binding、段階4の候補UIは未実装。既存GUIフラグの既定OFFを維持する。rollbackは新pure入口の利用を外すか、このIssueのcommitをrevertする。保存済みsourceの移行は不要。

## S1-5の最終確認

対象は合計36ケース（増分検証を含む）。srcを除いた実packageでReact不在・DOM/VM/通信globalアクセス0、skipLibCheck:falseの型検査を確認し、独立生成5ファイルを再emitと全SHA-256照合した。16契約の横断fixtureと依存artifact照合の記録は共通repoのschema-stage1-*.jsonを参照。既存生成基準は保持する。

validateTemplateSourceを追加し、形式不正・未知variantでも元sourceを保持した安全な診断を返す。raw parser例外を診断へ混ぜない。
