import * as ts from 'typescript'
import * as path from 'path'

import type { TransformerExtras, PluginConfig } from 'ts-patch'

export default function (
  program: ts.Program,
  pluginConfig: PluginConfig,
  { ts: tsInstance }: TransformerExtras
) {
  return (ctx: ts.TransformationContext) => {
    const { factory } = ctx

    // Find the project root based on the tsconfig.json location
    const configFilePath = program.getCompilerOptions()
      .configFilePath as string
    const projectRoot = configFilePath
      ? path.dirname(configFilePath)
      : program.getCurrentDirectory()

    function hasSkipComment(node: ts.Node): boolean {
      const commentRanges =
        tsInstance.getLeadingCommentRanges(node.getFullText(), 0) || []
      return commentRanges.some((commentRange) => {
        const comment = node
          .getFullText()
          .slice(commentRange.pos, commentRange.end)
        return comment.includes('@skip-prod-transpilation')
      })
    }

    return (sourceFile: ts.SourceFile) => {
      function visit(node: ts.Node): ts.Node {
        if (hasSkipComment(node)) {
          console.log(
            `\x1b[0;30m${path.relative(projectRoot, sourceFile.fileName)
            }\x1b[0m: skipped \x1b[0;37m${
              ts.SyntaxKind[node.kind]
            }\x1b[0m due to \x1b[0;36m@skip-prod-transpilation\x1b[0m directive`
          )
          return factory.createEmptyStatement()
        }
        return tsInstance.visitEachChild(node, visit, ctx)
      }
      return tsInstance.visitNode(sourceFile, visit)
    }
  }
}
