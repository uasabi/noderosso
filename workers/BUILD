load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("//nodes:index.bzl", "prettier", "prettier_test")
load("//workers:index.bzl", "worker")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "worker_files",
    srcs = glob(["*.ts"]),
)

ts_library(
    name = "workers",
    srcs = [":worker_files"],
    deps = [
        "//types",
        "@npm//@types/node",
    ],
)

prettier(
    name = "tsfmt",
    srcs = glob([
        "*.ts",
        "*.tsx",
    ]),
)

prettier_test(
    name = "tslint",
    srcs = glob([
        "*.ts",
        "*.tsx",
    ]),
)

worker(
    name = "basic-auth",
    srcs = [":workers"],
    entry_point = "basic-auth.ts",
    generated_bundle = "basic-auth.js",
    deps = [
        ":workers",
        "@npm//@rollup/plugin-commonjs",
        "@npm//@rollup/plugin-node-resolve",
        "@npm//notp",
        "@npm//rollup-plugin-node-polyfills",
        "@npm//rollup-plugin-node-builtins",
        "@npm//rollup-plugin-node-globals",
    ],
)
