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
        "//nodes:axios",
        "//nodes:worker_node",
        "//types",
        "@npm//@types/node",
        "@npm//axios",
        "@npm//node-red",
        "@npm//puppeteer-core",
        "@npm//puppeteer-extra",
        "@npm//zod",
    ],
)
