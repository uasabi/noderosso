load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("//nodes:index.bzl", "prettier", "prettier_test")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "worker_node_files",
    srcs = [
        "channel.ts",
        "context.ts",
        "worker-node.ts",
    ],
)

ts_library(
    name = "worker_node",
    srcs = [":worker_node_files"],
    deps = [
        "//types",
        "@npm//@types/node",
        "@npm//node-red",
    ],
)

filegroup(
    name = "axios_files",
    srcs = ["axios.ts"],
)

ts_library(
    name = "axios",
    srcs = [":axios_files"],
    deps = [
        "@npm//@types/human-interval",
        "@npm//@types/node",
        "@npm//axios",
        "@npm//human-interval",
    ],
)

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
