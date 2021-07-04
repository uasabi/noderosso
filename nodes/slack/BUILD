load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "slack",
    test_data = [],
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//packages/axios",
        "//packages/worker_node",
        "//packages/puppeteer",
        "//types",
        "@npm//@types/node",
        "@npm//axios",
        "@npm//node-red",
        "@npm//zod",
    ],
)
