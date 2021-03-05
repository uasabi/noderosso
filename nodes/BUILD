load("@npm//@bazel/typescript:index.bzl", "ts_library", "ts_config", "ts_project")
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

ts_project(
    name = "worker_node",
    tsconfig = "//:tsconfig",
    validate = False,
    srcs = [
        "channel.ts",
        "context.ts",
        "worker-node.ts",
    ],
    deps = [
        "//types",
        "@npm//@types/node",
        "@npm//node-red",
    ],
)

#ts_library(
#    name = "worker_node",
#    srcs = [":worker_node_files"],
#    deps = [
#        "//types",
#        "@npm//@types/node",
#        "@npm//node-red",
#    ],
#)

filegroup(
    name = "axios_files",
    srcs = ["axios.ts"],
)

ts_project(
    name = "axios",
    tsconfig = "//:tsconfig",
    validate = False,
    declaration = True,
    srcs = ["axios.ts"],
    deps = [
        "@npm//@types/human-interval",
        "@npm//@types/node",
        "@npm//axios",
        "@npm//human-interval",
    ],
)

#ts_library(
#    name = "axios",
#    srcs = [":axios_files"],
#    deps = [
#        "@npm//@types/human-interval",
#        "@npm//@types/node",
#        "@npm//axios",
#        "@npm//human-interval",
#    ],
#)

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
