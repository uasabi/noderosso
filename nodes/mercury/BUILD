load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "mercury",
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//packages/axios",
        "//packages/worker_node",
        "//packages/summarice",
        "//packages/puppeteer",
        "//types",
        "@npm//@mozilla/readability",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//hast-util-raw",
        "@npm//hast-util-select",
        "@npm//node-red",
        "@npm//zod",
    ],
)
