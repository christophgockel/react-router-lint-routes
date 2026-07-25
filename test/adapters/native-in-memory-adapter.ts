import { createVirtualFileSystem } from "typescript-7/unstable/fs";
import { collect, createNodeApi } from "../../src/adapters/native-adapter.ts";
import type { CompilerAdapter } from "../../src/compiler-adapter.ts";
import type { LintSourceFile } from "../../src/lint-ast.ts";

type SyncModule = typeof import("typescript-7/unstable/sync");
type AstModule = typeof import("typescript-7/unstable/ast");

const TSCONFIG_PATH = "/tsconfig.json";

// The native API reads source through a filesystem, so the in-memory sources are
// served from a virtual filesystem alongside a virtual tsconfig that lists them.
export class NativeInMemoryAdapter implements CompilerAdapter {
  private readonly ApiConstructor: SyncModule["API"];
  private readonly nodeApi: ReturnType<typeof createNodeApi>;
  private readonly files: Record<string, string>;

  constructor(ApiConstructor: SyncModule["API"], ast: AstModule, files: Record<string, string>) {
    this.ApiConstructor = ApiConstructor;
    this.nodeApi = createNodeApi(ast);
    this.files = files;
  }

  sourceFiles(): LintSourceFile[] {
    const fs = createVirtualFileSystem({
      ...this.files,
      [TSCONFIG_PATH]: JSON.stringify({
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          noEmit: true,
        },
        files: Object.keys(this.files),
      }),
    });

    const api = new this.ApiConstructor({ cwd: "/", fs });

    try {
      const snapshot = api.updateSnapshot({ openProjects: [TSCONFIG_PATH] });
      const project = snapshot.getProjects()[0];

      if (project === undefined) {
        return [];
      }

      return collect(project.program, this.nodeApi);
    } finally {
      api.close();
    }
  }
}
