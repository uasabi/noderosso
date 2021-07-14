load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "wordpress-scraper",
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
        "//types",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//node-red",
        "@npm//zod",
    ],
)
