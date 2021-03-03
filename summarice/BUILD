load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "js_library", "nodejs_test")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "summarice_files",
    srcs = ["index.ts"],
)

ts_library(
    name = "summarice_lib",
    srcs = [":summarice_files"],
    deps = [
        "//types",
        "@npm//wink-distance",
        "@npm//wink-nlp-utils",
    ],
)

filegroup(
    name = "summarice_test_files",
    srcs = ["test.ts"],
)

ts_library(
    name = "summarice_test_ts",
    srcs = [":summarice_test_files"],
    deps = [
        ":summarice",
        "@npm//@types/tape",
        "@npm//tape",
    ],
)

nodejs_test(
    name = "summarice_test",
    data = [":summarice_test_ts"],
    entry_point = ":test.ts",
)

js_library(
    name = "summarice",
    package_name = "@noderosso/summarice",
    srcs = [],
    visibility = ["//visibility:public"],
    deps = [":summarice_lib"],
)