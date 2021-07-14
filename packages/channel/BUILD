load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "js_library", "nodejs_test")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "channel_files",
    srcs = ["index.ts"],
)

ts_library(
    name = "channel_lib",
    srcs = [":channel_files"],
    deps = [
        "//types",
        "@npm//@types/node",
    ],
)

filegroup(
    name = "channel_test_files",
    srcs = ["test.ts"],
)

ts_library(
    name = "channel_test_ts",
    srcs = [":channel_test_files"],
    deps = [
        ":channel",
        "@npm//@types/tape",
        "@npm//tape",
    ],
)

nodejs_test(
    name = "channel_test",
    data = [":channel_test_ts"],
    entry_point = ":test.ts",
)

js_library(
    name = "channel",
    package_name = "@noderosso/packages/channel",
    srcs = [],
    visibility = ["//visibility:public"],
    deps = [":channel_lib"],
)
