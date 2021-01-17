load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "web-watcher",
    deps = [
        "//nodes:axios",
        "//nodes:worker_node",
        "//types",
        "@npm//@types/node",
        "@npm//hast-util-raw",
        "@npm//hast-util-select",
        "@npm//hast-util-to-html",
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
