load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "js_library")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "worker_node_files",
    srcs = ["index.ts"],
)

ts_library(
    name = "worker_node_lib",
    srcs = [":worker_node_files"],
    deps = [
        "//packages/channel",
        "//types",
        "@npm//@types/node",
    ],
)

js_library(
    name = "worker_node",
    package_name = "@noderosso/packages/worker_node",
    srcs = [],
    visibility = ["//visibility:public"],
    deps = [":worker_node_lib"],
)