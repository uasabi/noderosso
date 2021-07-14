load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "js_library")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "context_files",
    srcs = ["index.ts"],
)

ts_library(
    name = "context_lib",
    srcs = [":context_files"],
    deps = [
        "//types",
        "@npm//@types/node",
        "@npm//node-red",
    ],
)

js_library(
    name = "context",
    package_name = "@noderosso/packages/context",
    srcs = [],
    visibility = ["//visibility:public"],
    deps = [":context_lib"],
)