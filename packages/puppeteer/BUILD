load("@npm//@bazel/typescript:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "js_library")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "puppeteer_files",
    srcs = ["index.ts"],
)

ts_library(
    name = "puppeteer_lib",
    srcs = [":puppeteer_files"],
    deps = [
        "//types",
        "@npm//puppeteer-core",
        "@npm//puppeteer-extra",
        "@npm//puppeteer-extra-plugin-adblocker",
        "@npm//puppeteer-extra-plugin-stealth",
    ],
)

js_library(
    name = "puppeteer",
    package_name = "@noderosso/packages/puppeteer",
    srcs = [],
    visibility = ["//visibility:public"],
    deps = [":puppeteer_lib"],
)