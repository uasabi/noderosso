load("@npm//@bazel/typescript:index.bzl", "ts_config", "ts_project")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "files",
    srcs = glob(
        ["*.ts"],
        exclude = ["*.test.ts", "test.ts"],
    ),
    data = ["mercury.html"],
)

#node(
#    name = "mercury",
#    test_deps = [
#        "//types",
#        "@npm//@types/node",
#        "@npm//@types/tape",
#        "@npm//tape",
#    ],
#    deps = [
#        "//nodes:axios",
#        "//nodes:worker_node",
#        "//summarice",
#        "//types",
#        "@npm//@mozilla/readability",
#        "@npm//@types/node",
#        "@npm//chrono-node",
#        "@npm//hast-util-raw",
#        "@npm//hast-util-select",
#        "@npm//node-red",
#        "@npm//puppeteer-core",
#        "@npm//puppeteer-extra",
#        "@npm//puppeteer-extra-plugin-adblocker",
#        "@npm//puppeteer-extra-plugin-stealth",
#        "@npm//zod",
#    ],
#)

ts_project(
    name = "mercury",
    validate = False,
    srcs = glob(
        ["*.ts"],
        exclude = ["*.test.ts", "test.ts"],
    ),
    deps = [
        "//nodes:axios",
        "//nodes:worker_node",
        "//summarice",
        "//types",
        "@npm//@mozilla/readability",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//hast-util-raw",
        "@npm//hast-util-select",
        "@npm//node-red",
        "@npm//puppeteer-core",
        "@npm//puppeteer-extra",
        "@npm//puppeteer-extra-plugin-adblocker",
        "@npm//puppeteer-extra-plugin-stealth",
        "@npm//zod",
    ],
    tsconfig = "//:tsconfig",
)

#ts_library(
#    name = name,
#    srcs = [":files"],
#    deps = deps,
#)

#filegroup(
#    name = "test_files",
#    srcs = [name + ".test.ts"],
#)

#ts_library(
#    name = "tests_ts",
#    srcs = [":test_files"],
#    deps = [
#        ":" + name,
#    ] + test_deps,
#    data = test_data,
#)

filegroup(
    name = "all_ts_files",
    srcs = glob(["*.ts"]),
)

#prettier_test(
#    name = "tslint",
#    srcs = glob([
#        "*.ts",
#        "*.tsx",
#    ]),
#)

#prettier(
#    name = "tsfmt",
#    srcs = glob([
#        "*.ts",
#        "*.tsx",
#    ]),
#)
