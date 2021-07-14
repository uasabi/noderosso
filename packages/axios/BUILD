load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "js_library")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "axios_files",
    srcs = ["index.ts"],
)

ts_library(
    name = "axios_lib",
    srcs = [":axios_files"],
    deps = [
        "@npm//axios",
        "@npm//human-interval",
        "@npm//@types/node",
    ],
)

js_library(
    name = "axios",
    package_name = "@noderosso/packages/axios",
    srcs = [],
    visibility = ["//visibility:public"],
    deps = [":axios_lib"],
)