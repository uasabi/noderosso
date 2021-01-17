load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "mercury",
    deps = [
        "//nodes:axios",
        "//nodes:worker_node",
        "//summarice",
        "//types",
        "@npm//@mozilla/readability",
        "@npm//@types/jsdom",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//hast-util-raw",
        "@npm//hast-util-select",
        "@npm//jsdom",
        "@npm//node-red",
        "@npm//zod",
    ],
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ]
)
