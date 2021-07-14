load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "lru-cache",
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//packages/worker_node",
        "//packages/context",
        "//types",
        "@npm//@types/node",
        "@npm//human-interval",
        "@npm//node-red",
        "@npm//zod",
    ],
)
