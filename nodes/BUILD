load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("//nodes:index.bzl", "prettier", "prettier_test")

package(default_visibility = ["//visibility:public"])

# filegroup(
#     name = "worker_node_files",
#     srcs = [
#         "context.ts",
#         "worker-node.ts",
#     ],
# )

filegroup(
    name = "context_files",
    srcs = [
        "context.ts",
    ],
)

ts_library(
    name = "context_lib",
    srcs = [":context_files"],
    deps = [
        "//types",
        "//packages/channel",
        "//packages/worker_node",
        "@npm//@types/node",
        "@npm//node-red",
    ],
)

# ts_library(
#     name = "worker_node",
#     srcs = [":worker_node_files"],
#     deps = [
#         "//types",
#         "//packages/channel",
#         "//packages/worker_node",
#         "@npm//@types/node",
#         "@npm//node-red",
#     ],
# )

filegroup(
    name = "all_ts_files",
    srcs = glob(["*.ts"]),
)

prettier_test(
    name = "tslint",
    srcs = glob([
        "*.ts",
        "*.tsx",
    ]),
)

prettier(
    name = "tsfmt",
    srcs = glob([
        "*.ts",
        "*.tsx",
    ]),
)
